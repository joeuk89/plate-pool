# plate-pool

A calculator for any plate-loaded gym. You describe the gym in an inventory file, and plate-pool answers Load, List and Reverse for its implements, which share one plate pool. [docs/spec.md](docs/spec.md) is the specification. Agents that plan training start with [docs/agent-guide.md](docs/agent-guide.md).

## The inventory file

An inventory file describes one gym: its plate types, plates, locking hardware and implements. Its shape is inventory format 1 (spec section 17.3), and every file states `"format": 1`. Each implement has a kind (bar, handle, stack or vest) that fixes its positions and its drawing; everything else about it is a field in the file.

The JSON Schema for format 1 is in two places: [`inventory/inventory.schema.json`](inventory/inventory.schema.json) in this repo, and `plate-pool/inventory.schema.json` in the npm package. Point a file's `$schema` field at it for editor checks. plate-pool itself never loads the schema; its own reader checks every file and names the JSON path of each error.

Neither the npm package nor the site comes with an inventory. The command-line tool needs `--inventory <path>` or `PLATE_POOL_INVENTORY`. The site opens on the kit screen with no kit, and stores one when you open a set-up link or paste or choose a file.

The owner's own gym is the reference example: [inventory/README.md](inventory/README.md) describes its file and equipment.

## Layout

| Path | Contents |
| --- | --- |
| `inventory/inventory.json` | The owner's inventory: the reference example of format 1 and the fixture for the spec's worked examples. |
| `inventory/inventory.schema.json` | The JSON Schema for format 1. |
| `inventory/README.md` | The owner's equipment and its open measurement items. |
| `packages/core` | The library: the inventory reader and all calculation. No runtime dependencies. |
| `packages/cli` | The command-line tool, `plate-pool`. |
| `packages/web` | The web app (Vite and React). |

## Build and test

You need Node 22.12 or later. From the repo root:

```sh
npm run verify
```

This installs, builds and tests all three packages. The build stops first if `inventory/inventory.json` does not match its schema or fails the library's reader.

## Deployment

Every push to the main branch runs `.github/workflows/deploy.yml`: it tests, builds and deploys the web app to <https://joeuk89.github.io/plate-pool/>. A failing test or an invalid `inventory/inventory.json` stops the deployment. Pull requests run the same tests and build, and deploy nothing.

The web app installs from the browser and works offline. The build adds a service worker, `sw.js`, that caches every file of the deployment. With a network, each visit loads the latest page, and a new deployment replaces the cached copy. With no network, or none within 3 seconds, the app loads from the cache. The kit is stored on the device, so a stored kit works offline too.

## Release

Pushing a version tag runs `.github/workflows/release.yml`. It tests and builds everything, then publishes the command-line tool to npm as `plate-pool`. A failing test stops the release, and nothing is published.

To release:

1. Set `version` in `packages/cli/package.json` and merge it to the main branch.
2. Tag that commit `v` plus the version, such as `v1.0.0`, and push the tag. The workflow stops if the tag and the version differ.

The workflow publishes through npm trusted publishing: npm trusts this repo's `release.yml` run by its GitHub identity, so no token is stored anywhere. Provenance is attached by default.

The package bundles the library and the inventory schema, and no inventory. To check the package before a release, run `npm pack --workspace packages/cli` and install the file it writes into an empty directory.
