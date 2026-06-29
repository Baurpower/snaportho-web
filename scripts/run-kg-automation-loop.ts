import { spawnSync } from "node:child_process";

type ParsedArgs = {
  packetKey: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  let packetKey: string | null = null;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--packet") {
      packetKey = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return { packetKey };
}

function runStep(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const steps: Array<{ label: string; command: string; args: string[] }> = [
    { label: "coverage", command: "npm", args: ["run", "kg:coverage:report"] },
    { label: "generate", command: "npm", args: ["run", "kg:automation:generate"] },
    { label: "report", command: "npm", args: ["run", "kg:automation:report"] },
    { label: "status", command: "npm", args: ["run", "kg:auto:status"] },
  ];

  if (args.packetKey) {
    steps.push({
      label: "review-packet",
      command: "npm",
      args: ["run", "kg:auto:review-packet", "--", "--packet", args.packetKey],
    });
    steps.push({
      label: "approve-packet-dry-run",
      command: "npm",
      args: ["run", "kg:auto:approve-packet", "--", "--packet", args.packetKey, "--dry-run"],
    });
  }

  steps.push({
    label: "apply-approved-dry-run",
    command: "npm",
    args: ["run", "kg:auto:apply-approved", "--", "--dry-run"],
  });

  for (const step of steps) {
    runStep(step.command, step.args);
  }

  console.log(
    JSON.stringify(
      {
        completedSteps: steps.map((step) => step.label),
        packetKey: args.packetKey,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
