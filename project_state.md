# project_state.md
> Update this file before every git commit. AI reads this at the start of every session.

---

## Current Stage
**Active development — Slice 19 next (TestFlight)**

Done: PRD v5, ARCH.md, theme.ts, project_state.md, wireframes (all 13 screens), user journey map (J1–J10), mode switch flow, design system, Slice 1 (scaffold), Slice 2 (Supabase schema + RLS), Slice 3 (Auth), Slice 4 (Child profile), Slice 5 (Mode switch), Slice 6 (Child home: task list, checkmark animation, long-press uncheck, progress bar), Slice 7 (All done screen + milestone animation), Slice 8 (Task creation: 4-step flow), Slice 9 (Parent home: habit health cards — sorted Growing→Sprouting→Rooted→Blooming, HabitCard component, useHabitHealth hook, placeholder habit detail page), Slice 10 (Habit detail: stage progress bar, 3 signals + ❓ tooltips, pre-scripted insights, say-to-child, milestone section), Slice 11 (Habit health Edge Function: nightly cron, snapshot table), Slice 12 (Milestone card: photo upload, text note, Supabase Storage, signed URLs — habit-detail milestone rows tap to open card), Slice 13 (Notifications: push token registration, milestone push, Never Miss Twice day 2 only, weekly summary Sunday — 3 Edge Functions deployed), Slice 14 (Graduate habit: blooming-only button, confirmation dialog, graduated section on home, restore), Slice 15 (Summary screens: weekly/monthly/annual stats + bar chart — no PDF export), Slice 16 (Onboarding: 3-screen philosophy flow, AsyncStorage gate in index.tsx, gestureEnabled: false in _layout.tsx, push to create-profile on complete/skip), Slice 17 (Settings: notification toggles, PIN management, child profile editing + delete with PIN verification and cascade delete), Slice 18 (Offline sync: AsyncStorage cache for tasks + completions, offline queue with flush on reconnect), Records tab (milestone timeline: child selector, newest-first list, emoji+label+habit+date+photo thumbnail, signed URL generation, useFocusEffect reload, empty state, taps to milestone card)
Next: Slice 19 (TestFlight: app.json, eas.json, bundle ID, icons, screenshots)

---

## Development Slices

| # | Slice | Journey | Status |
|---|---|---|---|
| 1 | Project scaffold: Expo init, folder structure, Supabase connection, theme.ts wired | All | ✅ Done |
| 2 | Supabase schema + RLS: all tables, RLS policies, subscription_status + gender fields reserved | All | ✅ Done |
| 3 | Auth: sign up / login (email + Apple ID + Google), email verification state, session expiry handling | J1, J2 | ✅ Done |
| 4 | Child profile: create, store, gender field, tab switcher on parent home | J1, J9 | ✅ Done |
| 5 | Mode switch: "Hand to [child]" button on parent home, PIN setup + storage (expo-secure-store), PIN modal (bottom sheet) on child mode exit | J9, J8 | ✅ Done |
| 6 | Child home screen: task list, checkmark animation, long-press uncheck (0.65s), progress bar, date + greeting | J8 | ✅ Done |
| 7 | All done screen + milestone animation: standard vs special (day 7/30/100), milestone table write | J8 | ✅ Done |
| 8 | Task creation: 4-step flow (Name → Emoji picker → Category + Frequency → Commitment), quantity guard at 5 | J3, J10 | ✅ Done |
| 9 | Parent home: habit health cards with task emoji + stage text, sorted Growing→Sprouting→Rooted→Blooming, "+ Add task" entry | J2 | ✅ Complete |
| 10 | Habit detail: stage progress bar, 3 signals + ❓ tooltips, pre-scripted insights, say-to-child, milestone section for this task | J2 | ✅ Complete |
| 11 | Habit health Edge Function: nightly cron, snapshot table | J2 | ✅ Complete |
| 12 | Milestone card: photo upload, text note, Supabase Storage, signed URLs | J4 | ✅ Complete |
| 13 | Notifications: push token, milestone push, Never Miss Twice day 2 only, weekly summary Sunday | J4 | ✅ Complete |
| 14 | Graduate habit: Blooming-only entry, dialog, graduated section in Records, restore | J5 | ✅ Complete |
| 15 | Summary screens: weekly/monthly/annual stats + bar chart (PDF export moved to V2) | J6 | ✅ Complete |
| 16 | Onboarding: 4 screens (illustration + content layout), first-time gate, philosophy → profile → co-create → enter | J1 | ✅ Complete |
| 17 | Settings: notification toggles (milestone non-dismissable), PIN management, child profile editing + delete (PIN-verified, cascade) | J2 | ✅ Complete |
| 18 | Offline sync: AsyncStorage queue for completions, sync on reconnect | J8 | ✅ Complete |
| 19 | TestFlight: app.json, eas.json, bundle ID, icons, screenshots | — | ⬜ Not started |

**Paywall / subscription NOT in MVP.**

---

## Known Issues
- `npm install` requires `--legacy-peer-deps` due to react-dom@19.2.4 peer dep conflict with react@19.2.0.
- Tab strip `View` needs `paddingBottom: 12`; `bottomActions` needs `paddingTop: 12` (spacing fix, not yet applied).
- Slice 13 cron jobs (`check-never-miss-twice`, `send-weekly-summary`) are deployed but cron schedules must be registered manually in Supabase Dashboard → Edge Functions → Schedule before going live. Verify this before TestFlight.
- Onboarding swipe-back gesture (`gestureEnabled: false`) cannot be fully disabled in Expo Go — verify it is suppressed in a development build before TestFlight.
- Records tab does not show "Graduated 🎓" section (PRD §3.8) — graduated habits are currently shown on Home only; Records tab shows milestone timeline only.
- Onboarding changed from 4 screens to 3 screens (PRD §3.7) — intentional decision; philosophy/illustration screen kept, profile creation and task co-creation flow happen post-onboarding.

---

## Next Step
Start Slice 19 (TestFlight: app.json, eas.json, bundle ID, icons, screenshots).

---

## Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Mar 2026 | iOS only for V1 | Reduce scope, validate before Android |
| Mar 2026 | No independent child accounts in V1 | Eliminates COPPA complexity. Research: 65–95% of ages 5–10 don't own smartphones. |
| Mar 2026 | Pre-scripted stage insights, not AI | More reliable; AI personalization in V2 |
| Mar 2026 | Zustand over Redux | Less boilerplate, sufficient for MVP |
| Mar 2026 | Expo managed workflow | No native config until V2 |
| Mar 2026 | Long-press to uncheck (0.65s) | Deliberate friction; checkmark ownership belongs to child |
| Mar 2026 | No streak numbers shown to child | Avoids anxiety; surprise milestone animations instead |
| Mar 2026 | Habit health computed server-side nightly | Consistent calculation, no client drift |
| Mar 2026 | No paywall in MVP | Validate PMF first. Add post-MVP when: 7-day retention ≥50%, ≥20 families, ≥4 weeks usage. DB field reserved (default: active). |
| Mar 2026 | No launch screen | App opens directly to parent home. Children use parent's device — no need for child-selection entry screen. |
| Mar 2026 | PIN only, no Face ID | Simpler, consistent across all devices. PIN stored in expo-secure-store. |
| Mar 2026 | PIN only on exit from child mode | Entry (parent→child) needs no PIN — parent is handing the device deliberately. Exit (child→parent) needs PIN — prevents child from bypassing. |
| Mar 2026 | Google login added | Alongside email + Apple ID |
| Mar 2026 | Gender field on child profile | Boy / Girl / Other. No UI impact in V1. Reserved for theme personalization in V2. |
| Mar 2026 | Habit sort: Growing first | Parents should see problems first, not achievements. Growing (yellow) → Sprouting → Rooted → Blooming. |
| Mar 2026 | Tasks tab removed | "Add task" entry on parent home. Reduces nav complexity. Tab bar: Home / Records / Summary / Settings. |
| Mar 2026 | Task creation order: Name → Emoji → Category+Freq → Commitment | Name first (child engagement). Emoji second (child picks icon — ownership). Category+freq third (parent-led). Commitment last (child presses Start). |
| Mar 2026 | ❓ tooltips on habit signals | Consistency / Recovery / Trending are not intuitive. Tooltip on each explains in plain language. |
| Mar 2026 | Milestone section in habit detail | Parents can see per-task milestone history without going to Records tab. |
| Mar 2026 | theme.ts: icon field (renamed from emoji) | Type: string | ImageSourcePropType. Allows illustrations to replace emojis in V2 without component changes. |
| Mar 2026 | Slice 4 (child profile) before Slice 5 (mode switch) | Mode switch depends on profiles existing |
| Mar 2026 | Hand to [child] button label updates with tab | Multi-child: button always shows current child's name. No extra selection step needed. |
| May 2026 | Store storage path (not signed URL) in milestone.photo_url | Signed URLs expire in 1hr. Path is permanent; screen generates a fresh signed URL on load via createSignedUrl(). |
| May 2026 | milestone-photos bucket must be created manually in Supabase Dashboard | Private bucket. RLS: INSERT/SELECT allowed where (storage.foldername(name))[1] = auth.uid()::text. |
| May 2026 | Camera-library only for milestone photos (no camera capture) | Milestones are past events; parents add a memory photo from their roll, not a live shot. |
| May 2026 | expo-file-system/legacy import required for SDK 54 | expo-file-system v19 (SDK 54) deprecates readAsStringAsync at the top-level import. Must use `import * as FileSystem from 'expo-file-system/legacy'` for base64 file reading. Using the standard import throws at runtime even though TypeScript compiles fine. |
