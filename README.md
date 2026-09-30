# plate-pool

A calculator for one home gym. It answers Load, List and Reverse for five implements that share one plate pool. [docs/spec.md](docs/spec.md) is the specification.

## Layout

| Path | Contents |
| --- | --- |
| `inventory/inventory.json` | Every plate, piece of locking hardware and implement. The only source of equipment data. |
| `inventory/inventory.schema.json` | The JSON Schema the inventory file must match. |
| `packages/core` | The library: the model and all calculation. No runtime dependencies. |
| `packages/cli` | The command-line tool, `plate-pool`. |
| `packages/web` | The web app (Vite and React). |

## Build and test

You need Node 22.12 or later. From the repo root:

```sh
npm run verify
```

This installs, builds and tests all three packages. The build stops first if the inventory file does not match its schema.
