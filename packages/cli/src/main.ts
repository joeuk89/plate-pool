import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  achievable,
  InventoryError,
  list,
  load,
  readInventory,
  RequestError,
  reverse,
  type Implement,
  type ImplementKind,
  type Inventory,
  type ReverseRequest,
  type TargetRequest,
} from "@plate-pool/core";
import packageJson from "../package.json" with { type: "json" };
import { inventoryText, listText, loadText, reverseText } from "./format.js";

export interface Environment {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  /** The process environment, read for PLATE_POOL_INVENTORY. */
  variables: Record<string, string | undefined>;
}

const usage = `Usage: plate-pool <command> [arguments] [options]

Every command reads the inventory file named by --inventory <path>, or by the
PLATE_POOL_INVENTORY environment variable. The package bundles no inventory.

Commands:
  load <id>=<target> ...          Loadings for one or more targets. Targets share the plate pool.
                                  Argument order is priority order
  list <id>                       Achievable weights for one implement
  reverse <id> <positions>        Total for a given loading
  inventory                       What the kit holds. With --json, the file as read
  achievable                      The tables document for agents: one list per implement,
                                  hardware option, and pair or single, as JSON

Naming implements, by their id in the inventory file:
  <id>=<target>                   A target. A bare value reads in the implement's unit;
                                  a suffix overrides it: <id>=80kg, <id>=175lb.
                                  On a handle the kit has two or more of, a pair
  <id>.single=<target>            One handle. Also list <id>.single and reverse <id>.single
  <id>.pair=<target>              The explicit pair form
  <id>.hardware=<hardware id>     The hardware for that implement: an id from its options,
                                  or none when its options include none. For load, list and reverse

Options:
  --inventory <path>              The inventory file. Wins over PLATE_POOL_INVENTORY
  --json                          Structured output for agents
  --no-uneven                     Turn uneven loading off for every handle
  --help                          This text
  --from <weight>, --to <weight>  The range for list. Default: the implement's full range
  --from <id> <positions>         For load: what is on the implement now, given with the
                                  position options below. Each loading then shows its
                                  changes. One --from per implement; it covers a pair

Positions for reverse and load --from, plates innermost first:
  --side <plates>                 Each side of a bar
  --end-a <plates>, --end-b <plates>
                                  The two ends of a handle
  --stack <plates>                A stack
  --front <plates>, --back <plates>
                                  The front and back of a vest

  A plate list is comma-separated weights in the implement's unit, with 2x22.5 for two
  plates of 22.5, and <weight>:<plate id> where two plates the implement takes share a weight.
`;

const NO_INVENTORY = "No inventory given. Pass --inventory <path> or set PLATE_POOL_INVENTORY.";

const commands = ["load", "list", "reverse", "inventory", "achievable"] as const;
type Command = (typeof commands)[number];

const positionFlags = ["side", "end-a", "end-b", "stack", "front", "back"] as const;
type PositionFlag = (typeof positionFlags)[number];

const flagsByKind: Record<ImplementKind, { flags: PositionFlag[]; positions: Partial<Record<PositionFlag, string[]>> }> = {
  bar: { flags: ["side"], positions: { side: ["left", "right"] } },
  handle: { flags: ["end-a", "end-b"], positions: { "end-a": ["a"], "end-b": ["b"] } },
  stack: { flags: ["stack"], positions: { stack: ["stack"] } },
  vest: { flags: ["front", "back"], positions: { front: ["front"], back: ["back"] } },
};

const kinds = Object.keys(flagsByKind) as ImplementKind[];

interface PlateEntry {
  weight: number;
  id?: string;
}

type Positions = Partial<Record<PositionFlag, PlateEntry[]>>;

interface Current {
  key: string;
  positions: Positions;
}

interface Options {
  json: boolean;
  uneven: boolean;
  inventoryPath?: string;
  positions: Positions;
  positionFlags: string[];
  currents: Current[];
  from?: string;
  to?: string;
  positional: string[];
}

interface Named {
  implement: Implement;
  pair?: boolean;
}

class InputError extends Error {}

export function run(args: string[], environment: Environment): number {
  const [command, ...rest] = args;
  try {
    if (command === undefined) throw new InputError(usage);
    if (command === "--help" || command === "help") {
      environment.stdout(usage);
      return 0;
    }
    if (!isCommand(command)) throw new InputError(`Unknown command "${command}".\n${usage}`);

    const options = parseOptions(rest, command);
    const [positionFlag] = options.positionFlags;
    if (command !== "reverse" && positionFlag) throw new InputError(`${positionFlag} is for the reverse command.`);
    if (command !== "list" && options.to !== undefined) throw new InputError("--to works with list only.");
    if (command !== "list" && command !== "load" && options.from !== undefined) {
      throw new InputError("--from works with list and load only.");
    }

    const path = options.inventoryPath ?? (environment.variables.PLATE_POOL_INVENTORY || undefined);
    if (path === undefined) throw new InputError(NO_INVENTORY);
    const bytes = readBytes(path);
    const text = bytes.toString("utf8");
    const inventory = readInventory(text);

    if (command === "inventory" || command === "achievable") {
      if (options.positional.length > 0) throw new InputError(`${command} takes no arguments.`);
      if (command === "achievable") {
        environment.stdout(
          json({
            format: inventory.format,
            plate_pool: packageJson.version,
            inventory_sha256: createHash("sha256").update(bytes).digest("hex"),
            name: inventory.name,
            tables: achievable(inventory),
          }),
        );
      } else {
        environment.stdout(options.json ? (text.endsWith("\n") ? text : `${text}\n`) : inventoryText(inventory));
      }
      return 0;
    }

    const { hardware, rest: positional } = hardwareChoices(options.positional, inventory);

    if (command === "reverse" || command === "list") {
      const example = `such as ${command} ${firstId(inventory)}`;
      if (positional.length === 0) throw new InputError(`Name an implement, ${example}.`);
      if (positional.length > 1) throw new InputError(`${command} takes one implement, ${example}.`);
      const key = positional[0]!;
      if (key.includes("=")) throw new InputError(`${command} takes an implement id, not a target, ${example}.`);
      const named = parseKey(key, inventory);
      const id = named.implement.id;
      const shared = {
        implement: id,
        ...(named.pair === undefined ? {} : { pair: named.pair }),
        ...(hardware[id] === undefined ? {} : { hardware: hardware[id] }),
        ...(options.uneven ? {} : { uneven: false }),
      };
      if (command === "reverse") {
        const result = reverse(inventory, { ...shared, positions: positionsFor(named.implement, options.positions) });
        environment.stdout(options.json ? json(result) : reverseText(result, inventory));
      } else {
        const response = list(inventory, {
          ...shared,
          ...(options.from === undefined ? {} : { from: options.from }),
          ...(options.to === undefined ? {} : { to: options.to }),
        });
        environment.stdout(options.json ? json(response) : listText(response, inventory, options));
      }
      return 0;
    }

    if (positional.length === 0) throw new InputError(`Name a target, such as ${firstId(inventory)}=100.`);
    const targets = withCurrents(
      positional.map((arg) => parseTarget(arg, inventory)),
      options.currents,
      inventory,
    );
    const response = load(inventory, {
      targets,
      ...(Object.keys(hardware).length === 0 ? {} : { hardware }),
      ...(options.uneven ? {} : { uneven: false }),
    });
    environment.stdout(options.json ? json(response) : loadText(response, inventory));
    return 0;
  } catch (error) {
    if (error instanceof InputError || error instanceof RequestError || error instanceof InventoryError) {
      environment.stderr(error.message.endsWith("\n") ? error.message : `${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

function isCommand(command: string): command is Command {
  return (commands as readonly string[]).includes(command);
}

function parseOptions(args: string[], command: Command): Options {
  const options: Options = { json: false, uneven: true, positions: {}, positionFlags: [], currents: [], positional: [] };
  const positionsFor = (flag: string): Positions => {
    if (command !== "load") {
      options.positionFlags.push(flag);
      return options.positions;
    }
    const current = options.currents.at(-1);
    if (!current) throw new InputError(`In load, ${flag} follows --from <id>, such as --from <id> ${flag} 2x5.`);
    return current.positions;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    const equals = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const flag = equals < 0 ? arg : arg.slice(0, equals);
    const value = () => (equals < 0 ? args[++i] : arg.slice(equals + 1));
    switch (flag) {
      case "--json":
        options.json = true;
        break;
      case "--no-uneven":
        options.uneven = false;
        break;
      case "--from":
      case "--to": {
        const given = value();
        if (command === "load" && flag === "--from") {
          if (!given || given.startsWith("--")) throw new InputError("--from takes an implement id, such as --from <id> --side 2x5.");
          options.currents.push({ key: given, positions: {} });
          break;
        }
        if (!given) throw new InputError(`${flag} takes a weight, such as 100 or 45kg.`);
        options[flag === "--from" ? "from" : "to"] = given;
        break;
      }
      case "--inventory": {
        const path = value();
        if (!path) throw new InputError("--inventory takes the path of an inventory file.");
        options.inventoryPath = path;
        break;
      }
      default: {
        const position = positionFlags.find((name) => flag === `--${name}`);
        if (position) {
          const plates = value();
          if (plates === undefined) throw new InputError(`${flag} takes a list of plates, such as 2x22.5,5,2.5.`);
          positionsFor(flag)[position] = parsePlates(plates);
          break;
        }
        if (flag.startsWith("--")) throw new InputError(`Unknown option "${flag}".`);
        options.positional.push(arg);
      }
    }
  }
  return options;
}

function firstId(inventory: Inventory): string {
  return inventory.implements[0]?.id ?? "<id>";
}

function unknownImplement(key: string, inventory: Inventory): InputError {
  return new InputError(`Unknown implement "${key}". The kit's implements: ${inventory.implements.map((each) => each.id).join(", ")}.`);
}

function implementOf(id: string, inventory: Inventory): Implement {
  const implement = inventory.implements.find((candidate) => candidate.id === id);
  if (!implement) throw unknownImplement(id, inventory);
  return implement;
}

function parseKey(key: string, inventory: Inventory): Named {
  const dot = key.indexOf(".");
  if (dot < 0) return { implement: implementOf(key, inventory) };
  const suffix = key.slice(dot + 1);
  const implement = inventory.implements.find((candidate) => candidate.id === key.slice(0, dot));
  if (!implement || (suffix !== "single" && suffix !== "pair")) throw unknownImplement(key, inventory);
  if (implement.kind !== "handle") {
    throw new InputError(`"${key}": the ${implement.name.toLowerCase()} is not a handle, so it has no pair or single.`);
  }
  return { implement, pair: suffix === "pair" };
}

function hardwareChoices(args: string[], inventory: Inventory): { hardware: Record<string, string>; rest: string[] } {
  const hardware: Record<string, string> = {};
  const rest: string[] = [];
  for (const arg of args) {
    const match = /^([^=.]*)\.hardware=(.*)$/.exec(arg);
    if (!match) {
      rest.push(arg);
      continue;
    }
    const [, id, choice] = match as unknown as [string, string, string];
    const implement = implementOf(id, inventory);
    const name = implement.name.toLowerCase();
    const options = implement.kind === "vest" ? undefined : implement.hardware?.options;
    if (!options) throw new InputError(`The ${name} has no hardware to choose.`);
    if (!options.includes(choice)) {
      throw new InputError(`The ${name} takes no "${choice}" hardware. It takes ${joined(options, "or")}.`);
    }
    if (hardware[id] !== undefined) throw new InputError(`One ${id}.hardware per implement.`);
    hardware[id] = choice;
  }
  return { hardware, rest };
}

function parseTarget(arg: string, inventory: Inventory): TargetRequest {
  const separator = arg.indexOf("=");
  if (separator < 0) throw new InputError(`Write "${arg}" as <id>=<target>, such as ${firstId(inventory)}=100.`);
  const { implement, pair } = parseKey(arg.slice(0, separator), inventory);
  return { implement: implement.id, target: arg.slice(separator + 1), ...(pair === undefined ? {} : { pair }) };
}

function withCurrents(targets: TargetRequest[], currents: Current[], inventory: Inventory): TargetRequest[] {
  const given = new Set<string>();
  for (const current of currents) {
    const implement = implementOf(current.key, inventory);
    if (given.has(implement.id)) throw new InputError(`One --from per implement: --from ${implement.id} is given twice.`);
    given.add(implement.id);
    const target = targets.find((each) => each.implement === implement.id);
    if (!target) throw new InputError(`--from ${implement.id} needs a ${implement.id} target, such as ${implement.id}=100.`);
    target.current = { positions: positionsFor(implement, current.positions) };
  }
  return targets;
}

function parsePlates(text: string): PlateEntry[] {
  if (text.trim() === "") return [];
  return text.split(",").flatMap((item) => {
    const match = /^\s*(?:(\d+)\s*x\s*)?(\d+(?:\.\d+)?|\.\d+)(?::([a-z0-9.-]+))?\s*$/.exec(item);
    const count = match?.[1] === undefined ? 1 : Number(match[1]);
    const weight = Number(match?.[2]);
    if (!match || !(weight > 0) || count < 1) {
      throw new InputError(
        `"${item}" is not a plate. List plates innermost first, separated by commas, such as 2x22.5,5,2.5, with <weight>:<plate id> to name one.`,
      );
    }
    const id = match[3];
    return Array.from({ length: count }, () => (id === undefined ? { weight } : { weight, id }));
  });
}

function positionsFor(implement: Implement, given: Positions): ReverseRequest["positions"] {
  const { flags, positions } = flagsByKind[implement.kind];
  for (const flag of positionFlags) {
    if (given[flag] === undefined || flags.includes(flag)) continue;
    const kind = kinds.find((each) => flagsByKind[each].flags.includes(flag))!;
    const use = joined(flags.map((each) => `--${each}`), "and");
    throw new InputError(`--${flag} is for ${article(kind)} ${kind}. The ${implement.name.toLowerCase()} is ${article(implement.kind)} ${implement.kind}: use ${use}.`);
  }
  return flags.flatMap((flag) =>
    (positions[flag] ?? []).map((name) => {
      const plates = given[flag] ?? [];
      const named = plates.some((plate) => plate.id !== undefined);
      return { name, plates: plates.map(({ weight }) => weight), ...(named ? { ids: plates.map(({ id }) => id) } : {}) };
    }),
  );
}

function article(word: string): string {
  return /^[aeiou]/.test(word) ? "an" : "a";
}

function joined(items: string[], last: string): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

function readBytes(path: string): Buffer {
  try {
    return readFileSync(path);
  } catch (error) {
    throw new InputError(`Cannot read ${path}: ${(error as Error).message}`);
  }
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
