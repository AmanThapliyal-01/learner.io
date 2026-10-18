---
workflow: product-launch-video
flow: automation
storyboard: no
message: "learner.io checks what you already know, then plans only the gap."
destination: landing-embed
aspect: 1920x1080
language: en
audience: "Self-directed learners and career-switchers tired of one-size roadmaps"
length: 25s
angle: problem-solution
---

## Intent

A ~25s promo for the learner.io landing page and socials (sell, not a site tour). Story: generic
roadmaps start everyone at step one -> tell Asta your goal -> rate yourself, take a short skill
check -> the planner builds a plan for only the gap -> "Skip what you know. Learn what you don't."
Calm, confident, warm; sage palette from the app's tokens, comfortable on the eyes. Decided
autonomously (the user delegated creative direction).

## Assets

- ../../../web/public/assets/illustrations/gap-path.svg — brand illustration (solid stones = known, hatched = gap, sprout = goal); opening/closing scene.
- ../../../web/public/assets/illustrations/sprout-chat.svg — seedling + typing bubble; Asta beat.
- Landing page captured from the local dev server (http://127.0.0.1:5173).

## Customizations

- UI moments (Asta chat, self-rating, skill-gap bars, plan phases) are rebuilt in HTML from the app's own components and copy, since the signed-in screens need a running backend.

## Notes

- Silent: no HeyGen sign-in and no local TTS/music engines on this machine. Music can be added later.
- No people, no stock footage. Bricolage Grotesque for display, Inter for body.
