import { readFileSync } from "node:fs";
import { InventoryError, load, readInventory, RequestError, reverse, type CollarChoice, type Inventory, type ReverseRequest } from "@plate-pool/core";
import { inventoryText, loadText, reverseText } from "./format.js";

export interface Environment {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  defaultInventoryPath: string;
}

const usage = `Usage: plate-pool <command> [options]

Commands:
  load <implement>=<target> ...   Loadings for a target, such as barbell=175 or barbell=80kg.
                                  dumbbells=<target> is a pair, dumbbell=<target> is one
  reverse <implement> <plates>    Total for a given loading, such as reverse barbell --side 22.5,5
  inventory                       What the owner has

Options:
  --json                          Structured output for agents
  --collars <clamp|spinlock|none> Barbell collar choice. Default: clamp
  --no-uneven                     Turn uneven dumbbell loading off
  --inventory <path>              Use a different inventory file

Plates for reverse, innermost first:
  --side <weights>                Each side of the barbell, such as 22.5,22.5,5
  --end-a <weights>               End A of a dumbbell
  --end-b <weights>               End B of a dumbbell
  --stack <weights>               The kettlebell's or leg attachment's stack
  --blocks <count>                Blocks in the vest
`;

const implementNames: Record<string, string> = {
  barbell: "barbell",
  dumbbells: "dumbbell",
  dumbbell: "dumbbell",
  kettlebell: "kettlebell",
  leg: "leg",
  vest: "vest",
};

const collarChoices: CollarChoice[] = ["clamp", "spinlock", "none"];

type PlateOption = "side" | "end-a" | "end-b" | "stack";

const plateOptions: Record<PlateOption, { implements: string[]; owner: string }> = {
  side: { implements: ["barbell"], owner: "the barbell" },
  "end-a": { implements: ["dumbbell"], owner: "a dumbbell" },
  "end-b": { implements: ["dumbbell"], owner: "a dumbbell" },
  stack: { implements: ["kettlebell", "leg"], owner: "the kettlebell and leg attachment" },
};

interface Options {
  json: boolean;
  collars?: CollarChoice;
  uneven: boolean;
  inventoryPath?: string;
  plates: Partial<Record<PlateOption, number[]>>;
  blocks?: number;
  reverseOptions: string[];
  positional: string[];
}

class InputError extends Error {}

export function run(args: string[], environment: Environment): number {
  const [command, ...rest] = args;
  try {
    if (command === undefined) throw new InputError(usage);
    if (command !== "load" && command !== "reverse" && command !== "inventory") {
      throw new InputError(`Unknown command "${command}".\n${usage}`);
    }

    const options = parseOptions(rest);
    const [reverseOption] = options.reverseOptions;
    if (command !== "reverse" && reverseOption) throw new InputError(`${reverseOption} is for the reverse command.`);
    const inventory = readInventoryFile(options.inventoryPath ?? environment.defaultInventoryPath);

    if (command === "reverse") {
      const result = reverse(inventory, reverseRequest(options, inventory));
      environment.stdout(options.json ? json(result) : reverseText(result, inventory));
      return 0;
    }

    if (command === "inventory") {
      if (options.positional.length > 0) throw new InputError(`inventory takes no arguments.`);
      environment.stdout(options.json ? json(inventory) : inventoryText(inventory));
      return 0;
    }

    if (options.positional.length === 0) throw new InputError("Name a target, such as barbell=175.");
    const targets = options.positional.map(parseTarget);
    const response = load(inventory, {
      targets,
      ...(options.collars ? { collars: options.collars } : {}),
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

function parseOptions(args: string[]): Options {
  const options: Options = { json: false, uneven: true, plates: {}, reverseOptions: [], positional: [] };
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
      case "--collars": {
        const choice = value();
        if (!collarChoices.includes(choice as CollarChoice)) throw new InputError("--collars takes clamp, spinlock or none.");
        options.collars = choice as CollarChoice;
        break;
      }
      case "--inventory": {
        const path = value();
        if (!path) throw new InputError("--inventory takes the path of an inventory file.");
        options.inventoryPath = path;
        break;
      }
      case "--side":
      case "--end-a":
      case "--end-b":
      case "--stack": {
        const list = value();
        if (list === undefined) throw new InputError(`${flag} takes a list of plate weights, such as 22.5,5,2.5.`);
        options.plates[flag.slice(2) as PlateOption] = parsePlates(list);
        options.reverseOptions.push(flag);
        break;
      }
      case "--blocks": {
        const count = value();
        if (!/^\d+$/.test(count ?? "")) throw new InputError("--blocks takes a whole number of blocks, such as 12.");
        options.blocks = Number(count);
        options.reverseOptions.push(flag);
        break;
      }
      default:
        if (flag.startsWith("--")) throw new InputError(`Unknown option "${flag}".`);
        options.positional.push(arg);
    }
  }
  return options;
}

function parseTarget(arg: string) {
  const separator = arg.indexOf("=");
  if (separator < 0) throw new InputError(`Write "${arg}" as implement=target, such as barbell=175.`);
  const name = arg.slice(0, separator);
  const implement = implementNames[name];
  if (!implement) throw new InputError(`Unknown implement "${name}". Use barbell, dumbbells, dumbbell, kettlebell, leg or vest.`);
  const target = arg.slice(separator + 1);
  if (name === "dumbbell") return { implement, target, pair: false };
  return { implement, target };
}

function parsePlates(list: string): number[] {
  if (list.trim() === "") return [];
  return list.split(",").map((item) => {
    const weight = Number(item.trim());
    if (!/^\s*(\d+(\.\d+)?|\.\d+)\s*$/.test(item) || !(weight > 0)) {
      throw new InputError(`"${item}" is not a plate weight. List plates innermost first, separated by commas, such as 22.5,5,2.5.`);
    }
    return weight;
  });
}

function reverseRequest(options: Options, inventory: Inventory): ReverseRequest {
  if (options.positional.length === 0) throw new InputError("Name an implement, such as reverse barbell --side 22.5,5.");
  if (options.positional.length > 1) throw new InputError("reverse takes one implement, such as reverse barbell --side 22.5,5.");
  const [name] = options.positional as [string];
  const implement = implementNames[name];
  if (!implement) throw new InputError(`Unknown implement "${name}". Use barbell, dumbbells, dumbbell, kettlebell, leg or vest.`);

  for (const [option, { implements: allowed, owner }] of Object.entries(plateOptions)) {
    if (options.plates[option as PlateOption] && !allowed.includes(implement)) throw new InputError(`--${option} is for ${owner}.`);
  }
  if (options.blocks !== undefined && implement !== "vest") throw new InputError("--blocks is for the vest.");

  const plates = (option: PlateOption) => options.plates[option] ?? [];
  const positions: ReverseRequest["positions"] =
    implement === "barbell"
      ? [
          { name: "left", plates: plates("side") },
          { name: "right", plates: plates("side") },
        ]
      : implement === "dumbbell"
        ? [
            { name: "end-a", plates: plates("end-a") },
            { name: "end-b", plates: plates("end-b") },
          ]
        : implement === "vest"
          ? vestPositions(inventory, options.blocks ?? 0)
          : [{ name: "stack", plates: plates("stack") }];

  return {
    implement,
    ...(implement === "dumbbell" ? { pair: name === "dumbbells" } : {}),
    positions,
    ...(options.collars ? { collars: options.collars } : {}),
    ...(options.uneven ? {} : { uneven: false }),
  };
}

function vestPositions(inventory: Inventory, blocks: number): ReverseRequest["positions"] {
  const vest = inventory.implements.find((implement) => implement.id === "vest");
  const block = inventory.plates.find((plate) => vest?.accepts.includes(plate.type));
  if (!block) throw new InputError("The inventory holds no vest blocks.");
  const weight = block.weight.measured ?? block.weight.listed;
  const front = Math.floor(blocks / 2);
  return [
    { name: "front", plates: Array<number>(front).fill(weight) },
    { name: "back", plates: Array<number>(blocks - front).fill(weight) },
  ];
}

function readInventoryFile(path: string): Inventory {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new InputError(`Cannot read ${path}: ${(error as Error).message}`);
  }
  return readInventory(data);
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
