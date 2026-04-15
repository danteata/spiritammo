# SpiritAmmo — UX Improvement Plan

A full audit of every screen, component, and user flow. Organized by priority: fix what blocks new users first, then reduce friction for everyone, then add what's missing.

---

## Section 1: The New User Wall (Critical — Blocks Adoption)

These issues hit every first-time user and must be fixed first.

### 1.1 Onboarding is Cosplay, Not Onboarding ✅ DONE

**Current state:** Replaced with a 3-step onboarding flow (name input, starter verses preview, choose first drill) with animated step transitions. "DECLINE OP" renamed to "Skip". Typewriter removed from modal; home screen typewriter is skippable via tap-to-reveal. No more "PENDING AUTHORIZATION" or random recruit ID.

**Remaining:** None — fully implemented.

### 1.2 No Starter Content ✅ DONE

**Current state:** "Basic Training" collection with STARTER tag and 10 essential verses is seeded on first launch via `initializeAppData`. Home screen CTA navigates to Arsenal when `verseCount === 0`. Step 2 of WelcomeModal previews the starter verses.

**Remaining:** None — fully implemented.

### 1.3 Train Tab is a Dead End for New Users ✅ DONE

**Current state:** Train tab shows a full-screen empty state when `verseCount === 0` with "No Verses Yet" title, explanatory text, and "Go to Arsenal" CTA. Training modes are gated behind `verseCount > 0`.

**Remaining:** None — fully implemented.

---

## Section 2: Jargon & Cognitive Load (High — Confuses Everyone, Not Just New Users)

### 2.1 Military Metaphor Tax ✅ DONE

**Current state:** All "ABORT MISSION" buttons replaced with "END SESSION". `showPlainLabels` flag auto-disables after 5 sessions. "DECLINE OP" renamed to "Skip".

**Remaining:** None — fully implemented.

### 2.2 Five Training Modes is Too Many at Once ✅ DONE

**Current state:** Progressive unlock is implemented. Single Focus and Auto Pilot are always available. Burst Fire unlocks after 1 session, Voice Ops after 3 sessions, Live Fire Drill after 5 sessions. Locked modes show a lock icon with "Complete N more drills to unlock" text.

**Remaining:** None — fully implemented.

### 2.3 AmmunitionCard is Information Overload ✅ DONE

**Current state:** `AmmunitionCard` has collapsed/expanded states. Collapsed shows reference + accuracy bar + FIRE button (3 data points). Expanded shows full verse text, mnemonic, practice count, and secondary actions. INTEL button is inside the expanded view.

**Remaining:** None — fully implemented.

### 2.4 Quiz Setup Exposes Power-User Config ✅ DONE

**Current state:** Quick Drill preset (10 questions, unlimited time) is the primary CTA. Custom Drill Options hidden behind an "Advanced" toggle. True-false-list instructions tooltip shown below the Quick Drill button. Negative-phrased questions capped at 10%. "New Drill" is the primary action on results screen.

**Remaining:** None — fully implemented.

---

## Section 3: Navigation & Flow Friction (Medium — Adds Unnecessary Taps)

### 3.1 Home → First Practice Path ✅ DONE

**Current state:** Home CTA is context-aware: `verseCount === 0` → "ADD YOUR FIRST VERSE" → Arsenal; `dailyCompleted` → "EXTRA PRACTICE"; `streak > 0` → "CONTINUE STREAK"; default → "START DAILY DRILL". Quick-start cards (Single Focus, Auto Pilot, Burst Fire) auto-configure and launch sessions via the zustand store `startTraining`/`consumeTrainingIntent` pattern.

**Remaining:** None — Burst Fire quick-start card now respects progressive unlock (hidden/locked if totalSessions < 1).

### 3.2 Home Screen "RECENT OPERATIONS" is an Empty Label ✅ DONE (Removed)

**Current state:** The "RECENT OPERATIONS" section has been removed from the Home screen. No empty header is shown.

**Remaining:** Consider adding a practice history section with actual data when time permits (low priority — the section was worse empty than absent).

### 3.3 Duplicate "Add to Collection" Flows ✅ DONE

**Current state:** `QuickAddCollectionModal` is used consistently in `practice.tsx` and `quiz.tsx`. `AddVersesModal` is used in `arsenal.tsx` for bulk verse adding (distinct workflow). No duplicate inline collection pickers.

**Remaining:** None — fully implemented.

### 3.4 Voice Ops Has No Session Boundary ✅ DONE

**Current state:** Voice Ops has a session-length selector (5 / 10 / Unlimited verses), a progress bar during sessions ("Verse 3 of 10"), and an "END SESSION" button instead of "ABORT MISSION". Silence timeouts auto-advance with "Speak now — silence will auto-finish" hint.

**Remaining:** None — fully implemented.

---

## Section 4: Component-Specific Fixes (Medium — Polish & Trust)

### 4.1 TargetPractice Auto-Starts Recording ✅ DONE

**Current state:** TargetPractice has a "READY — Tap to Begin" state before recording starts. User must explicitly tap to initiate recording. "Wind conditions" relabeled as "MIC: STANDARD/MODERATE/SENSITIVE".

**Remaining:** None — fully implemented.

### 4.2 SoldierAvatar Equipment is Broken ❌ NOT DONE

**Current state:** The avatar equipment system has purchasable items but equipping them produces zero visual change. Only a mannequin image is shown. ~300 lines of dead style code remain (`soldierHead`, `soldierBody`, `soldierLegs`, `swordHilt`, etc.). VP fallback `valorPoints || 100` shows "100" for users with zero VP.

**Fix:**
- Either implement equipment layering (simple colored overlays per slot) or remove the equipment store from The Barracks
- Remove all dead style code
- Fix VP fallback: show "0" or initialize VP to 100 explicitly

### 4.3 Battle Mode "UNAUTHORIZED DISCLOSURE" Alert ✅ DONE

**Current state:** Both `AmmunitionCard` and `ScriptureCard` now use inline peek-penalty banners instead of Alert.alert. Tapping the eye icon in battle mode shows a warning banner ("Peek penalty: 0 VP for this verse. Tap again to reveal.") that auto-dismisses after 3 seconds. A second tap reveals the verse.

**Remaining:** None — fully implemented.

### 4.4 WelcomeModal Typewriter is Unskippable ✅ DONE

**Current state:** WelcomeModal no longer uses a typewriter — it's a 3-step animated flow. The home screen has a skippable typewriter (`handleTapReveal`) that reveals full text on tap.

**Remaining:** None — fully implemented.

### 4.5 Splash Screen Hides Too Early ✅ DONE

**Current state:** `SplashScreen.hideAsync()` is gated on `isLoading` state from the zustand store. The splash stays visible until all app data initialization completes.

**Remaining:** None — fully implemented.

---

## Section 5: New UX Features to Add

### 5.1 Onboarding Flow (Multi-Step) ✅ DONE

Merged into 1.1 — implemented as the 3-step WelcomeModal flow.

### 5.2 Contextual Tooltips (First-Run Hints) ❌ NOT DONE

**Current state:** No contextual first-run tooltips exist. `ContextualTooltip` component exists but may not be wired to first-visit logic with AsyncStorage flags.

**Fix:** Implement one-time tooltips on first visit to each major screen (Train, Battle, Arsenal, AmmunitionCard). Store seen-tooltip flags in AsyncStorage.

### 5.3 Quick-Start from Home Screen ✅ DONE

**Current state:** Home screen quick-start cards (Single Focus, Auto Pilot, Burst Fire) auto-configure and launch sessions via the zustand store `startTraining`/`consumeTrainingIntent` pattern. One tap goes directly from Home to the practice screen with the correct mode.

**Remaining:** Quick-start cards should respect progressive unlock gating (e.g., Burst Fire card should be hidden/locked if totalSessions < 1).

### 5.4 Post-Session Summary Cards ❌ NOT DONE

**Current state:** Battle results use native Alert dialogs — non-customizable, dismiss immediately, don't build engagement.

**Fix:** Build a custom summary card component showing accuracy, VP earned, streak status, and a next-action suggestion. Use consistently after all practice sessions and battles.

### 5.5 Achievement Notifications ❌ NOT DONE

**Current state:** Achievements are buried in the Mission Report screen. No in-the-moment celebration overlays.

**Fix:** Build full-screen celebration overlay for milestones (first verse memorized, 7-day streak, rank promotion). Surface achievements in the moment with animation + "Share" button.

### 5.6 Verse Search ❌ NOT DONE

**Current state:** Verse addition requires knowing the exact reference and typing text manually, or importing a PDF. No search that queries built-in Bible data.

**Fix:** Add search accessible from Home/Arsenal that queries `services/bibleApi.ts` and OSIS XML parsing. Let users type "John 3:16" and auto-populate text.

### 5.7 Haptic & Sound Feedback Layer ❌ NOT DONE

**Current state:** Haptics are imported (`expo-haptics`) but used minimally. No consistent feedback layer.

**Fix:** Add audio/haptic layer to key moments: correct recitation → success chime + light haptic; incorrect → soft tone + medium haptic; rank promotion → fanfare + heavy haptic; streak maintained → gentle pulse.

### 5.8 Accessibility Pass ❌ NOT DONE

**Current state:** Many interactive elements lack `accessibilityLabel`. Dynamic Type/font scaling not tested. Touch targets may be undersized on AmmunitionCard. Custom buttons missing `accessibilityRole`.

**Fix:** Add accessibility labels, test with VoiceOver/TalkBack, ensure 44×44pt minimum touch targets, add `accessibilityRole` to custom buttons.

---

## Section 6: Summary — Priority Order

| Priority | Item | Status | Impact | Effort |
|----------|------|--------|--------|--------|
| **P0** | 1.1 Multi-step onboarding | ✅ DONE | New users can't use the app without this | ~~Medium~~ |
| **P0** | 1.2 Pre-load starter collection | ✅ DONE | Every feature is dead without content | ~~Small~~ |
| **P0** | 1.3 Train tab empty state | ✅ DONE | Dead end drives users away | ~~Small~~ |
| **P1** | 2.1 Progressive metaphor labels | ✅ DONE | Reduces translation tax for all new users | ~~Small~~ |
| **P1** | 2.2 Progressive mode unlock | ✅ DONE | Prevents choice paralysis | ~~Medium~~ |
| **P1** | 2.3 AmmunitionCard collapse | ✅ DONE | Reduces visual noise by 60% | ~~Medium~~ |
| **P1** | 2.4 Quiz quick-start preset | ✅ DONE | Reduces config friction | ~~Small~~ |
| **P2** | 3.1 Home CTA context-aware | ✅ DONE | Cuts first-practice taps from 7 to 2 | ~~Small~~ |
| **P2** | 3.2 Fix or remove "RECENT OPERATIONS" | ✅ DONE (removed) | Removes confusing empty section | ~~Small~~ |
| **P2** | 3.3 Unify "add to collection" flow | ✅ DONE | One mental model, not three | ~~Small~~ |
| **P2** | 3.4 Voice Ops session boundary | ✅ DONE | Gives sessions a boundary | ~~Small~~ |
| **P2** | 4.1 TargetPractice manual start | ✅ DONE | Prevents surprise recording | ~~Small~~ |
| **P2** | 4.2 Fix avatar equipment rendering | ❌ NOT DONE | Currently a broken promise | Large |
| **P2** | 4.3 Replace "UNAUTHORIZED DISCLOSURE" | ✅ DONE | Removes dramatic scolding | ~~Small~~ |
| **P3** | 5.1 Contextual tooltips | ❌ NOT DONE | Gentle guidance without forcing | Medium |
| **P3** | 5.2 Quick-start from Home | ✅ DONE | One-tap practice | ~~Medium~~ |
| **P3** | 5.3 Post-session summary cards | ❌ NOT DONE | Motivates next action | Medium |
| **P3** | 5.4 Achievement notifications | ❌ NOT DONE | Emotional reward loops | Medium |
| **P3** | 5.5 Verse search by reference | ❌ NOT DONE | Easiest way to add verses | Medium |
| **P3** | 5.6 Haptic/sound feedback layer | ❌ NOT DONE | Makes the app feel responsive | Medium |
| **P3** | 5.7 Accessibility pass | ❌ NOT DONE | Essential for inclusivity | Large |

### Next Steps — Recommended Order

1. ~~**2.1** — Rename "ABORT MISSION" → "END SESSION" in campaign.tsx files~~ ✅ DONE
2. ~~**4.3** — Update ScriptureCard.tsx to use inline peek-penalty banner instead of Alert.alert~~ ✅ DONE
3. ~~**2.4** — Add Quick Drill preset to quiz config~~ ✅ DONE
4. ~~**3.4** — Add session-length selector to Voice Ops / Auto Pilot~~ ✅ DONE (already implemented)
5. ~~**4.1** — Add "READY — Tap to begin" state to TargetPractice~~ ✅ DONE (already implemented)
6. ~~**3.3** — Audit and unify add-to-collection flows~~ ✅ DONE (QuickAddCollectionModal used consistently)
7. ~~**5.2** — Quick-start cards should respect progressive unlock gating~~ ✅ DONE
8. **5.3** — Post-session summary cards (medium effort, high engagement impact)
9. **5.5** — Verse search (medium effort, high utility)

### The Updated Summary

**The new user onboarding path is fixed — 3-step flow, starter content, and context-aware CTAs now get users to their first practice in under 60 seconds. All friction-reduction work is also done: quiz config has a Quick Drill preset, voice ops has session boundaries, TargetPractice requires manual start, all "ABORT MISSION" labels are now "END SESSION", duplicate collection flows are unified, the ScriptureCard peek penalty uses inline banners, and quick-start cards respect progressive unlocks. The remaining work is about adding engagement features (summary cards, achievements, search, haptic/sound feedback, accessibility, and verse search).**