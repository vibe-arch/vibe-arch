#!/usr/bin/env node

import chalk from "chalk";
import { initCommand } from "./commands/init";
import { fullUpdate, startWatcher } from "./watcher";
import {
  startDaemon,
  stopDaemon,
  statusDaemon,
  logsDaemon,
} from "./commands/daemon";

// #1 크로스 플랫폼: Windows에서만 chcp 실행 (UTF-8 호환성)
if (process.platform === "win32") {
  try {
    require("child_process").execSync("chcp 65001", { stdio: "ignore" });
  } catch {}
}

const args = process.argv.slice(2);
const command = args[0];

function parseArgs(rawArgs: string[]): {
  targetDir: string;
  flags: Record<string, string | boolean>;
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 1; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rawArgs[i + 1];
      if (next && !next.startsWith("--") && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }

  return { targetDir: positional[0] || process.cwd(), flags };
}

async function main() {
  if (!command) {
    showHelp();
    return;
  }

  const { targetDir, flags } = parseArgs(args);

  try {
    switch (command) {
      case "init":
        await initCommand(targetDir, {
          arch: flags["arch"] as string | undefined,
          lang: flags["lang"] as string | undefined,
          yes: !!(flags["y"] || flags["yes"]),
          injection: flags["injection"] as string | undefined,
        });
        break;
      case "update":
        fullUpdate(targetDir);
        break;
      case "start":
        startDaemon(targetDir);
        break;
      case "run-watcher": // 데몬 전용 숨겨진 명령어
        startWatcher(targetDir);
        break;
      case "stop":
        stopDaemon(targetDir);
        break;
      case "status":
        statusDaemon(targetDir);
        break;
      case "logs":
        logsDaemon(
          targetDir,
          flags["lines"] ? parseInt(flags["lines"] as string) : 50,
        );
        break;
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;
      default:
        console.log(chalk.red(`\n[ERROR] Unknown command: ${command}`));
        showHelp();
        process.exit(1);
    }
  } catch (err: any) {
    console.error(chalk.red(`\n[CRITICAL ERROR] ${err.message}`));
    process.exit(1);
  }
}

function showHelp() {
  console.log(
    [
      "",
      chalk.bold.blue("vibe-arch") +
        " - AI-friendly architecture context manager",
      "",
      chalk.yellow("Usage:"),
      "  vibe-arch <command> [dir] [options]",
      "",
      chalk.yellow("Commands:"),
      `  init    [dir] [--arch <p>] [--lang <l>] [-y]  Initialize project with AI analysis`,
      `  update  [dir]                                  Sync all files with metadata`,
      `  start   [dir]                                  Start background monitoring`,
      `  stop    [dir]                                  Stop background monitoring`,
      `  status  [dir]                                  Show daemon status & coverage`,
      `  logs    [dir] [--lines <n>]                    Show background logs`,
      "",
      chalk.yellow("Command-specific Options:"),
      chalk.bold("  [init]"),
      "    --arch <pattern>      hexagonal | clean | mvc | layered | modular",
      "    --lang <language>     typescript | java | python | go | etc.",
      "    --injection <mode>    inline | sidecar | disabled (default: inline)",
      "    -y, --yes             Non-interactive mode (AI-friendly defaults)",
      "",
      chalk.bold("  [logs]"),
      "    --lines <n>           Number of log lines to show (default: 50)",
      "",
      chalk.yellow("Global Options:"),
      "  -h, --help           Show this help message",
      "",
    ].join("\n"),
  );
}

main();
