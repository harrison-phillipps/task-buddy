# TaskBuddy — Architecture Overview

A gamified productivity app built on Base44 (React + Deno backend functions).

---

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query
- **Backend**: Deno (Base44 backend functions) — all in `functions/`
- **Database**: Base44 entities — schemas in `entities/`
- **Auth**: Base44 built-in auth (`base44.auth.me()`)
- **Payments**: Stripe (Live mode) — `functions/createCheckout.js`, `functions/stripeWebhook.js`
- **Push notifications**: VAPID web push — `functions/sendPushNotification.js`

---

## Routing
Routes are defined in two places:
- `pages.config.js` — lazy-loads all pages and exports `pagesConfig` (used by `App.jsx`)
- `App.jsx` — wraps routes in `AuthProvider`, `QueryClientProvider`, and `Layout`

Main page: `Dashboard` (route `/`)

---

## Key Directories

| Path | Purpose |
|------|---------|
| `pages/` | Top-level route components (one file per page) |
| `components/` | Reusable UI components |
| `components/ai/` | AI-powered components (LLM calls go here or in backend functions) |
| `components/dashboard/` | Dashboard-specific widgets |
| `components/companion/` | Virtual companion personality/archetype components |
| `components/habits/` | Habit tracking UI |
| `components/tasks/` | Task-specific components |
| `components/analytics/` | Charts and reporting UI |
| `components/subscription/` | Feature gating and upgrade prompts |
| `functions/` | Deno backend functions (HTTP handlers) |
| `entities/` | JSON schemas for all data entities |
| `lib/` | Shared utilities: AuthContext, query-client, app-params |
| `hooks/` | Custom React hooks |
| `api/` | Base44 SDK client initialisation |

---

## Entities (Database)

| Entity | Purpose |
|--------|---------|
| `Task` | Core task with subtasks, recurrence, assignments |
| `FocusSession` | Recorded focus sessions (duration, mood, technique) |
| `ActiveSession` | Live timer state — synced across devices |
| `UserProgress` | Gamification: points, level, streaks, AI cache |
| `Habit` / `HabitCompletion` | Habit tracking |
| `WinsJournal` | Daily wins & mood entries |
| `Goal` | OKR-style goals linked to tasks |
| `CalendarEvent` | Local calendar events + synced external events |
| `Team` / `TeamMessage` / `TaskComment` / `TaskActivity` | Collaboration |
| `Notification` / `NotificationPreferences` | In-app and email notifications |
| `BrainDump` | AI-organised brain dump sessions |
| `CompanionLearning` / `CompanionFeedback` | Companion personality learning |
| `Leaderboard` | Weekly/monthly points ranking |

---

## Backend Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `createCheckout` | User action | Stripe checkout session |
| `stripeWebhook` | Stripe webhook | Handle payment events, update subscription |
| `cancelSubscription` | User action | Cancel Stripe subscription |
| `getSubscriptionStatus` | User action | Check active subscription |
| `analyzeTaskHistory` | User action | AI analysis of task patterns (cached in UserProgress) |
| `estimateTaskTime` | User action | LLM time estimate for a task |
| `dailyTaskDigest` | Scheduled 7am | Morning email digest (respects email_digest pref) |
| `sendDeadlineReminders` | Scheduled daily | Task deadline notifications (respects email_digest pref) |
| `sendUpcomingTaskReminders` | Scheduled ~5 min | 30-min-before reminders for today's tasks |
| `smartTaskNudge` | Scheduled | Nudge during free calendar slots |
| `recurringTaskHandler` | Scheduled daily | Create next occurrences for recurring tasks |
| `pushTaskToCalendar` | User action | Sync task to Google Calendar or Outlook |
| `syncTaskToGoogleCalendar` | User action | Direct Google Calendar sync |
| `syncTaskToOutlook` | User action | Direct Outlook sync |
| `fetchCalendarEvents` | User action | Pull events from Google Calendar |
| `fetchOutlookCalendarEvents` | User action | Pull events from Outlook |
| `syncCalendarToTasks` | User action | Import calendar events as tasks |
| `findCalendarGaps` | User action | Find free time slots in calendar |
| `syncGoalsToGoogleTasks` | User action | Sync goals to Google Tasks |
| `suggestTaskDueDate` | User action | Rule-based due date suggestion (no LLM) |
| `sendPushNotification` | Called internally | Send VAPID push notification |
| `getVapidPublicKey` | User action | Return VAPID public key for push subscription |
| `verifyMobileReceipt` | User action | Verify iOS/Android in-app purchase receipt |

---

## Subscription Tiers
Defined in `components/subscription/FeatureGate.jsx`.

| Tier | Products |
|------|---------|
| free | Limited features |
| pro | TaskBuddy Pro ($9.99/mo or $99/yr) |
| premium | TaskBuddy Premium ($19.99/mo or $199/yr) |

Feature access is checked via `hasFeatureAccess(user.subscription_tier, featureKey)`.

---

## Integration Credits — Cost Awareness
These operations consume Base44 integration credits:

- **High cost**: `analyzeTaskHistory` (3 LLM calls, cached after 5+ new completions)
- **Medium**: `estimateTaskTime`, `CompanionAI.generateCompanionMessage` (10min cache, 1hr for dashboard)
- **Per-user daily**: `dailyTaskDigest` (1 email per user, respects `email_digest` pref)
- **Low**: `sendDeadlineReminders`, `sendUpcomingTaskReminders` (notifications only, emails gated)

Always check `NotificationPreferences.email_digest !== 'none'` before sending emails.

---

## Virtual Companion
The companion system has multiple layers:
1. **Character**: `VirtualCompanion.jsx` — renders the animated SVG (robot, cat, dog, orb)
2. **Sync messages**: `companionUtils.jsx` — `getPersonalizedMessage()` returns a static string based on user progress
3. **AI messages**: `CompanionAI.jsx` — `generateCompanionMessage()` calls LLM with 10min cache (1hr for dashboard)
4. **Adaptive AI**: `components/companion/AdaptiveCompanionAI.jsx` — deep personality learning

> `getPersonalizedMessage` is synchronous. All async AI enhancement is handled by `AdaptiveCompanionAI`.

---

## Calendar Integrations
- **Shared connectors** (builder's account): Google Calendar, Outlook — used in `smartTaskNudge` for free-slot detection
- **App-user connectors**: Google Calendar (`id: 6a151dfbeaf22801484e7f38`), Outlook (`id: 6a151e40ac02426e22891765`), Google Tasks (`id: 6a151e1a747800c818af2da4`)

---

## Environment Variables / Secrets
| Secret | Used by |
|--------|---------|
| `STRIPE_SECRET_KEY` | Stripe backend functions |
| `STRIPE_PUBLISHABLE_KEY` | Frontend Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | `stripeWebhook.js` signature verification |
| `VAPID_PUBLIC_KEY` | Push notification subscription |
| `VAPID_PRIVATE_KEY` | `sendPushNotification.js` |
| `VAPID_SUBJECT` | `sendPushNotification.js` |