---
format: 1920x1080
duration: 25s
message: "learner.io checks what you already know, then plans only the gap."
arc: Problem → Goal → Check → Gap plan → Promise
audience: Self-directed learners and career-switchers tired of one-size roadmaps
mode: autonomous
music: "calm warm gentle uplifting acoustic"
---

## Video direction

Calm, confident product promo on the app's light sage palette (canvas #f5f7f6, surface #fff,
primary #2a7360, primary-soft #dcefe8, ink #1b2623). Bricolage Grotesque 600 for display, Inter for
UI. UI moments are rebuilt from the app's own components at ~2x scale: rounded-3xl cards, 1px
#dde4e1 borders, soft green-tinted shadow. Motion: expo/power3 eases, 0.5–0.8s entrances, reveals
paced across each frame, one slow camera drift per frame (scale 1 → 1.03). Every frame carries a
small step label top-left ("1 · Tell Asta your goal") as the system spine. Content stays above
y = 900. Silent: no narration, no music.

## Frame 1 — Same steps for everyone

- scene: A wall of identical grey "Step N" chips cascades in; the counter reads 40 steps
- duration: 4s
- poster: 3s
- transition_in: cut
- status: animated
- src: compositions/frames/01-hook.html

Scene 1 (0.0–1.4s): headline "Every roadmap starts at step one." types in word by word, centred-left.
Scene 2 (0.6–3.0s): a 10×4 grid of identical muted chips "Step 1 … Step 40" waterfalls in on the right,
row by row. Scene 3 (2.6–4.0s): a big "40" count-up badge lands; the chips dim to 50% to say "too much".

## Frame 2 — Tell Asta your goal

- scene: Asta chat: two quick exchanges, then the goal summary card pops in
- duration: 5.5s
- poster: 5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-asta.html

Scene 1 (0.0–0.6s): label "1 · Tell Asta your goal"; chat panel slides up. Scene 2 (0.5–3.2s):
bubbles arrive one by one — you: "I want to become a data analyst." Asta (sprout avatar, typing
dots first): "Nice. Hours per week, and what do you already use?" you: "About 6. I'm solid in SQL."
Scene 3 (3.4–5.5s): the goal card springs in on the right — "Data analyst in 4 months", chips
"6 hrs / week", "4 skills to check", button "Confirm goal".

## Frame 3 — Check what you know

- scene: Self-rating dots fill per skill, then one skill-check question gets answered correctly
- duration: 5.5s
- poster: 5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/03-check.html

Scene 1 (0.0–2.4s): label "2 · Check what you know"; a "Rate yourself" card lists SQL, Python for data,
Statistics, Power BI; 1–5 dots fill left to right per row (4, 3, 1, 0). Scene 2 (2.0–4.6s): a
"Skill check · SQL" question card slides in: "Which clause filters grouped rows?" options WHERE /
HAVING / ORDER BY; a cursor-free highlight selects HAVING, it turns green with a check. Scene 3
(4.6–5.5s): a small "Level confirmed: 4" chip lands.

## Frame 4 — A plan for the gap only

- scene: The SkillGap card fills (known solid, gap hatched, goal markers), then three plan phases stack in
- duration: 5.5s
- poster: 5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-gap.html

Scene 1 (0.0–2.6s): label "3 · Get a plan for the gap"; the hero SkillGap card (as on the landing
page): SQL 4/4 "Skip", Python 3/4 "Refresh · 1 wk", Statistics 1/3 "Focus · 3 wks", Power BI 0/3
"Focus · 2 wks"; solid bars grow, hatched gaps extend, goal ticks drop in. Scene 2 (2.6–5.5s): a
plan column on the right stacks three phases with week ranges; SQL is shown struck through as
"Skipped — you know this".

## Frame 5 — Skip what you know

- scene: The stepping-stone illustration builds stone by stone, a sprout grows, the tagline and logo land
- duration: 4.5s
- poster: 4.2s
- transition_in: crossfade
- status: animated
- src: compositions/frames/05-close.html

Scene 1 (0.0–2.0s): the gap-path illustration fills the frame; solid stones pop in lower-left to
upper-right, hatched stones follow fainter, the sprout scales up from the soil. Scene 2 (1.4–3.2s):
"Skip what you know." then "Learn what you don't." (primary) rise in, top-left over the sky.
Scene 3 (3.0–4.5s): logo lockup "learner.io" and "Build your plan" pill settle; hold.
