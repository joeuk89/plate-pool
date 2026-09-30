# plate-pool: agent guide

This guide is for software agents that plan training. It tells you how to ask plate-pool about weights and how to read its answers.

plate-pool knows every plate, piece of locking hardware and implement in one home gym. Its five implements share one plate pool: barbell, dumbbells, kettlebell, leg attachment and vest. Every answer comes from a fixed calculation over the owner's inventory file.

## What plate-pool answers

- **Load**: which plates reach a target on an implement, and where each plate goes.
- **List**: every total an implement can reach within a range.
- **Reverse**: the total of a given loading, with a warning for each rule it breaks.

## Rules you must know

- **A target is a total.** It includes the base weight: bar, handle, locking screws and collars. Ask for `barbell=173`, not for 155 lb of plates.
- **Barbell totals are 18 lb plus a multiple of 2.5.** The bar weighs 18 lb and the collars count as 0 lb, so 123 and 125.5 lb exist and 125 lb does not. Both values are unverified. If the owner measures them, the inventory file changes and so do the totals.
- **Implements share one plate pool.** Plates on the barbell are not free for the dumbbells. Put every implement a workout uses at the same time in one request, so the answer never uses a plate twice.
- **A request's order is its priority.** The first target gets as close as the plate pool allows. Each later target gets as close as it can without moving an earlier one away from its target. Put the implement that matters most first.

Also:

- A bare number means pounds, or kilograms for the vest. Add a unit to be explicit: `175lb`, `80kg`, `vest=12kg`.
- `dumbbells` means a pair. `dumbbell` means one.
- When no loading reaches a target exactly, the result holds the closest loading `below` and `above`, and `recommended` names the nearer one.
- Every result lists the `unverified` values it used, such as `barbell.base`. Tell the user when a total depends on one.
- Read `warnings`. They say why a target is refused or missed, or which rule a loading breaks.

## Command-line tool

Run it with `npx plate-pool`. It needs no setup: the package bundles the owner's inventory file. Add `--json` to every command for structured output.

| Option | Meaning |
| --- | --- |
| `--json` | Structured output |
| `--collars <clamp\|spinlock\|none>` | Barbell collar choice. Default: `clamp` |
| `--no-uneven` | Turn uneven dumbbell loading off |
| `--inventory <path>` | Use a different inventory file |

The tool exits with code 0 for any valid request, including one with no exact loading. It exits with code 1 for invalid input and writes the reason to standard error.

Plates in a position are listed from innermost to outermost. Weights are in the implement's unit, which is pounds for everything but the vest. Each `total` and `target` gives both units.

### load

Loadings for one or more targets, in priority order. Implement names: `barbell`, `dumbbells`, `dumbbell`, `kettlebell`, `leg`, `vest`.

```sh
npx plate-pool load barbell=175 dumbbells=40 --json
```

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
    },
    {
      "implement": "dumbbell",
      "pair": true,
      "target": { "lb": 40, "kg": 18.1 },
      "exact": true,
      "loading": {
        "total": { "lb": 40, "kg": 18.1 },
        "hardware": [{ "id": "screw-standard", "count": 2 }],
        "positions": [{ "name": "end-a", "plates": [5, 5, 5] }, { "name": "end-b", "plates": [5, 5, 5] }],
        "uneven": false
      },
      "alternatives": [],
      "warnings": [],
      "unverified": []
    }
  ],
  "leftover": {
    "plates": { "ql-22.5": 1, "ql-5": 0, "ql-2.5": 2, "ql-micro": 2 },
    "hardware": { "screw-standard": 0, "screw-long": 5, "collar-spinlock": 2, "collar-clamp": 2 }
  }
}
```

- An exact result holds `loading`. A result that is not exact holds `below`, `above` and `recommended`. One side is missing when nothing exists in that direction.
- A target over an implement's limit gets `refused`, which holds the `limit`, and a `below` loading at the heaviest allowed total. The barbell's limit is 210 lb of plates.
- `alternatives` holds up to five other loadings that reach the same total.
- For a pair of dumbbells, `hardware` and `positions` describe one dumbbell. The other is the same.
- A dumbbell loading with `uneven: true` has ends of different weights, and `heavier` names the heavier end.
- `leftover` counts the plates and hardware still free after the recommended loadings.

### list

Every total one implement can reach from `--from` to `--to`, with the whole pool free. Leave both out for the implement's full range.

```sh
npx plate-pool list barbell --from 100 --to 105 --json
```

```json
{
  "implement": "barbell",
  "rows": [
    {
      "total": { "lb": 100.5, "kg": 45.6 },
      "loading": {
        "total": { "lb": 100.5, "kg": 45.6 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          { "name": "left", "plates": [22.5, 5, 5, 5, 2.5, 1.25] },
          { "name": "right", "plates": [22.5, 5, 5, 5, 2.5, 1.25] }
        ],
        "uneven": false
      },
      "uneven": false,
      "micro": true
    },
    {
      "total": { "lb": 103, "kg": 46.7 },
      "loading": {
        "total": { "lb": 103, "kg": 46.7 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          { "name": "left", "plates": [22.5, 5, 5, 5, 5] },
          { "name": "right", "plates": [22.5, 5, 5, 5, 5] }
        ],
        "uneven": false
      },
      "uneven": false,
      "micro": false
    }
  ],
  "warnings": [],
  "unverified": ["barbell.base", "collar-clamp.weight"]
}
```

- Each row holds the recommended loading for that total. `micro` says it uses a micro plate.
- Rows that use locking screws also hold `screw`: `screw-standard` or `screw-long`.

### reverse

The total of a loading you describe. Give plates innermost first, separated by commas: `--side` for each barbell side, `--end-a` and `--end-b` for a dumbbell, `--stack` for the kettlebell and leg attachment, and `--blocks` for the number of vest blocks.

```sh
npx plate-pool reverse dumbbell --end-a 5,5,5,2.5 --end-b 5,5,5 --json
```

```json
{
  "implement": "dumbbell",
  "pair": false,
  "total": { "lb": 42.5, "kg": 19.3 },
  "hardware": [{ "id": "screw-standard", "count": 2 }],
  "positions": [{ "name": "end-a", "plates": [5, 5, 5, 2.5] }, { "name": "end-b", "plates": [5, 5, 5] }],
  "uneven": true,
  "heavier": "end-a",
  "warnings": [],
  "notes": [],
  "unverified": []
}
```

- Reverse always returns the total. It adds a warning for each rule the loading breaks, such as using more plates than the pool holds.
- `notes` holds fixed notes. The leg attachment's says the total is plate weight only.

### inventory

What the owner has: the inventory file. Every weight has a `listed` value, an optional `measured` value that overrides it, and a `status`: `verified` (the manufacturer states it), `owner` (the owner confirmed it on the equipment) or `unverified`.

```sh
npx plate-pool inventory --json
```

The output has four lists. This shows the first entry of each:

```json
{
  "plateTypes": [{ "id": "quick-lock", "name": "Ironmaster Quick-Lock", "unit": "lb" }],
  "plates": [
    {
      "id": "ql-22.5",
      "name": "22.5 lb",
      "type": "quick-lock",
      "count": 5,
      "weight": { "listed": 22.5, "status": "verified" },
      "stackLengthIn": { "listed": 1.875, "status": "unverified" },
      "shape": "square"
    }
  ],
  "hardware": [
    {
      "id": "screw-standard",
      "name": "Standard locking screw",
      "kind": "screw",
      "count": 4,
      "unit": "lb",
      "weight": { "listed": 2.5, "status": "verified" },
      "capacityIn": 3.25
    }
  ],
  "implements": [
    {
      "id": "barbell",
      "name": "Straight bar",
      "count": 1,
      "unit": "lb",
      "base": {
        "listed": 18,
        "status": "unverified",
        "note": "Ironmaster states about 18 lb and does not say whether that includes collars. Collars are added."
      },
      "positions": ["left", "right"],
      "symmetric": true,
      "accepts": ["quick-lock"],
      "hardware": {
        "options": ["collar-clamp", "collar-spinlock", "none"],
        "default": "collar-clamp",
        "perPosition": 1
      },
      "maxPlateWeight": 210,
      "positionLengthIn": { "listed": 11.5, "status": "verified", "note": "For plates and the collar" }
    }
  ]
}
```

## Static JSON

If you have web access but cannot run commands, read these files. They need no login.

| URL | Contents |
| --- | --- |
| <https://joeuk89.github.io/plate-pool/api/inventory.json> | The inventory file as deployed. `plate-pool inventory --json` prints the same four lists. |
| <https://joeuk89.github.io/plate-pool/api/achievable.json> | List results for every implement over its full range, with the whole pool free. |

`achievable.json` holds `{ "tables": [...] }`. Each table has the shape of `plate-pool list --json`, and `implement` says which implement it covers. The tables come in this order:

1. `barbell` with `"collars": "clamp"`
2. `barbell` with `"collars": "spinlock"`
3. `barbell` with `"collars": "none"`
4. `dumbbell` with `"pair": true`
5. `dumbbell` with `"pair": false`
6. `kettlebell`
7. `leg`
8. `vest`

The static files cannot share the pool between implements. For a request with several implements, run `plate-pool load`.

## Snippet for agent instructions

Paste this into another repo's agent instructions, such as its `CLAUDE.md` or `AGENTS.md`.

```markdown
## Plate loading: plate-pool

Use plate-pool for any weight on the owner's barbell, dumbbells, kettlebell, leg attachment or vest. Never work out plates by hand. Guide: https://github.com/joeuk89/plate-pool/blob/main/docs/agent-guide.md

- Load: `npx plate-pool load barbell=173 dumbbells=40 --json`
- List: `npx plate-pool list barbell --from 100 --to 200 --json`
- Reverse: `npx plate-pool reverse barbell --side 22.5,22.5,5,5 --json`
- Without a shell, read https://joeuk89.github.io/plate-pool/api/achievable.json

Rules:

- A target is a total, including the bar, handle, screws and collars.
- Barbell totals are 18 lb plus a multiple of 2.5. There is no 125 lb; the nearest are 123 and 125.5 lb.
- All implements share one plate pool. Put every implement used at the same time in one `load` request.
- A request's order is its priority. Put the implement that matters most first.
- Plan only weights plate-pool says exist. When a result is not exact, use the `recommended` loading.
- Mention any value the result lists under `unverified`.
```
