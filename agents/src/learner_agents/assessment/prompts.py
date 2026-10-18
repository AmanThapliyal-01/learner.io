"""Prompts for building and grading the skill check."""

import json

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from learner_agents.assessment.schemas import LEVEL_NAMES, AnsweredQuestion, GenerateRequest, GradeRequest, RatedSkill
from learner_agents.core.context import GoalSummary

_LEVELS = "; ".join(f"{level} = {name}" for level, name in LEVEL_NAMES.items())


def _goal(goal: GoalSummary) -> str:
    return f"{goal.title} ({goal.goal_type}). Success looks like: {goal.target_outcome}."


def targets_messages(request: GenerateRequest) -> list[BaseMessage]:
    skills = "\n".join(f"- {s.skill}" for s in request.skills)
    return [
        SystemMessage(
            "You set the skill level a learning goal requires, on a 1-5 scale "
            f"({_LEVELS}). Be realistic: most goals need 3 or 4; reserve 5 for skills at the core of an expert role."
        ),
        HumanMessage(f"Goal: {_goal(request.goal)}\nTimeline: {request.goal.timeline or 'none'}\nSkills:\n{skills}"),
    ]


def questions_messages(goal: GoalSummary, skill: RatedSkill) -> list[BaseMessage]:
    level = skill.self_rating
    return [
        SystemMessage(
            "You write a short skill check. Write 3 multiple-choice questions (exactly 4 options, one clearly correct, "
            "plausible distractors, no 'all of the above') and 1 short-answer question with a grading rubric.\n"
            f"Levels: {_LEVELS}.\n"
            f"The user rated themselves {level} ({LEVEL_NAMES[level]}). Pitch the questions so someone truly at that "
            "level gets most of them right and someone a level below gets about half. Test applied understanding, "
            "not trivia or exact syntax. For creative or physical skills (drawing, music, sport) use scenario and "
            "technique questions. Keep each question under 60 words. Vary the position of the correct option."
        ),
        HumanMessage(f"Goal: {_goal(goal)}\nSkill to check: {skill.skill}"),
    ]


def _question_line(q: AnsweredQuestion) -> str:
    if q.kind == "multiple_choice" and q.options is not None:
        chosen = q.options[int(q.answer)] if q.answer and q.answer.isdigit() and int(q.answer) < len(q.options) else "no answer"
        correct = q.options[int(q.answer_key)]
        verdict = "correct" if chosen == correct else "wrong"
        return f"[{q.id}] ({q.skill}, multiple choice) {q.prompt}\n  Chose: {chosen} ({verdict}; correct: {correct})"
    return f"[{q.id}] ({q.skill}, short answer) {q.prompt}\n  Rubric: {q.answer_key}\n  Answer: {q.answer or '(no answer)'}"


def evaluation_messages(request: GradeRequest) -> list[BaseMessage]:
    ratings = ", ".join(f"{s.skill} (self-rated {s.self_rating})" for s in request.skills)
    answered = "\n".join(_question_line(q) for q in request.questions)
    short_ids = [q.id for q in request.questions if q.kind == "short_answer"]
    return [
        SystemMessage(
            "You grade a learner's skill check and summarise it.\n"
            "1. Grade every short-answer question against its rubric: 1 = covers the rubric, 0.5 = partly right, "
            "0 = wrong, empty or off-topic. Feedback: one plain sentence on what was right or missing.\n"
            "2. For every skill, list up to 3 strengths and up to 3 gaps, concrete and specific to what the answers "
            "showed (e.g. 'Knows when to use an index', not 'Good at SQL'), plus a one-line summary.\n"
            "Base everything on the answers only. Be fair and encouraging, but honest."
        ),
        HumanMessage(
            f"Goal: {_goal(request.goal)}\nSkills: {ratings}\nShort-answer ids to grade: {json.dumps(short_ids)}\n\n"
            f"Answers:\n{answered}"
        ),
    ]
