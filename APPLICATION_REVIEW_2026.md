# SpiritAmmo Full App Review — April 2026

## Executive Summary

SpiritAmmo is a scripture memorization app with a military training theme, built on Expo SDK 55 + React Native. The app has a rich feature set (voice practice, EPUB import, campaigns, rankings, squads) but has accumulated significant technical debt that will compound without intervention. This review identifies the highest-impact problems and provides a prioritized remediation plan.

---

## 1. CRITICAL — Zustand Store is a God Object

**File:** `hooks/zustandStore.ts` — ~1,500 lines

The store handles everything: DB initialization, scripture CRUD, collection management, user stats, campaigns, streaks, ranks, avatar data, practice logs. Every component that calls `useAppStore()` subscribes to ALL state changes, causing unnecessary re-renders.

**Impact:** Performance degrades as data grows. A single practice session update re-renders every connected component.

**Fix:**
- Split into proper Zustand slices using `create` + `combine` (the `stores/` directory already has `createAvatarSlice.ts` as a template)
- Use selectors: `useAppStore(s => s.collections)` instead of `useAppStore()`
- Move async DB logic out of the store into services

**Suggested slice decomposition:**
```
stores/
  createScriptureSlice.ts    — scriptures, CRUD, search
  createCollectionSlice.ts   — collections, chapters, imports
  createPracticeSlice.ts     — sessions, logs, accuracy updates
  createUserSlice.ts         — stats, settings, rank, streak
  createCampaignSlice.ts     — campaign progress
  createAvatarSlice.ts       — already exists
```

---

## 2. CRITICAL — Speech Recognition Triplication

Three overlapping implementations exist simultaneously:

| File | Lines | Library |
|------|-------|---------|
| `services/voiceRecognition.ts` | 468 | `@react-native-voice/voice` |
| `services/speechRecognition.ts` | 334 | `expo-speech-recognition` + whisper |
| `hooks/useSpeechRecognition.ts` | — | wraps `expo-speech-recognition` |

**Fix:** Pick one (recommend `expo-speech-recognition` since it's an Expo ecosystem library), delete the others, update all consumers.

---

## 3. HIGH — Massive Components Need Decomposition

| Component | Lines | Problem |
|-----------|-------|---------|
| `TargetPractice.tsx` | 1,344 | Core practice UI + state + voice + scoring |
| `CollectionDetailModal.tsx` | 1,428 | Collection view + chapter navigation + stats + import |
| `FileUploader.tsx` | 1,066 | Upload + extraction + verse selection + import |
| `VoiceRecorder.tsx` | 1,042 | Recording + playback + quality + storage |
| `services/analytics.ts` | 1,378 | 6+ provider implementations in one file |

**Fix:** Extract sub-components and custom hooks. For example, `TargetPractice` should split into:
- `usePracticeSession` hook (state, scoring, voice)
- `PracticeHUD` component (score display, progress)
- `VerseDisplay` component (text rendering, highlighting)

---

## 4. HIGH — Unused Dependencies Bloat Bundle

| Package | Status |
|---------|--------|
| `@tanstack/react-query` | Initialized in root layout, never used in any component |
| `react-native-fs` | Duplicates `expo-file-system` |
| `openai` (full SDK) | Only used for chat completions — can use REST API instead |

`@tanstack/react-query` adds ~15KB gzipped for zero usage.

---

## 5. HIGH — Mock Data in JavaScript Bundle

`mocks/collections-raw.ts` is **2,956 lines** of JavaScript compiled into the bundle. This should be a JSON file loaded lazily or moved to SQLite at build time.

---

## 6. MEDIUM — AsyncStorage Startup Bottleneck

`initializeAppData()` makes 5+ sequential AsyncStorage reads (settings, stats, campaigns, avatar, data-loaded flag). These should be batched:

```typescript
// Before: 5 sequential reads
const settings = await AsyncStorage.getItem(SETTINGS_KEY)
const stats = await AsyncStorage.getItem(STATS_KEY)
const campaigns = await AsyncStorage.getItem(CAMPAIGNS_KEY)
// ...

// After: 1 batched read
const [[, settings], [, stats], [, campaigns]] = await AsyncStorage.multiGet([
  SETTINGS_KEY, STATS_KEY, CAMPAIGNS_KEY
])
```

---

## 7. MEDIUM — Duplicated Business Logic

| Logic | Location 1 | Location 2 |
|-------|-----------|-----------|
| Rank calculation | `zustandStore.ts` `calculateRank()` | `services/militaryRanking.ts` |
| Streak calculation | `zustandStore.ts` `updateUserStats()` | `services/streakManager.ts` |
| Theme colors | `constants/colors.ts` | Inline in 15+ components |
| Analytics events | `AnalyticsEventType` enum | `Analytics.Events` object |

---

## 8. MEDIUM — Type Safety Gaps

Widespread `any` usage:
- `zustandStore.ts`: `node: any`, `provisionCampaignScripture` params
- `profile.tsx`: `practiceLogs: any[]`
- `mission-report.tsx`: `militaryProfile: any`
- `analytics.ts`: `Record<string, any>` for event properties

---

## 9. MEDIUM — No Test Coverage for Core Flows

Only 7 test files exist. Zero tests for:
- Zustand store actions
- Database operations (CRUD)
- EPUB extraction pipeline
- Bible API service
- Any screen-level component
- Practice session flow

---

## 10. LOW — Minor Hygiene

- `.DS_Store` files committed to git
- `valorPointss.test.ts` has triple-s typo
- Extensive `console.log` in production code (~100+ instances)
- Both `expo-file-system` and `react-native-fs` in dependencies

---

## Prioritized Remediation Plan

### Sprint 1 — Performance Foundation (highest ROI)
1. Split Zustand store into slices with proper selectors
2. Remove `@tanstack/react-query` dependency
3. Batch AsyncStorage reads in `initializeAppData()`
4. Add `React.memo` to heavy components with stable selectors

### Sprint 2 — Code Health
5. Consolidate speech recognition to one library
6. Move `collections-raw.ts` to JSON file
7. Remove `react-native-fs` in favor of `expo-file-system`
8. Replace `openai` SDK with direct REST calls

### Sprint 3 — Maintainability
9. Decompose components >800 lines into sub-components
10. Deduplicate rank/streak logic
11. Add proper TypeScript types (eliminate `any`)
12. Split `analytics.ts` provider implementations

### Sprint 4 — Testing & Quality
13. Add unit tests for store slices
14. Add integration tests for DB operations
15. Add screen-level tests for practice and collection flows
16. Set up CI with test gates

---

## Architecture Diagram (Current vs Target)

### Current
```
Component → useAppStore() → Zustand God Store (1500 lines)
                               ↓
                    SQLite + AsyncStorage + Convex
```

### Target
```
Component → useAppStore(selector) → Zustand Slices (combined)
                    ↓                    ↓
              ScriptureSlice      CollectionSlice    PracticeSlice    ...
                    ↓                    ↓                 ↓
              SQLite Service    Collection Service  Practice Service
```

Each slice owns its state shape, its actions call service functions, services handle DB I/O. Components subscribe to only the slices they need.
