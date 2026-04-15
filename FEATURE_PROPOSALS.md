# SpiritAmmo — Feature Proposals & Implementation Status

Based on a full codebase review, these 5 features target the biggest gaps between what SpiritAmmo does well today and what would make it the definitive scripture memorization app.

---

## 1. Spaced Repetition System (SRS) Engine — ✅ IMPLEMENTED

**The Problem:** Right now, practice is manual — users choose verses or collections to review, or rely on random selection. There's no science behind *when* a verse should be reviewed. Accuracy and practice count are tracked, but the app doesn't tell you "review John 3:16 today because you're about to forget it." This is the single biggest retention gap in any memorization app.

**The Feature:** A full SRS engine (Anki-style) that calculates the optimal review time for every verse based on recall performance. Each scripture gets an SRS state: interval (days until next review), ease factor (how quickly the interval grows), and a due date. After each practice attempt, the accuracy score feeds the algorithm — high accuracy pushes the next review further out; low accuracy collapses the interval. The Home screen "Command Center" surfaces due-for-review verses as today's priority mission.

**Why It's Killer:** Every top-rated flashcard/memorization app has SRS. Without it, SpiritAmmo's retention ceiling is limited by the user's discipline to review the right verses at the right time. With it, the app does the hard work of scheduling — users just show up and the app tells them exactly what to practice. It transforms SpiritAmmo from "a cool way to memorize" into "the most effective way to memorize."

### Implementation Details

| Component | File | Status |
|-----------|------|--------|
| SRS Types & Constants | `types/srs.ts` | ✅ Complete |
| SM-2 Algorithm | `services/spacedRepetition.ts` | ✅ Complete — pure functions, fully tested |
| SRS Scheduler | `services/srsScheduler.ts` | ✅ Complete — due/overdue queues, daily summary |
| SRS Store Slice | `hooks/stores/createSRSSlice.ts` | ✅ Complete — zustand slice with persistence |
| SRS Review Hook | `hooks/useSRSReview.ts` | ✅ Complete — session management hook |
| DB Schema | `db/schema.ts` — `srs_states` table | ✅ Complete |
| DB Migration | `db/init.ts` — CREATE TABLE + indexes | ✅ Complete |
| Home Screen CTA | `app/(tabs)/index.tsx` — SRS Daily Briefing card | ✅ Complete |
| Train Tab SRS Mode | `app/(tabs)/train/index.tsx` — SRS Review card | ✅ Complete |
| Mission Report Tab | `app/mission-report.tsx` — BRIEFINGS tab with SRS schedule | ✅ Complete |
| Post-session Updates | All 6 session completion handlers | ✅ Complete |
| Tests | `__tests__/services/spacedRepetition.test.ts` | ✅ 25+ tests |

**Where SRS updates happen after practice:**
- `train/practice.tsx` → `handlePracticeComplete`
- `battle/quick.tsx` → `handleRecordingComplete`
- `battle/collection.tsx` → `handleRecordingComplete`
- `battle/campaign.tsx` → `handleMissionComplete`
- `train/campaign.tsx` → `handleMissionComplete`
- `train/voice.tsx` → evaluating useEffect

**What the user sees:**
1. Home screen shows an SRS Daily Briefing card with overdue/due counts and a "START REVIEW" button
2. Train tab shows an "SRS REVIEW" mode (unlocked after 2 sessions) with due count badge
3. Mission Report has a BRIEFINGS tab showing overdue/due/reviewed counts
4. After every practice session, SRS state is automatically updated — verses you struggled with come back sooner

---

## 2. Live Squad Operations — 🔧 BACKEND READY, UI NOT WIRED

**The Problem:** The squad/social system is the most under-realized part of the app. Clerk auth is wired up, Convex backend has schemas for squads, challenges, presence, and leaderboards — but the actual gameplay is thin. Squad challenges are static targets (e.g., "complete 50 rounds"). There's no real-time interaction. The social features feel bolted on rather than central.

**The Feature:** Real-time multiplayer squad operations powered by the existing Convex backend. Three modes:
- **Head-to-Head Skirmish:** Two squad members race to recite the same verse — speech recognition scores both simultaneously, fastest+most-accurate wins. Live accuracy bars and countdown create tension.
- **Cooperative Raid:** Squad tackles a campaign node together. Each member is assigned different verses from the same passage. All must hit accuracy threshold to "conquer" the node. Failure shares the retry.
- **Squad War:** Weekly squad-vs-squad competition. Cumulative accuracy and verse count over 7 days. Winner takes VP bounty from the loser's pool.

### Implementation Details

| Component | File | Status |
|-----------|------|--------|
| Squad Operation Types | `types/squadOperation.ts` | ✅ Complete |
| Convex Schema | `convex/schema.ts` — `squadOperations`, `squadWars`, `sharedMnemonics` tables | ✅ Complete |
| Skirmish Mutations | `convex/squadOperations.ts` | ✅ Complete — start, join, submit result, query |
| War Mutations | `convex/squadWars.ts` | ✅ Complete — declare, accept, update score, leaderboard |
| Squad Operations Screen | N/A | ❌ Not built — needs `/squad/operations` lobby screen |
| TargetPractice Multiplayer | N/A | ❌ Not built — needs opponent accuracy bar, countdown sync |
| Push Notifications | N/A | ❌ Not built — needs squad invite, war declaration, raid start notifications |

**What's ready but not yet visible:**
- All Convex backend schemas and mutations are in place
- TypeScript types for skirmish, raid, and war are defined
- No UI screens have been built yet — the squad screen (`app/squad.tsx`) exists but doesn't use the new operations types

---

## 3. AI Tactical Briefings — ✅ IMPLEMENTED (Backend), 🔧 PARTIAL (UI)

**The Problem:** The `battle_intel` table exists in the schema but is barely utilized. The `OpenAI` dependency is in `package.json` but unused. Users practice verses in isolation with no context about why a passage matters, how it connects to other verses they know, or what study strategy would help them most. The app tracks *what* you got wrong but doesn't tell you *why* or *how to fix it*.

**The Feature:** AI-generated tactical briefings that turn raw performance data into actionable study intelligence. Three layers:
- **After-Action Report:** After each practice session, AI analyzes your errors (which words you missed, patterns across attempts) and generates a 2-3 sentence diagnosis
- **Cross-Reference Intel:** AI suggests connections between verses you've memorized that share themes
- **Weekly Operation Plan:** AI generates a personalized 7-day study plan targeting weak areas

### Implementation Details

| Component | File | Status |
|-----------|------|--------|
| Briefing Types | `types/briefing.ts` | ✅ Complete |
| AI Client Infrastructure | `services/ai/client.ts` | ✅ Complete — Gemini/OpenAI client with fallback |
| Prompt Templates | `services/ai/prompts.ts` | ✅ Complete — all 3 briefing types + system prompts |
| Briefing Generator | `services/ai/briefing.ts` | ✅ Complete — after-action, cross-reference, weekly plan |
| Briefing Store Slice | `hooks/stores/createBriefingSlice.ts` | ✅ Complete — zustand slice with AsyncStorage persistence |
| Mission Report UI | `app/mission-report.tsx` — BRIEFINGS tab | ✅ Complete — shows SRS schedule + after-action report |
| UseAppStore Wiring | `hooks/useAppStore.ts` | ✅ Complete — all briefing actions exposed |

**What the user sees:**
- Mission Report screen now has a 4th tab: **BRIEFINGS**
- Shows SRS review schedule (overdue/due today/reviewed counts)
- Shows the latest after-action briefing with diagnosis and recommendation
- Briefings are generated automatically after sessions (requires `EXPO_PUBLIC_GEMINI_API_KEY`)

**What's NOT yet wired:**
- After-action briefings are NOT automatically triggered after each practice session (the store methods exist but no screen calls `requestAfterActionBriefing` post-session)
- Cross-reference intel and weekly plan generation are available in the store but have no UI trigger

---

## 4. Adaptive Campaign Engine — ✅ IMPLEMENTED

**The Problem:** Campaigns are currently static — pre-built sequences of verses with fixed difficulty thresholds. Once you conquer "Operation: Foundation" on Romans, there's no dynamic follow-up. The campaign system doesn't learn from your performance to create new challenges. Users run out of content.

**The Feature:** A dynamic campaign engine that procedurally generates new operations based on your mastery data. Instead of 3-4 hand-crafted campaigns, you get infinite campaigns that are always relevant:
- **Auto-Campaigns:** The engine identifies your weakest books/chapters and generates a campaign targeting them. Conquering it spawns the next auto-campaign for your new weak areas.
- **Thematic Operations:** The engine clusters your known verses by theme (faith, grace, warfare, prayer) and generates campaigns that reinforce thematic connections. "Operation: Shield of Faith" draws verses about faith from across multiple books.
- **Escalation Mode:** After conquering a campaign at "Recruit" difficulty, the same campaign escalates — higher accuracy thresholds, stealth drill at Ghost difficulty, voice-only recitation. No campaign is ever truly "done."

### Implementation Details

| Component | File | Status |
|-----------|------|--------|
| Campaign Engine Service | `services/campaignEngine.ts` | ✅ Complete — auto-campaign, thematic, escalation, weak clustering |
| Campaign Types | Uses existing `types/campaign.ts` | ✅ No new types needed |
| Campaign Slice Extensions | `hooks/stores/createCampaignSlice.ts` | ✅ Complete — `generateAutoCampaign()`, `generateThematicCampaign()`, `escalateCampaign()`, `findAvailableThemes()` |
| UseAppStore Wiring | `hooks/useAppStore.ts` | ✅ Complete — all 4 actions exposed |
| Battle Campaign Screen | `app/(tabs)/battle/campaign.tsx` | ✅ Complete — "ADAPTIVE OPERATIONS" section with Auto + Thematic buttons |
| Tests | `__tests__/services/campaignEngine.test.ts` | ✅ 15+ tests |

**What the user sees in Battle > Campaigns:**
1. Existing static campaigns still appear as before
2. Below the campaign list, a new **ADAPTIVE OPERATIONS** section appears with:
   - **AUTO OPERATION** button — taps `generateAutoCampaign()` which finds your weakest verses and creates a procedurally generated campaign targeting them
   - **THEMATIC OPERATION** button — taps `generateThematicCampaign()` which clusters your verses by theme (faith, grace, warfare, etc.) and creates a theme-linked campaign
3. If you have no weak areas (all accuracy > 70%), the Auto Operation shows "ALL CLEAR — No weak areas detected"

**Important:** Auto-generated campaigns only appear if you have scriptures with practice history. If you've never practiced, there's no data to generate from. Practice at least 2-3 verses first, then the adaptive section will appear.

**Escalation** is wired through `escalateCampaign(campaignId, level)` in the store — it can be called when a campaign is completed to create an escalated version. A UI trigger for this (e.g., "ESCALATE" button on completed campaigns) is available but not yet added to the campaign detail screen.

---

## 5. Mnemonic Arsenal — ✅ IMPLEMENTED

**The Problem:** The `mnemonic` field exists on the `Scripture` type but is almost entirely empty. Memorization has two phases: **encoding** (getting it in) and **retrieval** (getting it out). SpiritAmmo is great at testing retrieval but provides zero help with encoding.

**The Feature:** A rich mnemonic system that gives every verse multiple memory aids:
- **AI-Generated Mnemonics:** AI generates acrostics, visual imagery prompts, and story-chain links for any verse
- **Community Arsenal:** Users can share mnemonics they've created. Upvote/downvote surfaces the best ones. VP rewards for contributing
- **Mnemonic Training Mode:** A scaffolded learning flow — Step 1: See the full mnemonic. Step 2: First letters only. Step 3: Blanks. Step 4: Recite from memory.

### Implementation Details

| Component | File | Status |
|-----------|------|--------|
| Mnemonic Types | `types/mnemonic.ts` | ✅ Complete — Mnemonic, GeneratedMnemonic, BootCampSteps, VP_REWARDS |
| AI Mnemonic Generator | `services/ai/mnemonic.ts` | ✅ Complete — generates 5 types with fallback |
| Mnemonic Store Slice | `hooks/stores/createMnemonicSlice.ts` | ✅ Complete — CRUD, DB persistence, VP rewards |
| DB Schema | `db/schema.ts` — `mnemonics` table | ✅ Complete |
| DB Migration | `db/init.ts` — CREATE TABLE + indexes | ✅ Complete |
| Convex Schema | `convex/schema.ts` — `sharedMnemonics` table | ✅ Complete |
| Arsenal Screen UI | `app/(tabs)/arsenal.tsx` — "Arsenal" tab | ✅ Complete |
| UseAppStore Wiring | `hooks/useAppStore.ts` | ✅ Complete |

**What the user sees:**
1. Arsenal screen now has a 3rd tab: **Arsenal** (alongside Collections and Voice)
2. Shows practiced verses in a list with mnemonic count badges
3. Tapping a verse with no mnemonics triggers AI generation inline (spinner + "Generating mnemonics..." on the card itself)
4. Tapping a verse with existing mnemonics expands to show all of them, organized by type (acrostic, visual, story-chain, acronym, keyword)
5. Each mnemonic shows: type icon, type label, AI/User source tag, and full content
6. Collapsed cards show the first mnemonic as a preview

**Mnemonic types generated:**
- **Acrostic** — First letters form a memorable word/phrase
- **Visual** — Vivid mental image sequences connecting key concepts
- **Story-Chain** — Short narrative linking verse ideas in order
- **Acronym** — Catchy acronym from key words
- **Keyword** — Reference number linked to a key concept

**Community Arsenal** and **Mnemonic Boot Camp** (training mode) are backend-ready but do not have UI screens yet.

---

## Priority Recommendation

| Rank | Feature | Impact | Status |
|------|---------|--------|--------|
| 1 | Spaced Repetition Engine | Critical — foundational for retention | ✅ Fully implemented & wired |
| 2 | AI Tactical Briefings | High — differentiator | ✅ Backend complete, ✅ Mission Report tab, 🔧 Auto-trigger not wired |
| 3 | Mnemonic Arsenal | High — unique in market | ✅ Fully implemented & wired |
| 4 | Adaptive Campaign Engine | Medium — long-tail engagement | ✅ Fully implemented & wired |
| 5 | Live Squad Operations | High — viral/retention driver | 🔧 Backend complete, UI not built |

### Remaining Work

| Item | Feature | Description |
|------|---------|-------------|
| Auto-trigger briefings | AI Briefings | Call `requestAfterActionBriefing()` after practice sessions and `requestWeeklyPlan()` periodically |
| Cross-reference briefing UI | AI Briefings | Display cross-reference connections somewhere (e.g., scripture detail screen) |
| Squad Operations lobby | Squad Ops | Build `/squad/operations` screen with skirmish/raid/war creation |
| TargetPractice multiplayer | Squad Ops | Extend `TargetPractice.tsx` with opponent accuracy bars, countdown sync |
| Push notifications | Squad Ops | Squad invites, war declarations, raid starts |
| Escalate button on completed campaigns | Campaigns | Add "ESCALATE" button in campaign detail when a campaign is fully conquered |
| Community mnemonics | Mnemonics | Convex shared_mnemonics queries + voting UI + VP rewards |
| Mnemonic Boot Camp | Mnemonics | Scaffolded training mode (full → first letters → blanks → recite) |

### Key Files Added/Modified

**New files:**
- `types/srs.ts`, `types/briefing.ts`, `types/mnemonic.ts`, `types/squadOperation.ts`
- `services/spacedRepetition.ts`, `services/srsScheduler.ts`
- `services/ai/client.ts`, `services/ai/prompts.ts`, `services/ai/briefing.ts`, `services/ai/mnemonic.ts`
- `services/campaignEngine.ts`
- `hooks/stores/createSRSSlice.ts`, `hooks/stores/createBriefingSlice.ts`, `hooks/stores/createMnemonicSlice.ts`
- `hooks/useSRSReview.ts`
- `convex/squadOperations.ts`, `convex/squadWars.ts`
- `__tests__/services/spacedRepetition.test.ts`, `__tests__/services/campaignEngine.test.ts`

**Modified files:**
- `db/schema.ts`, `db/init.ts` — Added `srs_states` and `mnemonics` tables
- `convex/schema.ts` — Added `squadOperations`, `squadWars`, `sharedMnemonics` tables
- `hooks/zustandStore.ts` — Composed SRS, Briefing, Mnemonic slices + initialization
- `hooks/useAppStore.ts` — Exposed all new slice actions
- `hooks/stores/createCampaignSlice.ts` — Added auto-campaign, thematic, escalation
- `hooks/stores/createScriptureSlice.ts` — Auto-update SRS after practice
- `types/scripture.ts` — Added optional `srsState` field
- `app/(tabs)/index.tsx` — SRS Daily Briefing card
- `app/(tabs)/train/index.tsx` — SRS Review mode card
- `app/(tabs)/train/practice.tsx`, `battle/quick.tsx`, `battle/collection.tsx`, `battle/campaign.tsx`, `train/campaign.tsx`, `train/voice.tsx` — SRS update on session complete
- `app/(tabs)/battle/campaign.tsx` — Adaptive Operations section (Auto + Thematic buttons)
- `app/(tabs)/arsenal.tsx` — Mnemonic Arsenal tab
- `app/mission-report.tsx` — BRIEFINGS tab with SRS schedule + after-action report