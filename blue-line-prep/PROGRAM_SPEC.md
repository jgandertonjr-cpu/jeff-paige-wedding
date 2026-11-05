# Blue Line Prep — Program Spec (as built)

**GENERATED FILE — do not edit by hand.** Regenerate with `node blue-line-prep/tools/spec.cjs > blue-line-prep/PROGRAM_SPEC.md` after any change to `src/blue-line-prep.html`. It is produced by running the app's own `buildDay()` engine, so it is exactly what the app prescribes. The rationale, sources and decision rules are in [HANDOFF.md](HANDOFF.md).

Inputs for this dump: push-up max 30, sit-up max 37, 1.5 mile 13:12, every lift e1RM set to **100 lb so each load reads as a % of e1RM**, no shin flags, academy PT on Tue/Thu at 30 running minutes per PT day, final assessment at the default Tue 1 Jun 2027.

## Calendar

| Item | Value |
|---|---|
| Week 1 | Mon 12 Oct 2026 |
| v7 starts (`V7_FROM`) | Week 5 = 2026-11-09 |
| Time trials (`TT_WKS`) | Weeks 5, 8 (Saturdays) |
| Mock PFT | Week 11 Tue = 2026-12-22 |
| Academy starts (`ACADEMY_WK`) | Week 13 = 2027-01-04 |
| Light running weeks (`DELOADS`) | 6, 16, 20, 24, 28 |
| Final assessment default | 2027-06-01 |
| Calendar ends | Week 35 |

## Week summary

Running minutes are minutes of actual running. "Acad" is the planning assumption until academy weeks are logged.

| Wk | Mon | Phase | Own run | Acad run | Total | Run days | Bike/row | Lift days | PU days | SU days | Boot walk min |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-10-12 | A | 36 | 0 | 36 | 3 | 102 | 4 | 3 | 3 | 0 |
| 2 | 2026-10-19 | A | 39 | 0 | 39 | 3 | 98 | 4 | 3 | 3 | 20 |
| 3 | 2026-10-26 | A | 42 | 0 | 42 | 3 | 98 | 4 | 3 | 3 | 30 |
| 4 | 2026-11-02 | A | 46 | 0 | 46 | 3 | 61 | 2 | 3 | 3 | 40 |
| 5 | 2026-11-09 | A | 47 | 0 | 47 | 3 | 125 | 4 | 3 | 3 | 50 |
| 6 (light) | 2026-11-16 | A | 30 | 0 | 30 | 3 | 110 | 4 | 3 | 3 | 40 |
| 7 | 2026-11-23 | A | 52 | 0 | 52 | 4 | 130 | 4 | 3 | 3 | 60 |
| 8 | 2026-11-30 | A | 57 | 0 | 57 | 4 | 130 | 4 | 2 | 2 | 70 |
| 9 | 2026-12-07 | A | 62 | 0 | 62 | 4 | 155 | 4 | 3 | 3 | 80 |
| 10 | 2026-12-14 | A | 66 | 0 | 66 | 4 | 165 | 4 | 2 | 2 | 80 |
| 11 | 2026-12-21 | B | 58 | 0 | 58 | 4 | 85 | 2 | 1 | 1 | 30 |
| 12 | 2026-12-28 | B | 60 | 0 | 60 | 4 | 115 | 3 | 1 | 1 | 30 |
| 13 | 2027-01-04 | C | 0 | 60 | 60 | 0 | 30 | 3 | 0 | 0 | 0 |
| 14 | 2027-01-11 | C | 0 | 60 | 60 | 0 | 30 | 3 | 0 | 0 | 0 |
| 15 | 2027-01-18 | C | 6 | 60 | 66 | 1 | 100 | 3 | 1 | 1 | 0 |
| 16 (light) | 2027-01-25 | C | 0 | 60 | 60 | 0 | 130 | 3 | 2 | 2 | 0 |
| 17 | 2027-02-01 | C | 12 | 60 | 72 | 1 | 100 | 3 | 1 | 1 | 0 |
| 18 | 2027-02-08 | C | 18 | 60 | 78 | 1 | 100 | 3 | 2 | 2 | 0 |
| 19 | 2027-02-15 | C | 24 | 60 | 84 | 1 | 100 | 3 | 1 | 1 | 0 |
| 20 (light) | 2027-02-22 | C | 12 | 60 | 72 | 1 | 100 | 3 | 2 | 2 | 0 |
| 21 | 2027-03-01 | C | 28 | 60 | 88 | 1 | 100 | 3 | 1 | 1 | 0 |
| 22 | 2027-03-08 | C | 32 | 60 | 92 | 2 | 100 | 2 | 2 | 2 | 0 |
| 23 | 2027-03-15 | C | 25 | 60 | 85 | 1 | 100 | 3 | 1 | 1 | 0 |
| 24 (light) | 2027-03-22 | C | 12 | 60 | 72 | 1 | 100 | 3 | 2 | 2 | 0 |
| 25 | 2027-03-29 | C | 38 | 60 | 98 | 2 | 100 | 3 | 1 | 1 | 0 |
| 26 | 2027-04-05 | C | 40 | 60 | 100 | 2 | 100 | 3 | 2 | 2 | 0 |
| 27 | 2027-04-12 | C | 40 | 60 | 100 | 2 | 100 | 3 | 1 | 1 | 0 |
| 28 (light) | 2027-04-19 | C | 20 | 60 | 80 | 1 | 100 | 3 | 2 | 2 | 0 |
| 29 | 2027-04-26 | C | 40 | 60 | 100 | 2 | 100 | 3 | 1 | 1 | 0 |
| 30 | 2027-05-03 | C | 35 | 60 | 95 | 2 | 100 | 2 | 2 | 2 | 0 |
| 31 | 2027-05-10 | C | 36 | 60 | 96 | 2 | 110 | 2 | 1 | 1 | 0 |
| 32 | 2027-05-17 | C | 10 | 60 | 70 | 1 | 70 | 3 | 2 | 2 | 0 |
| 33 | 2027-05-24 | C | 26 | 60 | 86 | 2 | 50 | 1 | 1 | 1 | 0 |
| 34 | 2027-05-31 | C | 1 | 60 | 61 | 1 | 70 | 3 | 2 | 2 | 0 |
| 35 | 2027-06-07 | C | 0 | 60 | 60 | 0 | 140 | 3 | 1 | 1 | 0 |

## Run caps, Weeks 5–12 (`RUN_CAPS7`)

| Wk | Total | Run days | Longest run | Fast minutes |
|---|---|---|---|---|
| 5 | 47 | 3 | 19 | 13 |
| 6 | 30 | 3 | 12 | 0 |
| 7 | 52 | 4 | 20 | 10 |
| 8 | 57 | 4 | 22 | 13 |
| 9 | 62 | 4 | 24 | 12 |
| 10 | 66 | 4 | 25 | 14 |
| 11 | 58 | 4 | 22 | 14 |
| 12 | 60 | 4 | 26 | 0 |

## Academy run caps (`RUN_CEIL`, academy + own)

| Wk | Cap | Own running planned at the default assumption |
|---|---|---|
| 13 | 60 | quality 0 |
| 14 | 64 | quality 0 |
| 15 | 70 | quality 6 |
| 16 | light week | quality 0 |
| 17 | 75 | quality 12 |
| 18 | 80 | quality 18 |
| 19 | 85 | quality 24 |
| 20 | light week | quality 12 |
| 21 | 88 | quality 28 |
| 22 | 92 | quality 20 + easy 12 |
| 23 | 96 | quality 25 |
| 24 | light week | quality 12 |
| 25 | 100 | quality 20 + easy 18 |
| 26 | 105 | quality 20 + easy 20 |
| 27 | 110 | quality 20 + easy 20 |
| 28 | light week | quality 20 |
| 29 | 110 | quality 20 + easy 20 |
| 30 | 110 | quality 20 + easy 20 |
| 31 | 110 | quality 20 + easy 20 |
| 32 | peak / taper | quality 0 |
| 33 | peak / taper | quality 0 |
| 34 | peak / taper | quality 0 |
| 35 | peak / taper | quality 0 |

## Week by week

Weeks 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 22, 25, 30, 31, 32, 33, 34. Other academy weeks repeat the Week 18 shape with the run minutes from the table above. Weeks 1–3 are history (the v6 template) and are not reproduced here.

### Week 4 · 2026-11-02 · phase A

Own run 46 min · academy 0 · bike/row 61 · run days 3 · lift days 2

- **Mon 2026-11-02 — RETEST · Test Order + Full-Body A** (impact)
  - first: daily battery (v6)
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · first hard thing today, at least 90 min after waking · film it or have someone call out 15/30/45 s
  - first: Bike Sprint — stands in for the 300m — In the 5 min after the sit-ups: 3 min easy spin with 2 short pick-ups, then 50 s ALL OUT, seated · log average watts · then 5 min rest
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the bike sprint · film it or have someone call out 15/30/45 s
  - first: Easy Run [16 run-min] — 16 min easy jog on grass or track, at a pace you could talk at — after the tests, nothing hard. Run the easy part to a metronome app set a little quicker than your normal steps (about 5–7% more steps a minute, e.g. 160 → 170).
  - then: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 2 sets × 10 jumping jacks · 60 s rest · before the squat, after the prehab · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Wall Prep · Jump To Support — 3 sets × 3 reps · full rest
  - then: Back Squat — 4 sets × 5 reps @ 80 lb · 2–3 min rest · if the last set felt like 3+ reps left, do 1–2 extra reps on it · log the last set (weight, reps, reps left)
  - then: Bench Press — 4 sets × 5 reps @ 80 lb · 2–3 min rest · if the last set felt like 3+ reps left, do 1–2 extra reps on it · log the last set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · under 5 clean reps? slow negatives, or feet on a box
  - then: Neck Endurance — 3 sets × 20–30 s chin-tuck hold · 30 s rest · then press your head into your hand 10 s front, back and each side
- **Tue 2026-11-03 — Easy Day · Soleus, Row, Obstacle Block**
  - first: daily battery (v6)
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Hip Abduction + Rotation (band or DB) — 3 sets × 10–12 reps / side · 45 s rest
  - then: Hip Flexor Tolerance — 2 sets × 30 s hold / side
  - then: Rower — 25 min steady row, damper 3–5, at a pace you could talk at
  - then: Obstacle Block · MPO-245 — ~12 min: duffel drag ~90 lb backwards 3 × 15–20 m · low obstacles, 3 passes with direction changes · 25 lb plate carry 3 × 40 m
  - then: Duty-Boot Walk — 20 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-11-04 — Short Run + Speed** (impact)
  - first: daily battery (v6)
  - first: Short Run · Cadence + Speed [13 run-min] — 13 min run on grass or track: about 12 min easy jog, then 3 × 100 m fast, about 18 s each, walk 2 min between (walking back doesn't count toward the 13). Run the easy part to a metronome app set a little quicker than your normal steps (about 5–7% more steps a minute, e.g. 160 → 170).
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 2 sets × 10 jumping jacks · 60 s rest · after the run · stop on any shin pain
  - then: Peloton Zone 2 — 36 min steady ride · heart rate 134–147 the whole time (steady work, not a spin)
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 36/min (≈18 reps) · 2 min rest · if you need a rest, lock out 2 s at rep 22
  - then: Sit-Up Sets — 5 sets × 15 s ALL-OUT, 45 s rest · aim for 11+ full-range reps each
  - then: Neck Endurance — 3 sets × 20–30 s chin-tuck hold · 30 s rest · then press your head into your hand 10 s front, back and each side
- **Thu 2026-11-05 — Hard Bike + Full-Body B**
  - first: daily battery (v6)
  - first: Peloton Power Zone Intervals — Peloton 20-min FTP test (the class, ~40 min with its warm-up). It sets your Power Zones — every hard ride after this is prescribed in them. Even effort; the last 5 minutes should be the hardest. · at least 6 h before the evening lift
  - then: Deadlift — 4 sets × 5 reps @ 80 lb · 2–3 min rest · if the last set felt like 3+ reps left, do 1–2 extra reps on it · log the last set (weight, reps, reps left)
  - then: Overhead Press — 4 sets × 5 reps @ 80 lb · 2–3 min rest · if the last set felt like 3+ reps left, do 1–2 extra reps on it · log the last set (weight, reps, reps left)
  - then: Single-Leg RDL — 3 sets × 8–10 reps / leg · 60 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 6–10 reps · 90 s rest · heavy enough that 10 is hard, 3 s lowering · once you get 3 × 10, add 5–10 lb
  - then: Soleus Endurance Set — 2 sets / leg × as many reps as you can, stopping 1–2 short · 60 s rest
- **Fri 2026-11-06 — Upper Easy Block**
  - first: daily battery (v6)
  - then: DB Row — 3 sets × 8–10 reps / arm · 60 s rest
  - then: Pull-Ups / Chin-Ups — 2 sets × (your best set minus 3) reps · 90 s rest
  - then: Push-Up Sets — 1 ladder: 2-4-6-8-10-8-6-4-2 (50 reps) · rest as long as the last set took · hex-dumbbell handles for the first half
  - then: Step-Back Sprawl (No-Jump Burpee) — 3 sets × 8 reps · 60 s rest
  - then: Sit-Up Technique Set — 1 set × 22 reps fast but clean (aim ~30 s)
  - then: Shoulder Care · External Rotation + Y-T — side-lying DB external rotation 2 × 15 / side · prone Y-T raise 2 × 10 · light
  - then: Neck Endurance — 3 sets × 20–30 s chin-tuck hold · 30 s rest · then press your head into your hand 10 s front, back and each side
  - then: Hip Flexor Tolerance — 2 sets × 30 s hold / side
  - then: Dead Bug — 2 sets × 8 / side · slow
  - then: Duty-Boot Walk — 20 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-11-07 — Long Run** (impact)
  - first: daily battery (v6)
  - first: Long Run [17 run-min] — 17 min continuous, easy · surface: first 5 min on asphalt, the rest on grass or track. Run the easy part to a metronome app set a little quicker than your normal steps (about 5–7% more steps a minute, e.g. 160 → 170).
- **Sun 2026-11-08 — Rest + Checks**
  - first: Posteromedial Tenderness Map — Weekly re-measure — compare against your baseline photo. An INCREASE in length is a flare trigger on its own.
  - first: Single-Leg Hop Screen — 10 hops per leg — must be pain-free
  - first: Calf Capacity Test — Single-leg heel raises to fatigue at 30/min, each leg — target 25–30+ and within 10% side to side by Dec 13. Update the Baseline Screen with the numbers.

### Week 5 · 2026-11-09 · phase A

Own run 47 min · academy 0 · bike/row 125 · run days 3 · lift days 4

- **Mon 2026-11-09 — Easy Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [16 run-min] — 16 min easy jog on grass or track, at a pace you could talk at — Saturday is the time trial
  - first: Jump Prep · Pogos, Jacks, Burpees — 3 sets × 15 pogo hops · 2 sets × 15 jumping jacks · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Dumbbell Lateral Raise — 2 sets × 12–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Push-Up Test-Pace Set — 3 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-11-10 — 4 × 4 Bike + Lower A**
  - first: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Duty-Boot Walk — 25 min brisk walk in duty boots, any time today · then wear them ~2 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-11-11 — Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [12 run-min] — 12 min run on grass or track: about 11 min easy jog, then 4 × 20 s fast-but-relaxed strides, walk back between (walking back doesn't count toward the 12)
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Push-Up Sets — 4 sets × 20 reps · 60 s rest · after the pressing · LAST set: keep going to failure
  - then: Sit-Up Sets — 5 sets × 15 s ALL-OUT, 45 s rest · aim for 12+ full-range reps each
- **Thu 2026-11-12 — Threshold Bike + Lower B**
  - first: Peloton Power Zone Intervals — 35 min · 10 min warm-up · 2 × 10 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-11-13 — 60-Second Maxes + Upper C**
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · FIRST, before any lifting, at least 90 min after waking · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers
  - then: Dumbbell Shoulder Press — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: DB Row — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure · per arm
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Curl — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure · back and forth with the triceps
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Peloton Zone 2 — 25 min easy ride · heart rate 134–147
  - then: Duty-Boot Walk — 25 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-11-14 — 1.5-Mile Time Trial** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: 1.5-Mile Time Trial [19 run-min] — 19 min of running: warm up 10 min on the bike first (that keeps this run inside the single-run cap), then ~4 min easy jog with 3 strides, then a 1.5-mile TIME TRIAL outdoors on a track or flat measured course — even pace, first lap (400 m) no faster than 2:08, empty the tank over the last lap · jog a minute to finish. Target 12:55 or better. Log the time in Records: every goal pace updates from it.
  - first: Recovery Ride — 25 min easy spin after the time trial · heart rate under 134 · it clears the legs
- **Sun 2026-11-15 — Full Rest**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 6 · 2026-11-16 · phase A · light running week

Own run 30 min · academy 0 · bike/row 110 · run days 3 · lift days 4

- **Mon 2026-11-16 — Easy Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [10 run-min] — 10 min easy jog on grass or track, at a pace you could talk at
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Dumbbell Lateral Raise — 2 sets × 12–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Push-Up Test-Pace Set — 3 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-11-17 — Threshold Bike + Lower A**
  - first: Peloton Power Zone Intervals — 45 min · 10 min warm-up · 3 × 8 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Obstacle Block · MPO-245 — 5 min: duffel drag ~105 lb backwards 3 × 15 m · 25 lb plate carry 2 × 40 m
  - then: Duty-Boot Walk — 20 min brisk walk in duty boots, any time today · then wear them ~2 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-11-18 — Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [8 run-min] — 8 min easy jog on grass or track — light running week, no strides
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 2 sets × 15 jumping jacks · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Push-Up Sets — 4 sets × 20 reps · 60 s rest · after the pressing · LAST set: keep going to failure
  - then: Sit-Up Sets — 5 sets × 15 s ALL-OUT, 45 s rest · aim for 12+ full-range reps each
- **Thu 2026-11-19 — 4 × 3 Bike + Lower B**
  - first: Peloton Power Zone Intervals — 35 min · 10 min warm-up · 4 × 3 min hard at Power Zone 5 (effort 9/10), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-11-20 — 60-Second Maxes + Upper C**
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · FIRST, before any lifting, at least 90 min after waking · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers
  - then: Dumbbell Shoulder Press — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure
  - then: DB Row — 2 sets × 8–12 reps · 60–90 s rest · last set 1 rep short of failure · per arm
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Curl — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure · back and forth with the triceps
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · last set 1 rep short of failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Duty-Boot Walk — 20 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-11-21 — Long Run + Bike** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [12 run-min] — 12 min continuous, easy · surface: first 6 min on the road, the rest on grass or track · on the watch afterwards: under about 165 steps a minute, shorten the stride a touch next time
  - first: Peloton Zone 2 — 30 min easy on the bike or rower, straight off the run · heart rate 134–147 · the long aerobic session without the impact
- **Sun 2026-11-22 — Rest + Checks**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab
  - first: Calf Capacity Test — Single-leg heel raises to fatigue at 30 a minute, each leg — aim for 30+ and the two legs within 10% of each other. Put the numbers in the Baseline Screen on the Records tab.

### Week 7 · 2026-11-23 · phase A

Own run 52 min · academy 0 · bike/row 130 · run days 4 · lift days 4

- **Mon 2026-11-23 — Goal-Pace Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [16 run-min] — 16 min run on a track or flat path: 5 min easy · 5 × 2 min at 8:32/mile, walk 2 min after each (walking doesn't count) · 1 min easy
  - first: Jump Prep · Pogos, Jacks, Burpees — 3 sets × 15 pogo hops · 2 sets × 20 jumping jacks · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 4 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 3 sets × 35 s at 35 a minute (≈20 reps) · 60 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-11-24 — Threshold Bike + Lower A**
  - first: Peloton Power Zone Intervals — 50 min · 10 min warm-up · 3 × 10 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Duty-Boot Walk — 30 min brisk walk in duty boots, any time today · then wear them ~3 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-11-25 — Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [10 run-min] — 10 min run on grass or track: about 9 min easy jog, then 4 × 20 s fast-but-relaxed strides, walk back between (walking back doesn't count toward the 10)
  - first: Jump Prep · Pogos, Jacks, Burpees — 3 sets × 15 pogo hops · 2 sets × 20 jumping jacks · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 4 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Sets — 4 sets × 20 reps · 60 s rest · after the pressing · LAST set: keep going to failure
  - then: Sit-Up Sets — 5 sets × 15 s ALL-OUT, 45 s rest · aim for 12+ full-range reps each
- **Thu 2026-11-26 — 4 × 4 Bike + Lower B**
  - first: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-11-27 — 60-Second Maxes + Upper C** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [6 run-min] — 6 min easy jog on grass or track only (tomorrow is the long run) — it gets your legs used to back-to-back days
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · FIRST, before any lifting, at least 90 min after waking · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers
  - then: Dumbbell Shoulder Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: DB Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure · per arm
  - then: Dumbbell Lateral Raise — 4 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 10–15 reps · 60–90 s rest · last set to failure · back and forth with the triceps
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Duty-Boot Walk — 30 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-11-28 — Long Run + Bike** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [20 run-min] — 20 min continuous: 9 min easy on grass or track, then 11 min on the road — easy at first, and the last 6 min STEADY at ~10:00/mile (a typical formation-run pace: comfortably hard, not a race) · on the watch afterwards: under about 165 steps a minute, shorten the stride a touch next time
  - first: Peloton Zone 2 — 40 min easy on the bike or rower, straight off the run · heart rate 134–147 · the long aerobic session without the impact
- **Sun 2026-11-29 — Full Rest**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 8 · 2026-11-30 · phase A

Own run 57 min · academy 0 · bike/row 130 · run days 4 · lift days 4

- **Mon 2026-11-30 — Easy Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [14 run-min] — 14 min easy jog on grass or track, at a pace you could talk at — Saturday is the time trial
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 20 pogo hops · 2 sets × 30 jumping jacks · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 4 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 3 sets × 35 s at 35 a minute (≈20 reps) · 60 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-12-01 — 4 × 4 Bike + Lower A**
  - first: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Obstacle Block · MPO-245 — 5 min: duffel drag ~135 lb backwards 3 × 15 m · 25 lb plate carry 2 × 40 m
  - then: Duty-Boot Walk — 35 min brisk walk in duty boots, any time today · then wear them ~4 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-12-02 — PT Simulation + Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Academy PT Simulation — Push-ups 60 (4 × 15) · ab work 60 (20 sit-ups + 40 flutter-kick four-counts) · 40 jumping jacks · 10 step-back burpees · to a called cadence (app or partner), no rest beyond what the caller gives · then walk 3 min and go straight into the run
  - first: Easy Run [13 run-min] — 13 min run on grass or track: about 12 min easy jog, then 4 × 20 s fast-but-relaxed strides, walk back between (walking back doesn't count toward the 13)
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 4 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
- **Thu 2026-12-03 — Threshold Bike + Lower B**
  - first: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 2 × 12 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-12-04 — 60-Second Maxes + Upper C** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [8 run-min] — 8 min easy jog on grass or track only (tomorrow is the long run) — it gets your legs used to back-to-back days
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · FIRST, before any lifting, at least 90 min after waking · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers
  - then: Dumbbell Shoulder Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: DB Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure · per arm
  - then: Dumbbell Lateral Raise — 4 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 10–15 reps · 60–90 s rest · last set to failure · back and forth with the triceps
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Peloton Zone 2 — 25 min easy ride · heart rate 134–147
  - then: Duty-Boot Walk — 35 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-12-05 — 1.5-Mile Time Trial** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: 1.5-Mile Time Trial [22 run-min] — 22 min of running: warm up 10 min on the bike first (that keeps this run inside the single-run cap), then ~4 min easy jog with 3 strides, then a 1.5-mile TIME TRIAL outdoors on a track or flat measured course — even pace, first lap (400 m) no faster than 2:05, empty the tank over the last lap · jog a minute to finish. Target 12:35 or better. Log the time in Records: every goal pace updates from it.
  - first: Recovery Ride — 25 min easy spin after the time trial · heart rate under 134 · it clears the legs
- **Sun 2026-12-06 — Rest + Checks**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab
  - first: Calf Capacity Test — Single-leg heel raises to fatigue at 30 a minute, each leg — aim for 30+ and the two legs within 10% of each other. Put the numbers in the Baseline Screen on the Records tab.

### Week 9 · 2026-12-07 · phase A

Own run 62 min · academy 0 · bike/row 155 · run days 4 · lift days 4

- **Mon 2026-12-07 — Goal-Pace Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [18 run-min] — 18 min run on a track or flat path: 5 min easy · 4 × 3 min at 8:32/mile, walk 2 min after each (walking doesn't count) · 1 min easy
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 20 pogo hops · 2 sets × 20 jumping jacks · 2 sets × 5 jump burpees · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 4 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 45 s at 35 a minute (≈26 reps) · 90 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-12-08 — Threshold Bike + Lower A**
  - first: Peloton Power Zone Intervals — 50 min · 10 min warm-up · 2 × 15 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Duty-Boot Walk — 40 min brisk walk in duty boots, any time today · then wear them ~5 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-12-09 — Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [12 run-min] — 12 min run on grass or track: about 11 min easy jog, then 4 × 20 s fast-but-relaxed strides, walk back between (walking back doesn't count toward the 12)
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 20 pogo hops · 2 sets × 20 jumping jacks · 2 sets × 5 jump burpees · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 4 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Sets — 4 sets × 20 reps · 60 s rest · after the pressing · LAST set: keep going to failure
  - then: Sit-Up Sets — 5 sets × 15 s ALL-OUT, 45 s rest · aim for 12+ full-range reps each
- **Thu 2026-12-10 — 5 × 4 Bike + Lower B**
  - first: Peloton Power Zone Intervals — 45 min · 10 min warm-up · 5 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-12-11 — 60-Second Maxes + Upper C** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [8 run-min] — 8 min easy jog on grass or track only (tomorrow is the long run) — it gets your legs used to back-to-back days
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · FIRST, before any lifting, at least 90 min after waking · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers
  - then: Dumbbell Shoulder Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: DB Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure · per arm
  - then: Dumbbell Lateral Raise — 4 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 10–15 reps · 60–90 s rest · last set to failure · back and forth with the triceps
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Peloton Zone 2 — 20 min easy ride · heart rate 134–147
  - then: Duty-Boot Walk — 40 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-12-12 — Long Run + Bike** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [24 run-min] — 24 min continuous: 7 min easy on grass or track, then 17 min on the road — easy at first, and the last 8 min STEADY at ~10:00/mile (a typical formation-run pace: comfortably hard, not a race) · on the watch afterwards: under about 165 steps a minute, shorten the stride a touch next time
  - first: Peloton Zone 2 — 40 min easy on the bike or rower, straight off the run · heart rate 134–147 · the long aerobic session without the impact
- **Sun 2026-12-13 — Full Rest**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 10 · 2026-12-14 · phase A

Own run 66 min · academy 0 · bike/row 165 · run days 4 · lift days 4

- **Mon 2026-12-14 — Goal-Pace Run + Upper A** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [20 run-min] — 20 min run on a track or flat path: 5 min easy · 3 × 4 min, then 1 × 2 min, at 8:32/mile, walk 2 min after each (walking doesn't count) · 1 min easy
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 20 pogo hops · 2 sets × 20 jumping jacks · 2 sets × 5 jump burpees · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 4 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 45 s at 35 a minute (≈26 reps) · 90 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
- **Tue 2026-12-15 — Threshold Bike + Lower A**
  - first: Peloton Power Zone Intervals — 60 min · 10 min warm-up · 2 × 20 min at Power Zone 4 (about 90–95% of FTP, effort 7/10 — hard but steady), 3 min easy between · easy to finish
  - then: daily battery (v6)
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 4 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Obstacle Block · MPO-245 — 5 min: duffel drag 165 lb — the full obstacle-course drag backwards 3 × 15 m · 25 lb plate carry 2 × 40 m
  - then: Duty-Boot Walk — 40 min brisk walk in duty boots, any time today · then wear them ~5 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time
- **Wed 2026-12-16 — PT Simulation + Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Academy PT Simulation — Push-ups 75 (5 × 15) · ab work 90 (30 sit-ups + 60 flutter-kick four-counts) · 60 jumping jacks · 15 step-back burpees · to a called cadence (app or partner), no rest beyond what the caller gives · then walk 3 min and go straight into the run
  - first: Easy Run [13 run-min] — 13 min run on grass or track: about 12 min easy jog, then 4 × 20 s fast-but-relaxed strides, walk back between (walking back doesn't count toward the 13)
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 20 pogo hops · 60 s rest · straight after the run · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Overhead Press — 4 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 4 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · underhand grip today · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
- **Thu 2026-12-17 — 5 × 4 Bike + Lower B**
  - first: Peloton Power Zone Intervals — 45 min · 10 min warm-up · 5 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Split Squat (front foot on a step) — 2 sets × 8 reps / leg · 60–90 s rest
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering · add 5–10 lb when you get 3 × 12
  - then: Hanging Knee Raise — 3 sets × 10–15 reps · 60 s rest
- **Fri 2026-12-18 — Pace Sets + Upper C** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [8 run-min] — 8 min easy jog on grass or track only (tomorrow is the long run) — it gets your legs used to back-to-back days
  - first: Sit-Up Test-Pace Set — 1 set × 22 reps at 46 a minute · easy — the mock PFT is Tuesday
  - first: Push-Up Test-Pace Set — 1 set × 18 reps at 35 a minute · easy — the mock PFT is Tuesday
  - then: Dumbbell Shoulder Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: DB Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure · per arm
  - then: Dumbbell Lateral Raise — 4 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 10–15 reps · 60–90 s rest · last set to failure · back and forth with the triceps
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Peloton Zone 2 — 20 min easy ride · heart rate 134–147
  - then: Duty-Boot Walk — 40 min brisk walk in duty boots, any time today · any shin pain tonight or tomorrow morning → repeat last week's time
- **Sat 2026-12-19 — Long Run + Bike** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [25 run-min] — 25 min continuous: 2 min easy on grass or track, then 23 min on the road — easy at first, and the last 10 min STEADY at ~10:00/mile (a typical formation-run pace: comfortably hard, not a race) · on the watch afterwards: under about 165 steps a minute, shorten the stride a touch next time
  - first: Peloton Zone 2 — 40 min easy on the bike or rower, straight off the run · heart rate 134–147 · the long aerobic session without the impact
- **Sun 2026-12-20 — Full Rest**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 11 · 2026-12-21 · phase B

Own run 58 min · academy 0 · bike/row 85 · run days 4 · lift days 2

- **Mon 2026-12-21 — Easy Day Before The Mock** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [6 run-min] — 6 min easy jog with 3 relaxed strides at the end. Nothing else today — no pressing, no push-ups, no sit-ups.
- **Tue 2026-12-22 — MOCK PFT · Full Test Order** (impact)
  - first: TEST DAY — Warm-Up Protocol — ~25 min warm-up (8–10 min easy jog, drills, a few builds), finishing 6–15 min before the first event
  - first: Sit-Ups — 60 s ALL OUT — Event 1 · 60 s ALL OUT, full test position · target 44 · log total + 15 s splits
  - first: 300 m — FULL EFFORT [2 run-min] — Event 2 · 300 m FULL EFFORT, 5+ min after the sit-ups · through 200 m in ~36 s, then hold form · target 56 s or better
  - first: Push-Ups — 60 s ALL OUT — Event 3 · 60 s ALL OUT, 5+ min after the 300 · target 37 · log total + 15 s splits
  - first: 1.5-Mile Run [22 run-min] — Event 4 · 1.5 mi FULL EFFORT, 5+ min after the push-ups · outdoors, as the academy runs it · check your watch at the half-mile: aim for 4:16 (8:32/mile, the pace you've been training) · on pace at the mile? empty the tank · target 12:30 or better, stretch 12:15
- **Wed 2026-12-23 — Recovery · Spin + Boots**
  - then: Recovery Ride — 25 min easy spin · heart rate 113–134 · recovery, not training.
  - then: Duty-Boot Walk — 30 min easy walk in duty boots, then keep them on for ~2–3 h — the bridge to Saturday's long day, so it is not a jump from nothing.
- **Thu 2026-12-24 — Easy Run + Upper A + Light Lower** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [8 run-min] — 8 min run on grass: 7 min easy jog, then 3 × 20 s relaxed strides, walk back between
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 2 sets × 20 jumping jacks · 60 s rest · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Dumbbell Lateral Raise — 2 sets × 12–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
  - then: Back Squat — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Soleus Raise – Bent Knee — 2 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147 · spin the legs out
- **Fri 2026-12-25 — Christmas · Nothing Required**
  - first: Continuous Walk — Optional 20–40 min walk. That is the whole list.
- **Sat 2026-12-26 — Easy Run + Full Day In Boots + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [20 run-min] — 20 min easy on grass or the TrueForm — NOT the road: four days after a max 1.5 and on the same day as six hours in boots, the surface is the one load you can take out
  - first: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147 · straight off the run
  - first: Duty-Boot Walk — LONG DAY IN BOOTS — the rehearsal: wear them INSTEAD of your normal shoes for ~6 h after the run (standing, errands, 10 min marching at ~120 steps/min, stairs). It is here, not on Jan 2, so a sore spot has a week to settle.
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
- **Sun 2026-12-27 — Rest + Checks**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab
  - first: Calf Capacity Test — Single-leg heel raises to fatigue at 30 a minute, each leg — aim for 30+ and the two legs within 10% of each other. Put the numbers in the Baseline Screen on the Records tab.

### Week 12 · 2026-12-28 · phase B

Own run 60 min · academy 0 · bike/row 115 · run days 4 · lift days 3

- **Mon 2026-12-28 — Easy Run + Upper A + Obstacle Rehearsal** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [12 run-min] — 12 min easy jog, at a pace you could talk at
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Dumbbell Lateral Raise — 2 sets × 12–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · a metronome helps · rest only at the top, arms locked
  - then: Sit-Up Test-Pace Set — 1 set × 45 s at 46 a minute (≈35 reps) · full test form · rest only sitting up
  - then: Obstacle-Course Rehearsal — all six elements in order, ~70% effort
  - then: Peloton Zone 2 — 20 min easy on the bike or rower · heart rate 134–147
- **Tue 2026-12-29 — 4 × 3 Bike + Last Lower Before Day One** (impact)
  - first: Peloton Power Zone Intervals — 35 min · 10 min warm-up · 4 × 3 min hard at Power Zone 5 (effort 9/10), 3 min easy between · easy to finish · the engine stays sharp; the legs stay fresh
  - then: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 3 sets × 30 jumping jacks · 2 sets × 4 jump burpees · 60 s rest · count every jump as one rep (jacks as half) · stop on any shin pain
  - then: Back Squat — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Deadlift — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set · your last barbell lower-body session before day one
  - then: Soleus Raise – Bent Knee — 2 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
  - then: Duty-Boot Walk — 30 min brisk walk in duty boots, any time today · then wear them ~3 h (incl. 10 min marching) · any shin pain tonight or tomorrow morning → repeat last week's time · day 1 of 3 in a row in boots
- **Wed 2026-12-30 — PT Simulation + Easy Run + Upper B** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Academy PT Simulation — Push-ups 60 (4 × 15) · ab work 60 (20 sit-ups + 40 flutter-kick four-counts) · 40 jumping jacks · 10 step-back burpees · to a called cadence, then walk 3 min and go straight into the run
  - first: Easy Run [12 run-min] — 12 min run on grass: easy, with 4 × 20 s relaxed strides at the end, walk back between
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
  - then: Duty-Boot Walk — Wear the duty boots ~3 h today (standing, errands) — day 2 of 3 in a row
- **Thu 2026-12-31 — Easy Run + Upper C · Last Lifting Before Day One** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [10 run-min] — 10 min easy jog
  - first: Jump Prep · Pogos, Jacks, Burpees — 2 sets × 15 pogo hops · 60 s rest · stop on any shin pain
  - then: Dumbbell Shoulder Press — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: DB Row — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set · per arm
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Curl — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set · back and forth with the triceps
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
  - then: Loaded Carry — 3 sets × 40 m · 60 s rest · heaviest dumbbells you can hold without your grip opening
  - then: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147
  - then: Duty-Boot Walk — Wear the duty boots ~3 h today (standing, errands) — day 3 of 3 in a row. The academy is five days running; this is the rehearsal for the next-day recovery.
- **Fri 2027-01-01 — New Year's Day · Nothing Required**
  - first: Duty-Boot Walk — ~2 h in the duty boots, easy (a walk, errands). That is the whole list today.
- **Sat 2027-01-02 — Formation Rehearsal · 26 Min On The Road** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Long Run [26 run-min] — 26 min on the road in your academy PT shoes, starting at 07:30 (academy start time): 16 min easy, then 10 min at 10:30–11:00/mile, at least 10 min of it in step behind a partner, holding their stride · if your shins have flagged anything this week, run 22 min easy on grass instead
  - first: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147 · straight off the run
  - then: Duty-Boot Walk — Up to 3 h in the boots, no more. The long-day rehearsal was Dec 26 — today is not the day to add load.
- **Sun 2027-01-03 — Full Rest**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 13 · 2027-01-04 · phase C

Own run 0 min · academy 60 · bike/row 30 · run days 0 · lift days 3

- **Mon 2027-01-04 — Easy Ride**
  - then: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147 · the one ride of the week while you learn the schedule
- **Tue 2027-01-05 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
- **Wed 2027-01-06 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Dumbbell Lateral Raise — 2 sets × 12–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Lying Triceps Extension — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
- **Thu 2027-01-07 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
- **Fri 2027-01-08 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
- **Sat 2027-01-09 — Saturday · Light Lower**
  - then: Deadlift — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set · after a week with grappling, make it a Romanian deadlift with 3 reps in hand
  - then: Soleus Raise – Bent Knee — 2 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-01-10 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 15 · 2027-01-18 · phase C

Own run 6 min · academy 60 · bike/row 100 · run days 1 · lift days 3

- **Mon 2027-01-18 — Hard Bike · 4 × 4**
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-01-19 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-01-20 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-01-21 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-01-22 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-01-23 — Saturday · Own Run + Lower** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [6 run-min] — 6 min easy on the road + 4 × 20 s relaxed strides · the first running of your own inside the academy — easy only, at least 48 h after the academy's hardest run
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set · after a week with grappling, make it a Romanian deadlift with 3 reps in hand
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-01-24 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 16 · 2027-01-25 · phase C · light running week

Own run 0 min · academy 60 · bike/row 130 · run days 0 · lift days 3

- **Mon 2027-01-25 — Hard Bike · 4 × 4**
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-01-26 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-01-27 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-01-28 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-01-29 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-01-30 — Saturday · Bike + Lower**
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records · skip both if the academy tested you in the last 10 days
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers · skip both if the academy tested you in the last 10 days
  - first: Peloton Zone 2 — 30 min easy on the bike or rower · heart rate 134–147 · light week
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-01-31 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 18 · 2027-02-08 · phase C

Own run 18 min · academy 60 · bike/row 100 · run days 1 · lift days 3

- **Mon 2027-02-08 — Hard Bike · 4 × 4**
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-02-09 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-02-10 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-02-11 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-02-12 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-02-13 — Saturday · Own Run + Lower** (impact)
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records · skip both if the academy tested you in the last 10 days
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers · skip both if the academy tested you in the last 10 days
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [18 run-min] — 18 min of running: 6 min easy · 5 × 2 min at 8:32/mi, walk 2 min after each (walks don't count) · easy to 18. At least 48 h after the academy's hardest run. Fast minutes — yours plus academy sprints and timed runs — stay under a quarter of the week's running
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-02-14 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 19 · 2027-02-15 · phase C

Own run 24 min · academy 60 · bike/row 100 · run days 1 · lift days 3

- **Mon 2027-02-15 — Hard Bike · 4 × 4**
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-02-16 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-02-17 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-02-18 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-02-19 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-02-20 — Saturday · 1.5-Mile Time Trial** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: 1.5-Mile Run [24 run-min] — 24 min of running: ~5 min easy + 3 strides, then a 1.5-mile TIME TRIAL, fresh, outdoors on a track or flat measured course — even pace, empty the last 400 · target 12:15 or better · log it: every pace updates
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set · after a week with grappling, make it a Romanian deadlift with 3 reps in hand
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-02-21 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 22 · 2027-03-08 · phase C

Own run 32 min · academy 60 · bike/row 100 · run days 2 · lift days 2

- **Mon 2027-03-08 — Hard Bike · 4 × 4** (impact)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Easy Run [12 run-min] — 12 min easy on the road + 4 × 20 s relaxed strides · before tonight's session, conversational
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-03-09 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-03-10 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-03-11 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-03-12 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-03-13 — Saturday · Own Run + Lower** (impact)
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records · skip both if the academy tested you in the last 10 days
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers · skip both if the academy tested you in the last 10 days
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [20 run-min] — 20 min of running: 6 min easy · 4 × 3 min at 8:32/mi, walk 2 min after each (walks don't count) · easy to 20. At least 48 h after the academy's hardest run. Fast minutes — yours plus academy sprints and timed runs — stay under a quarter of the week's running
  - then: Obstacle-Course Rehearsal — all six elements in order, ~70% effort
- **Sun 2027-03-14 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 25 · 2027-03-29 · phase C

Own run 38 min · academy 60 · bike/row 100 · run days 2 · lift days 3

- **Mon 2027-03-29 — Hard Bike · 4 × 4** (impact)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Easy Run [18 run-min] — 18 min easy on the road + 4 × 20 s relaxed strides · before tonight's session, conversational
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-03-30 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-03-31 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-04-01 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-04-02 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-04-03 — Saturday · Own Run + Lower** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Goal-Pace Run [20 run-min] — 20 min of running: 6 min easy · 4 × 3 min at 8:32/mi, walk 2 min after each (walks don't count) · easy to 20 · then 2 × 150 m fast, about 28 s each, full walk-back. At least 48 h after the academy's hardest run. Fast minutes — yours plus academy sprints and timed runs — stay under a quarter of the week's running
  - then: Deadlift — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set · after a week with grappling, make it a Romanian deadlift with 3 reps in hand
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-04-04 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 30 · 2027-05-03 · phase C

Own run 35 min · academy 60 · bike/row 100 · run days 2 · lift days 2

- **Mon 2027-05-03 — Hard Bike · 4 × 4** (impact)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Easy Run [20 run-min] — 20 min easy on the road + 4 × 20 s relaxed strides · before tonight's session, conversational
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-05-04 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Wed 2027-05-05 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-05-06 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-05-07 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-05-08 — MOCK PFT · Full Test Order** (impact)
  - first: TEST DAY — Warm-Up Protocol — ~25 min warm-up, finishing 6–15 min before the first event
  - first: Sit-Ups — 60 s ALL OUT — Event 1 · 60 s ALL OUT · target 48 · log total + 15 s splits
  - first: 300 m — FULL EFFORT [2 run-min] — Event 2 · 300 m FULL EFFORT, 5+ min after the sit-ups · target 55 s or better
  - first: Push-Ups — 60 s ALL OUT — Event 3 · 60 s ALL OUT, 5+ min after the 300 · target 43 · log total + 15 s splits
  - first: 1.5-Mile Run [13 run-min] — Event 4 · 1.5 mi FULL EFFORT, 5+ min after the push-ups · half-mile split at goal pace (8:32/mi) · target 12:00 or better
- **Sun 2027-05-09 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 31 · 2027-05-10 · phase C

Own run 36 min · academy 60 · bike/row 110 · run days 2 · lift days 2

- **Mon 2027-05-10 — Hard Bike · 4 × 4** (impact)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Easy Run [20 run-min] — 20 min easy on the road + 4 × 20 s relaxed strides · before tonight's session, conversational
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-05-11 — T−21 · Last Full Session** (impact)
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Goal-Pace Run [16 run-min] — 16 min of running: 6 min easy · 2 × 0.75 mile at 8:32/mi, 2 min walk between · easy to 16. On a PT day with running, move it to the nearest free day
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish
- **Wed 2027-05-12 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-05-13 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-05-14 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-05-15 — T−17 · Full Obstacle Rehearsal**
  - first: Obstacle-Course Rehearsal — all six elements in order, ~70% effort
- **Sun 2027-05-16 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 32 · 2027-05-17 · phase C

Own run 10 min · academy 60 · bike/row 70 · run days 1 · lift days 3

- **Mon 2027-05-17 — Hard Bike · 4 × 4**
  - then: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · if tomorrow is the academy's hardest run, ride easy tonight and do this on another free evening
- **Tue 2027-05-18 — T−14 · Test-Order Rehearsal (sub-max)** (impact)
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Sit-Up Test-Pace Set — 1 set × 26 reps at 46 a minute · first, at least 90 min after waking
  - then: Speed-Endurance [1 run-min] — 300 m at ~58 s (90% — not a full effort) · 5 min after the sit-ups
  - then: Push-Up Test-Pace Set — 1 set × 21 reps at 35 a minute · 5 min after the 300
  - then: Goal-Pace Run [9 run-min] — 1 mile at 8:32/mi, 5 min after the push-ups · then stop. Own running is half or less for the rest of this week
- **Wed 2027-05-19 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-05-20 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-05-21 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-05-22 — T−10 · Last Heavy Lower**
  - first: Back Squat — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - first: Deadlift — 2 sets × 5 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - first: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-05-23 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 33 · 2027-05-24 · phase C

Own run 26 min · academy 60 · bike/row 50 · run days 2 · lift days 1

- **Mon 2027-05-24 — T−8 · Taper · Half Volume**
  - then: Push-Up Test-Pace Set — 1 set × 15 reps at 35 a minute · easy
  - then: Sit-Up Test-Pace Set — 1 set × 19 reps at 46 a minute · easy
  - then: Peloton Zone 2 — 20 min steady ride · heart rate 134–147 the whole time (steady work, not a spin)
- **Tue 2027-05-25 — T−7 · Taper · Half Volume**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
- **Wed 2027-05-26 — T−6 · Bike Intensity**
  - then: Peloton Power Zone Intervals — 30 min · 10 min warm-up · 4 × 2 min hard (Power Zone 5–6), 3 min easy between · easy to finish
- **Thu 2027-05-27 — T−5 · Goal-Pace Touch** (impact)
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - then: Goal-Pace Run [14 run-min] — 14 min of running: easy, with 3 × 90 s at 8:32/mi in the middle, 2 min walk between
- **Fri 2027-05-28 — T−4 · Taper · Upper B, Light**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · leave 2–3 reps in every set this week · log the last set
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Rear-Delt Raise — 2 sets × 15–20 reps · 60–90 s rest · leave 2 reps in every set
  - then: Curl — 2 sets × 8–12 reps · 60–90 s rest · leave 2 reps in every set
  - then: Shrug — 2 sets × 10–15 reps · 60–90 s rest · leave 2 reps in every set
- **Sat 2027-05-29 — T−3 · Easy + Strides** (impact)
  - first: Pre-Run Primer — 3 min · calf raises 2 × 15 · tib raises 1 × 15 · 30 s single-leg balance per leg
  - first: Easy Run [12 run-min] — 12 min easy, then 4 × 60 m at ~85%, full walk-back
- **Sun 2027-05-30 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab

### Week 34 · 2027-05-31 · phase C

Own run 1 min · academy 60 · bike/row 70 · run days 1 · lift days 3

- **Mon 2027-05-31 — T−1 · Prime, Don't Rest** (impact)
  - then: Strides [1 run-min] — 20 min easy walk with 2 × 20 s strides at ~80% in the middle · carbs 5–6 g/kg, low fibre, nothing new
- **Tue 2027-06-01 — FINAL ASSESSMENT** (impact)
  - first: TEST DAY — Warm-Up Protocol — Warm-up ~25 min if they allow it, finishing 6–15 min before the start. 2.5–3 h before: 110–160 g carbs + 25–30 g protein. Then the playbook on the Plan tab.
- **Wed 2027-06-02 — Upper A**
  - then: Bench Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Pull-Ups / Chin-Ups — 3 sets × (your best set minus 2) reps · 90 s rest · overhand or neutral grip · under 5 clean reps? slow negatives, or feet on a box · past 10, add weight
  - then: Incline Dumbbell Press — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Dumbbell Lateral Raise — 3 sets × 12–20 reps · 60–90 s rest · last set to failure
  - then: Lying Triceps Extension — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Push-Up Test-Pace Set — 2 sets × 30 s at 35 a minute (≈18 reps) · 60 s rest · skip it in a week the academy gave you 150+ push-ups
- **Thu 2027-06-03 — Academy PT · Easy Evening**
  - first: Academy PT — Academy PT — log it below: what you did, minutes of running, DT minutes, push-ups, jumps, how hard (1–10)
  - then: Calf Raise – Straight Knee — 2 sets × 12–15 reps · 60 s rest · bodyweight or light, slow lowering · after a heavy academy day (hard PT plus an hour on the mats) this is the whole evening
  - then: Recovery Ride — 30 min easy spin · optional — leave it out after a heavy academy day
- **Fri 2027-06-04 — Upper B**
  - then: Overhead Press — 3 sets × 6 reps @ 80 lb · 2–3 min rest · last set: as many clean reps as you can, stopping 1 short of failure (5–8 is the range) · log that set (weight, reps, reps left)
  - then: Barbell Row — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Rear-Delt Raise — 3 sets × 15–20 reps · 60–90 s rest · last set to failure
  - then: Curl — 3 sets × 8–12 reps · 60–90 s rest · last set to failure
  - then: Shrug — 3 sets × 10–15 reps · 60–90 s rest · last set to failure
  - then: Calf Raise – Straight Knee — 3 sets × 8–12 reps · 90 s rest · 3 s lowering
  - then: Sit-Up Sets — 4 sets × 15 s ALL-OUT, 45 s rest · skip it in a week the academy tested your sit-ups
- **Sat 2027-06-05 — Saturday · Bike + Lower**
  - first: Sit-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · full test form: fingers interlocked behind the head, elbows to knees, shoulder blades to the floor, rest only sitting up · log it in Records · skip both if the academy tested you in the last 10 days
  - first: Push-Ups — 60 s ALL OUT — 1 set · 60 seconds, max reps · 5 min after the sit-ups · chest to a fist, rest only at the top with arms locked · log it in Records — every push-up and sit-up dose rescales from these two numbers · skip both if the academy tested you in the last 10 days
  - first: Peloton Power Zone Intervals — 40 min · 10 min warm-up · 4 × 4 min hard at Power Zone 5 (about 105–110% of FTP, effort 9/10 — too hard to talk), 3 min easy between · easy to finish · no room under the running cap this week, so the bike takes the work
  - then: Back Squat — 3 sets × 5 reps @ 80 lb · 2–3 min rest · stop every set with 2 reps left · log the last set
  - then: Soleus Raise – Bent Knee — 3 sets × 6–8 reps @ ~80 lb · 90 s rest · 3 s lowering · when every set reaches 8, add 10 lb and log it
- **Sun 2027-06-06 — Range Day · Checks Only**
  - first: Posteromedial Tenderness Map — One minute, both shins: press along the inner edge of the bone. Anything tender, or one sore spot smaller than 2 inches? Open the Shins card on the Today tab.
  - first: Single-Leg Hop Screen — 10 hops per leg — any pain, open the Shins card on the Today tab
