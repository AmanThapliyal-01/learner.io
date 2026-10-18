"""The planner as a LangGraph: skill statuses (code) -> outline -> phase details in parallel -> assemble (code).

Groq allows about 8K tokens per minute per model, so one big call for a whole plan won't fit. The outline is one
call; then every phase is detailed in parallel (LangGraph Send), each starting on a different model so their
per-minute budgets add up. Each step waits out short rate limits (it's a background job) instead of failing.
"""

import logging
import operator
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, TypedDict

from langchain_core.language_models import LanguageModelInput
from langchain_core.runnables import Runnable
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Send

from learner_agents.core.llm.models import rotated_chain
from learner_agents.core.llm.patience import patiently
from learner_agents.core.llm.structured import structured_model
from learner_agents.planner.prompts import detail_messages, outline_messages
from learner_agents.planner.schemas import (
    Phase,
    PhaseDetail,
    PlanDocument,
    PlanOutline,
    PlanRequest,
    SkillStatus,
)

logger = logging.getLogger(__name__)

MAX_PHASES = 6


@dataclass(frozen=True)
class PlannerModels:
    outline: Runnable[LanguageModelInput, PlanOutline]
    # One per starting model; phase i uses details[i % len(details)].
    details: tuple[Runnable[LanguageModelInput, PhaseDetail], ...]


def _rotations(n: int) -> list[list[str]]:
    return [rotated_chain(k) for k in range(n)]


@lru_cache
def planner_models() -> PlannerModels:
    return PlannerModels(
        outline=structured_model(PlanOutline, temperature=0.3),
        details=tuple(structured_model(PhaseDetail, model_ids=chain, temperature=0.4) for chain in _rotations(3)),
    )


class PlannerState(TypedDict, total=False):
    request: PlanRequest
    statuses: list[SkillStatus]
    outline: PlanOutline
    # Parallel detail steps each add (index, phase); the reducer collects them.
    phases: Annotated[list[tuple[int, Phase]], operator.add]
    document: PlanDocument


class DetailTask(TypedDict):
    request: PlanRequest
    statuses: list[SkillStatus]
    outline: PlanOutline
    index: int


def skill_statuses(request: PlanRequest) -> list[SkillStatus]:
    """skip: already at the goal's level. refresh: one level short. focus: two or more short."""
    statuses = []
    for skill in request.skills:
        gap = skill.target_level - skill.assessed_level
        if gap <= 0:
            status, note = "skip", "You already have this at the level your goal needs."
        elif gap == 1:
            status, note = "refresh", "Close: a short refresh gets you there."
        else:
            status, note = "focus", f"The biggest gap: {gap} levels to go."
        statuses.append(
            SkillStatus(skill=skill.skill, current_level=skill.assessed_level, target_level=skill.target_level, status=status, note=note)
        )
    return statuses


def build_planner(models: PlannerModels) -> CompiledStateGraph:
    async def assess(state: PlannerState) -> PlannerState:
        return {"statuses": skill_statuses(state["request"])}

    async def outline(state: PlannerState) -> PlannerState:
        messages = outline_messages(state["request"], state["statuses"])
        result = await patiently(lambda: models.outline.ainvoke(messages))
        return {"outline": result.model_copy(update={"phases": result.phases[:MAX_PHASES]})}

    def fan_out(state: PlannerState) -> list[Send]:
        return [
            Send("detail", DetailTask(request=state["request"], statuses=state["statuses"], outline=state["outline"], index=i))
            for i in range(len(state["outline"].phases))
        ]

    async def detail(task: DetailTask) -> PlannerState:
        index, request = task["index"], task["request"]
        planned = task["outline"].phases[index]
        model = models.details[index % len(models.details)]
        messages = detail_messages(request, task["statuses"], task["outline"], index)
        result = await patiently(lambda: model.ainvoke(messages))
        resources = result.resources
        if request.goal.budget == "free_only":
            resources = [r for r in resources if r.free]  # the budget is a hard rule, not a suggestion
        phase = Phase(
            **planned.model_dump(),
            objectives=result.objectives[:5],
            topics=result.topics[:8],
            practice=result.practice,
            milestone=result.milestone,
            resources=resources[:4],
        )
        return {"phases": [(index, phase)]}

    async def assemble(state: PlannerState) -> PlannerState:
        request, plan_outline = state["request"], state["outline"]
        phases = [phase for _, phase in sorted(state["phases"], key=lambda item: item[0])]
        document = PlanDocument(
            summary=plan_outline.summary,
            starting_point=plan_outline.starting_point,
            total_weeks=sum(p.weeks for p in phases),
            hours_per_week=request.goal.hours_per_week,
            skills=state["statuses"],
            phases=phases,
        )
        return {"document": document}

    graph = StateGraph(PlannerState)
    graph.add_node("assess", assess)
    graph.add_node("outline", outline)
    graph.add_node("detail", detail)
    graph.add_node("assemble", assemble)
    graph.add_edge(START, "assess")
    graph.add_edge("assess", "outline")
    graph.add_conditional_edges("outline", fan_out, ["detail"])
    graph.add_edge("detail", "assemble")
    graph.add_edge("assemble", END)
    return graph.compile()


async def generate_plan(planner: CompiledStateGraph, request: PlanRequest) -> PlanDocument:
    state = await planner.ainvoke({"request": request})
    return state["document"]
