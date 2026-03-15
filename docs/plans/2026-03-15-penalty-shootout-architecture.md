# Penalty Shootout Feature Architecture

## 1. Executive summary

The repo already contains a frontend-only prototype at `src/games/arcade/penalty-neural-keeper/index.jsx`. It proves that a five-zone penalty game is fun, but it keeps match rules, goalkeeper AI, shot resolution, and adaptation entirely in the browser.

That is the wrong boundary for the feature you requested because:

- match integrity can be manipulated from devtools if the decisive logic stays client-side;
- adaptive AI loses value if the client can inspect or bypass it;
- team progression, rival profiles, stats, and tournaments need a persistent source of truth;
- a frontend-only loop makes difficulty tuning, telemetry, and balancing much harder.

Recommended product direction:

1. Keep rendering, animation, audio, and player input in React.
2. Move match state, goalkeeper AI, shot resolution, rival configuration, and stats to backend.
3. Use the current Node `server/` folder as the implementation path for this repo now.
4. Keep service contracts clean so the same module can later be migrated to Spring Boot without rewriting the frontend.

Default gameplay scope for v1:

- Option A: user attacks only, rival attack is simulated on backend.
- Classic 5-shot shootout plus sudden death.
- Five shot zones: `down-left`, `down-right`, `top-left`, `top-right`, `center`.
- Team-based rivals with distinct goalkeeper behavior and difficulty profiles.
- Adaptive goalkeeper AI with recency, frequency, transition bias, and controlled randomness.

Prepared for v2:

- Option B where the user also controls the goalkeeper on defensive turns.
- Extra shot inputs: power, precision, timing, spin.
- Tournaments, progression, seasonal leaderboards, weather, stadium variants.

## 2. Why the critical logic belongs in backend

### 2.1 Backend-owned responsibilities

The backend should own:

- rival catalog and difficulty presets;
- match creation and match lifecycle;
- turn ordering and shootout rules;
- adaptive goalkeeper decision making;
- shot outcome resolution;
- idempotent shot registration;
- persistent player stats and rival records;
- anti-tampering validation.

### 2.2 Frontend-owned responsibilities

The frontend should own:

- menu flow and rival selection UX;
- input capture for shot zone selection;
- visual scene rendering;
- local animation timeline;
- sound playback;
- responsive layout and HUD;
- optimistic loading states and retry UX.

### 2.3 Why the AI must not live only in frontend

If the goalkeeper AI stays in frontend, the player can inspect future reads, patch probability weights, repeat requests locally, or brute-force patterns. Moving AI server-side protects:

- fairness;
- balancing;
- difficulty progression;
- telemetry quality;
- future ranked/tournament modes.

The frontend still receives explainable metadata from the backend, for example:

- predicted dive lane;
- confidence score;
- adaptation score;
- save window timing;
- whether the keeper guessed, reacted late, or committed to the wrong zone.

That gives the player readable behavior without exposing the full internal model.

## 3. Target architecture

## 3.1 Primary implementation for this repo now

Use a dedicated Node ESM service under `server/penalty-shootout/` because the current repo already ships a lightweight Node HTTP backend (`server/cosmic-vanguard-backend.mjs`).

Advantages:

- zero new runtime stack for the first release;
- same deployment style as the existing backend script;
- fast iteration with JSON config and file-based persistence;
- easy to replace later with database storage.

### Runtime split

Frontend:

- React page and components under `src/games/arcade/penalty-shootout/`
- CSS scoped to the feature
- API client to the backend
- animation state machine

Backend:

- HTTP routes
- domain services
- in-memory active match store with persistence snapshots
- file-backed or database-backed stats store
- config-driven teams and difficulty profiles

## 3.2 Secondary enterprise-ready option

If the platform standard is Spring Boot, keep exactly the same domain boundaries and API contracts, then implement:

- `controller` layer for REST endpoints
- `service` layer for rules, AI, and stats
- `repository` layer for `PenaltyMatch`, `PenaltyShot`, `PenaltyTeamConfig`, `UserPenaltyStats`
- scheduled cleanup job for abandoned active matches
- Redis for active matches, PostgreSQL for persistent stats

The frontend does not change if route shapes and DTOs stay stable.

## 3.3 High-level sequence

1. Frontend loads team catalog.
2. User selects rival and difficulty.
3. Frontend calls `POST /api/penalty-shootout/matches`.
4. Backend creates active match state and returns match snapshot plus first rival context.
5. User selects a zone.
6. Frontend sends shot command with idempotency key.
7. Backend validates turn state, runs goalkeeper AI, resolves shot, simulates rival turn if needed, updates match state, and returns an animation payload.
8. Frontend animates the exact shot and goalkeeper response from the payload.
9. Flow repeats until normal finish or sudden death resolution.
10. Backend closes match, persists stats, and returns final summary.

## 4. Proposed folder structure

```text
src/
  games/
    arcade/
      penalty-shootout/
        index.jsx
        PenaltyShootoutPage.jsx
        PenaltyShootoutPage.css
        components/
          PenaltyShootoutIntro.jsx
          PenaltyTeamSelector.jsx
          PenaltyMatchHeader.jsx
          PenaltyArena.jsx
          PenaltyField.jsx
          GoalFrame.jsx
          Ball.jsx
          Goalkeeper.jsx
          Shooter.jsx
          ShotControls.jsx
          Scoreboard.jsx
          PenaltyHistory.jsx
          RivalCard.jsx
          MatchResultModal.jsx
          LoadingOverlay.jsx
        hooks/
          usePenaltyShootoutMatch.js
          usePenaltyShootoutAnimation.js
          usePenaltyShootoutInput.js
        state/
          penaltyShootoutReducer.js
          penaltyShootoutInitialState.js
          penaltyShootoutSelectors.js
        api/
          penaltyShootoutApi.js
        domain/
          penaltyShootoutConstants.js
          penaltyShootoutHelpers.js
          penaltyShootoutAnimationMap.js
          penaltyTrajectory.js
          goalkeeperPresentation.js
        assets/
          README.md
```

```text
server/
  penalty-shootout/
    index.mjs
    routes/
      penaltyShootoutRoutes.mjs
    controllers/
      penaltyShootoutController.mjs
      penaltyStatsController.mjs
    services/
      penaltyShootoutService.mjs
      goalkeeperAiService.mjs
      penaltyPhysicsResolver.mjs
      rivalTurnSimulationService.mjs
      teamConfigService.mjs
      statsService.mjs
      idempotencyService.mjs
    repositories/
      activeMatchRepository.mjs
      matchHistoryRepository.mjs
      playerStatsRepository.mjs
      teamConfigRepository.mjs
    domain/
      entities/
        PenaltyMatch.mjs
        PenaltyRound.mjs
        PenaltyShot.mjs
        PenaltyTeamConfig.mjs
        PenaltyDifficultyProfile.mjs
        UserPenaltyStats.mjs
      dto/
        CreateMatchRequestDto.mjs
        PenaltyMatchStateDto.mjs
        PenaltyShotRequestDto.mjs
        PenaltyShotResultDto.mjs
        GoalkeeperDecisionDto.mjs
        TeamDto.mjs
        MatchSummaryDto.mjs
      enums/
        MatchStatus.mjs
        MatchPhase.mjs
        ShotZone.mjs
        ShotOutcome.mjs
        DifficultyTier.mjs
      validators/
        penaltyShootoutValidators.mjs
    config/
      penaltyServerConfig.mjs
    utils/
      random.mjs
      math.mjs
      clock.mjs
      http.mjs
      errors.mjs
```

```text
server/data/
  penalty-shootout/
    teams.sample.json
    difficulty-profiles.sample.json
    matches/
    stats/
```

## 5. Backend class and file responsibilities

| File | Responsibility | Input | Output | Notes |
| --- | --- | --- | --- | --- |
| `penaltyShootoutRoutes.mjs` | Route registration | HTTP requests | Bound handlers | Keeps routing separate from logic |
| `penaltyShootoutController.mjs` | Request parsing, validation, status mapping | REST payloads | DTO responses | No domain rules |
| `penaltyStatsController.mjs` | Stats endpoints | Query params, auth context | Stats DTOs | Read-only in v1 except match finalize |
| `penaltyShootoutService.mjs` | Match lifecycle orchestration | Match commands | Updated match snapshot | Main use-case service |
| `goalkeeperAiService.mjs` | Adaptive keeper decisions | Shot history, team profile, difficulty | Dive decision and confidence | Pure, unit-test friendly |
| `penaltyPhysicsResolver.mjs` | Logical shot resolution | Shot command + keeper decision | Shot outcome + animation payload | Backend decides outcome, frontend replays it |
| `rivalTurnSimulationService.mjs` | Simulate rival attempts for Option A | Match context | Rival shot result | Separate from player shot logic |
| `teamConfigService.mjs` | Rival and difficulty lookup | Team id, difficulty id | Team config aggregate | Reads JSON now, DB later |
| `statsService.mjs` | Aggregate match and player metrics | Finished match | Updated stats | Persistent only |
| `idempotencyService.mjs` | Prevent duplicate shot writes | Match id, request key | Existing or new result | Required for double-click safety |
| `activeMatchRepository.mjs` | Active match store | Match entity | Read/write active state | Memory + disk snapshot or Redis |
| `matchHistoryRepository.mjs` | Archived finished matches | Match summary | Persistent record | Optional in v1, useful for analytics |
| `playerStatsRepository.mjs` | Persistent user stats | User stats aggregate | Read/write stats | JSON file now, DB later |
| `teamConfigRepository.mjs` | Config access layer | Team/difficulty query | Parsed config | Hidden source of truth |

## 6. Domain model

## 6.1 Core entities

### `PenaltyTeamConfig`

Fields:

- `id`
- `slug`
- `displayName`
- `shortName`
- `crestAsset`
- `colors`
- `uniform`
- `stadiumThemeId`
- `difficultyProfileId`
- `goalkeeperProfile`
- `crowdPalette`
- `enabled`

### `PenaltyDifficultyProfile`

Fields:

- `id`
- `tier`
- `displayName`
- `adaptationRate`
- `recencyWeight`
- `transitionWeight`
- `explorationNoise`
- `reactionMsMin`
- `reactionMsMax`
- `coverageRadius`
- `keeperOwnErrorRate`
- `saveBias`
- `bluffRate`
- `misreadRate`
- `rivalShotSkill`

### `PenaltyMatch`

Fields:

- `id`
- `userId`
- `playerTeamId`
- `rivalTeamId`
- `difficultyId`
- `status`
- `phase`
- `currentRound`
- `suddenDeathRound`
- `playerGoals`
- `rivalGoals`
- `playerShotsTaken`
- `rivalShotsTaken`
- `maxInitialShots`
- `turn`
- `shots`
- `goalkeeperMemory`
- `pendingAnimation`
- `winner`
- `createdAt`
- `updatedAt`
- `finishedAt`
- `version`

### `PenaltyShot`

Fields:

- `id`
- `matchId`
- `sequence`
- `round`
- `actor`
- `selectedZone`
- `intendedZone`
- `finalTarget`
- `keeperDecision`
- `outcome`
- `saveProbability`
- `shotPower`
- `shotPrecision`
- `reactionWindowMs`
- `animationPreset`
- `createdAt`

### `UserPenaltyStats`

Fields:

- `userId`
- `matchesPlayed`
- `matchesWon`
- `shootoutsByDifficulty`
- `goalsScored`
- `goalsConceded`
- `savesForced`
- `favoriteZones`
- `conversionByZone`
- `winRateByRival`
- `lastPlayedAt`

## 6.2 Ephemeral state vs persistent state

Separate them explicitly.

Ephemeral state:

- active match turn state;
- goalkeeper short-term memory for the current shootout;
- pending animation payload;
- idempotency key cache.

Persistent state:

- finished matches summary;
- player lifetime stats;
- team and difficulty configuration;
- optional historical shot trends for analytics.

Reason:

- active match data needs low-latency updates and expiration;
- stats need durability and analytics;
- mixing both in a single store makes cleanup and scaling harder.

## 7. Match flow and state machine

## 7.1 UX flow

1. Landing screen
2. Team selector
3. Rival preview card
4. Match briefing
5. Shootout loop
6. Round feedback
7. Final summary
8. Rematch or exit

## 7.2 Backend match phases

Possible `phase` values:

- `lobby`
- `awaiting_player_shot`
- `resolving_player_shot`
- `resolving_rival_shot`
- `between_rounds`
- `finished`
- `abandoned`

## 7.3 Turn flow for Option A

1. Player shot input arrives.
2. Backend validates that match exists and `phase === awaiting_player_shot`.
3. Goalkeeper AI computes dive decision.
4. Physics resolver computes logical outcome and animation payload.
5. Match scoreboard updates.
6. If shootout not decided, backend simulates rival shot.
7. Match scoreboard updates again.
8. Backend checks early win rule.
9. Match returns to `awaiting_player_shot` or `finished`.

## 7.4 Early finish rule

Classic rule:

- after each pair of turns, if one side cannot mathematically catch up within remaining initial shots, finish immediately;
- if tied after five shots each, enter sudden death;
- sudden death ends when both teams have taken the same number of shots and one leads.

## 8. REST API design

Base path:

`/api/penalty-shootout`

## 8.1 `GET /api/penalty-shootout/teams`

Purpose:

- return enabled rivals and display metadata.

Response:

```json
{
  "teams": [
    {
      "id": "harbor-athletic",
      "displayName": "Harbor Athletic",
      "crestAsset": "/assets/penalty/teams/harbor-athletic/crest.svg",
      "colors": {
        "primary": "#0D3B66",
        "secondary": "#F4D35E",
        "accent": "#FAF0CA"
      },
      "stadiumThemeId": "harbor-night",
      "difficultyProfileId": "competitive",
      "goalkeeperStyle": "balanced-reader"
    }
  ]
}
```

Errors:

- `500 config_unavailable`

## 8.2 `POST /api/penalty-shootout/matches`

Purpose:

- create a new shootout.

Request:

```json
{
  "playerTeamId": "player-default",
  "rivalTeamId": "harbor-athletic",
  "difficultyId": "competitive"
}
```

Response:

```json
{
  "matchId": "ps_01hrxv8x2m38",
  "status": "ACTIVE",
  "phase": "awaiting_player_shot",
  "playerTeam": {
    "id": "player-default",
    "displayName": "Your Club"
  },
  "rivalTeam": {
    "id": "harbor-athletic",
    "displayName": "Harbor Athletic"
  },
  "scoreboard": {
    "playerGoals": 0,
    "rivalGoals": 0,
    "playerShotsTaken": 0,
    "rivalShotsTaken": 0,
    "round": 1,
    "remainingInitialShots": 5,
    "suddenDeath": false
  },
  "history": [],
  "goalkeeperRead": {
    "adaptation": 0.18,
    "confidence": 0.14,
    "tendencyZone": null,
    "predictedZone": null
  }
}
```

Validation:

- unknown `rivalTeamId` -> `400 invalid_rival_team`
- unknown `difficultyId` -> `400 invalid_difficulty`
- unavailable team -> `409 team_disabled`

## 8.3 `POST /api/penalty-shootout/matches/{matchId}/shots`

Purpose:

- register one player shot.

Request headers:

- `Idempotency-Key: <uuid>`

Request body:

```json
{
  "selectedZone": "top-left"
}
```

Response:

```json
{
  "matchId": "ps_01hrxv8x2m38",
  "phase": "between_rounds",
  "playerShot": {
    "sequence": 1,
    "selectedZone": "top-left",
    "keeperDecision": {
      "predictedZone": "top-left",
      "tendencyZone": null,
      "adaptation": 0.18,
      "confidence": 0.31,
      "decisionType": "guess"
    },
    "outcome": "SAVE",
    "saveProbability": 0.41,
    "animation": {
      "ballPath": {
        "start": { "x": 540, "y": 515, "z": 0 },
        "control": { "x": 494, "y": 294, "z": 118 },
        "end": { "x": 366, "y": 120, "z": 206 },
        "durationMs": 640
      },
      "keeper": {
        "startX": 540,
        "targetX": 392,
        "reactionMs": 236,
        "diveDurationMs": 370,
        "reachPx": 158
      },
      "resultVfx": "glove-save-high-left"
    }
  },
  "rivalTurn": {
    "outcome": "GOAL",
    "targetZone": "down-right"
  },
  "scoreboard": {
    "playerGoals": 0,
    "rivalGoals": 1,
    "playerShotsTaken": 1,
    "rivalShotsTaken": 1,
    "round": 2,
    "remainingInitialShots": 4,
    "suddenDeath": false
  },
  "goalkeeperRead": {
    "adaptation": 0.29,
    "confidence": 0.37,
    "tendencyZone": "top-left",
    "predictedZone": "top-left"
  },
  "finished": false
}
```

Validation:

- invalid `matchId` -> `404 match_not_found`
- match finished -> `409 match_finished`
- wrong phase -> `409 invalid_match_phase`
- duplicated key with same payload -> `200` same result
- duplicated key with different payload -> `409 idempotency_conflict`
- invalid zone -> `400 invalid_selected_zone`

## 8.4 `GET /api/penalty-shootout/matches/{matchId}`

Purpose:

- fetch match state after reload or reconnect.

Response:

- current scoreboard
- history
- pending animation if the previous response was missed
- phase and finish summary if match ended

## 8.5 `POST /api/penalty-shootout/matches/{matchId}/finish`

Purpose:

- optional explicit finish command if the client wants an acknowledged close.

Normally the backend should auto-close as soon as the game is decided. This endpoint is useful for:

- analytics confirmation;
- client-side "claim rewards" flow;
- abandoned match cleanup in a later mode.

## 8.6 `GET /api/penalty-shootout/stats`

Purpose:

- player overview and rival breakdown.

Response:

```json
{
  "userId": "user_42",
  "matchesPlayed": 28,
  "matchesWon": 17,
  "winRate": 0.607,
  "favoriteZones": [
    { "zone": "top-left", "share": 0.29 },
    { "zone": "down-right", "share": 0.24 }
  ],
  "conversionByZone": [
    { "zone": "top-left", "rate": 0.71 },
    { "zone": "center", "rate": 0.44 }
  ],
  "byRival": [
    { "rivalTeamId": "harbor-athletic", "played": 6, "won": 5 }
  ]
}
```

## 9. Request validation and robustness

Required protections:

- validate `matchId`;
- validate match ownership if user accounts exist;
- reject shots if the match is not awaiting player input;
- reject invalid zones;
- reject stale client versions if needed;
- use idempotency keys on shot endpoint;
- increment optimistic lock `version` on match writes;
- protect against duplicate network retries;
- do not accept score values from frontend;
- do not accept direct keeper choice from frontend in Option A.

Recommended implementation details:

- store a short-lived idempotency record per `matchId + key`;
- wrap shot resolution in a single atomic write to active match state;
- add a server-generated `commandToken` in the match snapshot if you want even stricter turn sequencing later.

## 10. Goalkeeper AI design

## 10.1 Design goals

The keeper must feel adaptive, but never omniscient.

What the player should perceive:

- "It noticed that I repeat top-left."
- "It reacts faster when I become predictable."
- "It still guesses wrong sometimes."
- "Hard rivals feel smarter, not rigged."

## 10.2 Input history structure

Use a compact per-match history array:

```json
[
  {
    "sequence": 1,
    "selectedZone": "top-left",
    "outcome": "SAVE",
    "timestamp": "2026-03-15T16:22:03.448Z"
  }
]
```

For AI calculations, derive:

- `zoneCounts`
- `weightedRecencyCounts`
- `transitionCounts[fromZone][toZone]`
- `repeatStreakLength`
- `alternationPatternStrength`
- `lastZone`
- `lastTwoZones`

## 10.3 Zone score algorithm

Each zone gets a score:

```text
score(zone) =
  basePrior(zone)
  + frequencyWeight * normalizedFrequency(zone)
  + recencyWeight * normalizedRecency(zone)
  + transitionWeight * normalizedTransition(lastZone -> zone)
  + repeatBonus(zone)
  + tendencyBonus(zone)
  + profileBias(zone)
  + noise(zone)
```

Suggested defaults:

- `basePrior(zone) = 0.20`
- `frequencyWeight = 0.22 to 0.34`
- `recencyWeight = 0.24 to 0.38`
- `transitionWeight = 0.10 to 0.22`
- `repeatBonus = 0.00 to 0.16`
- `tendencyBonus = 0.00 to 0.12`

### Frequency

`normalizedFrequency(zone)` is the share of total shots sent to that zone.

### Recency

Use exponential decay:

```text
recencyContribution = sum(zoneMatch ? decay^age : 0)
```

Recommended `decay`:

- amateur: `0.62`
- competitive: `0.74`
- professional: `0.82`
- elite: `0.88`

This makes the latest 2-3 shots matter more.

### Transition bias

Track where the player goes after a previous zone. Example:

- after `down-left`, they often go `top-left`
- after `center`, they often go `down-right`

This lets the keeper read patterns beyond raw repetition.

### Repeat bonus

If the last 2 shots were identical and the current candidate zone matches them:

- add a repeat bonus proportional to difficulty and current adaptation.

### Tendency bonus

If one zone is clearly dominant over the last N shots:

- mark it as `tendencyZone`
- add a small boost

## 10.4 Adaptation state

Adaptation should increase during the shootout, not jump instantly.

```text
adaptation = clamp(
  baseAdaptation + shotsTaken * adaptationRate + predictability * predictabilityWeight,
  minAdaptation,
  maxAdaptation
)
```

Where `predictability` is derived from:

- dominance of one zone;
- consecutive repetitions;
- simple alternating patterns;
- reduced entropy of recent shots.

Suggested entropy-safe intuition:

- if the player distributes 5 zones evenly, predictability is low;
- if the player cycles between 2 zones or repeats 1 zone, predictability rises quickly.

## 10.5 Final zone selection

Do not always pick the top score. Use weighted sampling.

Steps:

1. Compute raw zone scores.
2. Clamp negatives to a floor.
3. Normalize scores to a probability distribution.
4. Apply exploration noise from the difficulty profile.
5. Sample the final dive zone.

That produces believable behavior:

- high score zones are more likely;
- the keeper still misses;
- harder rivals reduce noise, not eliminate uncertainty.

## 10.6 Decision type

Return an interpretable `decisionType`:

- `guess`
- `read-pattern`
- `late-reaction`
- `wrong-commit`
- `hold-center`

This is useful for:

- debugging;
- tuning;
- player-facing commentary;
- QA assertions.

## 10.7 Difficulty parameter table

| Tier | adaptationRate | recencyWeight | transitionWeight | explorationNoise | reactionMs | coverageRadius | keeperOwnErrorRate | misreadRate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `amateur` | 0.05 | 0.22 | 0.10 | 0.18 | 260-380 | 122 | 0.18 | 0.22 |
| `competitive` | 0.08 | 0.28 | 0.14 | 0.12 | 220-330 | 138 | 0.12 | 0.16 |
| `professional` | 0.11 | 0.34 | 0.18 | 0.08 | 190-290 | 152 | 0.08 | 0.10 |
| `elite` | 0.14 | 0.38 | 0.22 | 0.05 | 165-250 | 166 | 0.05 | 0.06 |

## 10.8 Anti-frustration rules

To keep the game fair:

- cap save probability by zone and difficulty;
- keep top-corner shots inherently harder to save;
- inject keeper own-error rate even on good reads;
- avoid instant max adaptation after one repeated shot;
- never let a single deterministic rule guarantee a save.

Recommended save probability caps:

- amateur: `0.58`
- competitive: `0.64`
- professional: `0.70`
- elite: `0.76`

## 10.9 AI unit tests

Unit tests should verify:

- repeated `top-left` increases `top-left` dive probability;
- recent shots matter more than early shots;
- elite has lower noise than amateur;
- evenly distributed history keeps probabilities near-uniform;
- invalid history never crashes and falls back to base priors;
- same input and fixed RNG seed produce stable outputs in test mode.

## 11. Shot resolution model

## 11.1 Why resolve on backend first

The backend decides the truth so the client cannot rewrite outcomes. The frontend then animates a result that already has:

- keeper target;
- keeper reaction delay;
- ball final coordinates;
- outcome type;
- rebound or goal net effect.

That is how you get both integrity and believable presentation.

## 11.2 Logical resolution inputs

Inputs:

- selected zone;
- team profile;
- difficulty profile;
- current goalkeeper decision;
- optional future shot modifiers: power, precision, timing, spin;
- RNG seed or server RNG result.

Outputs:

- `GOAL`
- `SAVE`
- `MISS`
- `POST`

V1 can keep `MISS` and `POST` low-frequency and driven by shot variance.

## 11.3 Backend resolution formula

Example conceptual flow:

```text
effectiveAccuracy =
  zoneBaseAccuracy
  + difficultyShotAssist
  - pressurePenalty
  - optionalTimingPenalty
  - optionalPowerPenalty
  + smallRandomSpread

saveChance =
  baseSaveChanceByDistance
  + keeperCoverageBonus
  + adaptationBonus
  + confidenceBonus
  - topCornerPenalty
  - shotPrecisionBonus
```

Decision order:

1. Determine whether the shot drifts off target.
2. If on target, determine whether the keeper reaches it.
3. If keeper reaches it, determine save type:
   - clean catch
   - parry
   - glove touch out
4. Return final outcome plus animation payload.

## 12. Physics and animation design

## 12.1 Ball presentation

Use a pseudo-3D path rendered in 2D:

- x/y on the field plane;
- z as visual lift only;
- scale increases while the ball travels toward the goal;
- shadow separates from the ball when height increases.

Recommended frontend trajectory model:

- quadratic or cubic bezier for x/y;
- independent easing curve for z;
- sprite rotation linked to velocity;
- slight per-shot micro-variation provided by the backend payload.

Shot archetypes:

- `high-corner`: higher z arc, faster snap near the end
- `low-corner`: flatter arc, faster ground shadow
- `center-drive`: lower curve, shorter keeper travel

## 12.2 Goalkeeper presentation

Use transform-driven animation, not frame-heavy sprite dependence, for the main body:

- translateX for lateral dive
- translateY for vertical lift
- rotate for torso tilt
- scaleX and scaleY for stretch
- separate glove layer for impact accent

Core timing values:

- `reactionMs`
- `pushOffMs`
- `airborneMs`
- `landingMs`
- `saveWindowMs`

These should come from backend ranges and frontend animation presets.

## 12.3 Collision perception

The player must feel the ball was saved because the keeper reached the path, not because the result text said so.

Achieve that by:

- syncing keeper hand position with intercept point;
- using one animation preset per result family;
- showing net ripple only on goals;
- showing glove flash and deflected trail on saves;
- showing post shake on `POST`.

## 12.4 Animation state machine

Use a local animation state machine:

- `idle`
- `runup`
- `strike`
- `ball-flight`
- `keeper-reaction`
- `impact`
- `result-hold`
- `transition-next`

The state machine should be driven by the backend payload timestamps, not guessed from the frontend.

## 13. Frontend design

## 13.1 Component responsibilities

| Component | Responsibility |
| --- | --- |
| `PenaltyShootoutPage.jsx` | Orchestrates page flow, data fetch, reducer, and high-level layout |
| `PenaltyShootoutIntro.jsx` | Entry CTA and feature explanation |
| `PenaltyTeamSelector.jsx` | Rival grid, difficulty picker, team preview |
| `PenaltyArena.jsx` | Combines field scene, actors, VFX, and scoreboard overlay |
| `PenaltyField.jsx` | Draws grass, penalty spot, goal area, stadium depth layers |
| `GoalFrame.jsx` | Posts, net, net ripple states |
| `Ball.jsx` | Ball sprite, spin, scale, shadow |
| `Goalkeeper.jsx` | Keeper body rig and dive transforms |
| `Shooter.jsx` | Run-up and strike pose |
| `ShotControls.jsx` | Five-zone input buttons and disabled states |
| `Scoreboard.jsx` | Shootout score, shot markers, sudden death indicator |
| `PenaltyHistory.jsx` | Visual history chips for player and rival |
| `MatchResultModal.jsx` | Victory/defeat summary and replay actions |
| `LoadingOverlay.jsx` | Spinner and degraded network fallback |

## 13.2 Frontend state management

Recommended approach:

- local `useReducer` inside `usePenaltyShootoutMatch`
- no Redux for v1
- no global context except existing app-wide language/session if already present

Why `useReducer` is the right fit:

- the match state is event-driven and state-machine-like;
- many updates are related and should be atomic;
- replaying backend snapshots into reducer actions is cleaner than multiple `useState` calls;
- it keeps the feature isolated from the rest of the platform.

Suggested reducer state:

- `view`
- `loading`
- `error`
- `teams`
- `selectedRivalId`
- `selectedDifficultyId`
- `matchId`
- `matchStatus`
- `matchPhase`
- `scoreboard`
- `history`
- `goalkeeperRead`
- `activeAnimation`
- `controlsLocked`
- `lastShotResult`
- `resultSummary`
- `pendingRequestKey`

## 13.3 Data flow

1. `PenaltyShootoutPage` fetches teams.
2. User selects rival and difficulty.
3. `startMatch` calls backend and dispatches `MATCH_STARTED`.
4. User clicks a zone.
5. UI dispatches `SHOT_SUBMIT_STARTED` and locks controls.
6. Backend response dispatches `SHOT_RESOLVED`.
7. `usePenaltyShootoutAnimation` plays timeline.
8. At timeline end, reducer dispatches `ANIMATION_FINISHED`.
9. Controls unlock if match not finished.

## 13.4 CSS organization

The repo currently centralizes a lot of CSS in `src/styles.css`. For this feature, do not grow that file again.

Recommended:

- `PenaltyShootoutPage.css` imported directly by the feature
- prefix every selector with `.penalty-shootout`
- CSS variables for team colors, stadium tone, and accent colors

Example variable groups:

- `--ps-grass-1`
- `--ps-grass-2`
- `--ps-goal-white`
- `--ps-ui-panel`
- `--ps-ui-accent`
- `--ps-team-primary`
- `--ps-team-secondary`

## 14. Teams and rivals system

## 14.1 Configuration strategy

Do not hardcode rivals in JSX. Use backend-owned config.

Config source order:

1. JSON files for v1
2. database table for production
3. admin panel later

Each rival should define:

- identity
- crest
- colors
- stadium theme
- difficulty profile reference
- goalkeeper behavior profile
- optional commentary text and intro flavor

## 14.2 Goalkeeper style profiles

Example styles:

- `balanced-reader`
- `late-spring-cat`
- `aggressive-guesser`
- `center-line-trapper`
- `pattern-hunter`

These styles tune weights on top of the base difficulty profile.

Example:

- `aggressive-guesser` dives earlier, higher bluff rate, larger wrong-commit swings
- `pattern-hunter` reacts more strongly to repeats and transitions
- `center-line-trapper` holds center longer and punishes predictable center shots

## 15. Assets system

## 15.1 Required asset list

- ball
- goal frame
- net
- grass texture layers
- penalty spot and six-yard box marks
- shooter body
- goalkeeper body
- goalkeeper gloves
- team uniforms
- rival crests
- stadium backgrounds
- crowd strip
- scoreboard panel
- goal, save, miss icons
- shot trail VFX
- impact flash
- post hit spark
- shadows

## 15.2 Recommended formats

| Asset type | Format | Reason |
| --- | --- | --- |
| Team crests | `SVG` | Sharp at all sizes, light |
| UI icons | `SVG` | Easy recolor and animate |
| Ball | `PNG` or sprite sheet | Needs rich shading |
| Keeper and shooter base bodies | `PNG` layered parts or sprite sheet | Cleaner silhouettes and controlled animation |
| Goal frame and net | `SVG` or layered PNG | Goal frame scales well, net can be stylized |
| Grass background | `PNG` tile + CSS overlays | Best performance |
| Stadium backdrop | `WebP` | Large image, compressed |
| Impact VFX | sprite sheet PNG | Cheap and crisp |

## 15.3 Recommended dimensions

- ball: `256x256`
- player full-body: `768x768`
- goalkeeper full-body: `768x768`
- goal frame scene layer: `1600x900`
- stadium background desktop: `1920x1080`
- stadium background mobile crop-safe: `1080x1920`
- crests: `512x512`
- UI panel slices: `1024x512`
- icons: `128x128`

## 15.4 Folder structure

```text
public/assets/penalty/
  teams/
    harbor-athletic/
      crest.svg
      kit-home.png
      kit-away.png
    iron-keepers/
      crest.svg
      kit-home.png
      kit-away.png
  characters/
    shooter/
      shooter-base.png
      shooter-runup.png
      shooter-strike.png
    goalkeeper/
      keeper-base.png
      gloves.png
      dive-left.png
      dive-right.png
      hold-center.png
  stadiums/
    harbor-night.webp
    metro-floodlights.webp
    summit-arena.webp
  field/
    grass-base.webp
    grass-detail.webp
    goal-frame.svg
    net.png
    shadow-soft.png
  ui/
    scoreboard-panel.svg
    history-slot.svg
    icon-goal.svg
    icon-save.svg
    icon-miss.svg
  effects/
    shot-trail.png
    glove-flash.png
    net-ripple.png
    post-hit.png
```

## 15.5 Naming conventions

- use lowercase kebab-case
- suffix with role when variants exist
- avoid team names inside shared assets

Examples:

- `keeper-dive-left-high.png`
- `scoreboard-panel-compact.svg`
- `harbor-athletic-crest.svg`

## 16. Animation breakdown

Use the right animation tool for each element.

### CSS or transform animations

- shooter run-up shift
- keeper lateral dive
- UI pulse and panel transitions
- score marker reveal

### Sprite animations

- glove impact flash
- net ripple
- post hit spark
- celebration burst

### State-machine coordinated animations

- full shot sequence
- result hold
- transition to next round
- final celebration or defeat

## 17. Sound design

Minimum cues:

- menu hover
- confirm selection
- whistle start
- run-up footstep
- strike kick
- ball whoosh
- glove save slap
- net impact
- crowd swell
- miss groan
- victory stinger
- defeat sting

Use light audio layering:

- one dry impact sound
- one crowd layer
- one UI feedback layer

## 18. Testing plan

## 18.1 Backend tests

Unit:

- `goalkeeperAiService.test.mjs`
- `penaltyPhysicsResolver.test.mjs`
- `rivalTurnSimulationService.test.mjs`
- `penaltyShootoutRules.test.mjs`

Integration:

- `penaltyShootoutController.test.mjs`
- `activeMatchRepository.test.mjs`
- idempotency duplicate-shot tests

Scenarios to cover:

- valid 5-shot shootout
- early winner before shot 5
- sudden death
- duplicate request key
- invalid phase
- abandoned match reload
- difficulty profile lookup failure

## 18.2 Frontend tests

Use Vitest for component logic and existing QA hooks for runtime checks.

Tests:

- team selector rendering
- shot controls disabled during in-flight request
- reducer transitions on start and shot resolve
- history rendering after each turn
- final modal on match finish
- animation hook consumes backend payload correctly

## 18.3 Gameplay validation

Manual and automated balance sessions should confirm:

- the keeper learns but does not "read minds";
- repeated patterns are punished;
- diversified shooting remains effective;
- elite rivals feel stronger without becoming unfair;
- match-to-match variety remains high.

## 19. Performance plan

Frontend:

- preload critical above-the-fold assets;
- lazy load heavy stadium variants;
- avoid re-rendering the full arena when only the HUD changes;
- use transform and opacity animation instead of layout thrash;
- use a single animation timeline object per shot.

Backend:

- keep active matches in memory or Redis;
- persist summaries asynchronously after response where safe;
- use deterministic helper functions and small DTOs;
- expire abandoned matches with TTL cleanup.

Network:

- shot responses should stay under small JSON payload sizes;
- include only the active shot animation, not the entire match object when unnecessary;
- keep end-to-end shot resolution under roughly `120ms` server time in normal conditions.

## 20. Implementation roadmap

## Phase 0 - Refactor prep

- extract constants and AI helpers from the current monolithic `src/games/arcade/penalty-neural-keeper/index.jsx`
- freeze current frontend prototype as a reference implementation
- add new docs and config samples

Exit criteria:

- current prototype understood and mapped to new boundaries

## Phase 1 - Backend foundation

- create Node backend module under `server/penalty-shootout/`
- implement team config loading
- implement match create/get endpoints
- implement shot endpoint with idempotency
- implement Option A rival simulation

Exit criteria:

- backend can run a full shootout headlessly via tests

## Phase 2 - Frontend integration

- split the current penalty game into modular React components
- replace local AI and scoring with API calls
- lock controls during shot resolution
- animate backend payload accurately

Exit criteria:

- full loop works end to end against backend

## Phase 3 - Production polish

- add real assets
- add richer VFX and audio
- add match summary and stats screen
- add failure handling and reconnect flow

Exit criteria:

- feature feels product-grade on desktop and mobile

## Phase 4 - Expansion

- player-controlled goalkeeper mode
- tournaments
- persistent progression
- ranked ladders
- seasonal rival rotations

## 21. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Frontend animations drift from backend result | Player perceives arbitrariness | Backend returns explicit animation payload with timing and intercept data |
| Keeper AI feels unfair | Churn and frustration | Save caps, own-error rate, weighted sampling, playtest telemetry |
| Monolithic frontend code becomes hard to evolve | Slow iteration | Move to reducer + modular components and isolated domain helpers |
| JSON config grows unmanageable | Content bottleneck | Keep repository layer and schema validation from day one |
| Duplicate shot requests corrupt state | Match inconsistencies | Idempotency keys and optimistic locking |
| Future Spring Boot migration becomes expensive | Rework | Stable DTOs and service boundaries now |

## 22. Concrete Spring Boot mapping

If the platform later standardizes on Java, map the same design as:

```text
com.playforge.penalty
  controller/
    PenaltyShootoutController.java
    PenaltyStatsController.java
  service/
    PenaltyShootoutService.java
    GoalkeeperAiService.java
    PenaltyPhysicsResolver.java
    RivalTurnSimulationService.java
    TeamConfigService.java
    StatsService.java
  service/impl/
    PenaltyShootoutServiceImpl.java
    GoalkeeperAiServiceImpl.java
    PenaltyPhysicsResolverImpl.java
    RivalTurnSimulationServiceImpl.java
    TeamConfigServiceImpl.java
    StatsServiceImpl.java
  repository/
    PenaltyMatchRepository.java
    PenaltyShotRepository.java
    TeamRepository.java
    UserPenaltyStatsRepository.java
  dto/
    PenaltyShootoutDto.java
    PenaltyShotRequestDto.java
    PenaltyShotResultDto.java
    GoalkeeperDecisionDto.java
    TeamDto.java
  domain/
    PenaltyMatch.java
    PenaltyShot.java
    PenaltyTeamConfig.java
    PenaltyDifficultyProfile.java
    UserPenaltyStats.java
```

That satisfies the requested naming style while remaining equivalent to the Node-first implementation path.

## 23. Asset generation prompts

All prompts below are original-content prompts only. No real clubs, league branding, or copyrighted emblems.

### 23.1 Goalkeeper

```text
Create an original football goalkeeper character for a premium arcade web game, semi-realistic stylized art direction, athletic proportions, dynamic dive-ready stance facing slightly toward camera, high-detail gloves, clean team-neutral uniform, dramatic stadium floodlight rim lighting, vivid but believable colors, strong silhouette readability, transparent background, centered composition, production-quality game asset, no logos, no text, no watermark.
```

### 23.2 Shooter

```text
Create an original football penalty shooter character for a premium arcade web game, semi-realistic stylized look, athletic build, run-up pose transitioning into strike, readable leg motion and torso twist, modern kit without branding, consistent stadium lighting with cool rim light and warm key light, transparent background, clean edges for frontend integration, high-detail but optimized for web, no logos, no watermark.
```

### 23.3 Ball

```text
Create an original premium football ball asset for a web sports game, semi-realistic arcade style, clean panel detail, subtle wear, realistic shading, strong specular highlights under stadium lights, isolated on transparent background, centered composition, crisp edge definition, high resolution, no logos, no watermark.
```

### 23.4 Goal frame and net

```text
Create an original football goal asset for a premium arcade web game, clean white goal frame with taut net, front-facing angle suitable for penalty shootout gameplay, semi-realistic stylized rendering, subtle stadium-light reflections, transparent background, crisp geometric readability, no brand markings, no text, high-resolution production asset.
```

### 23.5 Grass and pitch

```text
Create a premium football penalty area field texture for a modern web game, lush striped grass, visible penalty spot and box markings, semi-realistic stylized rendering, believable turf wear near the spot, floodlit evening stadium ambiance, top-quality texture with clean perspective for 2.5D frontend integration, no players, no logos, no watermark.
```

### 23.6 Stadium background

```text
Create an original football stadium backdrop for a premium arcade web game, night match atmosphere, bright floodlights, blurred but lively crowd, cinematic depth, clean central visibility behind the goal, semi-realistic stylized art direction, vivid but controlled color palette, optimized for UI legibility, no branding, no text, no watermark.
```

### 23.7 Generic team crests

```text
Create a set of original football team crest concepts for a premium web game, vector-friendly shield emblems, bold geometric forms, readable at small sizes, strong color blocking, no real club similarity, no letters required, no copyrighted symbols, clean flat-plus-depth hybrid style, transparent background, production-ready for frontend use.
```

### 23.8 Scoreboard UI panel

```text
Create a premium football game scoreboard panel for a web arcade title, sleek broadcast-inspired interface, layered glass and metal materials, high readability, space for team names, shot markers, and score, subtle neon accents, transparent background, clean edges, modern sports UI, no existing brand styling, no watermark.
```

### 23.9 Goal, save, miss icons

```text
Create three original sports UI icons for a premium football web game: goal, save, and miss. Use a cohesive semi-flat premium style, strong silhouette, bright but credible color coding, transparent background, centered composition, minimal detail for readability at small sizes, no text, no watermark.
```

### 23.10 Shot effects

```text
Create original football shot visual effects for a premium arcade web game, including ball trail, glove impact flash, and net hit burst, clean layered FX, stylized realism, transparent background, bright stadium-lit highlights, minimal noise, optimized for sprite sheet integration, high-resolution, no text, no watermark.
```

## 24. Final implementation recommendation

The best path for this repo is not to throw away the current `penalty-neural-keeper` prototype, but to evolve it into a service-backed feature.

Recommended practical migration:

1. keep the current visual prototype as behavior reference;
2. extract its zone, telemetry, and animation helpers into smaller modules;
3. create the new backend module with the contracts defined above;
4. swap frontend-local shot resolution for backend responses;
5. add team catalog, difficulty presets, and stats once the core loop is stable.

This gives you:

- a product-grade architecture;
- backend-owned fairness and scalability;
- a frontend that still feels fast and visually rich;
- a clean upgrade path to Spring Boot and persistent competitive modes.
