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

## Deployment

Every push to the main branch runs `.github/workflows/deploy.yml`: it tests, builds and deploys the web app to <https://joeuk89.github.io/plate-pool/>. A failing test or an inventory file that does not match its schema stops the deployment. Pull requests run the same tests and build, and deploy nothing.

The web app installs from the browser and works offline. The build adds a service worker, `sw.js`, that caches every file of the deployment. With a network, each visit loads the latest page, and a new deployment replaces the cached copy. With no network, or none within 3 seconds, the app loads from the cache.
