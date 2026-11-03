# plate-pool: agent guide

This guide is for software agents that plan training. It tells you how to ask plate-pool about weights, how to read its answers, and how to send the athlete to the app.

plate-pool is a calculator for any plate-loaded gym. It knows nothing about a gym until you give it the gym's inventory file. Every answer comes from a fixed calculation over that file.

## What plate-pool answers

- **Load**: which plates reach a target on an implement, and where each plate goes.
- **List**: every total an implement can reach within a range.
- **Reverse**: the total of a given loading, with a warning for each rule it breaks.

## The inventory file and the kit

An inventory file describes one gym: its plate types, plates, locking hardware and implements. Its shape is inventory format 1. The JSON Schema is in the repo at [`inventory/inventory.schema.json`](https://raw.githubusercontent.com/joeuk89/plate-pool/main/inventory/inventory.schema.json) and in the npm package as `plate-pool/inventory.schema.json`. plate-pool itself never loads the schema: its reader checks the file and names the JSON path of every error.

Each implement has an `id`, a `name`, a `unit` and a `kind`. The kind fixes its positions:

| Kind | Positions | JSON position names | Covers |
| --- | --- | --- | --- |
| bar | two sides, always the same plates | `left`, `right` | barbells, two-post machines |
| handle | two ends, which may differ | `a`, `b` | loadable dumbbells |
| stack | one stack | `stack` | loadable kettlebells, leg attachments, dip belts, landmines |
| vest | front and back | `front`, `back` | weighted vests, plate carriers |

On the phone, the inventory is stored as the **kit**: one per device. The athlete installs it by opening a set-up link (see [Links](#links)), or by pasting or choosing the file on the kit screen. The app does nothing until a kit is stored.

The examples below run against the owner's file, [`inventory/inventory.json`](../inventory/inventory.json), which is the reference example of format 1. Its implements are `barbell` (a bar), `dumbbell` (a handle the gym has two of), `kettlebell` and `leg` (stacks) and `vest`. Run them against the athlete's own file.

## Rules for every kit

- **A target is a total.** It includes the base weight: the implement and its locking hardware. Ask for `barbell=173`, not for the weight of the plates alone.
- **Implements share one plate pool.** Plates on one implement are not free for another. Put every implement a workout uses at the same time in one request, so the answer never uses a plate twice.
- **A request's order is its priority.** The first target gets as close as the plate pool allows. Each later target gets as close as it can without moving an earlier one away from its target. Put the implement that matters most first.
- **Read `warnings` and `unverified`.** `warnings` say why a target is refused or missed, or which rule a loading breaks. `unverified` lists the values no source or measurement confirms, such as `vest.base`. Tell the athlete when a total depends on one.

Also:

- A bare number reads in the implement's `unit`. Add a unit to be explicit: `175lb`, `80kg`.
- On a handle the gym has two or more of, `<id>=40` means a pair, `<id>.single=40` means one, and `<id>.pair=40` is the explicit pair.
- When no loading reaches a target exactly, the result holds the closest loading `below` and `above`, and `recommended` names the nearer one.
- Which totals exist depends on the kit. Plan only totals plate-pool says exist: run `achievable` or `list`, and never work out plates by hand.

## Command-line tool

Run it with `npx plate-pool`. The package bundles no inventory, so every command needs one: pass `--inventory <path>`, or set `PLATE_POOL_INVENTORY` to the path. When both are set, `--inventory` wins. With neither, the tool exits 1 with "No inventory given. Pass --inventory <path> or set PLATE_POOL_INVENTORY."

The examples below leave the option out and assume `PLATE_POOL_INVENTORY=inventory/inventory.json`. Add `--json` for structured output; `achievable` always writes JSON.

| Option | Meaning |
| --- | --- |
| `--inventory <path>` | The inventory file. Required unless `PLATE_POOL_INVENTORY` is set |
| `--json` | Structured output |
| `--no-uneven` | Turn uneven loading off for every handle |
| `<id>.hardware=<hardware id>` | The hardware for one implement: an id from its `options`, or `none`, such as `barbell.hardware=collar-spinlock` |

The tool exits with code 0 for any valid request, including one with no exact loading. It exits with code 1 for invalid input and writes the reason to standard error.

Implements are named by their inventory `id`. Plates in a position are listed from innermost to outermost. Each position carries `plates`, the weights, and `ids`, the plate ids in the same order; `ids` tells apart two plates of the same weight. Weights are in the implement's unit, and each `total` and `target` gives both units.

### load

Loadings for one or more targets, in priority order.

```sh
npx plate-pool load barbell=175 dumbbell=40 --json
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
          {
            "name": "left",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5"]
          },
          {
            "name": "right",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5"]
          }
        ],
        "uneven": false
      },
      "above": {
        "total": { "lb": 175.5, "kg": 79.6 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          {
            "name": "left",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          },
          {
            "name": "right",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          }
        ],
        "uneven": false
      },
      "alternatives": [],
      "warnings": [],
      "unverified": []
    },
    {
      "implement": "dumbbell",
      "pair": true,
      "target": { "lb": 40, "kg": 18.1 },
      "exact": true,
      "loading": {
        "total": { "lb": 40, "kg": 18.1 },
        "hardware": [{ "id": "screw-standard", "count": 2 }],
        "positions": [
          { "name": "a", "plates": [5, 5, 5], "ids": ["ql-5", "ql-5", "ql-5"] },
          { "name": "b", "plates": [5, 5, 5], "ids": ["ql-5", "ql-5", "ql-5"] }
        ],
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
- A target over an implement's `maxPlateWeight` or `maxTotal` gets `refused`, which holds the `limit`, and a `below` loading at the heaviest allowed total.
- `alternatives` holds up to five other loadings that reach the same total.
- `hardware` lists the locking hardware the loading uses, by hardware id. Without a `.hardware` argument, plate-pool tries the implement's `default` first, when it has one, then the rest of its `options` in order, and picks the first that fits and is free.
- For a pair of handles, `hardware` and `positions` describe one handle. The other is the same.
- A handle loading with `uneven: true` has ends of different weights, and `heavier` names the heavier end. A handle loading whose hardware `count` is 1 has its one piece on the `heavier` end; the other end has no hardware and no plates.
- `leftover` counts the plates and hardware still free after the recommended loadings, by id.

#### Current loading: `--from`

If an implement already carries plates, tell `load` what is on it now: its current loading. Each loading in the result then gains a `changes` block, and the fewest changes breaks ties between loadings equally close to the target. Closeness to the target still comes first.

Write `--from <id>` followed by the position options of `reverse`: `--side` for a bar, `--end-a` and `--end-b` for a handle, `--stack` for a stack, or `--front` and `--back` for a vest. The id is the implement's bare id, such as `dumbbell` for `dumbbell=80` or `dumbbell.single=40`. Give one `--from` per implement; an implement without one gets the same answer as with no `--from` at all, and no `changes` block.

```sh
npx plate-pool load barbell=175 --from barbell --side 22.5,22.5,5,5,5,5,5,5,2.5 --json
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
          {
            "name": "left",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5"]
          },
          {
            "name": "right",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5"]
          }
        ],
        "uneven": false,
        "changes": {
          "count": 0,
          "positions": [
            { "name": "left", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5], "remove": [], "add": [] },
            { "name": "right", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5], "remove": [], "add": [] }
          ],
          "hardware": []
        }
      },
      "above": {
        "total": { "lb": 175.5, "kg": 79.6 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          {
            "name": "left",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          },
          {
            "name": "right",
            "plates": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          }
        ],
        "uneven": false,
        "changes": {
          "count": 2,
          "positions": [
            { "name": "left", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5], "remove": [], "add": [1.25] },
            { "name": "right", "keep": [22.5, 22.5, 5, 5, 5, 5, 5, 5, 2.5], "remove": [], "add": [1.25] }
          ],
          "hardware": []
        }
      },
      "alternatives": [],
      "warnings": [],
      "unverified": []
    }
  ],
  "leftover": {
    "plates": { "ql-22.5": 1, "ql-5": 12, "ql-2.5": 2, "ql-micro": 2 },
    "hardware": { "screw-standard": 4, "screw-long": 5, "collar-spinlock": 2, "collar-clamp": 2 }
  }
}
```

The `changes` block:

- `count` is the number of changes from the current loading. A change is one plate put on or taken off one position, or one screw or pin added, removed or swapped for another; a swap counts two. Collars never count. For a pair of handles, `count` covers both, while `positions` and `hardware` describe one handle: do the same on the other.
- `positions` holds one entry per position. `keep` is the plates that stay on, innermost first. `remove` is the plates to take off, from the current loading. `add` is the plates to put on, outside the kept plates.
- `hardware` lists screw and pin changes: `{ "from": "screw-standard", "to": "screw-long", "count": 2 }` is a swap on two positions. An entry with only `to` adds hardware, and one with only `from` removes it.
- `positions[].plates` still lists the whole new loading, innermost first. Plates put on go outside the kept ones, so a heavier plate can sit outside a lighter one.
- A current loading affects its own implement only. Its plates stay free for the other implements in the request.
- `--from` takes no hardware option. The current loading gets the hardware `reverse` picks for the same plates.

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
          {
            "name": "left",
            "plates": [22.5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          },
          {
            "name": "right",
            "plates": [22.5, 5, 5, 5, 2.5, 1.25],
            "ids": ["ql-22.5", "ql-5", "ql-5", "ql-5", "ql-2.5", "ql-micro"]
          }
        ],
        "uneven": false
      },
      "uneven": false,
      "smallest": true
    },
    {
      "total": { "lb": 103, "kg": 46.7 },
      "loading": {
        "total": { "lb": 103, "kg": 46.7 },
        "hardware": [{ "id": "collar-clamp", "count": 2 }],
        "positions": [
          { "name": "left", "plates": [22.5, 5, 5, 5, 5], "ids": ["ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5"] },
          { "name": "right", "plates": [22.5, 5, 5, 5, 5], "ids": ["ql-22.5", "ql-5", "ql-5", "ql-5", "ql-5"] }
        ],
        "uneven": false
      },
      "uneven": false,
      "smallest": false
    }
  ],
  "warnings": [],
  "unverified": []
}
```

- Each row holds the recommended loading for that total, with its hardware in `loading.hardware`. `smallest` says the row uses the lightest plate the implement takes, and `uneven` says a handle's ends differ.

### reverse

The total of a loading you describe. Give each position's plates innermost first, separated by commas, with the position options of the implement's kind: `--side`, `--end-a` and `--end-b`, `--stack`, or `--front` and `--back`. Write `2x22.5` for two plates of 22.5, and `<weight>:<plate id>` where two plates the implement takes share a weight.

```sh
npx plate-pool reverse dumbbell.single --end-a 5,5,5,2.5 --end-b 5,5,5 --json
```

```json
{
  "implement": "dumbbell",
  "pair": false,
  "total": { "lb": 42.5, "kg": 19.3 },
  "hardware": [{ "id": "screw-standard", "count": 2 }],
  "positions": [
    { "name": "a", "plates": [5, 5, 5, 2.5], "ids": ["ql-5", "ql-5", "ql-5", "ql-2.5"] },
    { "name": "b", "plates": [5, 5, 5], "ids": ["ql-5", "ql-5", "ql-5"] }
  ],
  "uneven": true,
  "heavier": "a",
  "warnings": [],
  "notes": [],
  "unverified": []
}
```

- Reverse always returns the total. It adds a warning for each rule the loading breaks, such as using more plates than the pool holds.
- `notes` holds the implement's fixed `note`, if it has one.

### inventory

The inventory file as read. Every weight and length has a `listed` value, an optional `measured` value that overrides it, and a `status`: `verified` (the manufacturer states it), `owner` (the owner confirmed it on the equipment) or `unverified`.

```sh
npx plate-pool inventory --json
```

The output has four lists. This shows the first entry of each, from the owner's file:

```json
{
  "$schema": "./inventory.schema.json",
  "format": 1,
  "name": "Home gym",
  "lengthUnit": "in",
  "plateTypes": [{ "id": "quick-lock", "name": "Ironmaster Quick-Lock", "unit": "lb", "bore": "quick-lock" }],
  "plates": [
    {
      "id": "ql-22.5",
      "type": "quick-lock",
      "count": 5,
      "weight": { "listed": 22.5, "status": "verified" },
      "stackLength": { "listed": 1.875, "status": "unverified" },
      "diameter": 6.7,
      "colour": "#c9353f",
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
      "capacity": 3.25
    }
  ],
  "implements": [
    {
      "id": "barbell",
      "name": "Straight bar",
      "kind": "bar",
      "count": 1,
      "unit": "lb",
      "base": {
        "listed": 18,
        "status": "owner",
        "note": "Ironmaster states about 18 lb. The owner weighed it at 17.7 lb with its collars off and counts it as 18 lb. Collars are added."
      },
      "accepts": ["quick-lock"],
      "hardware": { "options": ["collar-clamp", "collar-spinlock", "none"], "default": "collar-clamp", "perPosition": 1 },
      "maxPlateWeight": 210,
      "maxPerPosition": { "ql-micro": 1 },
      "positionLength": { "listed": 11.5, "status": "verified", "note": "For plates and the collar" }
    }
  ]
}
```

### achievable

Every total each implement can reach, with the whole pool free, as one document. Run it over the athlete's file and plan from its tables.

```sh
npx plate-pool achievable
```

The output is always JSON. This shows the first row of the first table:

```json
{
  "format": 1,
  "plate_pool": "1.0.1",
  "inventory_sha256": "d33b57cca41bdfd2c01c02bd25e0317c93146757ef2e708a869355a955fdba68",
  "name": "Home gym",
  "tables": [
    {
      "implement": "barbell",
      "hardware": "collar-clamp",
      "rows": [
        {
          "total": { "lb": 18, "kg": 8.2 },
          "loading": {
            "total": { "lb": 18, "kg": 8.2 },
            "hardware": [{ "id": "collar-clamp", "count": 2 }],
            "positions": [
              { "name": "left", "plates": [], "ids": [] },
              { "name": "right", "plates": [], "ids": [] }
            ],
            "uneven": false
          },
          "uneven": false,
          "smallest": false
        }
      ]
    }
  ]
}
```

- `format` is the inventory format, and `plate_pool` the version of the tool.
- `inventory_sha256` is the SHA-256 of the file's bytes as read, in lower-case hex. Its first 8 characters are the kit's short hash, which per-line links carry as `kit`.
- `name` is the kit's name from the file.
- `tables` holds one table per implement, per entry in its hardware `options` (including `none`), and per pair and single on a handle the gym has two or more of. `hardware` is absent when the implement has no hardware, and `pair` appears on handles only. The rows have the shape of `list --json` rows over the implement's full range.
- The order is file order, then `options` order, then pair before single. There is no default-hardware marker: the first table for an implement uses its first option.
- A table cannot share the pool between implements. For a workout with several implements at once, run `load` with every target in one request.

For the owner's file, the tables come in this order:

1. `barbell`, `collar-clamp`
2. `barbell`, `collar-spinlock`
3. `barbell`, `none`
4. `dumbbell`, `screw-standard`, pair
5. `dumbbell`, `screw-standard`, single
6. `dumbbell`, `screw-long`, pair
7. `dumbbell`, `screw-long`, single
8. `dumbbell`, `none`, pair
9. `dumbbell`, `none`, single
10. `kettlebell`, `screw-standard`
11. `kettlebell`, `screw-long`
12. `kettlebell`, `none`
13. `leg`
14. `vest`

## Links

The web app is at <https://joeuk89.github.io/plate-pool/>. Two links send the athlete there. The set-up link installs their kit; a per-line link opens a workout line against it.

### Set-up link

`https://joeuk89.github.io/plate-pool/#inventory=<payload>`. The payload is the inventory file's bytes compressed with raw deflate (no zlib header or trailer), then base64url without padding. It rides in the fragment, so it never reaches the server. Opening it shows a confirm card that names the kit; one tap stores it on the device and removes the fragment from the URL.

Build it from the file with Node:

```sh
node -e 'const fs = require("node:fs"), zlib = require("node:zlib"); console.log("https://joeuk89.github.io/plate-pool/#inventory=" + zlib.deflateRawSync(fs.readFileSync(process.argv[1])).toString("base64url"))' "$PLATE_POOL_INVENTORY"
```

Compress the file's bytes exactly as they are, without parsing and re-writing the JSON, so the kit's hash on the phone matches `inventory_sha256`.

### Per-line link

`https://joeuk89.github.io/plate-pool/?<parameters>`. It carries targets and the short hash of the kit they were worked out for:

| Parameter | Meaning | Example |
| --- | --- | --- |
| `<id>` | Target for that implement. A pair on a handle the gym has two or more of. | `barbell=175lb` |
| `<id>.single` | Target for one of a handle. | `dumbbell.single=12.5lb` |
| `<id>.pair` | The explicit pair form. An error on a handle the gym has one of. | `dumbbell.pair=40lb` |
| `<id>.hardware` | The hardware for that implement: an id from its `options`, or `none`. Leave it out when the implement has no hardware. | `barbell.hardware=collar-spinlock` |
| `uneven` | `0` turns uneven loading off for every handle. | `uneven=0` |
| `view` | `load` (the default), `list` or `reverse`. | `view=list` |
| `kit` | The first 8 characters of `inventory_sha256`. | `kit=d33b57cc` |

- Target parameters' order is priority order, as in `load`. `.hardware`, `uneven`, `view` and `kit` do not count toward it.
- Always give each target a unit suffix: `lb` or `kg`.
- When `kit` differs from the stored kit's short hash, the app still shows the result, with a banner saying the targets were worked out for a different kit.

For example, the owner's barbell at 173 lb and a pair of dumbbells at 40 lb:

`https://joeuk89.github.io/plate-pool/?barbell=173lb&dumbbell=40lb&kit=d33b57cc`

## Snippet for agent instructions

Paste this into another repo's agent instructions, such as its `CLAUDE.md` or `AGENTS.md`. Replace the example ids with the implement ids in the athlete's file.

```markdown
## Plate loading: plate-pool

Use plate-pool for any weight on a plate-loaded implement. Never work out plates by hand. Guide: https://github.com/joeuk89/plate-pool/blob/main/docs/agent-guide.md

- Name the athlete's inventory file: set `PLATE_POOL_INVENTORY`, or add `--inventory <path>` to each command.
- Tables of every achievable total: `npx plate-pool achievable > achievable.json`. Plan only totals the tables hold.
- Load several implements at once: `npx plate-pool load barbell=173 dumbbell=40 --json`
- Load from what is on the bar now: `npx plate-pool load barbell=175 --from barbell --side 22.5,22.5,5,5,5,5,5,5,2.5 --json`
- List: `npx plate-pool list barbell --from 100 --to 200 --json`
- Reverse: `npx plate-pool reverse barbell --side 22.5,22.5,5,5 --json`
- Set-up link, which installs the kit on the athlete's phone: `node -e 'const fs = require("node:fs"), zlib = require("node:zlib"); console.log("https://joeuk89.github.io/plate-pool/#inventory=" + zlib.deflateRawSync(fs.readFileSync(process.argv[1])).toString("base64url"))' "$PLATE_POOL_INVENTORY"`. Send it once, and again whenever the file changes.
- Per-line link, one per workout line: `https://joeuk89.github.io/plate-pool/?barbell=173lb&dumbbell=40lb&kit=d33b57cc`. Use implement ids as parameters in priority order, always with a `lb` or `kg` suffix, and set `kit` to the first 8 characters of `inventory_sha256` from `achievable`.

Rules:

- A target is a total, including the implement and its locking hardware.
- All implements share one plate pool. Put every implement used at the same time in one `load` request.
- A request's order is its priority. Put the implement that matters most first.
- Read `warnings`, and mention any value the result lists under `unverified`.
- When a result is not exact, use the `recommended` loading.
```
