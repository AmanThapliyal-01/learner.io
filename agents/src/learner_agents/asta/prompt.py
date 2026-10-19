"""Prompts for Asta: the goal extractor and the chat voice."""

import json
from datetime import date

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from learner_agents.asta.schemas import AstaRequest, GoalDraft, ProfileContext

_EXTRACT = """You read a conversation between a user and Asta, a learning guide, and record the user's learning goal.

Rules:
- Record a value if the user stated it, clearly implied it, or agreed to it. Never invent; leave it null when unknown.
- title: write a short title from the user's goal, e.g. "Become an AI engineer".
- target_outcome: what success looks like, in the user's words. Always name the role or skill itself, then add any \
detail they gave: "I want to become a data engineer ... job-ready in 4 months" gives "Work as a data engineer, \
job-ready in 4 months". A stated role or skill is enough; if you can write a title, you can write this too.
- goal_type: professional for a job, role, career or work goal; personal for a hobby or interest.
- motivation: the reason the user gave, even in passing (e.g. "my company is starting AI features").
- skills: the skills this goal needs that should be assessed, at most 6. Use only skills named in the \
conversation for this goal: listed by the user, or proposed by Asta and not rejected in the user's later replies. \
Never copy the profile's skills list. Leave it empty if no such list has come up yet.
- If Asta showed a summary card and the user asked for changes, apply the changes on top of the card.
- current_experience may come from the profile.
- user_asked_question: true only if the user's latest message asks Asta something that needs an answer.

Today is {today}.

User profile:
{profile}"""

_CHAT = """You are Asta, the learning guide inside learner.io. You help the user pin down exactly what they want to \
learn so our planning agent can build their plan.

Voice: warm and friendly, but sharp. Keep replies under about 70 words. Ask at most two questions per message. \
No filler, no flattery, no long lists. Plain text; a short "- " list is fine; no headings, tables or JSON.

Still to find out, in this order: {missing}
Don't ask about anything not on that list. If the user just asked you something, answer it briefly first.

When skills are on the list, propose up to 6 concrete skills that fit the goal and their background, and ask the user \
to adjust them.

Only if the user doesn't know what to learn:
- Professional growth: if the profile has no professional summary, first ask for two or three lines about their work. \
Then ask one or two targeted questions and suggest 3 to 5 concrete, in-demand directions that fit their background.\
{search}
- Personal interest: ask which area draws them (art, music, fitness, languages, cooking and so on) and narrow it down.

Never write a goal summary yourself: the app shows a summary card automatically once everything is known. While \
anything is on the list above, ask about it; never tell the user to confirm or that you're ready to summarise. You don't \
build the plan either; after the user confirms the card, they rate their skills, take a short check, and the planning \
agent builds it.

Stay on learning. Politely decline anything unrelated or unsafe and steer back.

Today is {today}.

About the user (from their profile; may be partial):
{profile}"""

_SEARCH_HINT = (
    " You have web search: use it at most once in the conversation, only when current market demand would change "
    "your suggestion, and say in one line what you found."
)


def _profile_lines(profile: ProfileContext) -> str:
    fields = {
        "Name": profile.full_name,
        "Country": profile.country,
        "Age range": profile.age_range,
        "Current status": profile.current_status,
        "Profession": profile.profession,
        "Years of experience": profile.years_of_experience,
        "Education": profile.education,
        "Certifications": ", ".join(profile.certifications) or None,
        "Skills they listed": ", ".join(profile.skills) or None,
        "Hobbies": ", ".join(profile.hobbies) or None,
        "Professional summary": profile.professional_summary,
    }
    lines = [f"- {label}: {value}" for label, value in fields.items() if value not in (None, "")]
    return "\n".join(lines) if lines else "- Nothing yet."


def _conversation(request: AstaRequest) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for turn in request.messages:
        if turn.role == "user":
            messages.append(HumanMessage(turn.content))
            continue
        content = turn.content
        if turn.goal_summary is not None:
            content += f"\n\n[Summary card shown to the user: {json.dumps(turn.goal_summary.model_dump())}]"
        messages.append(AIMessage(content.strip()))
    return messages


def extraction_messages(request: AstaRequest, today: date | None = None) -> list[BaseMessage]:
    system = _EXTRACT.format(today=(today or date.today()).isoformat(), profile=_profile_lines(request.profile))
    transcript = "\n".join(
        f"{'User' if isinstance(m, HumanMessage) else 'Asta'}: {m.content}" for m in _conversation(request)
    )
    return [SystemMessage(system), HumanMessage(f"Conversation:\n{transcript}")]


def chat_messages(
    request: AstaRequest, draft: GoalDraft, *, web_search: bool, today: date | None = None
) -> list[BaseMessage]:
    missing = draft.missing()
    system = _CHAT.format(
        missing="; ".join(missing) if missing else "nothing; answer the user's question briefly. The summary card appears right after your reply, so don't summarise.",
        search=_SEARCH_HINT if web_search else "",
        today=(today or date.today()).isoformat(),
        profile=_profile_lines(request.profile),
    )
    return [SystemMessage(system), *_conversation(request)]
