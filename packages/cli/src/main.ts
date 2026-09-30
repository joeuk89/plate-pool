import { readFileSync } from "node:fs";
import { InventoryError, load, readInventory, RequestError, type CollarChoice, type Inventory } from "@plate-pool/core";
import { inventoryText, loadText } from "./format.js";

export interface Environment {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  defaultInventoryPath: string;
}

const usage = `Usage: plate-pool <command> [options]

Commands:
  load <implement>=<target> ...   Loadings for a target, such as barbell=175 or barbell=80kg.
                                  dumbbells=<target> is a pair, dumbbell=<target> is one
  inventory                       What the owner has

Options:
  --json                          Structured output for agents
  --collars <clamp|spinlock|none> Barbell collar choice. Default: clamp
  --no-uneven                     Turn uneven dumbbell loading off
  --inventory <path>              Use a different inventory file
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

interface Options {
  json: boolean;
  collars?: CollarChoice;
  uneven: boolean;
  inventoryPath?: string;
  positional: string[];
}

class InputError extends Error {}

export function run(args: string[], environment: Environment): number {
  const [command, ...rest] = args;
  try {
    if (command === undefined) throw new InputError(usage);
    if (command !== "load" && command !== "inventory") throw new InputError(`Unknown command "${command}".\n${usage}`);

    const options = parseOptions(rest);
    const inventory = readInventoryFile(options.inventoryPath ?? environment.defaultInventoryPath);

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
  const options: Options = { json: false, uneven: true, positional: [] };
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
