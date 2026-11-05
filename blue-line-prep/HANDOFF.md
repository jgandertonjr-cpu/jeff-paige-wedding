# Blue Line Prep — Handoff

**Read this before you touch `src/blue-line-prep.html`.** It is the source of truth for why the program is the way it is, what has been verified, the decision rules, and how to change the app without destroying the user's logged history.

- **App:** `src/blue-line-prep.html`, a single-file React PWA served at `/blue-line-prep.html` on jeffandpaige.net (Netlify, Eleventy passthrough copy, no build step for this file).
- **User:** Jeff, a police cadet. He trains from this app every day on his phone.
- **Current version:** v7, written 4 Nov 2026 (Week 4 of the app's calendar). v7 applies from **Week 5, Mon 9 Nov 2026**.
- **As-built detail:** [PROGRAM_SPEC.md](PROGRAM_SPEC.md) is generated from the app's own engine. Regenerate it; never hand-edit it.
- **History:** [REVIEW.md](REVIEW.md) is the 2 Nov 2026 review that produced v6.2. It is superseded by this file and kept for history only.

---

## 1. Rules for changing the app

Break these and he loses check-offs, or the program restarts under him.

1. **His data lives only in his phone's `localStorage`, key `blp-v6`.** Nothing he logs is in this repo. There is an export and restore card on the Records tab (v7). Do not rename the key and do not bump `v:6` without a migration.
2. **Check-offs are positional.** A ticked item is stored as `${week}-${dow}-am-${i}` or `-pm-${i}` (`trackKeys`). If a day that he has already trained builds a different item list, his ticks land on the wrong items.
3. **So: never change what any past or current week builds.** Gate every program change behind a week constant. `NEW_FROM=4` (v6.2) and `V7_FROM=5` (v7) exist for this. A new revision adds a new constant set to the first week that has not started. Never lower an existing one.
4. **Change the program forward, never restart it.** Completed weeks are his real, tolerated base. He said so explicitly on 2 Nov 2026.
5. **Run the checks before every commit that touches the app:**

   ```bash
   sh blue-line-prep/tools/check.sh HEAD 4
   ```

   The second argument is the number of weeks, from Week 1, that must build byte-identically to the reference version. Raise it to the last completed week as time passes. The script must print `0 differences` and `0 failed`.
6. **Regenerate the spec after any change:**

   ```bash
   node blue-line-prep/tools/spec.cjs > blue-line-prep/PROGRAM_SPEC.md
   ```
7. **Test in a browser with realistic data,** not an empty store. `.claude/launch.json` starts the Eleventy dev server on port 8080; the app is at `/blue-line-prep.html`. Seed `localStorage['blp-v6']` with ticks for the past weeks (use `window.__blp.trackKeys`) and confirm the streak and past days are intact.
8. **Do not deploy without his OK.** Deployment is a push to `main`.
9. **Anything saved goes through `snap()`** in `App`. The autosave and the backup export both write exactly that object. Add a new saved field there, and load it with a default in the load effect.
10. **Freeze the structure until the mock PFT (22 Dec 2026).** The program was rewritten three times on 2 Nov and again on 4 Nov. He agreed that after v7 only the numbers move. Do not restructure the week before the mock unless he asks or a rule in §6 requires it.

---

## 2. The athlete and his priorities

**Context**
- MCCC Municipal Police Academy (Blue Bell, PA), Act 120. Class runs Mon 4 Jan 2027 to about Tue 8 Jun 2027. Mon–Fri days plus Sundays on the firearms range.
- He passed the pre-entrance test on 21 Sep 2026: push-ups 26 and sit-ups 35 (both stopped at the standard), 300 m 54 s, 1.5 mile 13:12.
- History of medial tibial stress syndrome (shin splints). In August 2026 his running went 64 min, then 6 min, in consecutive weeks.
- Home gym: barbell, rack, plates, dumbbells, rower, Peloton, TrueForm curved treadmill. No kettlebell. Academy gym from 4 Jan.
- Nutrition: about 220 g protein a day, limited alcohol.
- Time: 45–90 minutes a day now, sustainable. He is unsure 90 minutes will be possible in the academy.

**His priorities, in order (4 Nov 2026)**
1. 1.5 mile: clear the standard with real cushion. He asked for sub-12:15 by 4 Jan and sub-12:00 by graduation.
2. Shin health: non-negotiable. Most aerobic volume on the bike and rower. Conservative running progression with clear back-off rules.
3. Push-ups and sit-ups well above the minimum: 40+ and 45+.
4. Physique: visibly built, upper body first. Lose fat without losing muscle.

**Numbers on 4 Nov 2026:** push-ups 30, sit-ups 37, 300 m about 55 s, 1.5 mile 13:12 (the September time; no trial since).

**Not confirmed by him** (he chose not to answer; the app assumes these): bodyweight about 245 lb, age 29, shins currently quiet, one session a day. If he gives real numbers, use them. A 30th birthday before a test matters: see §3.

---

## 3. Standards (verified 4 Nov 2026)

**Entry and retention standard, male, 30th percentile (Cooper norms)**

| Event | Age 18–29 | Age 30–39 |
|---|---|---|
| Sit-ups, 1 minute | 35 | 32 |
| 300 m run | 62.1 s | 63.0 s |
| Push-ups, 1 minute | 26 | 20 |
| 1.5-mile run | 13:16 | 13:46 |

**The 1.5-mile line is 13:16, not 13:08.** Three primary documents agree:
- the state's current page (source 1),
- the state's 2024 chart (source 2),
- MCCC's own application packet for the January 2027 class, page 21 (source 4).

13:08 was the state's 2023 chart (source 3). MCCC's web page still shows it (source 5). The 2021 chart and the 2014 FAQ had 13:15. v6.2 showed 13:08 as the pass line; v7 shows 13:16 and explains 13:08. His 13:12 passes by 4 seconds.

**Rules**
- The standard applies by biological sex and by age on the day of the test (source 1). After a 30th birthday the 30–39 column should apply. MCCC's practice is not confirmed.
- Test order: sit-ups, 300 m, push-ups, 1.5 mile. At least 5 minutes between events. All inside 2 hours. Failing one event ends the test (sources 1, 2, 3, 7).
- In a pass/fail test an event can be ended once the required number is reached (source 1). That is why he scored exactly 26 and 35 in September.
- The standard must be maintained throughout the academy. There are periodic fitness assessments, and a cadet who falls below is removed until they meet it again (source 1).

**Graduation**
- A final physical fitness assessment is a required practical in the state syllabus (source 8).
- The obstacle course must be passed within three attempts (source 1). Form MPO-245 (12/2023, source 9) lists six events in order: exit a patrol vehicle from the driver's seat with the belt engaged; low 6-inch obstacles with direction changes; a 5 ft solid wall with no handles or side struts; a 36 in × 3 ft obstacle; drag a 165 lb dummy to behind the wall (it may be repositioned, not dropped); carry a 25 lb medicine ball to the finish. Each event is scored satisfactory or unsatisfactory. The form records a completion time and sets no limit.
- The 50th-percentile graduation standard (40 sit-ups, 56.0 s, 33 push-ups, 11:58) appears only in the March 2014 state FAQ (source 7). No current document found requires it. His own targets clear it anyway.

**Protocols (source 1)**
- **Sit-ups:** on the back, knees about 90°, feet flat and held by another person. Fingers interlocked behind the head, not on top of the head or on the neck. A rep counts when the elbows touch the knees and the shoulder blades return to the mat. Hips stay down. Rest only in the up position, or the test is terminated. The timer calls 30 s and 45 s and counts down the last 5 s.
- **Push-ups:** hands slightly wider than the shoulders, fingers forward, palms flat, starting in the up position. Lower until the chest touches the instructor's fist (a 3-inch sponge for opposite-sex testing) or the elbows reach 90°. Back straight. Rest only in the up position. Hands and toes stay on the floor. One minute.
- **300 m:** flat measured surface, 3–5 minute warm-up, timed to 0.1 s.
- **1.5 mile:** flat measured surface (a 440-yard track is recommended), 3–5 minute warm-up, no headphones, no physical help from another runner, timed to the second. MCCC runs both runs on an outdoor course (source 5).

**Academy hours (source 8, the state's 2022 syllabus, 919 hours)**
- Physical fitness training and testing: 72 hours across the whole academy, about 3.3 hours a week over 22 weeks.
- Control tactics: 94 hours, of which tactical self-defence is 58.
- This is why the academy plan assumes 2–3 PT sessions a week and why his own work has to carry the standards.

**Not verified. Do not guess these.**
- When MCCC assesses during the academy, and whether there is a test in the first week. The state protocol's wording implies a first, second and final assessment.
- MCCC's PT days, session length and run distances.
- Which age bracket MCCC applies after a 30th birthday.
- One sentence in the state's sit-up protocol still mentions "50%" at the final assessment. Its force is unknown.
- Whether a trained pacer may still be requested for the runs (the 2014 FAQ allowed it).
- The obstacle course time limit, if any.
- The regulation, 37 Pa. Code § 203.11 (source 10, an unofficial copy last amended 2007), still lists a bench press instead of push-ups and has no 50th-percentile rule. The current battery comes from Commission policy.

**Questions for Director Georgette Hill:** the dates of the assessments; the PT days; the age bracket after a 30th birthday; whether 13:08 on the web page is simply out of date.

**Sources**
1. State page: https://www.pa.gov/agencies/mpoetc/programs/training/basic-police-officer-training/physical-fitness.html
2. State chart, © 2024 (PDF created 12 Mar 2024): https://www.policeapp.com/Jobs/customer-files/MPOETC-Fitness-Charts-2024.pdf
3. State chart, © 2023 (PDF created 15 Aug 2023), superseded: https://liberalarts.temple.edu/sites/liberalarts/files/MPOETC%20Fitness%20Charts.pdf
4. MCCC application packet for January 2027 (PDF dated 1 Jun 2026), page 21: https://www.mc3.edu/degrees-and-programs/assets/police-academy/docs/police-academy-application.pdf
5. MCCC academy page: https://www.mc3.edu/degrees-and-programs/municipal-police-academy
6. MCCC sample application (2022–23), page 19, carries the 2021 chart (13:15).
7. State FAQ, March 2014: https://www.policeapp.com/Jobs/customer-files/FAQs-Regarding-Physical-Fitness-Tests-and-Standards.pdf
8. State syllabus, 2022: https://www.pa.gov/content/dam/copapwp-pagov/en/mpoetc/documents/training/basic-police-officer-training/basic%20police%20training%20syllabus.pdf
9. Form MPO-245: https://www.pa.gov/content/dam/copapwp-pagov/en/mpoetc/documents/mpoetc-school-authorities-documents-and-forms/MPO-245_Obstacle%20Course%20Checklist%20and%20Criteria.pdf
10. 37 Pa. Code § 203.11 (Cornell LII copy): https://www.law.cornell.edu/regulations/pennsylvania/37-Pa-Code-SS-203-11

---

## 4. The program

### Phase A: 9 Nov 2026 to 3 Jan 2027 (app weeks 5–12)

**The week (Weeks 5–10)**

| Day | Aerobic (first block) | Lifting (second block) | Push-ups and sit-ups |
|---|---|---|---|
| Mon | Goal-pace run (easy in time-trial weeks), then jumps | Upper A: bench, pull-ups, incline DB press, lateral raise, triceps | Test-pace intervals |
| Tue | Threshold bike | Lower A: squat 3×5, heavy soleus raise, tib raise. Boots. Drag and carry every second week | — |
| Wed | Easy run plus strides, then jumps | Upper B: overhead press, barbell row, chin-ups, rear-delt raise, curls, shrugs | Volume, last set to failure |
| Thu | Bike 4×4 min | Lower B: deadlift 3×5, split squat, calf raise, hanging knee raise | — |
| Fri | Short easy run (from Week 7) | Upper C: DB press, one-arm row, lateral raise, curls, triceps, farmer carry. Boots | 60-second max of each, sit-ups first |
| Sat | Long run, then straight onto the bike or rower. Time trial in Weeks 5 and 8 | — | — |
| Sun | Off. One-minute shin check | — | — |

- One session a day is fine. Splitting aerobic and lifting by 6+ hours is better for the lifting (Robineau 2016).
- In a time-trial week the 4×4 moves to Tuesday and Thursday is an easier threshold ride.
- Week 6 (16 Nov) is a light **running** week only. Lifting and the bike carry on.
- The PT simulation (called-cadence calisthenics, then the run) happens on three Wednesdays: 2, 16 and 30 Dec. It replaces that day's push-up and sit-up sets.

**Run caps, in minutes** (`RUN_PLAN`, `RUN_CAPS7`)

| Week of | Total | Run days | Longest run | Fast minutes | Bike/row built | Key session |
|---|---|---|---|---|---|---|
| 9 Nov (5) | 47 | 3 | 19 | 13 | 125 | Sat 14 Nov time trial |
| 16 Nov (6) | 30 | 3 | 12 | 0 | 110 | Light running week |
| 23 Nov (7) | 52 | 4 | 20 | 10 | 130 | Mon 5×2 min at goal pace |
| 30 Nov (8) | 57 | 4 | 22 | 13 | 130 | Sat 5 Dec time trial |
| 7 Dec (9) | 62 | 4 | 24 | 12 | 155 | Mon 4×3 min |
| 14 Dec (10) | 66 | 4 | 25 | 14 | 165 | Mon 3×4 min plus 1×2 min |
| 21 Dec (11) | 58 | 4 | 22 | 14 | 85 | Tue 22 Dec mock PFT |
| 28 Dec (12) | 60 | 4 | 26 | 0 | 115 | Sat 2 Jan, 26 min on the road |

- **Longest-run rule:** no run more than 10% longer than the longest of the previous 30 days. This is the one load rule with good evidence (§7).
- **Fast minutes** are time trials, goal-pace reps and the 300. Relaxed strides do not count.
- **Goal pace** is 3% faster than the best 1.5 mile of the last 8 weeks (`runPaces`, unchanged from v6.2).
- **Bike:** two hard sessions a week, never more. The approved bike/row caps were 125, 110, 140, 145, 165, 170, 90, 120; the built weeks sit at or under them.
- **Week 5 holds its total at 47** (not 50) because it adds a time trial. Volume holds when intensity steps up.

**Lifting** (`LIFT7`, `upper7`, `lowerA7`, `lowerB7`, `vol7`)
- Bench and overhead press: 4×6 at about 77.5% of e1RM. The last set goes to one rep short of failure and is the set he logs. e1RM tracking is unchanged, so loads move as his logs move.
- Squat and deadlift: 3×5 at about 80%, two reps always in hand.
- Accessories: 3 sets in the 8–20 range, last set to failure. Lateral raise on Friday and barbell row are 4 sets.
- Volume by week: Weeks 5–6 one set fewer and nothing to failure ("ramp"); Weeks 7–10 full; Weeks 11–14 about two-thirds, nothing to failure ("lite"); the rest of the academy 3 sets ("acad").
- Weekly hard sets at full volume: about 14 for back, 17 for shoulders including presses, 7 for chest plus the push-up work, 6 direct for biceps and for triceps.

**Push-ups and sit-ups** (`calis7`, `PU_INT`, `puRate`, `suRate`)
- Monday: timed intervals at the rate the next target needs (current max + 5 a minute for push-ups; at least 46 a minute for sit-ups). 3×30 s building to 2×45 s.
- Wednesday: push-ups 4 sets at 65% of max, the last to failure. Sit-ups 5×15 s all-out.
- Friday: 60 seconds of sit-ups all-out, 5 minutes, 60 seconds of push-ups all-out, before lifting. 13, 20, 27 Nov, 4 and 11 Dec. On 18 Dec it is an easy pace set because the mock is four days later.
- Every dose reads the latest logged max.

**Mock and arrival weeks (Weeks 11–12)**
- Mon 21 Dec: a 6-minute jog and nothing else. Tue 22 Dec: mock PFT in test order. Running then holds at 58 and 60 minutes, all easy.
- Lifting at two-thirds volume. Last lifting day is Thu 31 Dec.
- Full day in boots Sat 26 Dec. 26 minutes on the road at 07:30 on Sat 2 Jan.

**What v7 removed, and why**
- The 8-minute daily battery (balance, knee-to-wall, toe curls, tib raises, soft tissue, short foot). Replaced by a 3-minute pre-run primer. No prevention exercise for shin splints has good trial evidence (§7).
- Neck holds, hip-flexor holds, dead bugs, get-ups, sprawls, circuits, the separate shoulder-care block.
- The home wall drill on a loaded barbell. Pull-ups now; the real wall at the academy.
- The metronome requirement. The trial v6 cited used supervised biofeedback, not a metronome.
- The 30/15 bike intervals (tested in trained cyclists) and the low-cadence "climb" ride.
- The 150 m reps before the mock. They do not fit under the fast-minute caps, and the 300 m has about 7 seconds in hand. They return on alternate Saturdays in the academy from Week 17.

### Phase B: academy, 4 Jan to 8 Jun 2027 (app weeks 13–35)

**His own week** (`buildDayRaw`, academy branch)

| Slot | Session | Minutes |
|---|---|---|
| Day after academy PT | Upper A, then on the next such day Upper B | 40 |
| A PT-free evening that is not a lifting day | Hard bike, 4×4 min | 35–40 |
| PT-day evening | Calf raises; an optional easy 30-minute spin | 0–30 |
| Saturday | Own run inside the cap, then squat or deadlift 3×5 (alternating weeks) and heavy soleus raises | 70 |
| Sunday | Range. Weekly shin check | — |

- **PT days are his to set** on the Plan tab (default Tue and Thu). The week re-keys around them (`dayTypeOf`, `liftDays`, `bikeDay`).
- With Tue/Thu PT the hard bike lands on Monday, the night before PT. The app tells him to swap it if Tuesday turns out to be the academy's hardest run.
- **Weeks 13–14:** two sets per exercise, one easy ride, no running of his own.
- **Every second Saturday** (even weeks from 16): a 60-second max of sit-ups and push-ups before the run. Skipped if the academy tested him in the last 10 days.
- **Light weeks** (16, 20, 24, 28): his own running halves and is all easy. Lifting and the bike carry on.
- **3 PT days:** both free evenings are lifting. The hard bike only happens on a Saturday with no room for his own run.
- **4–5 PT days:** no running or hard riding of his own. One upper session on the first free evening; the second on Saturday with a light squat and an easy ride.
- **A shin flag in the last 7 days** takes all of his own running out. The academy's cannot be removed.

**Running caps, academy plus his own** (`RUN_CEIL`, `ownRunAcademy`, `academyWeeks`)

| Weeks | Dates | Cap | His own running |
|---|---|---|---|
| 13–14 | 4–17 Jan | 60, then 64 | None |
| 15 | 18 Jan | 70 | About 6 easy |
| 17–19 | 1–21 Feb | 75, 80, 85 | One run: 12, 18, 24 |
| 21–23 | 1–21 Mar | 88, 92, 96 | 28; then 20 plus an easy 12; then 25 |
| 25–27 | 29 Mar–18 Apr | 100, 105, 110 | 20 plus an easy 18–20 |
| 29–31 | 26 Apr–16 May | 110 | Same, then the peak |
| 16, 20, 24, 28 | Light weeks | — | Half of the week before, all easy |
| 32–34 | 17 May–6 Jun | Taper | Written by the graduation peak |

- His own running is the room the academy leaves under the cap, also limited to +10% and +6 minutes over the highest of the last four weeks.
- Academy running is planned at 30 minutes per PT day until three academy weeks are logged, then at the highest of the last three logged weeks.
- If the academy alone exceeds the cap, he adds nothing and Saturday becomes a second hard bike.
- The quality run is one session of up to 20 running minutes; when the room is 21–31 minutes the extra is added to it as easy minutes (28 at most). An extra easy run appears once 12+ minutes of room is left after the quality run.
- Time trials: Sat 20 Feb and Sat 17 Apr. Mock PFT: Sat 8 May. A 24-day graduation peak keys off the final assessment date (default Tue 1 Jun until he enters the real one).

---

## 5. Tests and targets

| Date | Test | Push-ups | Sit-ups | 300 m | 1.5 mile |
|---|---|---|---|---|---|
| Sat 14 Nov | Time trial, fresh | — | — | — | ≤12:55 |
| Fri 20 Nov | 60-second max | 32 | 39 | — | — |
| Fri 4 and Sat 5 Dec | 60-second max, time trial | 34 | 42 | — | ≤12:35 |
| Tue 22 Dec | Mock PFT, test order | 37 (stretch 40) | 44 (stretch 46) | ≤56 s | ≤12:30 (stretch 12:15) |
| Academy assessment 1 | Date unknown | 37+ | 44+ | ≤56 s | ≤12:30 |
| Sat 20 Feb | Time trial | 40 | 46 | — | ≤12:15 |
| Sat 17 Apr | Time trial | 42 | 47 | — | ≤12:05 |
| Sat 8 May | Mock PFT | 43 | 48 | ≤55 s | ≤12:00 |
| Final assessment | Default Tue 1 Jun | 43+ | 48+ | ≤55 s | ≤12:00 |

These live in `TARGETS` and show on the Plan tab.

**What he was told about realism (4 Nov 2026)**
- 12:30 in test order by 4 Jan is realistic. 12:15 is about a one-in-three shot. That figure is a judgement, not a calculation.
- Sub-12:00 by graduation is realistic if he loses 15–20 lb and the shins hold.
- 40 push-ups by 4 Jan is a stretch. 36–38 is realistic.
- The reason: running is capped near an hour a week and fast running is the costliest thing for the tibia, so the gain must come from the bike and from bodyweight. Ten pounds is worth roughly 17–20 seconds over 1.5 miles.

---

## 6. Decision rules

### Shins: reported by exception

**On 4 Nov 2026 he asked for the daily shin screening to be removed and the swap button kept.** v7 does that:
- The two daily pain ratings, the readiness inputs as a requirement, and the lock that hid the session until he rated are gone.
- "Swap the run" is always visible on a run day. He can use it for any reason.
- A collapsed **Shins** card on the Today tab is where he reports pain, on the day it happens.
- **Do not bring the daily gate back** unless he asks. A gate he resents stops being answered honestly.

**The rules** (`shinVerdict`, `shinScan`, and the Plan tab card)

| Verdict | Trigger | What happens |
|---|---|---|
| Carry on | No pain, or 2/10 or less that fades in the first ten minutes and is gone next morning | Nothing |
| Back off | 3–4/10 during a run; pain that does not fade; any shin pain at first steps next morning | He taps a button that swaps his next two runs to the bike at 1.5× the minutes. Goal-pace reps, time trials and jumps are removed for 7 days. Next week's running holds instead of stepping up |
| Twice | Two flags within 14 days | For two weeks from the second flag: running capped at 70% of the last full week, all easy, no jumps. Calorie deficit paused |
| Stop | 5/10 or more; pain that builds as he runs; any warning sign ticked | No running or jumping. A button swaps his next four runs. He is told to see a sports-medicine clinician before running again, and to tell academy PT staff the same day |
| Coming back | After a stop or 7+ days off running | Pain-free walking and 10 pain-free hops per leg first. Then the return-to-run ladder (in the Shins card), restarting at about half the last pain-free week on alternate days, +10–15% a week, no fast running for two weeks |

**How the app implements them**
- Reports are stored in the same `pmPain`, `pmShape`, `amPain` and `flags` maps as before, keyed by day. History and the Records shin log keep working.
- From Week 5 a "pain day" is any day whose entry reads back off or stop, or with a warning sign ticked. Days before Week 5 are classified by the old v6.2 rule, so nothing he has trained is rebuilt.
- `trend` (pain days in the last 7) greater than 0 makes `trendClean` false in the day builder. That removes goal-pace reps, time trials, jumps and the formation-pace finish, and in the academy removes his own running.
- A swapped run is written into `subs` like any manual swap. It is visible, permanent and undoable from that day's Swap card.
- A swapped run counts as not run in `runCaps`. That is what makes next week hold.
- `twiceNow` adds the 70% term to `runCaps` for the current and the next week, and sets the Fuel tab's shin status to "flare" (maintenance calories).
- The Sunday one-minute check (press along the shin, 10 hops per leg) stays as the weekly safety net.

**Honest status of these rules:** the thresholds are expert opinion, not trial evidence. Shin-splint guidance allows progression under 4/10; bone-stress guidance wants no pain during, after or the next day. Both stop progression on next-day pain, which is why any morning pain is a back-off here.

### Missed 1.5-mile target
- **14 Nov time trial:** 12:45 or better keeps 12:15 alive. 12:46–13:05 makes the target 12:30. Slower than 13:05 repeats the trial on Sat 28 Nov in place of the long run. The app does the repeat automatically when the time is logged (`tt1Slow`).
- **Any later trial** more than 15 s behind, or under 10 s better than the last: add one easy 30–40 minute ride a week. If he has lost less than 1 lb a week over three weeks, cut 150–200 kcal a day.
- **Never** respond by running above the cap.
- **Mock slower than 13:00:** in academy weeks 3–6, two hard bike sessions a week and no Saturday leg lifting.

### Push-up or sit-up stall
A Friday max that rises by less than 1 over three weeks.
- Cut that event's volume by a third for one week, then re-test.
- Slow first 30 seconds (under 22 push-ups): strength is the limit. Add 2×6–8 feet-elevated push-ups after bench.
- Fast start and a collapse: endurance is the limit. Add a third Monday interval and cut the rests to 45 s.
- Under 34 push-ups or 41 sit-ups at the mock: keep two of his own sessions a week in the academy whatever PT does.

### Lifting stall
No added rep on a lift for three weeks.
- Losing more than 1% of bodyweight a week: add 200 kcal.
- Otherwise drop one set for a week, then change the exercise variation.

### Recovery
- Two hard sessions in a row that feel worse at the same power, or three nights under 6.5 hours: the threshold ride becomes an easy ride that week.
- Elbow or shoulder pain of 3/10 or more: drop Wednesday's push-up volume sets first. Keep Friday's max and the rows.

### Fat loss (`nutrition()`)
- About 0.5% of bodyweight a week through 19 Dec (end of Week 10), at 200–220 g protein. The existing energy-availability floor (30 kcal per kg of fat-free mass) can cap this lower; it is conservative for a man his size and was left in place.
- Maintenance from 20 Dec to 17 Jan: mock, holidays, arrival, first two academy weeks.
- Academy: up to 300 kcal a day once 14 days have passed with no shin flag. Maintenance inside 14 days of any test, from 3 May, and when the training-burn number is more than 14 days old.
- A shin flag in the last 7 days caps the deficit at 250 kcal. Two flags in 14 days, a warning sign or the return-to-run ladder means maintenance.

The missed-target, stall, lifting and recovery rules are text on the Plan tab and in this file. Only the time-trial repeat is automated.

---

## 7. Evidence

Sources were opened on 4 Nov 2026. Most were read as abstracts. Where the evidence is thin or absent, that is stated.

**1.5 mile**
- Intervals of 2–4 minutes adding up to 15+ minutes of hard work are the best-supported format for aerobic power: Helgerud 2007 (https://pubmed.ncbi.nlm.nih.gov/17414804/), Wen 2019 (https://pubmed.ncbi.nlm.nih.gov/30733142/).
- Cycling training improved run performance about as much as running training in seven small trials: Menges 2026 (https://pubmed.ncbi.nlm.nih.gov/42267259/). Contrary: cycling did not raise running lactate threshold in Pierce 1990 (https://pubmed.ncbi.nlm.nih.gov/2228355/). So running stays.
- Low-fit recruits improved 7–16% in 6–8 weeks, but they were about 20 and ran far more: Trank 2001 (https://pubmed.ncbi.nlm.nih.gov/11404670/), Myhre 2016 (https://pubmed.ncbi.nlm.nih.gov/27239430/). In one academy, weeks 4–17 brought only 20 seconds: Campbell 2024 (https://pubmed.ncbi.nlm.nih.gov/38489586/).
- Body mass: about 0.5–0.6% faster per 1% of mass removed, from added-weight and unloading studies. At his size that is roughly 1.2 s per mile per pound, or 17–20 s per 10 lb over 1.5 miles: Cureton 1978 (https://pubmed.ncbi.nlm.nih.gov/723510/), Zacharogiannis 2017 (https://doi.org/10.1249/01.mss.0000517367.65054.59). v6's "2 seconds per mile per pound" was overstated.
- No study was found on running 1.5 miles after a sprint and push-ups. Nothing shows a slow start beats an even or slightly fast one: Gosztyla 2006 (https://pubmed.ncbi.nlm.nih.gov/17149992/).
- Curved non-motorized treadmills cost about a fifth to a third more energy at the same speed; there are no bone-load or shin-injury data: Edwards 2017 (https://pubmed.ncbi.nlm.nih.gov/29184508/), Schoenmakers 2018 (https://pubmed.ncbi.nlm.nih.gov/29789265/).

**Shins**
- Strongest risk factor: a previous episode. Newman 2013 (https://pubmed.ncbi.nlm.nih.gov/24379729/), Garnock 2018 (https://pubmed.ncbi.nlm.nih.gov/29122474/). Body-mass index has a small, inconsistent effect.
- No treatment or prevention method has good trial evidence: Winters 2013 (https://pubmed.ncbi.nlm.nih.gov/23979968/), Moen 2012 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3352296/).
- A weekly 10% rule did not reduce injuries: Buist 2008 (https://pubmed.ncbi.nlm.nih.gov/17940147/). A single run more than 10% longer than the longest of the prior 30 days raised risk by about two-thirds in 5,205 runners: Frandsen 2025 (https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/).
- Tibial strain rises steeply with speed: Baggaley 2024 (https://pubmed.ncbi.nlm.nih.gov/38725420/), Edwards 2010 (https://pubmed.ncbi.nlm.nih.gov/20096977/). Bone-stress guidance: add volume before intensity: Warden 2021 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8316280/).
- Slower recruits are injured about twice as often: Knapik 2011 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3354365/), Jones 2017 (https://pubmed.ncbi.nlm.nih.gov/28993131/).
- Gait retraining cut shin splints in recruits, but the method was supervised biofeedback, not a metronome: Sharma 2014 (https://pubmed.ncbi.nlm.nih.gov/24500537/). Low step rate was associated with shin injury in one small cohort: Luedke 2016 (https://pubmed.ncbi.nlm.nih.gov/26818150/).
- Balance and neuromuscular training: conflicting. Marques 2025 (https://pubmed.ncbi.nlm.nih.gov/40633262/) against Goodall 2013 (https://pubmed.ncbi.nlm.nih.gov/22924758/).
- Calf endurance is lower in people with shin splints (association only): Madeley 2007 (https://pubmed.ncbi.nlm.nih.gov/17336155/).
- Foot orthoses reduced stress fractures in military trials; cushioned insoles did not: Bonanno 2017 (https://pubmed.ncbi.nlm.nih.gov/27919918/).
- Related loads: walking is about half the tibial stress of running (Meardon 2021, https://pubmed.ncbi.nlm.nih.gov/34077287/); boots versus shoes showed no strain difference in 7 people (Milgrom 1998, https://pubmed.ncbi.nlm.nih.gov/9498580/); jumping strained the tibia no more than running (Milgrom 2000, https://pubmed.ncbi.nlm.nih.gov/10854019/).
- Pain rules are expert opinion: Moen 2012 (above), Warden 2021 JOSPT (https://pubmed.ncbi.nlm.nih.gov/33962529/), George 2024 (https://pmc.ncbi.nlm.nih.gov/articles/PMC11393297/).
- No bone-injury data exist for dieting in a man his size. The evidence is from lean runners: Heikura 2018 (https://pubmed.ncbi.nlm.nih.gov/29252050/).
- **No injury trial was found for:** staged boot walking, staged asphalt, graded jump prep, tib raises, heavy soleus work as prevention. They are kept where they are cheap and already his routine, and described honestly in the app.

**Push-ups and sit-ups** (thin evidence)
- Push-up practice beat bench training for push-up gains: Kotarsky 2018 (https://pubmed.ncbi.nlm.nih.gov/29466268/).
- Bench strength explains about a fifth of one-minute push-up score: Mayhew 1991 (J Strength Cond Res 5(1):16–21).
- Sets to failure raised repetition endurance more: Izquierdo 2006 (https://pubmed.ncbi.nlm.nih.gov/16410373/).
- Replacing sit-ups with core work did not lower sit-up scores in 2,616 soldiers: Childs 2009 (https://pubmed.ncbi.nlm.nih.gov/19812508/).
- In academies, push-up and sit-up gains stalled after about week 8: Crawley 2016 (https://pubmed.ncbi.nlm.nih.gov/26466133/).
- No trial was found on high-frequency easy sets or on training frequency for these tests.

**Lifting, concurrent training, deloads**
- Size rises with weekly sets, with diminishing returns: Schoenfeld 2017 (https://pubmed.ncbi.nlm.nih.gov/27433992/), Pelland 2026 (https://pubmed.ncbi.nlm.nih.gov/41343037/). A common recommendation is 12–20 sets per muscle, from a small evidence base: Baz-Valle 2022 (https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/).
- Sets ended closer to failure grew more: Robinson 2024 (https://pubmed.ncbi.nlm.nih.gov/38970765/).
- One heavy exposure a week holds strength: Androulakis-Korakakis 2020 (https://pubmed.ncbi.nlm.nih.gov/31797219/). Fitness holds on far less training if intensity stays up: Spiering 2021 (https://pubmed.ncbi.nlm.nih.gov/33629972/).
- Endurance work interferes little with size and maximal strength on average, mostly in the legs and inside the same session: Schumann 2022 (https://pubmed.ncbi.nlm.nih.gov/34757594/), Petré 2021 (https://pubmed.ncbi.nlm.nih.gov/33751469/), Wilson 2012 (https://pubmed.ncbi.nlm.nih.gov/22002517/). Six hours between sessions helped: Robineau 2016 (https://pubmed.ncbi.nlm.nih.gov/25546450/).
- Scheduled deloads have no outcome evidence, and a week off cost strength in one trial: Bell 2023 (https://pubmed.ncbi.nlm.nih.gov/37730925/), Coleman 2024 (https://pubmed.ncbi.nlm.nih.gov/38274324/). A pre-test taper is supported: volume down 41–60%, intensity and frequency kept: Bosquet 2007 (https://pubmed.ncbi.nlm.nih.gov/17762369/).

**Fat loss and sleep**
- A deficit blunts muscle gain; about 500 kcal a day removed it on average: Murphy & Koehler 2022 (https://pubmed.ncbi.nlm.nih.gov/34623696/).
- Slow loss with lifting kept or added lean mass: Garthe 2011 (https://pubmed.ncbi.nlm.nih.gov/21558571/). High protein helped in a deficit: Longland 2016 (https://pubmed.ncbi.nlm.nih.gov/26817506/).
- Short sleep: more injuries in soldiers (Grier 2020, https://pubmed.ncbi.nlm.nih.gov/32061551/) and, in a deficit, more of the loss from lean tissue (Nedeltcheva 2010, https://pubmed.ncbi.nlm.nih.gov/20921542/).

**Claims that were in the app with no source found. Do not reintroduce them.**
- "43 studies show bench press does not interfere with push-up volume."
- "Each sit-up loads the spine at 3,300–3,500 N against a 3,400 N limit." Only "above 3,000 N" is verified (McGill 1995), and the limit is an occupational lifting criterion.
- "The neck fails before the abs in a sit-up test."
- "2 seconds per mile per pound."
- "Walking is 3× lower tibial stress than running." The verified figure is about half.

Some of these still appear in library text shown only on Week 1–4 days. That text is history and was left alone.

---

## 8. What changed on 4 Nov 2026 (v7), and where it differs from the approved plan

**Changed**
- Pass line 13:08 → 13:16, with the explanation. Goals and a dated targets card.
- Weeks 5–10: new week (two hard bike sessions, three upper sessions, two short lower sessions, Friday maxes, two time trials). Weeks 11–12 and all academy weeks rewritten.
- Today tab: session first. Shins card, warning signs and sleep inputs are collapsed and optional. "Swap the run" always visible.
- Back-off rules automated as described in §6.
- Calorie rules: deficit to 19 Dec (was 14 Dec); academy deficit up to 300 kcal gated only on 14 flag-free days.
- Backup export and restore on the Records tab.
- Lift logs from light running weeks now count toward e1RM (from Week 5 only).
- The shin-evidence and flare-protocol cards on the Plan tab were rewritten to match §6 and §7.

**Differences from the plan he approved** (all on the cautious or the necessary side; he was told)
- **150 m reps are not in Phase A.** The approved plan listed them every second Wednesday and also capped fast minutes. They do not fit under the caps, so the caps won.
- **Academy quality run can reach 28 running minutes, not 20.** With a hard 20-minute limit the weekly ramp stalled at 80 total minutes and never reached the approved caps. The extra is easy running; the fast part is unchanged.
- **Week 15 own run is about 6 minutes, and the minimum own run dropped from 8 to 6.** Week 12 now ends on 60 minutes, and with an 8-minute floor the 10% rule left his own running at zero for the whole academy.
- **The hard bike sits on Monday with Tue/Thu PT,** the night before a PT day, because the other free evenings are the lifting days after PT.
- **Bike/row minutes built are slightly under the approved caps** in Weeks 7–10 (130, 130, 155, 165 against 140, 145, 165, 170).

---

## 9. Code map

All in `src/blue-line-prep.html`. The engine is plain JS from `const STORE=` to the icons section; the React `App` follows.

| What | Where |
|---|---|
| Calendar, phases, revision gates | `START`, `ACADEMY_WK`, `TAPER_WKS`, `DELOADS`, `NEW_FROM`, `V7_FROM`, `TT_WKS`, `PHASES` |
| Standards, goals, dated targets | `EVENTS`, `PASS`, `GOAL`, `TARGETS` |
| Running: minutes, reps, caps, surfaces | `RUN_PLAN`, `RUN_CAPS7`, `GP_REPS`, `GP_EXTRA`, `ASPHALT`, `FORMATION`, `runPaces` |
| Academy running | `RUN_CEIL`, `LONG_CEIL`, `ownRunAcademy`, `academyWeeks`, `PT_DAYS_DEFAULT`, `dayTypeOf` |
| Lifting | `LIFT7`, `vol7`, `liftSr7`, `acc7`, `upper7`, `lowerA7`, `lowerB7`, `e1Track`, `isEasyLog` |
| Push-ups and sit-ups | `calis7`, `PU_INT`, `puRate`, `suRate`, `FRI_MAX_WKS` |
| Bike | `BK7`, `BIKE7` |
| Day builder | `buildDayRaw` (Sunday, test taper, Weeks 11–12, academy, Weeks 5–10, then the v6 templates for Weeks 1–4) |
| Missed sessions, re-entry, swaps, return-to-run | `missAdapt`, `reentryOf`, `buildDay`, `subFor`, `RTR` |
| Shin rules | `shinVerdict`, `isPainDay7`; in `App`: `shinScan`, `twice14`, `twiceNow`, `swapNextRuns`, `runCaps` |
| Calories | `nutrition()`; in `App`: `gateOK`, `shin` |
| Saved state | `snap()`, the load effect, `exportData`, `importData` |
| Exercise text | `SHIN_EX`, `PACE_EX`, `STR_EX`, `CARDIO_EX`, `RUN_EX`, `LIBS` |
| Debug handle | `window.__blp` |

**Old code that still runs:** the v6 and v6.2 templates, `puFor`, `suFor`, `WAVE`, `liftSr`, `SPEED`, `cadNote` build Weeks 1–4. Do not delete them. Their table entries for Weeks 5–10 are dead.

**Tools** (`blue-line-prep/tools/`)
- `check.sh`: the regression and rule checks. Run before every commit.
- `dump.cjs`, `cmp.cjs`, `show.cjs`: dump the engine's output, compare two dumps, print weeks.
- `unit.cjs`: 56 rule checks (shin verdicts, caps, missed days, academy patterns). Add a check when you add a rule.
- `spec.cjs`: regenerates `PROGRAM_SPEC.md`.

---

## 10. Open items

- **Sat 14 Nov:** first real 1.5-mile number since September. It resets every goal pace and decides whether 12:15 is live (§6).
- **When MCCC publishes the schedule:** he sets PT days on the Plan tab and enters assessment dates. If the final assessment is not Tue 1 Jun, the graduation peak follows the date he enters.
- **After three logged academy weeks:** check that the academy-running assumption (30 minutes per PT day) was close. If the academy runs far more, his own running will sit at zero and Saturday becomes the second hard bike. That is intended.
- **If he gives his real bodyweight, age or shin status,** revisit the calorie numbers and the 30–39 bracket note.
- **The Sunday shin check and the calf-capacity test** were not discussed with him. They were kept as weekly, not daily, items. Remove them only if he asks.
- **Not built:** automatic handling of the missed-target, stall and recovery rules beyond the time-trial repeat. They are written rules he applies himself.
