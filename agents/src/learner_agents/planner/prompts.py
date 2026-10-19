"""Prompts for the planner graph."""

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from learner_agents.planner.schemas import PhaseOutline, PlanOutline, PlanRequest, SkillStatus

_STYLE = {"video": "video courses", "reading": "docs and books", "hands_on": "hands-on projects", "mixed": "a mix of formats"}


def _context(request: PlanRequest, statuses: list[SkillStatus]) -> str:
    goal = request.goal
    skills = []
    for status, assessed in zip(statuses, request.skills, strict=True):
        line = f"- {status.skill}: level {status.current_level} now, goal needs {status.target_level} -> {status.status.upper()}"
        if assessed.gaps:
            line += f"; gaps: {'; '.join(assessed.gaps)}"
        if assessed.strengths:
            line += f"; strengths: {'; '.join(assessed.strengths)}"
        skills.append(line)
    profile = request.profile
    background = ", ".join(
        part
        for part in [profile.profession, f"{profile.years_of_experience} yrs" if profile.years_of_experience else None, profile.education]
        if part
    )
    return (
        f"Goal: {goal.title}. Success looks like: {goal.target_outcome}. Why: {goal.motivation}.\n"
        f"Time: {goal.hours_per_week} hours a week; timeline: {goal.timeline or 'none given'}.\n"
        f"Learns best with {_STYLE[goal.learning_style]}; budget: {'free resources only' if goal.budget == 'free_only' else 'paid is fine'}.\n"
        f"Background: {background or 'not given'}. Already knows: {goal.current_experience or 'not stated'}.\n"
        f"Assessed skills:\n" + "\n".join(skills)
    )


def outline_messages(request: PlanRequest, statuses: list[SkillStatus]) -> list[BaseMessage]:
    return [
        SystemMessage(
            "You design a personal learning plan that covers only the gap between what the learner knows and what "
            "their goal needs.\n"
            "- SKIP skills get no phase of their own; say in the starting point that they're already covered.\n"
            "- REFRESH skills get a short review inside another phase.\n"
            "- FOCUS skills get most of the time, the biggest gaps first, ordered so each phase builds on the last.\n"
            "- 2 to 6 phases. Weeks across phases must fit the timeline at the given hours per week; with no "
            "timeline, choose a realistic total.\n"
            "- Address the learner as 'you'. Be concrete and encouraging; no filler.\n"
            "- SKIP, REFRESH and FOCUS are internal labels: never write them. Describe skills in plain words, and "
            "only say a skill is already covered if it is marked SKIP."
        ),
        HumanMessage(_context(request, statuses)),
    ]


def detail_messages(
    request: PlanRequest, statuses: list[SkillStatus], outline: PlanOutline, index: int
) -> list[BaseMessage]:
    phase: PhaseOutline = outline.phases[index]
    others = "\n".join(
        f"{n + 1}. {p.title} ({p.weeks} wks)" + (" <- this one" if n == index else "") for n, p in enumerate(outline.phases)
    )
    free_rule = "Every resource must be free." if request.goal.budget == "free_only" else "Paid resources are fine."
    return [
        SystemMessage(
            "You detail one phase of a learning plan.\n"
            "- Objectives: what the learner can do by the end. Topics: what to study, in order.\n"
            f"- Practice: one concrete task or mini-project sized for {request.goal.hours_per_week} hours a week; "
            "favour building things when they learn best hands-on.\n"
            "- Milestone: start with \"You're done with this phase when\".\n"
            "- 2 to 4 resources that match how they learn. Name real, well-known resources (official docs, "
            f"established courses, books, communities). No URLs. {free_rule}\n"
            "- Don't re-teach what the assessment shows they already know."
        ),
        HumanMessage(
            f"{_context(request, statuses)}\n\nPlan phases:\n{others}\n\n"
            f"Detail phase {index + 1}: {phase.title} ({phase.weeks} weeks). Aim: {phase.aim}. "
            f"Focus skills: {', '.join(phase.focus_skills)}."
        ),
    ]
