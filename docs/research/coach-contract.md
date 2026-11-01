# What the coach engine reads and emits

Researched 2026-11-01 for [#54](https://github.com/joeuk89/plate-pool/issues/54), part of map [#53](https://github.com/joeuk89/plate-pool/issues/53). Sources are the `joeuk89/strength-coach` repo at commit `8e463e1` (its `main`; the repo is private, so paths below are repo-relative and not linked) and this repo. Quotes are exact. Where the coach docs leave something undefined, this file says so instead of filling it in.

Short version: the coach has settled **what** the files and links are for and **which three header fields** it reads. It has not written down a single URL parameter name, a compression algorithm, a hash length, or a body shape for the tables. Those are plate-pool's to define in format 1, and the coach's `core/kit.py` does not exist yet, so nothing on the coach side is implemented against a shape.

## 1. The set-up link

**What the coach says.** One link per plate-pool location on each routine page, with the inventory inline. `docs/adr/0021-the-instance-owns-the-kit-plate-pool-is-a-hand-run-generator.md` lines 60-63:

> **Routine pages.** Each plate-pool location gets one set-up link, with the inventory inline in the URL (compressed and encoded; a few kilobytes), that one tap installs on the phone. The per-line deep link keeps ADR 0008's shape and adds the kit's short hash, so plate-pool can say when the kit stored on the device is not the one the loads were rounded to.

The grilling ticket's resolution (strength-coach issue 49, comment of 2026-10-31, answer 4) adds where it lands: "which one tap installs in plate-pool's local storage on the phone". `docs/adr/0012-rendered-pages-are-committed-output-of-publish.md` lines 53-55 repeat the same sentence for the page renderer.

**What one tap must do in plate-pool.** Open the app, decode the inventory from the URL, store it in local storage as the device's kit, and be ready to load. Nothing more is specified. The coach does not say whether the link should also land on a particular screen afterwards.

**Undefined in the coach docs:**

- The URL base. The coach never names plate-pool's site; `instance.md` line 78 says the location carries "No URL: the engine fetches nothing". The renderer must know where plate-pool is served, and no doc says where that comes from.
- The parameter name, the compression algorithm and the text encoding. "compressed and encoded" is all the ADR says. The only concrete proposal is on this repo's own issue [#52](https://github.com/joeuk89/plate-pool/issues/52) (comment of 2026-10-31): `?kit=<compressed, base64url>`, "the owner's inventory is about 4 KB raw". That is plate-pool's proposal, not a coach commitment.
- A size cap. "a few kilobytes" is the only expectation. The renderer is pure stdlib Python (ADR 0019 lines 64-66 and 96-101), so the compressor will be one of `zlib`, `gzip`, `bz2` or `lzma`; which one is not stated.
- The kit's name. The coach knows the kit as `kit/<name>.json`, but no doc says the set-up link carries `<name>`. Map #53 decides "One named kit on the device at a time", so plate-pool needs a name from somewhere: either a parameter the coach adds, or a name plate-pool derives.

## 2. The per-line deep link

**Shape.** ADR 0021 line 62: "keeps ADR 0008's shape and adds the kit's short hash". ADR 0008's shape, `docs/adr/0008-plate-pool-owns-the-home-inventory.md` lines 63-65:

> **Routine pages carry a plate-pool deep link per loaded line**, built from the frozen prescription (`?barbell=175&collars=clamp`; both implements in one link for a superset). Nothing about plates reaches Hevy.

So the parameters are this repo's spec section 8.7 as it stands: `barbell`, `dumbbells`, `dumbbell`, `kettlebell`, `leg`, `vest`, `collars`, `uneven`, `view`, plus one new parameter for the hash. ADR 0012 line 53 adds that "Loads on pages are in athlete units".

**The hash.** The coach docs say "the kit's short hash" and nothing else. What can be pinned down from them:

- *What is hashed.* The only hash the engine holds is the inventory's. ADR 0019 lines 67-69: "`cli` reads the committed file and the inventory's hash and hands both to the service as values". The renderer therefore has `inventory_sha256` (section 3) and nothing else to shorten, so the short hash is a prefix of it.
- *Algorithm.* SHA-256, by the header field's name. No doc states it in words.
- *Length.* Undefined in the coach docs. Issue #52's comment proposes "`kit=<first 8 hex of inventory_sha256>` when no inline inventory is given". That is plate-pool's proposal.
- *Parameter name.* Undefined in the coach docs. The #52 proposal reuses `kit` for both the inline inventory (set-up link) and the hash (per-line link), telling them apart by length. Map #53 lists link parameters under "Not yet specified", so this is open on both sides.

**How plate-pool should compare it.** The coach's only requirement, ADR 0021 line 63: "so plate-pool can say when the kit stored on the device is not the one the loads were rounded to". So: take the SHA-256 of the stored kit (section 3 says over which bytes), compare its prefix of the same length with the link's value, and warn on mismatch. Issue #52's comment adds plate-pool's own intent: "the app says when the stored kit's hash differs and offers the set-up link again". The coach does not ask plate-pool to refuse to load on a mismatch, only to say so.

**Units.** Spec 8.7 reads an unsuffixed value as lb (`vest=12kg` is the suffixed form). ADR 0012 says loads are in athlete units, and `[athlete].units` is `kg` or `lb` (`docs/spec/instance.md` line 90). No coach doc says the renderer appends the unit suffix. For a kg athlete it must, or plate-pool reads the number as lb. See section 6.

## 3. `inventory_sha256`: file bytes, not a canonical form

The coach hashes the file as committed. `docs/spec/verbs.md` line 245, the exit 5 row:

> a plate-pool location whose `kit/<name>.achievable.json` is missing or carries an `inventory_sha256` other than the hash of `kit/<name>.json` (`kit_tables_stale`, naming the location and the generator command, on `plan draft` and `program adopt`; ADR 0021)

`docs/spec/instance.md` lines 158-159: "A verb that rounds hashes the inventory first and stops with exit 5, `kit_tables_stale`, when the header disagrees". ADR 0021 lines 47-51 give the reason ("a warning lets a plan freeze loads the rack cannot build") and add "No hash is ever stored in the store".

"The hash of `kit/<name>.json`" is the hash of the file. No coach doc mentions canonicalisation, key order or whitespace. Issue #52's comment states it outright for plate-pool's side: "the SHA-256 of the inventory file's bytes". The two readings agree, so format 1 should hash the bytes as read from disk.

Consequences plate-pool should know:

- Any byte change stales the tables, including reformatting or a trailing newline. That is intended: the `kit` skill reruns the generator after every edit (`docs/spec/skills.md` lines 308-311).
- The encoding of the value (lower-case hex, with or without a `sha256:` prefix) is undefined in the coach docs. `docs/spec/validation.md` line 84 uses `"params_hash": "sha256:…"` for an unrelated field, so the coach has used a prefixed form elsewhere; #52's "first 8 hex" assumes bare hex. Format 1 should state one form.
- Git line-ending conversion between the generator run and the engine's read would change the bytes. The coach does not address it.

## 4. The tables document `kit/<name>.achievable.json`

**The header.** Three fields, named the same way in ADR 0021 lines 40-42 and `docs/spec/instance.md` lines 154-157:

> a header, `format` (the document format the engine states it parses), `plate_pool` (the version that wrote it) and `inventory_sha256`, then the tables.

- `format`: ADR 0021 calls it "the document format number the engine states it parses". Issue #52's comment says "an integer the engine states it parses, 1 to start". The coach docs do not say what the engine does with a `format` it does not state; by the exit 5 row's wording only a missing file and a hash mismatch are `kit_tables_stale`, so an unknown `format` has no named refusal.
- `plate_pool`: "the version that wrote it". Its form (a semver string is the obvious reading) is not stated, and no coach rule reads it.
- `inventory_sha256`: section 3.

Where the header sits (top-level keys beside the tables, or a nested `header` object) is undefined. "then the tables" reads as siblings.

**The body.** The coach docs do not define a body shape. They define what the engine takes from it, which is the contract the body must satisfy:

| The engine needs | Source |
| --- | --- |
| One table per implement, selected by the location's `implements` map: "At a plate-pool location a value names an implement of the kit tables, so the load step is that implement's table" | `docs/spec/instance.md` line 123 |
| The barbell table chosen by `collars`, the dumbbell table by `dumbbells` (`pair` or `single`): "`collars` and `dumbbells` (`pair` or `single`) choosing which tables apply" | `docs/spec/instance.md` line 78; ADR 0021 lines 42-44 |
| An ordered list of rows, each a total load: "the next row of a plate-pool location's table" is the load step; rounding "selects from the rows of the applicable table" | ADR 0008 lines 36-37 and 49-50 |
| A top row: "With no next rack row ... a hit holds and the step records `cause = rack_top`" | `docs/spec/prescription.md` lines 115-116 |
| Plates per side, per row, for the warm-up ladder: "the row with the fewest plates per side from 10 % under the target up to it, never above, ties lighter, then the row whose plates contain the previous warm-up's" | `docs/spec/prescription.md` lines 270-272; ADR 0008 lines 53-56 |
| Totals readable in the athlete's unit (`[athlete].units` is `kg` or `lb`) | `docs/spec/instance.md` line 90 |

ADR 0019 line 67 names the parser: "`core/kit.py` parses a `kit/<name>.achievable.json` document into enumerated racks and is pure". `docs/spec/testing.md` lines 62-65 name its fixture: "one synthetic kit tables document, `<name>.achievable.json` with its header, and the inventory it hashes against". Neither exists yet: the strength-coach repo at `8e463e1` holds `docs/`, `scripts/benchmark` and three root files, no `src/` and no `core/kit.py`.

**What the body is today.** The coach assumes the deploy's `api/achievable.json`. Issue #52's comment: "prints the document the deploy builds today (`api/achievable.json`, the eight tables) with a header". That document is built by `packages/web/api/plugin.ts` in this repo: `{ "tables": [...] }`, one entry per request in this fixed order (`docs/agent-guide.md` lines 330-340):

1. `barbell` with `"collars": "clamp"`
2. `barbell` with `"collars": "spinlock"`
3. `barbell` with `"collars": "none"`
4. `dumbbell` with `"pair": true`
5. `dumbbell` with `"pair": false`
6. `kettlebell`
7. `leg`
8. `vest`

Each table is a `ListResponse` (`packages/core/src/list.ts` lines 25-38) with `collars` added for the barbell:

```ts
export interface ListRow {
  total: Display;        // { lb: number; kg: number }
  loading: Loading;      // total, hardware [{ id, count }], positions [{ name, plates: number[] }], uneven
  uneven: boolean;
  micro: boolean;
  screw?: string;
}

export interface ListResponse {
  implement: string;
  pair?: boolean;
  rows: ListRow[];
  warnings: string[];
  unverified: string[];
}
```

Rows run lightest to heaviest. Every total carries both `lb` and `kg` (`packages/core/src/weight.ts` lines 6-9), so the engine can read its athlete's unit without converting. `loading.positions[].plates` gives plates per side for the warm-up ladder. This matches everything in the table above, which is why the coach could write its rules against it without naming a shape.

**Units.** Row totals are in both units. The coach's rules speak of "athlete units" throughout; nothing in the coach docs asks for a single-unit document.

**`format` expected.** Not stated anywhere in the coach docs. Issue #52's comment says 1. The engine "states" the number it parses, so whichever integer format 1 emits, `core/kit.py` will carry that constant.

## 5. Inventory fields the `kit` skill writes

The engine never reads the inventory (`docs/spec/instance.md` line 157: "it never parses the inventory, runs Node or fetches"), so the only coach-side consumer of the schema is the `kit` skill, an agent prompt. `docs/spec/skills.md` lines 296-311, the skill's Ask and Judge:

> For a plate pool: every plate with its count and weight, the locking hardware, each implement's bare weight and limit, which collars they use.

> **Inventory.** Write `kit/<name>.json` in plate-pool's schema; mark a weight `verified` only when the maker states it, `owner` when the athlete weighed it, else `unverified`. Then run `npx plate-pool achievable --inventory kit/<name>.json > kit/<name>.achievable.json`; a schema error is the athlete's answer to fix, never a value to guess.

So the skill writes, and format 1 must keep:

- The weight value object: `listed`, optional `measured`, and `status` with the enum `verified` / `owner` / `unverified` (`inventory/inventory.schema.json` lines 39-50). The skill names the three status values; renaming them breaks the prompt.
- Plates with a count and a weight.
- Locking hardware.
- Per implement: a bare weight and a limit.
- Collars, and which the athlete uses. The location's `collars` key (`clamp`, `spinlock` or `none` today) must name a choice the tables carry.
- Implement ids: the location's `implements` map points equipment kinds at "an implement of the kit tables" (`docs/spec/instance.md` line 123), so whatever ids the inventory gives implements must appear as table `implement` values.

The skill reads the schema at run time and takes "a schema error" as the athlete's problem to fix, so field names beyond the ones above are free to change. The equipment kinds the map keys on are the coach's own registry (`coach schema --registry equipment-kinds`: barbell, dumbbell, kettlebell, leg attachment, vest, machine, cable, band, bodyweight; ADR 0008 lines 41-44), not inventory fields.

Cutover detail: `docs/spec/cutover.md` line 24 has `kit/home.json` as "a copy of the inventory", this repo's `inventory/inventory.json`. That file has no `format` key and a `$schema` of `./inventory.schema.json`, a relative path that dangles once copied. Under map #53's "`format: 1` is a required top-level field", the copy needs `format: 1` added or the generator refuses it by name.

## 6. Coach assumptions that #53's decisions contradict or leave hanging

1. **The bundled inventory as a sample.** ADR 0021 lines 66-68 describe plate-pool's side as "a kit screen that loads an inventory from the set-up link, a pasted file or local storage, with the bundled inventory as a sample" and "plate-pool's own site stays its owner's gym". Issue #52's comment says the same: "With nothing stored the app opens on that screen with the bundled inventory offered as a sample" and "Nothing changes for the owner's deployed site". Map #53 decides the opposite: "The site is generic. It opens with no inventory ... No starter inventory, no in-app preset." The engine never depends on the site (ADR 0021 line 68), so nothing on the coach side breaks; the ADR's wording is simply stale and the owner's phone gets its kit through the set-up link like anyone else's.

2. **Fixed implement ids and the `collars` / `dumbbells` location keys.** The coach selects tables with two location-level keys, `collars` and `dumbbells` (`docs/spec/instance.md` line 78), and its examples and tests name `barbell`, `dumbbell`, `kettlebell`, `leg` and `vest` (`docs/spec/prescription.md` line 307: "the barbell row above 120 is 125"; `docs/spec/program.md` line 500: "the home rack's next barbell row"). Map #53 replaces those with four kinds (bar, handle, stack, vest) carrying athlete-named implements, and lists "`achievable` tables for implements with several hardware options and for pair or single handles: one table per choice, as today, or a choice list in the header" as not yet specified. A gym with two bars, or two handles with different hardware, has no place in `collars` and `dumbbells` as single location keys. Whatever format 1 chooses, the coach's `[location.<name>]` shape will need a matching change, and that is a coach-side ticket, not plate-pool's.

3. **The eight-table order and `api/achievable.json`.** Issue #52's comment ties the `achievable` command to "the document the deploy builds today (`api/achievable.json`, the eight tables)". Map #53 retires the static JSON and makes the table set data-driven. No coach doc depends on the order or the count, only on finding a table by implement, collars and pair, so this is a wording gap rather than a conflict.

4. **Uneven rows.** ADR 0008 lines 47-48: "The location still fixes which tables apply: collars (clamp), uneven dumbbells (off), pair or single." But `docs/spec/instance.md` line 78 gives the location only `collars` and `dumbbells`; there is no `uneven` key. Today's tables are generated with the library default, uneven on (`packages/core/src/request.ts` line 163: `request.uneven ?? true`), so the dumbbell tables contain rows flagged `"uneven": true`. Either `core/kit.py` filters those rows or the engine rounds to a load the athlete must build unevenly. Undefined on the coach side; plate-pool should keep the `uneven` flag on every row so the engine can filter.

5. **Units in the per-line link.** Section 2: spec 8.7 reads a bare number as lb, the coach renders "athlete units", and no coach doc says the renderer appends `kg`. If plate-pool's link grammar keeps the bare-number-is-lb rule, the coach's renderer must suffix every value for a kg athlete. Worth stating in format 1's link section so the renderer has a sentence to cite.

6. **One parameter, two meanings.** Issue #52's proposal uses `kit=` for the inline inventory and for the 8-hex hash, distinguished by length. The coach docs name neither parameter, and #53 lists link parameters as open. Nothing on the coach side stops plate-pool using two names.

7. **The kit's name.** Section 1: the coach keeps one `<name>` per plate-pool location and never passes it to plate-pool. #53's "one named kit on the device" needs a name; the set-up link is the only place it could come from, and the coach does not put it there.

8. **No refusal for an unknown `format`.** Section 4: the coach's only named kit refusal is `kit_tables_stale` for a missing file or a hash mismatch. What the engine does with a tables document whose `format` it does not state is unwritten. That is the coach's gap; plate-pool only needs to emit the integer.

Everything else lines up: `npx plate-pool achievable --inventory kit/<name>.json` (ADR 0021 line 11; `docs/spec/skills.md` line 310) matches #53's "`--inventory` or `PLATE_POOL_INVENTORY` is required"; the engine never runs Node or fetches, so the npm package is the only delivery that matters (ADR 0021 lines 69-71: the `kit` skill runs it for the athlete); the hash check on per-line links and the versioned schema are stated the same way on both sides.
