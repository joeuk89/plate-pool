# plate-pool: specification

Version 1. Agreed 2026-09-30.

## 1. Purpose

plate-pool is a calculator for one home gym. It knows every plate, locking screw, collar and implement the owner has, and it answers three questions:

| Question | Example | Answer |
| --- | --- | --- |
| **Load** | "175 lb on the barbell" | Which plates go where, with a picture |
| **List** | "Every barbell weight from 100 to 200 lb" | A table of achievable weights |
| **Reverse** | "These plates are on the bar" | The total weight |

It has three users: the owner on a phone in the gym, the owner on a desktop, and software agents that plan training (for example the coach agent in the owner's workout repo).

The app needs no agent or AI to work. Every answer comes from a fixed calculation over the inventory file.

## 2. Glossary

Code, documents and agents use these words with these meanings.

| Term | Meaning |
| --- | --- |
| **Implement** | A piece of equipment that carries weight: barbell, dumbbell, kettlebell, leg attachment, vest. |
| **Plate** | One removable weight. A vest block counts as a plate. |
| **Plate type** | A family of plates that fit the same implements: Quick-Lock, vest block. Olympic is a future type. |
| **Plate pool** | Every plate and piece of locking hardware the owner has. All implements draw from it. |
| **Locking hardware** | What holds plates on: locking screws (dumbbell, kettlebell) and collars (barbell). |
| **Position** | A place on an implement that holds plates. The barbell has two **sides**. A dumbbell has two **ends**. The kettlebell and leg attachment have one **stack**. The vest has **front** and **back**. |
| **Base weight** | The weight of an implement with its locking hardware and no plates. |
| **Loading** | A full description of one loaded implement: locking hardware, and the plates on each position in order. |
| **Target** | The total weight asked for. It includes the base weight. |
| **Request** | One or more targets, in priority order. |
| **Listed weight** | The weight the manufacturer states. |
| **Measured weight** | A weight the owner has measured. It overrides the listed weight. |
| **Unverified** | A value no reliable source or measurement confirms. |
| **Uneven** | A dumbbell whose two ends carry different weights. |

## 3. Scope

### In version 1

- Load, List and Reverse for five implements: barbell, dumbbells, kettlebell, leg attachment, weighted vest.
- Requests that cover several implements and share the plate pool.
- A web app that installs on a phone and works offline.
- A command-line tool published to npm.
- Static JSON files for agents with web access.
- A guide that tells agents how to use the tool.

### Out of version 1

- Workout logging, rest timers, and any link to Hevy.
- Accounts, sync, or any server.
- Editing the inventory inside the app.
- Remembering what is loaded now, or working out the fewest plate changes between two loadings.
- One-rep-max and percentage calculators.
- The rack. Mirafit publishes no load rating for the M130, so there is nothing to check against.
- Typed or spoken sentences as input.

## 4. Equipment

Full detail, sources and open questions are in [research/equipment-specs.md](research/equipment-specs.md). This section holds the values the app uses.

Status values: **verified** (manufacturer or distributor states it), **owner** (the owner confirmed it on the equipment), **unverified**.

### 4.1 Plates

| Plate | Type | Count | Weight | Stack length per plate | Shape | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 22.5 lb | Quick-Lock | 5 | 22.5 lb | 1.875 in | Square | Weight verified; length unverified |
| 5 lb | Quick-Lock | 24 | 5 lb | 0.5 in | Square | Weight verified; length unverified |
| 2.5 lb | Quick-Lock | 4 | 2.5 lb | 0.25 in | Square | Weight verified; length unverified |
| Micro | Quick-Lock | 4 | 1.25 lb | 0.25 in | Round | Weight verified; length unverified |
| Vest block | Vest block | 30 | 1 kg | n/a | Block | Weight verified; count unverified |

Quick-Lock plates total 247.5 lb.

Stack length is how much a plate adds to a stack. Ironmaster publishes no thickness, so these values are calculated from published dumbbell lengths. They set how many plates a locking screw holds and how the picture is drawn.

### 4.2 Locking hardware

| Item | Count | Weight used | Holds | Status |
| --- | --- | --- | --- | --- |
| Standard locking screw | 4 | 2.5 lb | Up to 3.25 in of plates (six 5 lb + one 2.5 lb) | Verified |
| Long locking screw | 5 | 2.5 lb | Up to 5.125 in of plates (one 22.5 lb + six 5 lb + one 2.5 lb) | Listed weight verified. Real weight is about 3 lb |
| Ironmaster spin-lock collar | 2 | 0 lb | n/a | Unverified |
| Mirafit 1" clamp collar | 4 | 0 lb | n/a. 1.26 in wide | Unverified |

Ironmaster counts the long screw as 2.5 lb, and so does the app. A dumbbell listed at 120 lb weighs about 121 lb.

### 4.3 Implements

| Implement | Count | Base weight | Positions | Plate types | Limit |
| --- | --- | --- | --- | --- | --- |
| Straight bar | 1 | 18 lb, plus collars | 2 sides | Quick-Lock | 210 lb of plates |
| Dumbbell | 2 | 5 lb handle + 2 screws = 10 lb | 2 ends | Quick-Lock | 120 lb per dumbbell |
| Kettlebell | 1 | 22.5 lb handle + 1 screw = 25 lb | 1 stack | Quick-Lock | 80 lb |
| Leg attachment | 1 | 0 lb (plates only) | 1 stack | Quick-Lock | 100 lb of plates |
| Weighted vest | 1 | 0 kg | Front, back | Vest block | 30 blocks |

Notes:

- **Straight bar.** Ironmaster states "about 18 lb" and does not say whether that includes collars. The app uses 18 lb for the bar and adds the collar weight, which is 0 lb until known. Status: unverified. Each side has 11.5 in for plates and the collar.
- **Bare handles.** A dumbbell with no screws and no plates weighs 5 lb. A kettlebell with no screw and no plates weighs 22.5 lb. Both are valid loadings.
- **Leg attachment.** Its lever weight is not published. The app reports plate weight only.
- **Vest.** The empty vest's weight is not published. It counts as 0 kg. Status: unverified.
- **Leg attachment and Olympic plates.** The attachment also takes Olympic plates. The owner has none, so version 1 lists Quick-Lock only.

## 5. Inventory file

One JSON file holds everything in section 4. It is the single source of truth for the web app, the command-line tool and the static JSON.

Rules:

- The file lives in the repo at `inventory/inventory.json`, with a JSON Schema beside it. The build fails if the file does not match the schema.
- The owner or an agent changes it by editing the file and pushing. The app only reads it.
- It holds equipment only: no order numbers, prices, dates or addresses. The repo is public.
- Every weight has a `listed` value, an optional `measured` value and a `status`. The calculation uses `measured` when present, otherwise `listed`.
- Plate types are data. Each implement names the plate types it accepts. Adding Olympic plates later is a change to this file and needs no code change.

Shape, shown by example:

```json
{
  "plateTypes": [
    { "id": "quick-lock", "name": "Ironmaster Quick-Lock", "unit": "lb" },
    { "id": "vest-block", "name": "Mirafit vest block", "unit": "kg" }
  ],
  "plates": [
    {
      "id": "ql-22.5",
      "type": "quick-lock",
      "count": 5,
      "weight": { "listed": 22.5, "status": "verified" },
      "stackLengthIn": { "listed": 1.875, "status": "unverified" },
      "shape": "square"
    }
  ],
  "hardware": [
    {
      "id": "screw-long",
      "kind": "screw",
      "count": 5,
      "weight": { "listed": 2.5, "status": "verified", "note": "Real weight is about 3 lb" },
      "capacityIn": 5.125
    },
    {
      "id": "collar-clamp",
      "kind": "collar",
      "count": 4,
      "weight": { "listed": 0, "status": "unverified" },
      "widthIn": 1.26
    }
  ],
  "implements": [
    {
      "id": "barbell",
      "name": "Straight bar",
      "count": 1,
      "unit": "lb",
      "base": { "listed": 18, "status": "unverified" },
      "positions": ["left", "right"],
      "symmetric": true,
      "accepts": ["quick-lock"],
      "hardware": { "options": ["collar-clamp", "collar-spinlock", "none"], "default": "collar-clamp", "perPosition": 1 },
      "maxPlateWeight": 210
    }
  ]
}
```

The build fills in the remaining plates, hardware and implements from section 4.

## 6. Calculation rules

### 6.1 General

1. **A target is a total.** It includes the base weight: bar, handle, screws and collars.
2. **Measured beats listed.** See section 5.
3. **Unverified values are flagged.** Every result names the unverified values it used.
4. **Pounds first.** Results show pounds with kilograms beside them. The vest shows kilograms first. Input accepts either unit: `175`, `175lb`, `80kg`. A bare number means pounds, or kilograms for the vest.
5. **Exact arithmetic.** The library calculates in whole thousandths of the implement's unit, so sums never drift. It converts to the other unit for display only, with 1 lb = 0.45359237 kg. Pounds show up to two decimals and kilograms one.
6. **The pool is never exceeded.** No result uses more plates or hardware than the inventory holds.

### 6.2 Rules per implement

**Barbell**

- Both sides carry the same plates in the same order.
- Plates may total at most 210 lb. A target above the limit is refused: the result states the limit and shows the heaviest allowed loading.
- One collar per side. The choice is Mirafit clamp (default), Ironmaster spin-lock or none.
- At most one micro plate per side.

**Dumbbells**

- A request for dumbbells means a pair unless it asks for one. Both dumbbells in a pair get the same loading.
- Two screws per dumbbell, both the same kind. Standard screws up to 75 lb per dumbbell, long screws above.
- A long screw needs at least 3.0 in of plates on its end to lock (unverified).
- The two ends may differ in weight by at most 2.5 lb. This is Ironmaster's documented way to make small steps. The result is marked uneven and names the heavier end.
- If every 2.5 lb and micro plate is in use on another implement, the ends may differ by 5 lb. The result says why.
- At most one micro plate per end.
- A setting turns uneven loading off. Targets that need it then become impossible and follow rule 6.4.

**Kettlebell**

- One stack, one screw. Standard screw up to 57.5 lb, long screw above.
- If no standard screw is free, the kettlebell takes a long screw. The result warns that the screw may stick out at the top, which Ironmaster's manual calls normal.
- At most one micro plate.

**Leg attachment**

- One stack, no locking hardware from the pool.
- Plates may total at most 100 lb.
- Every result carries a fixed note: "Plate weight only. The lever changes the resistance you feel."

**Weighted vest**

- A target in kilograms is a number of 1 kg blocks.
- Blocks split evenly between front and back. With an odd count, the extra block goes on the back.

**All Quick-Lock implements**

- Plates on a position must fit the locking hardware's capacity, measured in stack length.
- Order on a position: heaviest plate innermost, micro plate outermost.
- A micro plate uses 0.25 in of stack length, the same as a 2.5 lb plate.

### 6.3 Choosing a loading

Several loadings often reach the same weight. For a request with implements 1 to n in priority order, the library picks the loading set that wins this comparison, checked in order:

1. Implement 1 is as close to its target as possible.
2. Implement 2 is as close to its target as possible, and so on to implement n.
3. The fewest plates in total across all implements.
4. The fewest uneven dumbbells.

"As close as possible" means the smallest difference from the target. On a tie, the lower weight wins.

The result also holds up to five other loadings per implement that reach the same weight, for the "other ways to make this" list.

The search space is small: 37 plates of 4 sizes. The library may search it exhaustively.

### 6.4 Impossible targets

When no loading reaches a target exactly, the result holds two loadings: the closest below and the closest above. It marks the nearer one as recommended. On a tie it recommends the lower.

In a request with several implements, each later implement uses the plates left by the recommended loadings before it. A later implement that misses its target because of plates used earlier gets a warning that names the cause.

### 6.5 List

List returns every achievable total for one implement within a range, in ascending order. It assumes the whole pool is free. Each row holds the total, the recommended loading, and flags: uneven, micro plates used, screw kind.

### 6.6 Reverse

Reverse takes a loading and returns its total. It also checks the loading against the pool and the rules in 6.2, and returns a warning for each rule broken. It returns the total even when a rule is broken.

## 7. Worked examples

These use the inventory in section 4 with both collar types at 0 lb. They are acceptance tests for the library.

| # | Request | Result |
| --- | --- | --- |
| 1 | Barbell 175 lb | Not exact. Below: 173 lb, each side 2 × 22.5, 6 × 5, 1 × 2.5. Above: 175.5 lb, each side the same plus 1 micro. Recommended: 175.5 lb. |
| 2 | Barbell 173 lb | Exact. Each side 2 × 22.5, 6 × 5, 1 × 2.5. |
| 3 | Barbell 230 lb | Refused: over the 210 lb plate limit. Heaviest allowed: 228 lb, each side 2 × 22.5, 12 × 5. |
| 4 | Dumbbells 40 lb (pair) | Exact. Each end 3 × 5. Standard screws. Uses 12 × 5 lb plates. |
| 5 | One dumbbell 12.5 lb | Exact, uneven. One end 1 × 2.5, the other end empty. Standard screws. |
| 6 | One dumbbell 47.5 lb | Exact, uneven. One end 4 × 5, the other end 3 × 5 + 1 × 2.5. |
| 7 | Dumbbells 120 lb (pair) | Exact. Each end 1 × 22.5, 6 × 5, 1 × 2.5. Long screws. Uses every 5 lb and 2.5 lb plate. |
| 8 | Kettlebell 80 lb | Exact. 1 × 22.5, 6 × 5, 1 × 2.5. Long screw. |
| 9 | Dumbbells 120 lb (pair), then kettlebell 40 lb | Dumbbells exact. Kettlebell not exact: below 26.25 lb (1 micro), above 47.5 lb (1 × 22.5). Recommended: 47.5 lb, with a warning that the dumbbells use the plates it needs. |
| 10 | Barbell 173 lb, then dumbbells 40 lb (pair) | Both exact. Left over: 1 × 22.5, 2 × 2.5, 4 micro, 5 long screws. |
| 11 | Barbell 88 lb, then dumbbells 75 lb (pair) | Both exact. Barbell: each side 7 × 5. Dumbbells: each end 1 × 22.5, 2 × 5, standard screws. The barbell gives up its fewest-plate loading (1 × 22.5, 2 × 5, 1 × 2.5 per side) so the dumbbells can reach 75 lb. 26 plates in total. |
| 12 | Leg attachment 50 lb | Exact. 2 × 22.5, 1 × 5. |
| 13 | Vest 12 kg | Exact. 12 blocks: 6 front, 6 back. |
| 14 | Vest 30 lb | Not exact (13.6 kg). Below: 13 kg. Above: 14 kg. Recommended: 14 kg. |

Properties that must hold for every input:

- Every row from List, passed to Load as a target, returns an exact result.
- Reverse of any loading from Load returns the same total.
- No result exceeds the pool.

## 8. Web app

### 8.1 Principles

- Simple, clean and stylish. One job per screen.
- Readable at arm's length on a phone: large type, high contrast.
- Follows the device's light or dark setting.
- Built for a Pixel 10 Pro first, and usable on a desktop.
- All calculation runs in the browser.

### 8.2 Load screen

This is the main screen.

- **Implement tabs** across the top: barbell, dumbbells, kettlebell, leg attachment, vest.
- **One large number field** for the target, with a unit switch.
- **Step buttons** up and down. Each press moves to the next achievable weight.
- **Options per implement**: collar choice for the barbell; pair or single for dumbbells.
- **Result**: the picture, then a text list per position ("each side: 2 × 22.5, 6 × 5, 1 × 2.5"), then the hardware to use.
- **Impossible target**: two results side by side, below and above, with the recommended one highlighted.
- **Notes**: uneven loading, warnings, and unverified values, in small text under the result.
- **Other ways to make this**: a collapsed list.

### 8.3 Several implements

- An "add implement" button stacks another card under the first.
- Card order is priority order. The owner drags cards to reorder.
- Each card shows its own result and picture.
- A line at the bottom shows the plates and hardware left over.

### 8.4 The picture

- An SVG schematic seen from the side.
- Plates drawn at relative size: width from stack length, height from plate size. Quick-Lock plates are 6.7 in square. The micro plate is a smaller round disc.
- Each plate is labelled with its weight and coloured by weight. The same weight has the same colour everywhere.
- Locking hardware is drawn and named.
- An uneven dumbbell marks its heavier end.
- The vest is drawn as front and back grids of blocks.

### 8.5 List screen

- One table per implement, with a from and to filter.
- Columns: total in pounds, total in kilograms, plates per position, flags.
- Tapping a row opens that weight in the Load screen.

### 8.6 Reverse screen

- The same picture as Load, made editable.
- Plate buttons add a plate. Tapping a plate in the picture removes it.
- Sides and ends mirror by default. A switch turns mirroring off for dumbbells.
- The total updates on every change. Rule warnings show under it.

### 8.7 Links

Every result has its own URL. Opening the URL shows the same result.

| Parameter | Meaning | Example |
| --- | --- | --- |
| `barbell`, `kettlebell`, `leg`, `vest` | Target for that implement | `barbell=175` |
| `dumbbells` | Target for a pair | `dumbbells=40` |
| `dumbbell` | Target for one dumbbell | `dumbbell=12.5` |
| `collars` | `clamp`, `spinlock` or `none` | `collars=clamp` |
| `uneven` | `0` turns uneven loading off | `uneven=0` |
| `view` | `load` (default), `list` or `reverse` | `view=list` |

Parameter order is priority order. Values take an optional unit: `vest=12kg`, `barbell=80kg`.

Example: `https://joeuk89.github.io/plate-pool/?barbell=173&dumbbells=40`

### 8.8 Settings

The app remembers these on the device:

- Collar choice. Default: Mirafit clamp.
- Uneven loading on or off. Default: on.
- Last implement used.

The app must work when the browser's storage is empty or blocked.

### 8.9 Offline

The app is an installable web app. After the first visit it loads and calculates with no network. A new deployment replaces the cached copy on the next visit with a network.

## 9. Command-line tool

Published to npm as `plate-pool`. It runs with `npx plate-pool` and needs no setup.

| Command | Purpose | Example |
| --- | --- | --- |
| `load` | Loadings for one or more targets | `plate-pool load barbell=173 dumbbells=40` |
| `list` | Achievable weights for one implement | `plate-pool list barbell --from 100 --to 200` |
| `reverse` | Total for a given loading | `plate-pool reverse barbell --side 22.5,22.5,5,5` |
| `inventory` | What the owner has | `plate-pool inventory` |

Options:

| Option | Meaning |
| --- | --- |
| `--json` | Structured output for agents |
| `--collars <clamp\|spinlock\|none>` | Barbell collar choice. Default: `clamp` |
| `--no-uneven` | Turn uneven dumbbell loading off |
| `--inventory <path>` | Use a different inventory file |

Behaviour:

- Implement names and target syntax match the URL parameters in 8.7.
- Argument order is priority order.
- `reverse` takes `--side` for the barbell, `--end-a` and `--end-b` for a dumbbell, `--stack` for the kettlebell and leg attachment, and `--blocks` for the vest.
- Default output is readable text with a one-line plate layout per position.
- Exit code 0 for any valid request, including one with no exact answer. Exit code 1 for invalid input, with the reason on standard error.
- The package bundles the owner's inventory file.

Text output example:

```
$ plate-pool load barbell=175
Barbell  target 175 lb (79.4 kg)  no exact loading

  below  173 lb (78.5 kg)
         each side: 22.5 22.5 5 5 5 5 5 5 2.5 | clamp collar
* above  175.5 lb (79.6 kg)
         each side: 22.5 22.5 5 5 5 5 5 5 2.5 1.25 | clamp collar

Unverified: bar weight, collar weight
```

JSON output example:

```json
{
  "results": [
    {
      "implement": "barbell",
      "target": { "lb": 175, "kg": 79.4 },
      "exact": false,
      "recommended": "above",
      "below": {
        "total": { "lb": 173, "kg": 78.5 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          { "name": "left", "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5] },
          { "name": "right", "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5] }
        ],
        "uneven": false
      },
      "above": {
        "total": { "lb": 175.5, "kg": 79.6 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          { "name": "left", "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25] },
          { "name": "right", "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25] }
        ],
        "uneven": false
      },
      "alternatives": [],
      "warnings": [],
      "unverified": ["barbell.base", "collar-clamp.weight"]
    }
  ],
  "leftover": {
    "plates": { "ql-22.5": 1, "ql-5": 12, "ql-2.5": 2, "ql-micro": 2 },
    "hardware": { "screw-standard": 4, "screw-long": 5, "collar-clamp": 2, "collar-spinlock": 2 }
  }
}
```

Plates in a position are listed from innermost to outermost. `leftover` assumes the recommended loading.

## 10. Static JSON

The deployment publishes two files beside the web app. Any agent with web access can read them with no login.

| File | Contents |
| --- | --- |
| `api/inventory.json` | The inventory file as deployed |
| `api/achievable.json` | The List result for every implement over its full range, with the whole pool free. The barbell has one table per collar choice. Dumbbells have one table for a pair and one for a single. |

The build generates `achievable.json` from the library, so it cannot disagree with the app.

## 11. Agent guide

The repo holds `docs/agent-guide.md`. It covers:

- What plate-pool answers, in three lines.
- Each command with one example, and the JSON shape of its output.
- The static JSON URLs.
- The rules an agent must know: a target is a total; barbell totals are 18 lb plus a multiple of 2.5; implements share one pool; a request's order is its priority.
- A snippet to paste into another repo's agent instructions.

## 12. Build

### 12.1 Stack

- **Language**: TypeScript throughout.
- **Library** (`packages/core`): the model and all calculation. No runtime dependencies. No access to files, network or browser features.
- **Command-line tool** (`packages/cli`): Node. Reads the inventory and calls the library.
- **Web app** (`packages/web`): Vite and React. Calls the library in the browser.
- **One repo**, using npm workspaces.

### 12.2 Layout

```
inventory/
  inventory.json
  inventory.schema.json
packages/
  core/
  cli/
  web/
docs/
  spec.md
  agent-guide.md
  research/equipment-specs.md
```

### 12.3 Tests

- Tests sit on the library.
- Section 7's examples and properties are the minimum set.
- The command-line tool has one test per command that checks its JSON output against the library's result.
- The web app needs no calculation tests, because it holds no calculation.

### 12.4 Hosting and release

- The repo is public on GitHub, under the owner's personal account (`joeuk89`). It must not sit under the Red Snapper organisation.
- A GitHub Actions workflow runs on every push to the main branch: test, build the web app, generate the static JSON, deploy to GitHub Pages.
- A second workflow publishes the npm package when a version tag is pushed.

### 12.5 Build order

Each step ends in something that works and can be reviewed alone.

1. Inventory file and schema.
2. Library: model, Reverse, and Load for one implement.
3. Library: List, and Load for several implements.
4. Command-line tool.
5. Web app: Load screen and picture for one implement.
6. Web app: several implements, List screen, Reverse screen, links, settings.
7. Offline support, deployment and static JSON.
8. Agent guide, and npm release.

## 13. Open items

None of these block the build. Each is one value in the inventory file.

| Item | Value used now | Settled by |
| --- | --- | --- |
| Bar's real weight, and whether 18 lb includes collars | 18 lb, collars extra | Bathroom scale: weigh yourself holding the bar, subtract your bodyweight |
| Weight of each collar type | 0 lb | Kitchen scale |
| Long screw's real weight | 2.5 lb (Ironmaster's convention) | Kitchen scale |
| Empty vest weight, and block count | 0 kg, 30 blocks | Bathroom scale, and counting |
| Do 2 × 22.5 + 12 × 5 lb fit on one bar side with the collar on | Allowed. Calculated to fit with a clamp collar, 0.49 in spare | Loading it once |
| Does a long screw lock on a lightly loaded kettlebell | Allowed, with a warning | Trying it once |
| Shortest stack a long screw locks on a dumbbell | 3.0 in | Trying it once |
| Plate stack lengths | Calculated values in 4.1 | Measuring a stack of five 5 lb plates |

The research file lists further checks. They affect drawing scale only.

## 14. Follow-ups outside this build

- **Workout repo logs.** Logged barbell weights assumed a 20 lb bar. With an 18 lb bar they are about 2 lb high, and targets such as 125 lb cannot be made exactly. The nearest are 123 and 125.5 lb.
- **Workout repo guide.** Add the snippet from the agent guide to the workout repo's `reference/` folder.
- **GitHub repo.** The owner creates it under their personal GitHub account (`joeuk89`), not the Red Snapper organisation, and turns on GitHub Pages.

## 15. Later candidates

Not agreed, and not part of version 1. Recorded so they are not lost.

- List with some plates reserved for another implement ("what can the dumbbells make while the barbell is at 173?").
- Remembering what is loaded, and the fewest plate changes to the next loading.
- Olympic plates and bar.
- Bodyweight plus vest totals for chin-ups and dips.
