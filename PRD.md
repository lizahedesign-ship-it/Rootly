# PRD.md — Rootly: Children's Habit Tracker
> Version 5 · MVP scope only · Last updated: March 2026

---

## 1. Product Overview

**One-liner:** Help children ages 5–10 build self-managed habits, while giving parents a meaningful window into their child's growth — not a surveillance tool.

**Core philosophy:**
- The checkmark belongs to the child. Parents observe; they do not complete tasks on behalf of the child.
- Hide numbers from children. No streaks, no counters, no points. Completion is its own reward.
- Habits are measured by long-term health, not daily snapshots.
- Missing a day is fine. Missing two in a row is a signal worth a conversation.
- Past achievements are never deleted.

**Target user:** Parents of children ages 5–10 who share a parent's device. Research confirms 65–95% of children in this age range do not own a smartphone — the assumption that children use a parent's device is well-supported.

**Platform:** iOS first. React Native + Expo.

---

## 2. MVP Scope — What Is Included

### Included in V1
- Parent account: email, Apple ID, or Google login
- Up to 4 child profiles per parent account. Each profile includes: name, age, gender (Boy / Girl / Other — reserved for future theme personalization)
- App opens directly to parent home — no launch screen
- Mode switch: parent home → "Hand to [child]" button → child mode (no PIN on entry). Exit child mode via PIN modal (bottom sheet, 4-digit). PIN is set by parent during onboarding.
- Multi-child: top tab switcher on parent home. "Hand to [child]" button label updates to match selected tab.
- Task creation: 4-step co-creation flow (Name → Emoji → Category + Frequency → Commitment card). Child presses "Start!" to confirm.
- 6 task categories: Learning, Physical, Family, Interests, Character, Personal Growth
- Task frequency: Daily / Weekdays / Weekend / Custom days
- Task quantity guard: soft warning at 5 active tasks per child
- Daily task completion with checkmark animation + confetti
- Tap completed task to uncheck directly, shows toast confirmation
- Completion screen: "Great job today!" — no streak numbers shown to child
- Milestone animations: larger surprise animation at day 7, day 30, 100 completions — child sees no number, no explanation
- Habit health system: Sprouting → Growing → Rooted → Blooming (computed server-side nightly)
- Parent home: habit health cards with task emoji + stage text label. Sorted: Growing first (needs attention) → Sprouting → Rooted → Blooming last
- Habit detail: stage progress bar (Sprouting → Blooming), 3 signals with ❓ tooltips, pre-scripted stage insight, milestone section for that specific task
- Graduate a habit: Blooming-only. Removes from daily list, preserves all history.
- Milestone card: parent adds photo + text note, saved permanently
- Push notifications: milestone, weekly summary (Sunday), Never Miss Twice (day 2 only), annual summary (Dec 31)
- Records tab: milestone timeline with task emoji + photo thumbnails
- Annual summary: stats, 12-month bar chart, milestone timeline, PDF export
- Offline task completion with sync on reconnect
- Settings: notification preferences, PIN management, child profile editing

### NOT in V1 (explicitly excluded)
- No paywall or subscription gate — all features free in MVP (see Section 13 for post-MVP plan)
- No launch screen — app opens directly to parent home
- No Face ID / Touch ID — PIN only for parent authentication
- No independent child accounts (ages 11+)
- No cross-device sync for child's own phone
- No AI-generated copy of any kind
- No social sharing or public profiles
- No points, badges, streaks displayed to child
- No Android
- No web version
- No physical book ordering
- No grandparent accounts

---

## 3. User Flows

### 3.1 App entry (every session)
1. App opens → parent home directly (no launch screen, no PIN required)
2. If first launch → Onboarding flow (see 3.7)

### 3.2 Parent home → child mode
1. Parent selects child tab (Ethan / Lily / etc.)
2. Taps "Hand to [child]" button → child mode loads immediately, no PIN needed
3. Parent hands device to child

### 3.3 Child mode → parent mode (exit)
1. Child taps "Parent exit · PIN" at bottom of child home
2. PIN modal slides up from bottom (bottom sheet)
3. Parent enters 4-digit PIN → correct → child mode exits → parent home
4. Wrong PIN → shake animation, try again

### 3.4 Co-create a task (parent + child together)
1. Parent taps "+ Add a new task together" on parent home
2. Step 1: Name the habit — parent and child decide together
3. Step 2: Pick an emoji — child chooses from grid + search
4. Step 3: Pick category + frequency (Daily / Weekdays / Weekend / Custom)
5. Step 4: Commitment card — child taps "Start! 🚀" to confirm
6. Task created, appears in child's task list immediately

### 3.5 Daily child flow
1. Parent hands device to child (via "Hand to [child]" button)
2. Child sees task list with date + greeting
3. Taps circle → fills green + confetti burst
4. Tap completed task → immediately unchecked + toast shown
5. All tasks done → "All done!" celebration screen, no numbers shown
6. Milestone trigger (day 7 / 30 / 100): larger surprise animation, no number shown to child

### 3.6 Parent views habit health
1. Parent home shows cards sorted: Growing (yellow) first → Sprouting → Rooted → Blooming last
2. Tap card → habit detail: stage bar + 3 signals (with ❓) + insight + milestone section for that task
3. "Say to your child" copy at bottom

### 3.7 Onboarding (first launch only)
1. Screen 1: Philosophy — illustration + "This is your child's app"
2. Screen 2: Create child profile — name + age + gender
3. Screen 3: Co-create first task (calls child over — Step 1–4 of task creation)
4. Screen 4: Child taps "Start! 🚀" → celebration → enter parent home

### 3.8 Graduate a habit
1. Only visible on Blooming habits
2. Tap card → detail → "Graduate this habit 🎓"
3. Confirm dialog → removed from daily list, history preserved
4. Appears in Records tab under "Graduated 🎓" (dimmed). Can restore.

---

## 4. Screens (13 total)

| Screen | Description |
|--------|-------------|
| Parent Home | Child tab switcher, "Hand to [child]" button, habit health cards (worst→best), "+ Add task" |
| Habit Detail | Stage bar, 3 signals + ❓, stage insight, say-to-child, milestone section for this task |
| Child Home | Date + greeting, task circles, progress bar, "Parent exit · PIN" at bottom |
| Child All Done | "Great job today!" — standard version + milestone surprise version (dark green) |
| Login / Sign Up | Email + Apple ID + Google. Email requires verification. |
| Onboarding | 4 steps: illustration top + content bottom. First launch only. |
| PIN Modal | Bottom sheet over dimmed bg. 4-dot indicator + numpad. Used on child mode exit only. |
| Task Creation | 4 steps: Name → Emoji picker → Category + Frequency → Commitment card |
| Records | Milestone timeline with task emoji + photo thumbnails |
| Milestone Card | Trophy header, photo upload, text note, save |
| Annual Summary | Stats, 12-month bar chart, milestone list, PDF export |
| Settings | Notification toggles, PIN management, child profiles, account |
| Habit Graduate Dialog | Blooming-only. Confirms history preserved. |

---

## 5. Habit Health System

### Five stages
| Stage | Emoji | Label | Card bg |
|-------|-------|-------|---------|
| Sprouting | 🌱 | Sprouting · just started | neutral gray |
| Growing | 🌿 | Growing · needs attention | yellow (#FFF8E7) ← sorted first |
| Rooted | 🌳 | Rooted · almost there | light green |
| Blooming | 🌸 | Blooming · truly a habit | medium green |
| Graduated | 🎓 | Graduated | dimmed |

**Sort order on parent home: Growing → Sprouting → Rooted → Blooming → Graduated**
Rationale: parents should see habits needing attention first, not the ones already doing well.

### Three signals (shown in habit detail only)
- **Consistency rate** ❓: % of days completed over life of task. Never resets.
- **Recovery speed** ❓: avg days to complete after a miss. Shown only after 3+ miss events.
- **Trend** ❓: rising / flat / declining over past 4 weeks.

Each signal has a ❓ icon that shows a tooltip explaining what the number means.

### Stage insights — pre-scripted (NOT AI-generated in V1)
Three layers per stage: What's happening / What helps / Say to your child.
(Full copy in Section 8 of original PRD v4 — unchanged.)

---

## 6. Notifications

| Notification | Trigger | Max frequency |
|---|---|---|
| Milestone reached | Child hits day 7 / day 30 / 100 completions | Per milestone |
| Weekly summary | Every Sunday | Once per week |
| Never Miss Twice | Day 2 of consecutive miss only (not day 1) | Once per miss streak |
| Annual summary ready | December 31 | Once per year |

Never send daily reminders. Volume target: ~10–20 notifications per year total.
Milestone notifications cannot be turned off in Settings.

---

## 7. Data Fields

### Parent account
```
id, email, auth_provider (email | apple | google), created_at,
subscription_status (default: active — reserved for post-MVP paywall)
```

### Child profile
```
id, parent_id, name, age, gender (boy | girl | other),
avatar_emoji, created_at,
invite_code (reserved V2), linked_account_id (reserved V2)
```

### Task
```
id, child_id, name, icon (string | ImageSourcePropType — supports future illustrations),
category (learning | physical | family | interests | character | growth),
frequency (daily | weekdays | weekends | custom), custom_days (array),
reminder_time (optional), created_at, is_active, is_graduated, graduated_at
```

### Task completion
```
id, task_id, child_id, completed_at (date YYYY-MM-DD), created_at
```

### Milestone
```
id, task_id, child_id, type (streak_7 | streak_30 | count_100),
triggered_at, photo_url (optional), parent_note (optional), created_at
```

### Habit health snapshot
```
id, task_id, computed_at, stage (sprouting | growing | rooted | blooming),
consistency_rate, avg_recovery_days, trend (up | flat | down)
```

---

## 8. Acceptance Criteria

| Feature | Done when... |
|---|---|
| App opens to parent home | No launch screen, no PIN on cold start |
| Hand to child | Tapping button enters child mode immediately, no auth |
| Child mode lock | Child cannot exit without correct PIN |
| PIN modal | Slides up from bottom as sheet, numpad visible, 4 dots fill as typed |
| Checkmark | Tap completes task, circle fills green + animation + confetti |
| Tap to uncheck | Tap completed task → immediately unchecked, toast appears |
| All done screen | Fires only when all active tasks completed for that day |
| Milestone animation | Day 7/30/100 triggers visibly different larger animation, no number shown |
| Habit sort | Growing cards always appear first on parent home |
| ❓ tooltips | Tapping ❓ on each signal shows plain-language explanation |
| Task creation order | Name → Emoji → Category + Frequency → Commitment → child presses Start |
| Milestone in detail | Each habit detail shows achieved milestones + next upcoming milestone |
| Multi-child | Tab switch updates all content + Hand to button label |
| Gender field | Saved on child profile, no UI impact in V1 |
| Graduate | Blooming-only. Removes from child list. History preserved. Restorable. |
| PDF export | Annual summary as readable PDF with name, year, stats, milestones |

---

## 9. Error States

| Situation | Display |
|---|---|
| No tasks created | Child mode: "No tasks yet — ask a parent to set some up!" |
| All tasks graduated | Child mode: "All habits graduated! Talk to a parent about new ones." |
| No internet | Offline task completion works. Syncs on reconnect. |
| Photo upload fails | "Couldn't save photo. Tap to retry." — text note saved regardless |
| Wrong PIN | Shake animation. No lockout in V1. |

---

## 10. What We Are NOT Building in V1

- No paywall or subscription gate
- No launch screen
- No Face ID / Touch ID (PIN only)
- No independent child login
- No AI-generated copy
- No social sharing
- No gamification shown to child
- No Android / web
- No grandparent accounts

---

## 11. User Journeys Summary

| # | Journey | Frequency |
|---|---|---|
| J1 | Parent registration + Onboarding | Once |
| J2 | Parent opens app + views habit health | Daily/weekly |
| J3 | Parent creates new task | Occasional |
| J4 | Parent receives notification → acts | Triggered |
| J5 | Parent graduates a habit | Rare |
| J6 | Annual summary + PDF export | Yearly |
| J8 | Child completes daily tasks | Daily |
| J9 | Parent ↔ child mode switch | Daily |
| J10 | Parent + child co-create task | Occasional |

J7 (Paywall) deferred to post-MVP.

---

## 12. V2 Considerations (not in scope now)

- Independent child accounts for ages 11+ (research shows 11 is the smartphone ownership inflection point)
- AI-personalized "Say to your child" copy
- Grandparent read-only view
- Illustrations replacing emoji (architecture already prepared: icon field uses ImageSourcePropType)
- Gender-based themes
- Physical growth book printing
- Android

---

## 13. Pricing Strategy (Post-MVP)

Paywall deferred. MVP ships free to all TestFlight users.

**Post-MVP pricing (planned, not built):**
- Single child: $49.99/yr or $5.99/mo
- Family (up to 4 children): $69.99/yr or $7.99/mo
- Early bird (first 100 users): single $29.99 / family $49.99
- 30-day free trial, triggered after first milestone

**When to add paywall:**
- 7-day retention ≥ 50%
- ≥ 20 active families
- Average usage ≥ 4 weeks

DB field `subscription_status` reserved (default: active). No schema migration needed when paywall is added.
