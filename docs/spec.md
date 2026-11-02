# plate-pool: specification

Version 1 agreed 2026-09-30. Version 2 (section 16) agreed 2026-10-30. Version 3 (section 17) agreed 2026-11-02. Sections 1 to 3 describe the app as it stands after version 3; sections 4 to 16 record versions 1 and 2, and section 17 names each rule it replaces.

## 1. Purpose

plate-pool is a calculator for a plate-loaded gym. Given an inventory file that describes every plate, piece of locking hardware and implement a gym has, it answers three questions:

| Question | Example | Answer |
| --- | --- | --- |
| **Load** | "175 lb on the barbell" | Which plates go where, with a picture |
| **List** | "Every barbell weight from 100 to 200 lb" | A table of achievable weights |
| **Reverse** | "These plates are on the bar" | The total weight |

It has three users: a person on a phone in their gym, the same person on a desktop, and software agents that plan training (for example the coach in the owner's strength-coach repo). The phone gets its inventory from a set-up link; the desktop and the agents hand the tool a file.

The app needs no agent or AI to work. Every answer comes from a fixed calculation over the inventory file.

The owner's own gym is the reference example: `inventory/inventory.json` is a format 1 file like any other, and every worked example runs against it.

## 2. Glossary

Code, documents and agents use these words with these meanings.

| Term | Meaning |
| --- | --- |
| **Inventory** | The file that describes one gym: its plate types, plates, hardware and implements. Format 1 (section 17.3) is its public shape. |
| **Format** | The version of the inventory file's shape. A file states its format; the app reads format 1. |
| **Kit** | A named inventory stored on the device. One at a time. |
| **Implement** | A piece of equipment that carries plates: a bar, a loadable dumbbell, a loadable kettlebell, a leg attachment, a vest. |
| **Implement kind** | One of four shapes an implement can have: **bar**, **handle**, **stack**, **vest**. The kind fixes the implement's positions and its drawing. |
| **Bar** | An implement kind with two sides that always carry the same plates: a barbell, or a two-post machine. |
| **Handle** | An implement kind with two ends that may carry different plates: a loadable dumbbell. A handle the gym has two or more of can be loaded as a **pair** or as a **single**. |
| **Stack** | An implement kind with one position: a loadable kettlebell, a leg attachment, a dip belt, a landmine. |
| **Vest** | An implement kind with a front and a back that share its plates: a weighted vest or plate carrier. |
| **Plate** | One removable weight. A vest block counts as a plate. |
| **Plate type** | A family of plates that fit the same implements, with a bore: Olympic, standard, Quick-Lock, vest block. |
| **Plate pool** | Every plate and piece of locking hardware the gym has. All implements draw from it. |
| **Locking hardware** | What holds plates on. Its kinds are **screw**, **collar** and **pin**. |
| **Position** | A place on an implement that holds plates. A bar has two **sides**. A handle has two **ends**. A stack has one **stack**. A vest has **front** and **back**. |
| **Base weight** | The weight of an implement with no plates. Hardware weight is added unless the file says the base includes it. |
| **Loading** | A full description of one loaded implement: locking hardware, and the plates on each position in order. |
| **Target** | The total weight asked for. It includes the base weight. |
| **Request** | One or more targets, in priority order. |
| **Listed weight** | The weight the manufacturer states. |
| **Measured weight** | A weight the owner has measured. It overrides the listed weight. |
| **Unverified** | A value no reliable source or measurement confirms. |
| **Uneven** | A handle whose two ends carry different weights. |
| **Current loading** | The loading that is on an implement right now, as the user has told the app. |
| **Change** | One plate put on or taken off one position, or one screw or pin added, removed or swapped for another (a swap counts two: one off, one on). Taking hardware off to reach the plates and putting the same piece back does not count. Collars never count. |
| **Changes** | The number of changes to get from the current loading to another loading. |
| **Set-up link** | A link that carries an inventory and installs it as the kit. |
| **Per-line link** | A link that carries targets and the short hash of the kit they were worked out for. |
| **Kit screen** | The screen that imports a kit. It is the whole app until a kit is stored, and the kit page afterwards. |

## 3. Scope

Version 1 is sections 5 to 15, version 2 is section 16 and version 3 is section 17. Each later version says what it replaces in the earlier sections.

### In scope

- Load, List and Reverse for every implement in a format 1 inventory, over the four implement kinds.
- Requests that cover several implements and share the plate pool.
- A current loading per implement and the fewest changes to the next loading.
- A web app that opens with no inventory, takes a kit from a set-up link, a pasted file or a chosen file, installs on a phone and works offline.
- A command-line tool published to npm that reads any format 1 file and writes the `achievable` document for agents.
- A guide that tells agents how to use the tool.

### Out of scope

- Fixed-weight equipment and selectorised machines: fixed dumbbells and kettlebells, pin stacks, bands, bodyweight. The coach's grid handles them (strength-coach ADR 0021).
- Editing the inventory inside the app. A file is written outside the app and imported.
- Accounts, sync, or any server. The set-up link carries the inventory itself.
- Workout logging, rest timers, and any link to Hevy.
- One-rep-max and percentage calculators.
- Typed or spoken sentences as input.
- Named drawings per product (trap bar, kettlebell, dip belt). The kind draws; the name says what it is.
- A starter inventory or an in-app preset.

## 4. Equipment

Moved in version 3 to [inventory/README.md](../inventory/README.md), beside the owner's inventory file. The values the worked examples use are in the file itself.

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
3. **Unverified values are flagged.** Every result names the unverified values it used, except plate stack lengths. Those decide whether plates fit, never the total, and section 13 tracks them.
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
- A dumbbell may instead take one screw, on one end. The other end has no screw and so no plates. The screw counts toward the ends' difference, so with a 2.5 lb standard screw this gives a bare 7.5 lb dumbbell. It needs uneven loading on.
- A long screw needs at least 3.0 in of plates on its end to lock (unverified).
- The two ends may differ in weight by at most 2.5 lb. This is Ironmaster's documented way to make small steps. The result is marked uneven and names the heavier end.
- If every 2.5 lb and micro plate is in use on another implement, the ends may differ by 5 lb. The result says why.
- At most one micro plate per end.
- A setting turns uneven loading off. Targets that need it then become impossible and follow rule 6.4.

**Kettlebell**

- One stack, one screw. Standard screw up to 57.5 lb, long screw above.
- If no standard screw is free, the kettlebell takes a long screw. The result warns that the screw may stick out at the top, which Ironmaster's manual calls normal.
- At most one 22.5 lb plate. Ironmaster's manual allows 5 lb and 2.5 lb plates "or the 22.5 lb plate", and the 80 lb kit holds one.
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

With a current loading, rule 3 changes: see section 16.3.

The search space is small: 37 plates of 4 sizes. The library may search it exhaustively.

### 6.4 Impossible targets

When no loading reaches a target exactly, the result holds two loadings: the closest below and the closest above. It marks the nearer one as recommended. On a tie it recommends the lower.

In a request with several implements, each later implement uses the plates left by the recommended loadings before it. A later implement that misses its target because of plates used earlier gets a warning that names the cause.

With a current loading, the tie-break changes: see section 16.3.

### 6.5 List

List returns every achievable total for one implement within a range, in ascending order. It assumes the whole pool is free. Each row holds the total, the recommended loading, and flags: uneven, micro plates used, screw kind.

### 6.6 Reverse

Reverse takes a loading and returns its total. It also checks the loading against the pool and the rules in 6.2, and returns a warning for each rule broken. It returns the total even when a rule is broken. Plate order on a position is a preference, not a rule, and gets no warning: see section 16.3.

## 7. Worked examples

These use the inventory in section 4 with the default clamp collars, which weigh 0 lb. They are acceptance tests for the library.

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
| 15 | One dumbbell 7.5 lb | Exact, uneven. One standard screw on one end, no plates. With uneven loading off: not exact, below 5 lb, above 10 lb. |

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
- **Current loading**: a "Loaded" button, a strip and a changes block. See section 16.4.

### 8.3 Several implements

- An "add implement" button stacks another card under the first.
- Card order is priority order. The owner drags cards to reorder.
- Tapping the tab of an implement that a lower card holds moves that card to the top.
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
      "unverified": []
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

Retired in version 3. The `achievable` command replaces it: see section 17.8.

## 11. Agent guide

The repo holds `docs/agent-guide.md`. It covers:

- What plate-pool answers, in three lines.
- Each command with one example, and the JSON shape of its output.
- The static JSON URLs.
- The rules an agent must know: a target is a total; barbell totals are 18 lb plus a multiple of 2.5 with clamp collars, and 20 lb plus a multiple of 2.5 with spin-lock collars; implements share one pool; a request's order is its priority.
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

Moved in version 3 to [inventory/README.md](../inventory/README.md). None blocks a build.

## 14. Follow-ups outside this build

- **Workout repo logs.** Logged barbell weights assumed a 20 lb bar. With an 18 lb bar they are about 2 lb high, and targets such as 125 lb cannot be made exactly. The nearest are 123 and 125.5 lb.
- **Workout repo guide.** Add the snippet from the agent guide to the workout repo's `reference/` folder.
- **GitHub repo.** The owner creates it under their personal GitHub account (`joeuk89`), not the Red Snapper organisation, and turns on GitHub Pages.

## 15. Later candidates

Not agreed, and not part of version 1. Recorded so they are not lost.

- List with some plates reserved for another implement ("what can the dumbbells make while the barbell is at 173?").
- Remembering what is loaded, and the fewest plate changes to the next loading. Now version 2: see section 16.
- Olympic plates and bar.
- Bodyweight plus vest totals for chin-ups and dips.

## 16. Version 2: current loading

Agreed 2026-10-30. The first feature after version 1. Everything in sections 1 to 15 stands unless this section says otherwise.

### 16.1 Purpose

Between sets the owner often moves from one weight to the next without stripping the implement. The app learns what is on the implement now (the **current loading**) and, for the next target, shows the loading that takes the fewest **changes** to reach, whether that means adding to what is on or unloading and starting again.

### 16.2 Terms

See the glossary in section 2: **current loading**, **change**, **changes**.

### 16.3 Calculation rules

1. **A current loading is per implement and optional.** Load accepts one current loading for each implement in the request. An implement with none behaves exactly as version 1.
2. **Kept plates are the shared innermost run.** Quick-Lock plates stack, so a plate comes off only after everything outside it. On each position the plates kept are the longest run, from the innermost plate outward, that the current loading and the new loading share. Everything outside that run on the current loading is taken off; everything outside it on the new loading is put on.
3. **Changes are counted as the glossary defines them.** A dumbbell pair counts both dumbbells. A vest change is one block put on or taken off; blocks do not stack, and front and back follow 6.2.
4. **Plate order is relaxed.** Added plates go outside the kept plates, heaviest first among themselves, micro plate outermost. A position may therefore carry a heavier plate outside a lighter one. Fresh loadings keep heaviest innermost. Reverse no longer warns about order.
5. **Fewest changes replaces fewest plates.** With a current loading, 6.3 rule 3 becomes "the fewest changes in total across all implements", and "the fewest plates" follows it as rule 4, then fewest uneven dumbbells as rule 5. Closeness to the target still comes first: a loading that misses the target never beats one that hits it, however few changes it needs.
6. **Impossible targets.** Both the below and the above loading carry their changes. The nearer one is recommended. On a tie the one with fewer changes wins, then the lower.
7. **Other ways.** The alternatives list is ordered by changes, fewest first.
8. **Everything else holds.** The pool limit, per-implement rules in 6.2, screw choice by weight and the List and Reverse behaviour are unchanged. List ignores current loadings.

### 16.4 Web app

- **Loaded button.** Every loading the Load screen shows has a "Loaded" button: the exact result, each of below and above, and each row under "Other ways to make this". Tapping it pins that loading as the implement's current loading and promotes it to the main result. The Reverse screen has the same button, so the owner can record a loading the app never suggested; pinning there switches to the Load screen.
- **Strip.** Between the number field and the result, when a current loading exists: "On the bar · 173 lb · each side 2 × 22.5, 6 × 5, 1 × 2.5" with an "Unload" button that clears it. Wording per implement: "On the bar", "On the dumbbells" or "On the dumbbell", "On the kettlebell", "On the attachment", "In the vest". Nothing shows without a current loading.
- **Changes block.** With a current loading, the text under the picture becomes a changes block: a count, then one line per position. Example: "4 changes. Each side: take off 2.5 · put on 5, 5." A position with nothing to do reads "unchanged". A screw swap reads "swap standard screw for long screw". Below and above each carry their own block. Rows under "Other ways" are prefixed with their count.
- **Picture.** Kept plates draw as today. Added plates draw with a highlight. Taken-off plates are not drawn. Plates draw in their real order.
- **Step buttons** are unchanged: they move to the next achievable weight.
- **Storage.** Each implement's current loading is kept on the device like the settings in 8.8, so a reload or a locked phone mid-workout keeps it. Only "Unload" or pinning another loading replaces it. The app works with storage empty or blocked.
- **Links** carry no current loading. A result's URL describes the target only; opening it shows the fresh result.
- **Several implements.** A current loading affects its own implement only. Plates on the bar stay available to the dumbbells. "List with some plates reserved" remains a later candidate (section 15).
- **List screen** is unchanged.

### 16.5 Command-line tool and JSON

- `load` takes `--from <implement> <loading>` using the position options of `reverse`, for example `plate-pool load barbell=175 --from barbell --side 22.5,22.5,5,5,5,5,5,5,2.5`. One `--from` per implement.
- Text output adds a changes line per loading.
- Each loading in the JSON output gains an optional `changes` block, present only when a current loading was given:

```json
"changes": {
  "count": 4,
  "positions": [
    { "name": "left", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5], "remove": [2.5], "add": [5, 5] },
    { "name": "right", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5], "remove": [2.5], "add": [5, 5] }
  ],
  "hardware": [{ "from": "screw-standard", "to": "screw-long", "count": 2 }]
}
```

- `positions[].plates` still lists the whole new loading, innermost first.
- `api/achievable.json` is unchanged.
- The agent guide gains `--from` and the `changes` shape.

### 16.6 Worked examples

Default clamp collars. These are acceptance tests for the library.

| # | Current loading | Target | Result |
| --- | --- | --- | --- |
| 16 | Barbell 88 lb (each side 7 × 5) | 98 lb | Exact. Put on 1 × 5 per side. 2 changes. Beats the 4-plate fresh loading. |
| 17 | Barbell 68 lb (each side 5 × 5) | 113 lb | Exact. Put on 1 × 22.5 per side, outside the 5s. 2 changes. |
| 18 | Barbell 173 lb | 175 lb | Not exact. Below 173 lb: 0 changes. Above 175.5 lb: put on 1 micro per side, 2 changes. Recommended: 175.5 lb, as nearer. |
| 19 | Dumbbells 70 lb pair (each end 1 × 22.5, 1 × 5, 1 × 2.5, standard screws) | 80 lb pair | Exact. Swap to long screws and put on 1 × 5 per end, outside the 2.5. 8 screw changes + 4 plate changes = 12 changes. |
| 20 | None | any | No `changes` block. Identical to version 1. |

Properties:

- With no current loading, every result equals the version 1 result.
- Reverse of a loading with `changes` returns the same total as the loading.
- Changes on a position equals plates taken off plus plates put on plus screw changes, and never counts a kept plate.

### 16.7 Tickets

Three, each shippable alone, built unattended as described in CLAUDE.md at the time.

1. **Library.** Current loading on Load, ranking by changes, relaxed order, Reverse order warning removed, `changes` in the result, examples 16 to 20 as tests.
2. **Web app.** Loaded and Unload, the strip, the changes block, picture highlight, interactive "other ways", Loaded on Reverse, device storage. The ticket ends with a full check in a real browser, phone-sized and desktop, that every screen looks right and works well.
3. **Command-line tool and agent guide.** `--from`, JSON `changes`, guide update.

## 17. Version 3: any plate-loaded gym

Agreed 2026-11-02. Everything in sections 1 to 16 stands unless this section says otherwise. Where this section replaces a rule, it names the rule it replaces.

### 17.1 Purpose

plate-pool stops being a calculator for one home gym and becomes one for any plate-loaded gym. The gym is described by an **inventory file** in **format 1**, the public contract. The owner's file is the reference example and the fixture for every worked example, and the owner's own gym reaches the phone the same way anyone's does: through a set-up link.

Three things change for the three users:

- **The phone.** The web app opens with no inventory. A **kit** arrives by set-up link, pasted file or chosen file, and is stored on the device. One kit at a time.
- **The desktop and the tool.** The command-line tool bundles no inventory. `--inventory <path>` or `PLATE_POOL_INVENTORY` names the file, and an `achievable` command writes the tables that the static JSON used to carry.
- **Agents.** The static JSON (section 10) retires. An agent that plans training runs `achievable` over the athlete's file, as the coach does (strength-coach ADR 0021), and links the athlete to the app with a set-up link and per-line links.

Nothing else moves: Load, List and Reverse, several implements sharing one pool, current loading, offline, the picture.

### 17.2 Terms

The glossary in section 2 defines **implement kind**, **bar**, **handle**, **stack**, **vest**, **kit**, **kit screen**, **set-up link**, **per-line link** and **format**. Four kinds carry all loading logic. A kind fixes an implement's positions and its drawing; every other difference between implements is a field in the file.

| Kind | Positions | Covers |
| --- | --- | --- |
| **bar** | two sides, always mirrored | straight bar, Olympic bar, EZ bar, trap bar, safety squat bar, Swiss bar, a two-post machine such as a belt squat or leg press |
| **handle** | two ends, may be uneven | loadable dumbbell |
| **stack** | one stack | loadable kettlebell, leg attachment, dip belt, landmine, a one-post machine |
| **vest** | front and back | weighted vest, plate carrier |

### 17.3 Inventory format 1

Format 1 replaces the shape in section 5. The file is still the single source of truth for every answer, and still holds equipment only.

#### 17.3.1 The file

```json
{
  "$schema": "./inventory.schema.json",
  "format": 1,
  "name": "Home gym",
  "lengthUnit": "in",
  "plateTypes": [],
  "plates": [],
  "hardware": [],
  "implements": []
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `$schema` | no | For editors. The library never loads it. |
| `format` | yes | `1`. Any other value is refused by name: "Inventory format 2 is not supported. This version reads format 1." |
| `name` | yes | The kit's name. Shown on the kit screen and written into the `achievable` header. |
| `lengthUnit` | yes | `mm` or `in`. One unit for every length in the file: `stackLength`, `capacity`, `minStack`, `width`, `positionLength`, `diameter`, `maxPlateDiameter`. The `In` suffixes of section 5 go. |

Weight units stay where they are: on each plate type, hardware item and implement. Every weight and length keeps the value shape `{ "listed", "measured"?, "status", "note"? }` with `status` required (`verified`, `owner` or `unverified`). Measured beats listed (6.1). There is no bare-number shorthand.

Ids are `[a-z0-9-]+`, unique within each list. An implement id may not be `view`, `uneven`, `kit`, `inventory`, `single`, `pair` or `hardware`, because those words are URL parameters and key suffixes (17.6, 17.8).

#### 17.3.2 Plate types

| Field | Required | Meaning |
| --- | --- | --- |
| `id`, `name`, `unit` | yes | As today. |
| `bore` | yes | `olympic`, `standard`, `quick-lock` or `block`. It drives the drawing only: a hole or a pocket. Fit is stated by each implement's `accepts` alone, because a dip belt takes two bores and a leg attachment three. Carrier plates are `block`. |

#### 17.3.3 Plates

| Field | Required | Meaning |
| --- | --- | --- |
| `id`, `type`, `count`, `weight` | yes | As today. |
| `countStatus` | no | As today. |
| `name` | no | A display name. Plates are named by weight everywhere; a name is for the odd plate such as a micro plate. |
| `stackLength` | yes, unless the type's bore is `block` | The length the plate adds to a stack. |
| `diameter` | no | Used by the picture (17.7) and checked against `maxPlateDiameter`. |
| `colour` | no | A CSS colour. Wins over the palette in 17.7. |
| `shape` | yes | `square`, `round`, `hexagonal`, `twelve-sided` or `block`. Draws the plate button on Reverse only. |

#### 17.3.4 Hardware

| Field | Required | Meaning |
| --- | --- | --- |
| `id`, `name`, `kind`, `count`, `unit`, `weight` | yes | `kind` is `screw`, `collar` or `pin`. |
| `capacity` | no, any kind | The longest stack the item holds. |
| `minStack` | no, any kind | The shortest stack the item locks on. A value object, so it can be unverified. |
| `width` | no, any kind | The length the item takes on a position. |
| `note` | no | Shown whenever the item is used as a fallback (17.4). |

#### 17.3.5 Implements

Common fields: `id`, `name`, `kind`, `count`, `unit`, `base`, `accepts`. `kind` is required and is `bar`, `handle`, `stack` or `vest`. `positions` and `symmetric` go: the kind fixes the positions. There is no `picture` field: the kind draws (17.7).

| Field | bar | handle | stack | vest | Meaning |
| --- | --- | --- | --- | --- | --- |
| `hardware` (`options`, `default`?, `perPosition`) | optional | optional | optional | no | As today. `"none"` in `options` means hardware is optional. Without `default`, the first option that fits is used. |
| `positionLength` | optional | optional | optional | no | The length of one position for plates and hardware together. |
| `unevenAllowance` | no | required | no | no | The most the two ends may differ by, in the implement's unit. `0` means even only. |
| `unevenAllowanceRelaxed` | no | optional | no | no | The allowance when every plate weighing at most `unevenAllowance` is in use on another implement. Omit to turn the relaxation off. |
| `maxPlateDiameter` | optional | optional | optional | no | A plate with a larger `diameter` is refused on this implement. |
| `maxPerPosition` | optional | optional | optional | optional | A map of plate id to the most of that plate one position holds. |
| `maxPlateWeight`, `maxTotal` | optional | optional | optional | optional | As today. |
| `note` | optional | optional | optional | optional | A fixed sentence on every result. |
| `baseIncludesHardware` | optional | optional | optional | no | Default `false`. `true` means `base` already includes the hardware, so no hardware weight is ever added, whichever option is chosen. |

The kinds:

- **bar**: two sides, always mirrored. Hardware optional; one collar per side at most is the usual `perPosition`. A two-post machine is a bar with no hardware.
- **handle**: two ends. `count` of 2 or more means a request is a pair unless it asks for one; `count` 1 is always single. Hardware on one end only, with the other end empty, is allowed when `unevenAllowance` is above 0, and the hardware counts toward the difference. The result is marked uneven and names the heavier end.
- **stack**: one position. Hardware optional: a kettlebell's screw or pin; a dip belt has none. A landmine is a stack whose `base` is the bar's weight, with a `note`.
- **vest**: front and back. Plates split as evenly as possible by weight, with the heavier side at the back on a tie. No hardware. A plate carrier is a vest with every plate capped at 1 per position in `maxPerPosition`.

Example, one implement per kind, in a kilogram and millimetre file:

```json
{
  "format": 1,
  "name": "Olympic kit",
  "lengthUnit": "mm",
  "plateTypes": [
    { "id": "olympic", "name": "Olympic", "unit": "kg", "bore": "olympic" },
    { "id": "carrier-plate", "name": "Carrier plate", "unit": "kg", "bore": "block" }
  ],
  "plates": [
    { "id": "20", "type": "olympic", "count": 2, "weight": { "listed": 20, "status": "verified" }, "stackLength": { "listed": 55, "status": "verified" }, "diameter": 450, "colour": "#1e5bb8", "shape": "round" },
    { "id": "carrier-8", "type": "carrier-plate", "count": 2, "weight": { "listed": 8, "status": "verified" }, "shape": "block" }
  ],
  "hardware": [
    { "id": "collar", "name": "Spring collar", "kind": "collar", "count": 2, "unit": "kg", "weight": { "listed": 0.25, "status": "verified" }, "width": 60 }
  ],
  "implements": [
    { "id": "bar", "name": "Olympic bar", "kind": "bar", "count": 1, "unit": "kg", "base": { "listed": 20, "status": "verified" }, "accepts": ["olympic"],
      "hardware": { "options": ["collar", "none"], "default": "collar", "perPosition": 1 }, "positionLength": { "listed": 415, "status": "verified" } },
    { "id": "dumbbell", "name": "Loadable dumbbell", "kind": "handle", "count": 2, "unit": "kg", "base": { "listed": 2, "status": "verified" }, "accepts": ["olympic"],
      "hardware": { "options": ["collar"], "perPosition": 1 }, "positionLength": { "listed": 150, "status": "verified" }, "unevenAllowance": 0 },
    { "id": "belt", "name": "Dip belt", "kind": "stack", "count": 1, "unit": "kg", "base": { "listed": 0, "status": "verified" }, "accepts": ["olympic"] },
    { "id": "vest", "name": "Plate carrier", "kind": "vest", "count": 1, "unit": "kg", "base": { "listed": 1.5, "status": "verified" }, "accepts": ["carrier-plate"], "maxPerPosition": { "carrier-8": 1 } }
  ]
}
```

#### 17.3.6 Validation

The library's reader is the one validator, because files now arrive from outside the build. It checks what the JSON Schema checks (shape and enumerations) and what a schema cannot:

- `format` is 1, or the file is refused by name.
- Ids are unique within each list and match `[a-z0-9-]+`; no implement id is a reserved word.
- Every `type`, `accepts` entry, `options` entry and `maxPerPosition` key resolves to an id in the file, and `default` is in `options`.
- `stackLength` is present on every plate whose type's bore is not `block`.
- Each field appears on a kind that allows it, and `unevenAllowance` is present on every handle.

Errors name the JSON path, for example `implements[1].unevenAllowance: required on a handle`. The reader returns every error it finds, and the web app shows up to three.

The JSON Schema is published in two places only: the repo, beside the example file, so its raw GitHub URL is stable for authors and the coach's kit skill; and the npm package, as `plate-pool/inventory.schema.json`. The site does not serve it. The library does not load it, so no schema dependency ships in the npm package or the web app. The repo's validate script still runs the schema over the example file.

#### 17.3.7 The owner's file

`inventory/inventory.json` migrates to format 1 with every value and note unchanged. It is the reference example for authors and the fixture for the worked examples in sections 7, 16.6 and 17.11. Its equipment detail and open measurement items, formerly sections 4 and 13, live in [inventory/README.md](../inventory/README.md). The migration:

- adds `format`, `name` ("Home gym") and `lengthUnit` ("in"), and drops the `In` suffixes;
- gives the plate types a `bore` (`quick-lock`, `block`) and the plates a `stackLength`, a `colour` matching today's picture, and `name` "Micro" on the micro plate;
- gives each implement its `kind` and moves every rule that section 6.2 states in words into fields: `maxPerPosition` for the micro plate and the kettlebell's 22.5 lb plate, `unevenAllowance` 2.5 and `unevenAllowanceRelaxed` 5 on the dumbbell, `note` on the leg attachment, `capacity` and `minStack` on the screws, `width` on the clamp collar, `positionLength` on the bar;
- gives the long screw the `note` "It may stick out at the top, which Ironmaster's manual calls normal."

Hardware is then chosen by capacity (17.4), not by the 75 lb and 57.5 lb thresholds, and every worked example still passes. The one result that changes is example 19 (17.11).

### 17.4 Calculation rules

These replace section 6.2 and the "all Quick-Lock implements" rules. Sections 6.1, 6.3 to 6.6 and 16.3 stand, with the changes named here. No rule in the library names a plate, hardware or implement id.

**Positions and mirroring, by kind**

- A **bar** carries the same plates in the same order on both sides.
- A **handle** has two ends that may differ by at most `unevenAllowance`, or by `unevenAllowanceRelaxed` when every plate weighing at most `unevenAllowance` is in use on another implement in the request; the result says why. A handle with `count` 2 or more is loaded as a pair unless the request asks for one; both handles in a pair get the same loading. The uneven switch (8.8) turns uneven loading off for every handle in the request.
- A **stack** has one position.
- A **vest** splits its plates between front and back as evenly as possible by weight, the heavier side at the back on a tie. A vest target is read in the vest's unit.

**Hardware**

- The hardware for a position is chosen by capacity. The library takes the first option in `options` order, starting at `default` when set, whose `capacity` (if stated) holds the stack on every position and whose `minStack` (if stated) is met. The same option goes on every position of one implement.
- When the first option that fits is not free in the pool, the next option that fits is used and the result warns: "No <preferred name> is free, so the <implement name> uses a <chosen name>." followed by the chosen item's `note` if it has one.
- `"none"` in `options` means hardware is optional; it is chosen only when no other option fits or is free. With `baseIncludesHardware` true no hardware weight is added.
- A **change** (section 2) counts hardware of kind `screw` and `pin`; a collar never counts. A swap counts two.

**Lengths**

- On every position of every kind, the plates' `stackLength` total plus the chosen hardware's `width` (if stated) must fit `positionLength` (if stated), and the plates' total must fit the hardware's `capacity` (if stated). This generalises the bar-only `positionLength` and the screw-only capacity of version 1.
- A plate whose `diameter` is above the implement's `maxPlateDiameter` is never loaded on it.

**Caps and limits**

- `maxPerPosition` limits how many of one plate a position holds.
- `maxPlateWeight` and `maxTotal` work as in 6.2: a target above the limit is refused, and the result states the limit and shows the heaviest allowed loading.

**Order and notes**

- Fresh loadings put the heaviest plate innermost and the lightest outermost. There is no field: the micro plate is outermost because it is lightest. Section 16.3 rule 4 still relaxes this when plates are added to a current loading.
- An implement's `note` appears on every result for it.

**Units and text**

- A bare target reads in the implement's `unit`; a suffix overrides it (`bar=80kg`). Results show the implement's unit first and the other unit beside it. This replaces "pounds first" in 6.1 rule 4.
- Text names things by their `name`: the implement, the hardware, the kit. Position labels are "each side" for a bar, "end A" and "end B" for a handle, "stack" for a stack, "front" and "back" for a vest. "No 2.5 lb or micro plate is free" becomes "no plate of <allowance> or less is free". The List flag "micro plates used" becomes "smallest plate used", keyed to the lightest plate the implement accepts.

### 17.5 Web app

Sections 8 and 16.4 stand with these changes.

#### 17.5.1 The kit screen: no kit, no app

- With no kit on the device the app shows the kit screen and nothing else: the masthead, one line saying what the app does, a card explaining that a set-up link installs itself, the import panel, and a pointer for people without a file.
- **Import panel**: a "Paste your inventory file" field first, then "Use this file" and "Choose a file…". Paste is the route that always works on a phone and in the installed app; the file picker is the desktop route.
- **Errors** come from the reader (17.3.6) and name the JSON path, up to three at once, shown above the buttons. The pasted text stays so it can be fixed in place.
- **Pointer**: "No file yet? An inventory describes your plates, hardware and bars. Write one with strength-coach, which also makes your set-up link." linking to the strength-coach README. There is no starter inventory and no preset.
- Targets in the query (`?barbell=175lb`) are kept while the kit screen shows and applied once a kit is in.

#### 17.5.2 Arrival by set-up link

- Opening a set-up link (17.6) shows a confirm card on the kit screen: "Set-up link opened", the kit's `name`, a one-line summary (implements, plate entries, hardware items) and one button, "Use <name> on this phone". One tap, always: the card names what is about to be installed, and when a kit is already stored it says it replaces it and what that clears.
- The tap stores the kit, replaces the URL so the fragment is gone (a shared URL never carries an inventory), and lands on the Load screen with any targets the link carried.
- A fragment that fails to decode or validate shows its error at the top of the kit screen, with the import panel below.

#### 17.5.3 The stored kit

- The kit's name sits under "plate-pool" in the masthead as a chip ("Home gym ▾"). Tapping it opens the **kit page**: name, counts, the short hash as "kit 3f9a1c7e", a Done button and Replace kit. Nothing is editable.
- **Replace kit** opens the import panel on the kit page with the warning "Replacing the kit clears what is loaded on every implement and forgets the last implement you used." The old kit stays until the new file validates, so there is never a gap with no kit.
- Storage keeps the file's bytes as received, so the hash the app shows is the hash the coach computed. One kit at a time.
- Replacing the kit clears every current loading, the last implement used and every per-implement hardware choice. The uneven switch survives.

#### 17.5.4 Generic screens

- **Implement tabs** are the kit's implements in file order, labelled by `name`.
- **Options per implement**: a hardware choice on any implement with more than one entry in `options`, labelled by `name`; pair or single on a handle with `count` 2 or more.
- **Settings** (8.8) become: a hardware choice per implement, keyed by implement id; the uneven switch; the last implement used.
- The current-loading strip (16.4) starts with the implement's `name`: "Straight bar · 173 lb · each side 2 × 22.5, 6 × 5, 1 × 2.5". The per-implement wordings ("On the bar", "In the vest") go.
- The List screen's flag column uses "smallest" for the smallest plate used and drops the screw column; the hardware shows in the loading.
- The Reverse screen's plate buttons are the plates the implement accepts, in weight order, outlined by `shape`. The mirroring switch shows on handles only.
- Nothing in the web app names an implement, plate or hardware id.

#### 17.5.5 Hash mismatch

A per-line link whose `kit` differs from the stored kit's short hash still shows the result, with a yellow banner above the implement tabs: "These targets were worked out for a different kit. Open your set-up link again if your gym has changed." The banner goes when the target changes or the kit is replaced.

#### 17.5.6 Desktop and offline

- The same layout at the app's maximum width; nothing desktop-specific.
- The first visit caches the shell whether or not a kit is in. A set-up link opened later works offline: the fragment never reaches the network, and the device decodes it with `DecompressionStream("deflate-raw")` and hashes it with `crypto.subtle.digest`. No library is added for either.

### 17.6 Links

This replaces the table in 8.7. Two links, with different jobs, so neither parameter is overloaded.

**Set-up link**: `https://joeuk89.github.io/plate-pool/#inventory=<payload>`. The payload is the inventory file's bytes compressed with raw deflate (no zlib header or trailer), then base64url without padding. It rides in the fragment so it never reaches the server or the service worker's cache key. The owner's file is about 1.4 KB as a link.

**Per-line link**: `https://joeuk89.github.io/plate-pool/?<parameters>`, as today, with these parameters:

| Parameter | Meaning | Example |
| --- | --- | --- |
| `<id>` | Target for that implement. A pair on a handle with `count` 2 or more. | `barbell=175lb` |
| `<id>.single` | Target for one of a handle. | `dumbbell.single=12.5lb` |
| `<id>.pair` | The explicit pair form. An error on a handle with `count` 1. | `dumbbell.pair=40lb` |
| `<id>.hardware` | The hardware choice for that implement: an id from its `options`, or `none`. Omitted when the implement has no hardware. | `barbell.hardware=collar-clamp` |
| `uneven` | `0` turns uneven loading off for every handle. | `uneven=0` |
| `view` | `load` (default), `list` or `reverse`. | `view=list` |
| `kit` | The first 8 hex characters of the inventory's SHA-256. | `kit=3f9a1c7e` |

Target parameters' order is priority order; `.hardware`, `uneven`, `view` and `kit` do not count toward it. A bare value reads in the implement's unit; links the app and the coach generate always carry the unit suffix. The `dumbbells` and `collars` parameters go.

### 17.7 The picture

This replaces 8.4's plate and colour rules. The kind draws the implement: there is no `picture` field and no named drawing per product. The implement's `name` on its tab and card says what it is; the picture's job is the plates on their positions.

- **bar**: a faded shaft, a stop and one sleeve, mirrored. **handle**: a grip with two stopped ends. **stack**: a mount, a stop and a post. **vest**: front and back grids. A plate carrier is the vest drawing with one cell per panel; a belt squat or leg press is the bar or stack drawing with no hardware.
- **Scale**: the picture scales to the largest plate the implement can take: the largest accepted plate's `diameter`, capped by `maxPlateDiameter` when set. The empty sleeve or post draws at `positionLength`, as today.
- **Plate height** is one of four bands of that reference, by the ratio of the plate's `diameter` to it: at least 0.85 → full height; at least 0.6 → 0.78; at least 0.4 → 0.58; else 0.42. A plate with no `diameter` draws at full height.
- **Plate width** comes from `stackLength`, with a minimum wide enough for a two-digit label inside. Labels that still do not fit go above with leaders, as today. `shape` does not draw; every plate is the same rounded rectangle seen from the side.
- **Colour**: a plate's `colour` field wins when set. Otherwise the kit's distinct weights per unit, heaviest first, take a fixed palette in order: red, blue, yellow, green, white, purple, orange, teal, brown, grey, with ink chosen for contrast and a steel outline on near-white plates. The scope is the whole kit, so the same weight has the same colour on every implement (8.4). No standards table ships in the app.
- **Hardware**: one glyph per `kind`: a collar is the clamp block, a screw is the disc, a pin is a thin rod through the post. `width` sets the collar's drawn width when stated. The label names the item.
- An uneven handle marks its heavier end, and current-loading highlights (16.4) are unchanged.

### 17.8 Command-line tool and `achievable`

Section 9 stands with these changes.

**Naming**

- Implements are named by inventory id everywhere: `load barbell=173`, `list barbell`, `reverse barbell`. The `dumbbells` alias goes.
- Pair or single is a key suffix, as in 17.6: `dumbbell=40` is a pair on a handle with `count` 2 or more, `dumbbell.single=12.5` is one, `dumbbell.pair=40` the explicit form. `list dumbbell.single --from 10 --to 60` works the same way.
- The hardware choice is a per-implement argument: `barbell.hardware=collar-clamp` or `barbell.hardware=none`. Only ids in that implement's `options` are accepted. `--collars` goes.
- `--no-uneven` stays global.
- A bare value reads in the implement's unit; a suffix overrides it.

**Positions and plates**

- Position flags by kind: bar `--side`; handle `--end-a`, `--end-b`; stack `--stack`; vest `--front`, `--back`. Each takes a plate list. `--blocks` goes.
- A plate list is comma-separated weights with `count x weight` shorthand (`--side 2x22.5,6x5`, `--front 12x1`) and `weight:id` where two accepted plates share a weight (`--side 10:bumper-10`).
- `--from <id>` takes the bare id and the position flags above. A current loading belongs to the implement, not to the pair or single request; for a pair, one description covers both.
- `reverse` follows the pair rule of `load`: `reverse dumbbell` is the pair total on a handle with `count` 2 or more, `reverse dumbbell.single` is one.

**Commands and options**

| Command | Purpose | Example |
| --- | --- | --- |
| `load` | Loadings for one or more targets | `plate-pool load barbell=173 dumbbell=40` |
| `list` | Achievable weights for one implement | `plate-pool list barbell --from 100 --to 200` |
| `reverse` | Total for a given loading | `plate-pool reverse barbell --side 2x22.5,2x5` |
| `inventory` | What the kit holds | `plate-pool inventory` |
| `achievable` | The tables document for agents | `plate-pool achievable > home.achievable.json` |

| Option | Meaning |
| --- | --- |
| `--inventory <path>` | The inventory file. Required unless `PLATE_POOL_INVENTORY` is set; wins when both are set. |
| `--json` | Structured output for agents. |
| `--no-uneven` | Turn uneven loading off for every handle. |

- The package bundles no inventory. With neither `--inventory` nor `PLATE_POOL_INVENTORY`, every command exits 1 with "No inventory given. Pass --inventory <path> or set PLATE_POOL_INVENTORY."
- `inventory` prints the kit's name and length unit, then the plates (count × weight, type, bore), the hardware (kind, capacity) and the implements (kind, positions, hardware options, caps). `--json` prints the file as read.
- Text output is headed by the implement's `name`, with "pair" or "single" after a handle: `Straight bar  target 175 lb (79.4 kg)`. Position labels and hardware names follow 17.4.

**JSON**

- Position names by kind: `left` and `right`, `a` and `b`, `stack`, `front` and `back`. Each position carries `plates: number[]` as today plus `ids: string[]` in parallel, always present.
- List rows: `micro` becomes `smallest`; `screw` goes, because `loading.hardware` carries the choice; `uneven` stays on every row.
- `leftover` is unchanged, keyed by plate and hardware id.

**`achievable`**

`plate-pool achievable --inventory <path>` writes one JSON document to standard output and exits 0; invalid input exits 1 with the reason on standard error.

```json
{
  "format": 1,
  "plate_pool": "1.0.0",
  "inventory_sha256": "<64 lower-case hex, SHA-256 over the inventory file's bytes as read>",
  "name": "Home gym",
  "tables": [
    { "implement": "barbell", "hardware": "collar-clamp", "rows": [] },
    { "implement": "barbell", "hardware": "none", "rows": [] },
    { "implement": "dumbbell", "hardware": "screw-standard", "pair": true, "rows": [] },
    { "implement": "dumbbell", "hardware": "screw-standard", "pair": false, "rows": [] },
    { "implement": "leg", "rows": [] }
  ]
}
```

- `format` is the inventory format. `plate_pool` is the package version. `inventory_sha256` is hashed over the file's bytes exactly as read, so the coach's hash of the same file matches it.
- One table per implement, per entry in its `options` (including `none`), and per pair and single on a handle with `count` 2 or more. `hardware` is absent when the implement has no hardware; `pair` appears on handles only. Rows are the `list --json` rows over the implement's full range with the whole pool free.
- Order: file order, then `options` order, pair before single.
- There is no default-hardware marker. If the coach asks for one, it is an additive field.

**Static JSON** (section 10) retires. The deployment serves no `api/inventory.json` or `api/achievable.json`; `achievable` replaces them.

### 17.9 Agent guide, README and site wording

- The agent guide (section 11) is rewritten for any kit: it drops the owner's 18 lb rule and every named implement, says that `--inventory` or `PLATE_POOL_INVENTORY` is required, documents `achievable` and its document, the kit and the two links, and keeps the four rules that hold for every kit: a target is a total; implements share one pool; a request's order is its priority; read `warnings` and `unverified`. The snippet for other repos' agent instructions follows.
- The README opens "A calculator for any plate-loaded gym", explains the inventory file and where the schema is, and states that the package bundles no inventory and the site opens with no kit.
- The site's only landing is the kit screen (17.5.1); there is no separate landing page.
- CLAUDE.md's first line and scope rule name version 3 and section 17.

### 17.10 Build and release

Section 12 stands with these changes.

- **Layout**: `inventory/README.md` joins the example file and schema. `packages/web/api/` (the static JSON plugin) goes. Test fixtures for a second kit in kilograms and millimetres live under `packages/core/test/`; nothing but the owner's file is published as an example.
- **The library** gains the reader and validator (17.3.6) and loses every named id. It still has no runtime dependencies and no access to files, network or browser features: the command-line tool and the web app read bytes and hand the library a string.
- **The command-line tool** reads the file named by `--inventory` or `PLATE_POOL_INVENTORY`, and bundles the schema at `plate-pool/inventory.schema.json`.
- **The web app** stores the kit's bytes on the device, decodes set-up links and hashes the kit with browser APIs (17.5.6). The deploy workflow no longer generates static JSON.
- **Tests**: examples 1 to 20 and the properties in sections 7 and 16.6 run against the migrated owner file; examples 21 to 28 (17.11) are added. The command-line tool keeps one test per command, including `achievable` and the missing-inventory error. Web tests cover the kit screen's four routes in (set-up link, paste, file, replace), the mismatch banner, and the three Share paths (#45).
- **Release**: the first npm release is `1.0.0`, and `plate_pool` carries that version. The release workflow and the tag rule in the README are unchanged.

### 17.11 Worked examples

Examples 1 to 20 stand and run against the migrated owner file, with one revision:

| # | Change |
| --- | --- |
| 19 | With hardware chosen by capacity, 35 lb of plates per end is 3.125 in and fits a standard screw (capacity 3.25 in). Result: exact, put on 1 × 5 per end outside the 2.5, standard screws kept, 4 changes. |

New examples, acceptance tests for version 3:

| # | Input | Result |
| --- | --- | --- |
| 21 | The owner's file with `"format": 2` | Refused: "Inventory format 2 is not supported. This version reads format 1." Exit 1. |
| 22 | The owner's file with an implement id `kit` | Refused, naming `implements[0].id`. |
| 23 | `achievable --inventory inventory/inventory.json` | 14 tables in this order: barbell × 3 (collar-clamp, collar-spinlock, none), dumbbell × 6 (screw-standard pair, single; screw-long pair, single; none pair, single), kettlebell × 3, leg × 1, vest × 1. `name` is "Home gym". Every row's total, passed to `load`, is exact. |
| 24 | `load dumbbell=80` on the owner's file | Exact, pair. Each end 1 × 22.5, 2 × 5, 1 × 2.5. Standard screws. |
| 25 | `load bar=95.5` on the Olympic kit in 17.3.5 extended with 10, 5 and 2.5 kg plates (two of each) | Exact. Each side 20, 10, 5, 2.5 with a spring collar. Bar 20 kg, collars 0.5 kg, plates 75 kg. Lengths checked in mm. |
| 26 | `load dumbbell.single=22.5` on the same Olympic kit, `unevenAllowance` 0 | Exact: each end 10 with a spring collar. With `dumbbell.single=25`: not exact, below 22.5, above 27.5 (each end 10, 2.5), because the ends may not differ. |
| 27 | The owner's file as a set-up link, opened on a device with no kit | The confirm card names "Home gym"; after the tap the URL has no fragment, and `?barbell=173lb` shows example 2. |
| 28 | `?barbell=173lb&kit=00000000` with the owner's kit stored | Example 2's result with the mismatch banner. Changing the target removes the banner. |

Properties that must hold for every kit:

- Every row from `achievable`, passed to Load with the row's hardware and pair setting, returns an exact result.
- Reverse of any loading from Load returns the same total.
- No result exceeds the pool, a `positionLength`, a `capacity` or a `maxPerPosition` cap.
- A file that passes the reader passes the JSON Schema, and the reader rejects every file the schema rejects.

### 17.12 Tickets

Six build tickets, each shippable alone, built unattended as version 2 was with a copy of the version 2 workflow (the blocked-by table, the rules paragraph, the browser walkthrough and the screenshot list change; no new stage).

1. **Library: inventory format 1** (#63). The reader and validator, the four kinds, every rule as data, generic text, `ids` in positions, list row renames, the migrated owner file and schema, the second-kit fixture. Examples 1 to 26 pass. Blocks every ticket below.
2. **Command-line tool: generic names, `achievable` and no bundled inventory** (#64). Blocked by #63.
3. **Web app: generic implements and the picture** (#65). Tabs, options, labels and settings from the kit; the kind draws; banded sizes; the palette; hardware glyphs. Blocked by #63.
4. **Web app: the kit screen, set-up link, stored kit and retired static JSON** (#66). Blocked by #65.
5. **README, agent guide and CLAUDE.md for any plate-loaded gym** (#67). Blocked by #64 and #66.
6. **First npm release** (#21), re-pointed at version 3. Blocked by #64 and #67. The owner does this one.

The Share button (#45) and the tab bug (#44) ride along unblocked.
