export interface Output {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

const usage = "Usage: plate-pool <command>\n";

export function run(args: string[], output: Output): number {
  const [command] = args;
  if (command === undefined) {
    output.stderr(usage);
    return 1;
  }
  output.stderr(`Unknown command "${command}".\n${usage}`);
  return 1;
}
