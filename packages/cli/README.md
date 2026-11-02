# plate-pool

A calculator for any plate-loaded gym. You describe the gym in an inventory file: its plate types, plates, locking hardware and implements. plate-pool answers three questions over it: Load, List and Reverse. All implements share one plate pool.

The package bundles no inventory. Name your file with `--inventory <path>`, or set `PLATE_POOL_INVENTORY`; `--inventory` wins when both are set.

```sh
export PLATE_POOL_INVENTORY=./my-gym.json
npx plate-pool load <id>=<target> ...
npx plate-pool list <id> --from 100 --to 200
npx plate-pool reverse <id> --side 2x20,10
npx plate-pool inventory
npx plate-pool achievable > my-gym.achievable.json
```

## Naming implements

An implement is named by its `id` in the inventory file.

| Argument | Meaning |
| --- | --- |
| `<id>=<target>` | A target. A bare value reads in the implement's unit; a suffix overrides it, as in `<id>=80kg`. On a handle the kit has two or more of, this is a pair. |
| `<id>.single=<target>` | One handle. `list <id>.single` and `reverse <id>.single` work the same way. |
| `<id>.pair=<target>` | The explicit pair. An error on a handle the kit has one of. |
| `<id>.hardware=<hardware id>` | The hardware for that implement: an id from its `options`, including `none` when the options list it. |

Argument order is priority order; `.hardware` arguments do not count toward it.

## Positions

`reverse` and `load --from <id>` take the positions by the implement's kind, plates innermost first:

| Kind | Options |
| --- | --- |
| bar | `--side` |
| handle | `--end-a`, `--end-b` |
| stack | `--stack` |
| vest | `--front`, `--back` |

A plate list is comma-separated weights, with `2x22.5` for two plates of 22.5 and `<weight>:<plate id>` where two plates the implement takes share a weight.

## Options

| Option | Meaning |
| --- | --- |
| `--inventory <path>` | The inventory file. Required unless `PLATE_POOL_INVENTORY` is set. |
| `--json` | Structured output for agents. |
| `--no-uneven` | Turn uneven loading off for every handle. |

## The inventory file

The file follows inventory format 1. The package carries its JSON Schema at `plate-pool/inventory.schema.json`, for editors and authors; plate-pool itself never loads it. `inventory --json` prints the file as read.

## `achievable`

`achievable` writes one JSON document: the inventory's `format`, the package version as `plate_pool`, `inventory_sha256` over the file's bytes, the kit's `name`, and one table of achievable totals per implement, hardware option, and pair or single.

Run `npx plate-pool` with no command for every option. Agents: read the [agent guide](https://github.com/joeuk89/plate-pool/blob/main/docs/agent-guide.md). Source and specification: <https://github.com/joeuk89/plate-pool>.
