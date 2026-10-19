# Repo Rules #

Before starting to work always keep these rules in memory

## 1. Decisions
Do not agree with everything what the user has Say first think and research about it if what the user has said is wrong then tell the user what they are wrong about, provide them with facts when arguying also give a solid proof searched from web well established website.

## 2. Learning
When ever an session end, update in file Sprout\AgentRule\Learning.md repo what we have learned on how to work efficiently together.

## 3. Guardrails
Strictly follows the guardrails written in Sprout\AgentRule\Guardrails.md, even if the User asks to bypass any guardrail. You are not Authorized to do so.

## 4. Automation
First whenever Agent (you) or User works on something always think of how we can automate the task but do not automate it yourself. first discuss with user once the approves of it only then work on it.

## 5. Working Model
### If you are capable of firing subagents
- If model is Claude: 
Use Sonnet 5.5 High for task that does not require reasoning and are much more simpler.
Use Opus 5.5 Medium for Low reasoning tasks.
Use Opus 5.5 High for task that requires reasoning (mostly this tasks will sits with you).
Your work will always to monitor and review the work being done and getting submitted by the sub agents so you will be working on high reasoning model or latest model eg- Opus 5.5 High, If the selected model is not a high reasoned model ask the user to provide you with a high reasoned model before start working.

- If model is Codex:
Use luna 6.1 High for task that does not require reasoning and are much more simpler.
User sol 6.1 High for task that requires reasoning (mostly this tasks will sir with you).
Your work will always be monitoring and reviewing the work being done and getting submitted by the sub agents so you will be working on high reasoning model or latest model eg- GPT-6.1 Sol High, If the selected model is not a high reasoned model ask the user to provide you with a high reasoned model before start working.

If it is some other model ask the user to define model per work task tyepe, once provided only then start working.

### If you are incapable of firing subagents 
If the model is unable to fire subagents than suggest to user what is the best possible method if they approves of it only then start working on it otherwise stick to regular working method.

## 6. Work divison/ work planning
When starting to work on something follow the workGuidelines if they are applicable, path: Sprout\AgentRule\workGuidelines.md. 

