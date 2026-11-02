# The owner's inventory

`inventory.json` is the owner's home gym in inventory format 1 ([spec section 17.3](../docs/spec.md)). It is the reference example for anyone writing a file, and the fixture for every worked example in the spec. `inventory.schema.json` is the JSON Schema a file must match; editors read it through the file's `$schema` field, and the repo's validate script runs it over this file.

The app bundles neither file. A phone gets this inventory through a set-up link like any other kit, and the command-line tool is pointed at it with `--inventory inventory/inventory.json`.

This file holds equipment only. The repo is public: no order numbers, prices, dates or addresses.

## Equipment

Full detail, sources and open questions are in [docs/research/equipment-specs.md](../docs/research/equipment-specs.md). This section holds the values the file uses.

Status values: **verified** (manufacturer or distributor states it), **owner** (the owner confirmed it on the equipment), **unverified**.

### Plates

| Plate | Type | Count | Weight | Stack length per plate | Shape | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 22.5 lb | Quick-Lock | 5 | 22.5 lb | 1.875 in | Square | Weight verified; length unverified |
| 5 lb | Quick-Lock | 24 | 5 lb | 0.5 in | Square | Weight verified; length unverified |
| 2.5 lb | Quick-Lock | 4 | 2.5 lb | 0.25 in | Square | Weight verified; length unverified |
| Micro | Quick-Lock | 4 | 1.25 lb | 0.25 in | Round | Weight verified; length unverified |
| Vest block | Vest block | 30 | 1 kg | n/a | Block | Weight verified; count unverified |

Quick-Lock plates total 247.5 lb.

Stack length is how much a plate adds to a stack. Ironmaster publishes no thickness, so these values are calculated from published dumbbell lengths. They set how many plates a locking screw holds and how the picture is drawn.

### Locking hardware

| Item | Count | Weight used | Holds | Status |
| --- | --- | --- | --- | --- |
| Standard locking screw | 4 | 2.5 lb | Up to 3.25 in of plates (six 5 lb + one 2.5 lb) | Verified |
| Long locking screw | 5 | 2.5 lb | Up to 5.125 in of plates (one 22.5 lb + six 5 lb + one 2.5 lb) | Listed weight verified. Real weight is about 3 lb |
| Ironmaster spin-lock collar | 2 | 1 lb | n/a | Owner: weighed at 433 g, counted as 1 lb |
| Mirafit 1" clamp collar | 4 | 0 lb | n/a. 1.26 in wide | Owner: nylon, weighs next to nothing |

Ironmaster counts the long screw as 2.5 lb, and so does the app. A dumbbell listed at 120 lb weighs about 121 lb.

### Implements

| Implement | Count | Base weight | Positions | Plate types | Limit |
| --- | --- | --- | --- | --- | --- |
| Straight bar | 1 | 18 lb, plus collars | 2 sides | Quick-Lock | 210 lb of plates |
| Dumbbell | 2 | 5 lb handle + 2 screws = 10 lb | 2 ends | Quick-Lock | 120 lb per dumbbell |
| Kettlebell | 1 | 22.5 lb handle + 1 screw = 25 lb | 1 stack | Quick-Lock | 80 lb |
| Leg attachment | 1 | 0 lb (plates only) | 1 stack | Quick-Lock | 100 lb of plates |
| Weighted vest | 1 | 0 kg | Front, back | Vest block | 30 blocks |

Notes:

- **Straight bar.** Ironmaster states "about 18 lb". The owner weighed it at 17.7 lb with its collars off and counts it as 18 lb. The app adds the collar weight: 2 lb for two spin-lock collars, 0 lb for two clamp collars. Status: owner. Each side has 11.5 in for plates and the collar.
- **Bare handles.** A dumbbell with no screws and no plates weighs 5 lb. A kettlebell with no screw and no plates weighs 22.5 lb. Both are valid loadings.
- **Leg attachment.** Its lever weight is not published. The app reports plate weight only.
- **Vest.** The empty vest's weight is not published. It counts as 0 kg. Status: unverified.
- **Leg attachment and Olympic plates.** The attachment also takes Olympic plates. The owner has none, so the file lists Quick-Lock only.

## Open items

None of these block a build. Each is one value in the inventory file.

| Item | Value used now | Settled by |
| --- | --- | --- |
| Long screw's real weight | 2.5 lb (Ironmaster's convention) | Kitchen scale |
| Empty vest weight, and block count | 0 kg, 30 blocks | Bathroom scale, and counting |
| Do 2 × 22.5 + 12 × 5 lb fit on one bar side with the collar on | Allowed. Calculated to fit with a clamp collar, 0.49 in spare | Loading it once |
| Does a long screw lock on a lightly loaded kettlebell | Allowed, with a warning | Trying it once |
| Do two 22.5 lb plates fit on the kettlebell | Not allowed: at most one | Trying it once |
| Shortest stack a long screw locks on a dumbbell | 3.0 in | Trying it once |
| Plate stack lengths | Calculated values in the plates table above | Measuring a stack of five 5 lb plates |

The research file lists further checks. They affect drawing scale only.
