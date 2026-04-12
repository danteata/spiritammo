# SpiritAmmo — Next-Level Feature Proposals

Based on a full codebase review, these 5 features target the biggest gaps between what SpiritAmmo does well today and what would make it the definitive scripture memorization app.

---

## 1. Spaced Repetition System (SRS) Engine

**The Problem:** Right now, practice is manual — users choose verses or collections to review, or rely on random selection. There's no science behind *when* a verse should be reviewed. Accuracy and practice count are tracked, but the app doesn't tell you "review John 3:16 today because you're about to forget it." This is the single biggest retention gap in any memorization app.

**The Feature:** A full SRS engine (Anki-style) that calculates the optimal review time for every verse based on recall performance. Each scripture gets an SRS state: interval (days until next review), ease factor (how quickly the interval grows), and a due date. After each practice attempt, the accuracy score feeds the algorithm — high accuracy pushes the next review further out; low accuracy collapses the interval. The Home screen "Command Center" surfaces due-for-review verses as today's priority mission.

**Why It's Killer:** Every top-rated flashcard/memorization app has SRS. Without it, SpiritAmmo's retention ceiling is limited by the user's discipline to review the right verses at the right time. With it, the app does the hard work of scheduling — users just show up and the app tells them exactly what to practice. It transforms SpiritAmmo from "a cool way to memorize" into "the most effective way to memorize."

**Implementation Sketch:**
- Extend the `scriptures` SQLite table with SRS columns: `srs_interval`, `srs_ease_factor`, `srs_due_date`, `srs_reps`, `srs_lapses`
- Create `services/spacedRepetition.ts` — SM-2 or FSRS algorithm that takes accuracy + current SRS state → new SRS state
- After every practice/battle session, update SRS state for each verse attempted
- New "SRS Review" mode in Train tab: auto-generates a session from all due verses, sorted by urgency
- Home screen "Daily Briefing" shows due verse count as the primary CTA
- Add `srsState` to `ScriptureSlice` and persist to SQLite

**Files Touching:** `db/schema.ts`, `hooks/stores/createScriptureSlice.ts`, `services/` (new), `app/(tabs)/index.tsx`, `app/(tabs)/train/index.tsx`

---

## 2. Live Squad Operations

**The Problem:** The squad/social system is the most under-realized part of the app. Clerk auth is wired up, Convex backend has schemas for squads, challenges, presence, and leaderboards — but the actual gameplay is thin. Squad challenges are static targets (e.g., "complete 50 rounds"). There's no real-time interaction. The social features feel bolted on rather than central.

**The Feature:** Real-time multiplayer squad operations powered by the existing Convex backend. Three modes:
- **Head-to-Head Skirmish:** Two squad members race to recite the same verse — speech recognition scores both simultaneously, fastest+most-accurate wins. Live accuracy bars and countdown create tension.
- **Cooperative Raid:** Squad tackles a campaign node together. Each member is assigned different verses from the same passage. All must hit accuracy threshold to "conquer" the node. Failure shares the retry.
- **Squad War:** Weekly squad-vs-squad competition. Cumulative accuracy and verse count over 7 days. Winner takes VP bounty from the loser's pool.

**Why It's Killer:** Social accountability is the #1 predictor of long-term scripture memory habits. Solo apps have 30-day retention problems; group dynamics fix that. Real-time competition creates the kind of "just one more round" engagement that made Wordle and Duolingo leagues viral. The infrastructure (Convex real-time sync, Clerk auth, speech recognition, VP economy) is already built — this connects existing systems into a social loop.

**Implementation Sketch:**
- New Convex mutations: `startSkirmish`, `submitSkirmishResult`, `joinRaid`, `completeRaidNode`, `declareSquadWar`, `updateWarScore`
- New Convex queries: `getActiveSkirmish`, `getRaidStatus`, `getSquadWarLeaderboard`
- New screen: `/squad/operations` — lobby for finding/creating live operations
- Extend `TargetPractice.tsx` with multiplayer state: opponent accuracy bar, countdown sync, result comparison
- Push notifications for squad invites, war declarations, raid starts
- VP rewards scaled for multiplayer (2x base for co-op, 3x for competitive wins)

**Files Touching:** `convex/schema.ts`, `convex/` (new mutations/queries), `app/squad.tsx`, `components/TargetPractice.tsx`, `app/(tabs)/battle/index.tsx`, `providers/ConvexProvider.tsx`

---

## 3. AI Tactical Briefings

**The Problem:** The `battle_intel` table exists in the schema but is barely utilized. The `OpenAI` dependency is in `package.json` but unused. Users practice verses in isolation with no context about why a passage matters, how it connects to other verses they know, or what study strategy would help them most. The app tracks *what* you got wrong but doesn't tell you *why* or *how to fix it*.

**The Feature:** AI-generated tactical briefings that turn raw performance data into actionable study intelligence. Three layers:
- **After-Action Report:** After each practice session, AI analyzes your errors (which words you missed, patterns across attempts) and generates a 2-3 sentence diagnosis: "You're dropping the second clause of verses with conditional structure — try chunking Romans 8:28 into 'We know' / 'that for those' / 'who love God' / 'all things work together.'"
- **Cross-Reference Intel:** AI suggests connections between verses you've memorized: "Romans 8:28 and Jeremiah 29:11 share the 'plans/provision' theme — reviewing them together will reinforce both."
- **Weekly Operation Plan:** AI generates a personalized 7-day study plan targeting weak areas, suggesting specific training modes: "Monday: Voice Ops on your 5 weakest verses. Tuesday: Stealth Drill on Romans 8. Wednesday: Burst Fire review of due-for-review verses."

**Why It's Killer:** Most memorization apps are passive — they test you but don't coach you. AI coaching turns SpiritAmmo into a personal tutor that adapts to your specific memory patterns. The "Tactical Briefing" framing is perfect for the military theme and makes the AI feel native rather than bolted-on. OpenAI is already a dependency — this is the feature it was meant for.

**Implementation Sketch:**
- New service: `services/aiBriefing.ts` — calls OpenAI API with structured prompts containing user performance data
- Prompt engineering: verse accuracy history, error patterns (missed words), current mastery levels, recent session summaries
- New screen section on Mission Report: "Tactical Briefing" tab showing AI-generated insights
- Post-session modal: 2-3 sentence AI diagnosis with dismiss/save option
- Weekly briefing notification + Home screen card
- Cache AI responses in `battle_intel` table (reuse existing schema)
- Privacy: all AI calls server-side, no verse text sent to OpenAI — only references + accuracy metadata

**Files Touching:** `services/aiBriefing.ts` (new), `services/questionGenerator.ts`, `app/mission-report.tsx`, `components/TargetPractice.tsx`, `db/schema.ts` (populate `battle_intel`), `app/(tabs)/index.tsx`

---

## 4. Adaptive Campaign Engine

**The Problem:** Campaigns are currently static — pre-built sequences of verses with fixed difficulty thresholds. Once you conquer "Operation: Foundation" on Romans, there's no dynamic follow-up. The campaign system doesn't learn from your performance to create new challenges. Users run out of content.

**The Feature:** A dynamic campaign engine that procedurally generates new operations based on your mastery data. Instead of 3-4 hand-crafted campaigns, you get infinite campaigns that are always relevant:
- **Auto-Campaigns:** The engine identifies your weakest books/chapters and generates a campaign targeting them. Conquering it spawns the next auto-campaign for your new weak areas.
- **Thematic Operations:** AI clusters your known verses by theme (faith, grace, warfare, prayer) and generates campaigns that reinforce thematic connections. "Operation: Shield of Faith" draws verses about faith from across multiple books.
- **Escalation Mode:** After conquering a campaign at "Recruit" difficulty, the same campaign escalates — higher accuracy thresholds, stealth drill at Ghost difficulty, voice-only recitation. No campaign is ever truly "done."

**Why It's Killer:** Content exhaustion kills memorization apps. Hand-built campaigns take time to create and users burn through them. Procedural campaigns mean SpiritAmmo never runs out of operations — there's always a next mission tailored to where you are right now. The "escalation" mechanic means even completed content stays fresh at higher difficulty, giving long-term users a reason to revisit old campaigns.

**Implementation Sketch:**
- New service: `services/campaignEngine.ts` — algorithm that reads mastery data, identifies weak clusters, selects verses, generates campaign nodes with difficulty curves
- Extend `CampaignSlice`: `generateAutoCampaign()`, `escalateCampaign(campaignId, newDifficulty)`
- Thematic clustering: group verses by Bible book metadata + keyword extraction (simple NLP or pre-built topic tags)
- New campaign themes generated procedurally: pick theme name from military operation generator (e.g., "Operation: [VIRTUE NAME]")
- Campaign map visualization: existing coordinate system on `CampaignNode` enables a tactical map view
- Store auto-generated campaigns alongside manual ones in existing campaign storage (AsyncStorage)

**Files Touching:** `services/campaignEngine.ts` (new), `hooks/stores/createCampaignSlice.ts`, `types/campaign.ts`, `app/(tabs)/train/campaign.tsx`, `app/(tabs)/battle/campaign.tsx`, `app/(tabs)/battle/index.tsx`

---

## 5. Mnemonic Arsenal

**The Problem:** The `mnemonic` field exists on the `Scripture` type but is almost entirely empty. Memorization has two phases: **encoding** (getting it in) and **retrieval** (getting it out). SpiritAmmo is great at testing retrieval (practice, drills, quizzes) but provides zero help with encoding. The hardest part of scripture memory isn't repeating — it's creating the mental hooks that make repetition stick.

**The Feature:** A rich mnemonic system that gives every verse multiple memory aids:
- **AI-Generated Mnemonics:** OpenAI generates acrostics, visual imagery prompts, and story-chain links for any verse. "For John 3:16, picture: God (pointing up) → Loved (heart) → World (globe) → Gave (gift box) → Son (baby) → Believes (head nod) → Life (tree growing)."
- **Community Arsenal:** Users can share mnemonics they've created. Upvote/downvote surfaces the best ones. VP rewards for contributing popular mnemonics. This builds a UGC flywheel.
- **Mnemotic Training Mode:** A new training mode that teaches the mnemonic first, then gradually removes the scaffolding. Step 1: See the full mnemonic. Step 2: First letters only. Step 3: Blanks. Step 4: Recite from memory.

**Why It's Killer:** Every memorization app tests recall. None help with the actual memorization process — the initial encoding. Mnemonics are the proven technique (memory champions use them universally), but most people don't know how to create good ones. By providing AI-generated mnemonics + a community library, SpiritAmmo becomes the only app that helps you *learn* verses, not just *test* them. The "Arsenal" metaphor is already in the app — mnemonics are the literal ammunition.

**Implementation Sketch:**
- New table: `mnemonics` (id, scripture_id, type, content, author_user_id, upvotes, downvotes, created_at)
- New service: `services/mnemonicGenerator.ts` — calls OpenAI with verse text, generates 3-5 mnemonic variants per verse
- New Convex table: `shared_mnemonics` — community submissions with voting
- New screen: `/arsenal/mnemonics/[scriptureId]` — browse AI + community mnemonics for a verse
- New training mode in Train tab: "Mnemonic Boot Camp" — scaffolded memorization flow
- VP rewards: +5 VP for submitting a mnemonic, +2 VP when yours gets an upvote
- Populate the empty `mnemonic` field on Scripture with AI-generated defaults on first launch

**Files Touching:** `db/schema.ts` (new table), `convex/schema.ts` (shared mnemonics), `types/scripture.ts`, `services/mnemonicGenerator.ts` (new), `app/(tabs)/arsenal.tsx`, `app/(tabs)/train/index.tsx`, `hooks/stores/createScriptureSlice.ts`

---

## Priority Recommendation

| Rank | Feature | Impact | Effort | Dependency |
|------|---------|--------|--------|------------|
| 1 | Spaced Repetition Engine | Critical — foundational for retention | Medium | None (standalone) |
| 2 | AI Tactical Briefings | High — differentiator, uses OpenAI dep | Medium | OpenAI API key |
| 3 | Mnemonic Arsenal | High — unique in market | Medium | OpenAI API key |
| 4 | Live Squad Operations | High — viral/retention driver | High | Convex + push notifs |
| 5 | Adaptive Campaign Engine | Medium — long-tail engagement | Medium | SRS engine (Feature 1) |

**Suggested build order:** Start with SRS (it's foundational — other features benefit from knowing when verses are due). Then AI Tactical Briefings and Mnemonic Arsenal in parallel (both use OpenAI). Squad Operations next. Adaptive Campaigns last (benefits most from having SRS data).