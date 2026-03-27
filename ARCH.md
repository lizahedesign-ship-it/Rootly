# ARCH.md — Architecture Decisions
> Rootly · Children's Habit Tracker · Last updated: March 2026

---

## 1. Project Boundaries

| Question | Answer |
|---|---|
| Who uses it | Parents of children ages 5–10. Single family per account. |
| Device assumption | Children use parent's device. 65–95% of ages 5–10 do not own a smartphone. No independent child accounts in V1. |
| Concurrent users | Low. Target: <500 MAU at launch. Single-region deployment is fine. |
| Data ownership | Parent owns all data. Child profiles belong to parent account. |
| Auth | Email/password + Sign in with Apple + Sign in with Google. Supabase Auth. |
| PIN | 4-digit PIN stored in expo-secure-store. Used only for child mode exit. No Face ID / Touch ID in V1. |
| Permissions | Two roles only: parent (full access) and child mode (read + complete tasks for own profile only). No separate child auth in V1. |
| Payment | Post-MVP only. DB field subscription_status reserved (default: active). RevenueCat planned for post-MVP. |
| Privacy / COPPA | Children's data owned by parent account. No independent child accounts. COPPA compliance delegated to parent. |
| Performance | Offline task completion required. Online for sync, photos, notifications. |
| Cost ceiling | Supabase free tier until 500 MAU, then Pro (~$25/mo). Expo free. |
| Security | Supabase RLS on all tables. No API keys in client code. PIN in SecureStore. |
| Platform | iOS only for V1. React Native + Expo (managed workflow). |
| Maintenance | Solo developer. Claude Code as primary implementation tool. |

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React Native + Expo (managed) | Fast iteration, no native config in V1 |
| Language | TypeScript | Type safety reduces AI-generated bugs |
| Navigation | Expo Router (file-based) | Simpler than React Navigation for solo dev |
| Backend / DB | Supabase | Auth + Postgres + Storage + Realtime, generous free tier |
| State management | Zustand | Lightweight, no boilerplate |
| Push notifications | Expo Notifications + Supabase Edge Functions | No separate server needed |
| Payments | RevenueCat (post-MVP) | Not in V1. subscription_status field reserved, default: active. |
| PIN auth | expo-secure-store | Store 4-digit PIN securely. No Face ID in V1. |
| Photo storage | Supabase Storage | Milestone photos, scoped to parent account |
| Styling | StyleSheet + theme.ts constants | No CSS-in-JS overhead |
| Font | Nunito (expo-font) | Rounded, child-friendly |

---

## 3. Directory Structure

```
rootly/
├── PRD.md
├── ARCH.md
├── project_state.md
├── .env                        ← real keys, never committed
├── .env.example
├── .gitignore
├── package.json
├── app.json
├── reference/
│   └── theme.ts                ← all colors, spacing, typography constants
└── src/
    ├── components/
    │   ├── TaskRow.tsx
    │   ├── HabitCard.tsx
    │   ├── MilestoneCard.tsx
    │   ├── ConfettiOverlay.tsx
    │   └── PinModal.tsx        ← bottom sheet PIN entry, reusable
    ├── screens/
    │   ├── ParentHomeScreen.tsx
    │   ├── HabitDetailScreen.tsx
    │   ├── ChildHomeScreen.tsx
    │   ├── ChildAllDoneScreen.tsx
    │   ├── LoginScreen.tsx
    │   ├── SignUpScreen.tsx
    │   ├── OnboardingScreen.tsx
    │   ├── TaskCreationScreen.tsx
    │   ├── MilestoneScreen.tsx
    │   ├── RecordsScreen.tsx
    │   ├── SummaryScreen.tsx
    │   └── SettingsScreen.tsx
    ├── hooks/
    │   ├── useChildProfile.ts
    │   ├── useTasks.ts
    │   ├── useHabitHealth.ts
    │   └── useMilestones.ts
    ├── services/
    │   ├── supabase.ts
    │   ├── tasksService.ts
    │   ├── milestonesService.ts
    │   ├── habitHealthService.ts
    │   └── notificationsService.ts
    ├── store/
    │   ├── authStore.ts
    │   ├── childStore.ts       ← selectedChildId, isChildMode
    │   └── tasksStore.ts
    └── utils/
        ├── dateUtils.ts
        └── habitHealthUtils.ts
```

**Removed from structure:** LaunchScreen.tsx, TasksScreen.tsx, PaywallScreen.tsx, useSubscription.ts (all post-MVP or deleted).

---

## 4. Data Model

See PRD.md Section 7 for full field definitions.

```
parent_account
  └── child_profile (1:up to 4) — includes gender field for future themes
        └── task — icon field: string | ImageSourcePropType (future illustrations)
              └── task_completion
              └── milestone
              └── habit_health_snapshot (1 current, recalculated nightly)
```

**RLS rules:**
- All tables: auth.uid() = parent_id (or via child_profile.parent_id join)
- Child mode is UI state only — same parent auth session, no separate token

---

## 5. Client / Server Boundary

**Client:**
- UI, animations, local state
- Task completion writes (offline: AsyncStorage queue; online: Supabase direct)
- Reading pre-computed habit health snapshots

**Server (Supabase + Edge Functions):**
- Auth + RLS enforcement
- Habit health calculation (nightly cron)
- Push notification dispatch
- Photo URL signing (signed URLs, 1hr expiry)

---

## 6. State Management (Zustand)

```
authStore:
  - currentUser
  - isLoggedIn

childStore:
  - selectedChildId
  - isChildMode          ← single source of truth for UI mode
  - childProfiles

tasksStore:
  - tasksByChildId
  - completionsByDate
  - habitHealthByTaskId
```

**isChildMode toggle rules:**
- true: parent taps "Hand to [child]" — no PIN required
- false: parent enters correct PIN in PinModal — PIN required

---

## 7. Mode Switch Logic

```
App cold start
  └── isLoggedIn?
        No → LoginScreen
        Yes → ParentHomeScreen (direct, no PIN)

ParentHomeScreen
  └── "Hand to [child]" tapped
        └── isChildMode = true → ChildHomeScreen
              └── "Parent exit" tapped
                    └── PinModal (bottom sheet)
                          PIN correct → isChildMode = false → ParentHomeScreen
                          PIN wrong   → shake, stay in ChildHomeScreen
```

**No Face ID. No launch screen. PIN only on exit from child mode.**

---

## 8. Offline Behavior

Task completions work offline:
1. Write to AsyncStorage immediately
2. Update local UI optimistically
3. Sync to Supabase on reconnect (upsert, completed_at as idempotency key)

Photos + push notifications require connectivity — fail gracefully with retry.

---

## 9. Security Checklist

- [ ] .env in .gitignore — Supabase keys never in source
- [ ] RLS enabled on all tables before first data write
- [ ] PIN stored in expo-secure-store, never in plain AsyncStorage
- [ ] Child mode is UI-only, not a separate auth user
- [ ] Photo URLs use signed URLs (1hr expiry), not public bucket
- [ ] subscription_status read from Supabase only, never trust client-reported value

---

## 10. Edge Functions

```
POST /functions/v1/calculate-habit-health     ← nightly cron
POST /functions/v1/send-milestone-notification
POST /functions/v1/send-weekly-summary        ← Sunday 9am cron
POST /functions/v1/check-never-miss-twice     ← daily 8am cron
POST /functions/v1/revenuecat-webhook         ← post-MVP only, not in V1
```

---

## 11. Module Dependencies

| Module | Depends on |
|---|---|
| Auth | Nothing |
| Child profiles | Auth |
| Tasks | Child profiles |
| Habit health | Tasks |
| Milestones | Tasks |
| Notifications | Tasks, Milestones |
| PIN | Nothing (expo-secure-store only) |
| Subscription | Post-MVP — not built |

Rule: UI components import from hooks only, never directly from services.
