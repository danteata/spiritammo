# SpiritAmmo — UX Improvement Plan

A full audit of every screen, component, and user flow. Organized by priority: fix what blocks new users first, then reduce friction for everyone, then add what's missing.

---

## Section 1: The New User Wall (Critical — Blocks Adoption)

These issues hit every first-time user and must be fixed first.

### 1.1 Onboarding is Cosplay, Not Onboarding

**Current state:** The `WelcomeModal` is a themed splash screen — "MISSION DOSSIER // 001," "CLASSIFIED" stamp, typewriter animation, "ACCEPT MISSION" button. It looks cool but teaches the user nothing. After dismissal, a one-step `TutorialOverlay` says "Tap the button below to begin practicing your first verse" — but there are zero verses loaded. The CTA on the Home screen sends them to the Train tab, which is a dead end with no data.

**Problems:**
- Zero explanation of what the app actually does (memorize scripture by reciting it)
- Zero guidance on adding verses — the single prerequisite for every feature
- "DECLINE OP" button label implies consequences for skipping (it's just "skip")
- Typewriter animation is unskippable — user must wait 8-10 seconds or tap ahead blindly
- "STATUS: PENDING AUTHORIZATION" + random recruit ID suggest the account needs approval
- After onboarding, user lands on Home → taps CTA → Train tab (0 verses) → dead end

**Fix:**
- Replace the themed modal with a 3-step onboarding flow:
  - **Step 1 — What this app does:** One sentence + animation: "Memorize scripture by reciting it aloud. The app listens and scores your accuracy." No jargon.
  - **Step 2 — Add your first verses:** Inline verse picker or pre-loaded starter pack (see 1.2). User adds at least 3 verses before proceeding. This is the unlock gate for everything else.
  - **Step 3 — Choose your first drill:** Two cards, not five: "Read & Listen" (Auto Pilot) and "Speak from Memory" (Single Focus). The other 3 modes unlock after completing one session.
- Make the typewriter animation skippable (tap to reveal full text)
- Rename "DECLINE OP" → "Skip" / "ACCEPT MISSION" → "Get Started"
- Remove "PENDING AUTHORIZATION" and random ID — replace with a name input field

### 1.2 No Starter Content

**Current state:** New users start with zero verses and zero collections. Every feature requires verses. The Arsenal empty state is well-designed ("Start Your Collection" + "Add Verse" / "Import PDF") but it's on a different tab from where the user is sent first.

**Fix:**
- **Pre-load a starter collection** on first launch: "Basic Training" — 10 essential verses (John 3:16, Psalm 23:1, Romans 8:28, Phil 4:13, etc.). Mark it as a system collection with a "STARTER" badge. This gives every new user content to practice with immediately.
- **Surface verse-adding on the Home screen.** When verses = 0, the Home CTA should go directly to Arsenal (or an inline "Add your first verse" flow), not to Train.
- **Make the Train tab handle zero verses gracefully.** Instead of showing 5 drill cards that will fail, show a full-screen empty state: "You need ammunition before you can train. Add verses to your Arsenal." with a prominent "Go to Arsenal" button.

### 1.3 Train Tab is a Dead End for New Users

**Current state:** With zero verses, the Train tab shows all 5 mode cards. Tapping any of them either shows an empty scripture card or fails silently. There is no empty state or guidance.

**Fix:**
- Gate all training modes behind a verse count check. If `scriptures.length === 0`, show the empty state described above.
- If `scriptures.length < 5`, show a subtle banner: "Add more verses to unlock Burst Fire and Live Fire Drill."
- Never let the user enter a mode that has no content.

---

## Section 2: Jargon & Cognitive Load (High — Confuses Everyone, Not Just New Users)

### 2.1 Military Metaphor Tax

**Current state:** Every label, button, status, and error message uses military jargon. Users must mentally translate before they can act:

| Jargon | Plain Meaning | Appears On |
|--------|--------------|------------|
| Arsenal | Collection / Verse List | CollectionSelector, Arsenal tab |
| Ammunition | Scripture verses | Train tab, AmmunitionCard |
| Rounds / Rounds Fired | Practice count / verses | AmmunitionCard, Profile stats |
| Deploy | Start | Train mode cards |
| Abort Mission | End Session | Voice Ops, Quiz |
| Fire! | Start Recording | AmmunitionCard |
| Stealth | Fill-in-the-Blanks | AmmunitionCard, StealthDrill |
| Intel | Mnemonic / Study Notes | AmmunitionCard |
| Load Ammunition | Select a Collection | Train tab |
| Establish New Arsenal | Create New Collection | CollectionSelector |
| Unauthorized Disclosure | Peeked at the Answer | ScriptureCard battle mode |
| Dismantle Arsenal | Delete Collection | Error messages |
| Regroup | Try Again | Battle results |
| Hit / Miss | Correct / Incorrect | Voice Ops |

**Fix — Progressive Metaphor:** Don't kill the theme — it's SpiritAmmo's identity. But **always pair jargon with plain language** until the user has completed 5+ sessions. After that, fade the plain labels.

Implementation approach:
- Add a `showPlainLabels` flag to `UserSettings`, default `true`
- Set to `false` after the user completes 5 sessions (tracked via `totalPracticed` in stats)
- Components read this flag and render: `FIRE! (Record)` or just `FIRE!` depending on state
- Error messages always use plain language regardless of the flag — errors are not the place for metaphor

Specific high-impact relabeling (always do these, not conditional):
- "ABORT MISSION" → "END SESSION" (abort sounds destructive, and it's not)
- "UNAUTHORIZED DISCLOSURE" → "Revealing gives you 0 VP for this verse" (explain the consequence instead of scolding)
- "DECLINE OP" → "Skip"
- Error messages: always plain language — "Could not create collection" not "Failed to establish arsenal"

### 2.2 Five Training Modes is Too Many at Once

**Current state:** The Train tab presents 5 mode cards simultaneously with no recommended starting point. Single Focus, Burst Fire, and Live Fire Drill have subtle differences that a new user cannot distinguish. The `primaryMode` style hint on Single Focus is too subtle (1.5px border).

**Fix — Progressive Unlock:**
- **Level 1 (always visible):** Single Focus + Auto Pilot. These are the most distinct and cover "active memorization" and "passive listening."
- **Level 2 (unlocked after 1 session):** Burst Fire. Natural progression from Single Focus — "now try multiple verses."
- **Level 3 (unlocked after 3 sessions):** Voice Ops. Adds speech recognition, which is a complexity step up.
- **Level 4 (unlocked after 5 sessions):** Live Fire Drill. Combines recording, stealth, and collection selection — the most complex mode.

Show locked modes as grayed-out cards with "Complete X more drills to unlock" text. This creates a sense of progression and prevents overwhelm.

### 2.3 AmmunitionCard is Information Overload

**Current state:** A single card shows: reference, practice count, loaded/empty status, reveal/hide toggle, full verse text (with blur), mnemonic with plan/tactics split, accuracy meter with 5-tier rating, and 2-3 action buttons. That's 10+ data points in one card.

**Fix — Collapse by Default:**
- **Collapsed state:** Show reference + accuracy bar + one primary action button. That's it. Three data points.
- **Expanded state (tap to expand):** Verse text, mnemonic, practice count, secondary actions.
- This cuts visual noise by ~60% in list views (Burst Fire, Collection Assault) while keeping all information accessible.
- Move the "INTEL" button inside the expanded view — it's a secondary action that most users won't use on every card.

### 2.4 Quiz Setup Exposes Power-User Config

**Current state:** The quiz config screen shows 20/50/100 question counts and UNLIMITED/5M/15M/30M/CUSTOM time options. The smallest quiz is 20 questions. The custom time input has "SPECIFY EXACT DURATION (1-999 MIN)" in all-caps. The true-false-list interaction model (5 options × 3 buttons = 15 tap targets) is never explained.

**Fix:**
- Add a "Quick Drill" preset: 10 questions, unlimited time, one-tap start. Make it the primary CTA.
- Move 50/100 and timed options behind an "Advanced" toggle or "Custom Drill" card.
- Add a one-line tooltip on first quiz: "For each statement, tap True if it matches the scripture, False if it doesn't, or Skip."
- Cap negative-phrased questions at 10% instead of 25% (currently too high for learning).
- On the results screen, make "New Drill" the primary action. Demote "Redeploy Priority Drill" and "Auto-Build Struggling Collection" to a secondary section.

---

## Section 3: Navigation & Flow Friction (Medium — Adds Unnecessary Taps)

### 3.1 Home → First Practice Path is Broken

**Current path:** Home (CTA) → Train tab → (dead end) → Arsenal tab → Add verse → Train tab → Choose mode → Practice = **7+ taps with no guidance**

**Fix:** Home CTA should be context-aware:
- `scriptures.length === 0` → CTA = "Add Your First Verse" → navigates to Arsenal (with inline add-verse flow)
- `scriptures.length > 0 && no session today` → CTA = "Start Daily Drill" → navigates to Single Focus with auto-selected verse
- `hasSessionToday` → CTA = "Extra Practice" or "Continue Streak"

### 3.2 Home Screen "RECENT OPERATIONS" is an Empty Label

**Current state:** The Home screen renders a "RECENT OPERATIONS" section header but no content below it. This is true even for returning users — the list rendering code doesn't exist.

**Fix:** Either implement the recent operations list (show last 3-5 practice sessions with date, verse, accuracy) or remove the section header entirely until there's data. An empty header is worse than no header.

### 3.3 Duplicate "Add to Collection" Flows

**Current state:** Three different UIs for the same action:
1. `QuickAddCollectionModal` — bottom sheet with vertical list
2. Quiz preview modal's inline horizontal scroll picker
3. Post-quiz results quick-add

**Fix:** Use `QuickAddCollectionModal` everywhere. Remove the inline picker from the quiz preview modal. This gives the user one consistent mental model for "add verse to collection."

### 3.4 Voice Ops Has No Session Boundary

**Current state:** Voice Ops runs indefinitely until the user taps "ABORT MISSION." There's no verse count, no progress indicator, no end condition. The user doesn't know if they'll do 5 verses or 50.

**Fix:**
- Add a session-length selector before starting: 5 / 10 / Unlimited verses
- Show a progress bar during the session (e.g., "Verse 3 of 10")
- Replace "ABORT MISSION" with "END SESSION" + show results summary
- Communicate silence timeouts: "Auto-advances after 3 seconds of silence"

---

## Section 4: Component-Specific Fixes (Medium — Polish & Trust)

### 4.1 TargetPractice Auto-Starts Recording

**Current state:** The TargetPractice component auto-starts recording when it becomes visible. Users expecting a manual trigger are caught off guard. Combined with "wind conditions" and "range distance" indicators that look like game mechanics but actually affect speech recognition sensitivity, this creates confusion.

**Fix:**
- Add a "READY — Tap to begin" state before auto-starting. Give the user 2 seconds to read the reference before recording starts, or let them tap to start manually.
- Relabel "wind conditions" as "mic sensitivity" or remove the metaphor — it currently suggests a game mechanic that doesn't exist.

### 4.2 SoldierAvatar Equipment is Broken

**Current state:** The avatar equipment system has 6 slots and purchasable items, but equipping items produces **zero visual change** on the avatar. The rendering code fetches equipped items but never draws them — only a mannequin image is shown. There are 300+ lines of dead style code for a hand-drawn avatar system that was abandoned.

**Fix:**
- Either implement the equipment layering (even simple colored overlays per slot) or remove the equipment store from The Barracks. Currently, users spend VP on items they can't see — this breaks trust.
- Remove all dead styles (`soldierHead`, `soldierBody`, `soldierLegs`, `swordHilt`, etc.)
- Fix the VP fallback: `valorPoints || 100` shows "100" for users with zero VP. Show "0" or initialize VP to 100 explicitly.

### 4.3 Battle Mode "UNAUTHORIZED DISCLOSURE" Alert

**Current state:** In battle mode, revealing the verse text triggers an alert: "UNAUTHORIZED DISCLOSURE — Revealing the verse text means you're not reciting from memory. This verse will be scored as 0% accuracy." The user must confirm just to read the verse.

**Fix:** Replace the alarming alert with a softer inline banner that appears on the card: "Peek penalty: 0 VP for this verse." No modal, no confirmation. The user can peek without the dramatic scolding. The consequence (0 VP) is the same.

### 4.4 WelcomeModal Typewriter is Unskippable

**Current state:** The typewriter animation at 45ms/character with haptic feedback takes 8-10 seconds and cannot be skipped. The "ACCEPT MISSION" button is visible during the animation, creating an awkward tension.

**Fix:** Tap anywhere on the text to reveal it instantly. Or cap the animation at 2 seconds total and fade in the remainder.

### 4.5 Splash Screen Hides Too Early

**Current state:** `SplashScreen.hideAsync()` fires on the first render with no dependency on loading state. If Clerk, Convex, or the Zustand store hasn't initialized, the user sees a blank screen.

**Fix:** Gate splash dismissal on an "app ready" signal — Clerk loaded + store hydrated. Show a branded loading state (the SpiritAmmo logo + "Initializing..." text) until ready.

---

## Section 5: New UX Features to Add

### 5.1 Onboarding Flow (Multi-Step)

**What:** A 3-step onboarding that ships the user to their first successful practice session in under 60 seconds.

1. **Welcome + Tagline:** "Memorize scripture by reciting it aloud. The app listens and scores you." + optional name input
2. **Starter Pack:** Pre-loaded "Basic Training" collection of 10 verses. User can add more or skip.
3. **First Drill:** Auto-launches Single Focus with the first starter verse. User completes one recitation. "You just memorized your first verse! Here's what to try next."

No military jargon until step 3, and even then it's paired with plain language.

### 5.2 Contextual Tooltips (First-Run Hints)

**What:** After onboarding, the first time a user visits each screen, show a one-time tooltip that explains the core interaction:

- **Train tab:** "Choose a drill to practice your verses. Start with Single Focus for deep memorization."
- **Battle tab:** "Battles test your memory under pressure. You earn Valor Points based on accuracy."
- **Arsenal tab:** "This is where you manage your verse collections. Add verses manually or import from a PDF."
- **AmmunitionCard:** "Tap FIRE! to recite the verse aloud. The app will score your accuracy."
- **StealthDrill:** "Fill in the missing words. Start at Recruit difficulty and work your way up."

Each tooltip appears once, then never again. Store seen-tooltip flags in AsyncStorage.

### 5.3 Quick-Start from Home Screen

**What:** The Home screen CTA should be a **one-tap path to practice**, not a navigation step. Instead of routing to the Train tab (where the user must then select a mode + collection + verse), the CTA should auto-configure and launch a session:

- "Start Daily Drill" → auto-selects due-for-review verses (if SRS is built) or weakest verses → launches Single Focus
- "5-Minute Review" → auto-selects 5 verses → launches Burst Fire
- "Listen & Learn" → auto-selects a chapter → launches Auto Pilot

This removes 2-3 taps from every session start.

### 5.4 Post-Session Summary Cards

**What:** After every practice session or battle, show a consistent summary card (not a native Alert dialog) that includes:
- Accuracy score with visual indicator (progress ring or bar)
- VP earned (if battle mode)
- Streak status ("3-day streak! Keep it up!")
- One next-action suggestion: "Try Stealth Drill on this verse" / "Review again in 2 days" / "3 verses are due for review tomorrow"

Current battle results use Alert dialogs — these are non-customizable, dismiss immediately, and don't build engagement. A custom summary card can be designed to motivate the next action.

### 5.5 Achievement Notifications

**What:** When the user hits a milestone (first verse memorized, 7-day streak, rank promotion, etc.), show a full-screen celebration overlay with the achievement badge, a congratulatory message, and a "Share" button. Current achievements are buried in the Mission Report — they should surface in the moment.

This creates emotional reward loops that keep users coming back. The military theme makes this natural: "PROMOTED TO CORPORAL" with a rank badge animation.

### 5.6 Verse Search

**What:** Add a global search accessible from the Home screen or Arsenal that lets users find and add verses by reference or keyword. Current verse addition requires knowing the exact reference and typing the text manually, or importing a PDF. A search that queries the built-in Bible data (already available via `services/bibleApi.ts` and OSIS XML parsing) would let users type "John 3:16" and auto-populate the text.

### 5.7 Haptic & Sound Feedback Layer

**What:** Add a subtle audio/haptic layer to key moments:
- Correct recitation → success chime + light haptic
- Incorrect → soft tone + medium haptic
- Rank promotion → fanfare + heavy haptic
- Streak maintained → gentle pulse

Currently, haptics are imported (`expo-haptics`) but used minimally. A consistent feedback layer makes the app feel responsive and rewarding without being distracting.

### 5.8 Accessibility Pass

**What:**
- All interactive elements need accessibility labels (many buttons use only icons with no `accessibilityLabel`)
- Support Dynamic Type / font scaling (NativeWind can break with large fonts)
- VoiceOver/TalkThrough testing on all custom components
- Ensure minimum touch target sizes (44×44pt) — some action buttons on AmmunitionCard are undersized
- Add `accessibilityRole` to custom buttons (e.g., the FIRE! button needs `accessibilityRole="button"`)

---

## Section 6: Summary — Priority Order

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| **P0** | 1.1 Multi-step onboarding | New users can't use the app without this | Medium |
| **P0** | 1.2 Pre-load starter collection | Every feature is dead without content | Small |
| **P0** | 1.3 Train tab empty state | Dead end drives users away | Small |
| **P1** | 2.1 Progressive metaphor labels | Reduces translation tax for all new users | Medium |
| **P1** | 2.2 Progressive mode unlock | Prevents choice paralysis | Medium |
| **P1** | 2.3 AmmunitionCard collapse | Reduces visual noise by 60% | Medium |
| **P1** | 2.4 Quiz quick-start preset | Reduces config friction | Small |
| **P2** | 3.1 Home CTA context-aware | Cuts first-practice taps from 7 to 2 | Small |
| **P2** | 3.2 Fix or remove "RECENT OPERATIONS" | Removes confusing empty section | Small |
| **P2** | 3.3 Unify "add to collection" flow | One mental model, not three | Medium |
| **P2** | 3.4 Voice Ops session length | Gives sessions a boundary | Small |
| **P2** | 4.1 TargetPractice manual start | Prevents surprise recording | Small |
| **P2** | 4.2 Fix avatar equipment rendering | Currently a broken promise | Large |
| **P2** | 4.3 Replace "UNAUTHORIZED DISCLOSURE" | Removes dramatic scolding | Small |
| **P3** | 5.1 Contextual tooltips | Gentle guidance without forcing | Medium |
| **P3** | 5.2 Quick-start from Home | One-tap practice | Medium |
| **P3** | 5.3 Post-session summary cards | Motivates next action | Medium |
| **P3** | 5.4 Achievement notifications | Emotional reward loops | Medium |
| **P3** | 5.5 Verse search by reference | Easiest way to add verses | Medium |
| **P3** | 5.6 Haptic/sound feedback layer | Makes the app feel responsive | Medium |
| **P3** | 5.7 Accessibility pass | Essential for inclusivity | Large |

### The One-Sentence Summary

**The app's biggest UX problem is that a new user can't get to a successful practice session in under 60 seconds — the onboarding doesn't add verses, the Train tab is a dead end without them, and military jargon obscures every action.** Fix the onboarding-to-first-practice path, then strip friction from the rest.