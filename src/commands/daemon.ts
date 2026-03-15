import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as os from 'os';
import chalk from 'chalk';
import { getArchitectureStats } from '../watcher';

const PID_DIR = path.join(os.homedir(), '.vibe-arch');
const LOG_DIR = path.join(os.homedir(), '.vibe-arch', 'logs');

// #3 권한 에러 핸들링
function ensureDirs(): void {
  try {
    if (!fs.existsSync(PID_DIR)) fs.mkdirSync(PID_DIR, { recursive: true });
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e: any) {
    if (e.code === 'EACCES') {
      console.error('[ERROR] Permission denied: cannot create ~/.vibe-arch/');
      console.error('[FIX]   Run: sudo chown -R $(whoami) ~/.vibe-arch');
      process.exit(1);
    }
    throw e;
  }
}

function projectKey(targetDir: string): string {
  return targetDir.replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
}

function pidFilePath(targetDir: string): string {
  return path.join(PID_DIR, `${projectKey(targetDir)}.pid`);
}

function logFilePath(targetDir: string): string {
  return path.join(LOG_DIR, `${projectKey(targetDir)}.log`);
}

function isRunning(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readPid(pidFile: string): number | null {
  try {
    const raw = fs.readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(raw);
    return isNaN(pid) ? null : pid;
  } catch { return null; }
}

// #2 좀비 프로세스 방지: PID 파일 유효성 검증 후 정리
function cleanStalePid(pidFile: string): void {
  const pid = readPid(pidFile);
  if (pid && !isRunning(pid)) {
    try { fs.unlinkSync(pidFile); } catch {}
  }
}

export function startDaemon(targetDir: string): void {
  ensureDirs();
  const rootDir = path.resolve(targetDir);
  const pidFile = pidFilePath(rootDir);
  const logFile = logFilePath(rootDir);

  // stale PID 정리
  cleanStalePid(pidFile);

  const existingPid = readPid(pidFile);
  if (existingPid && isRunning(existingPid)) {
    console.log(`[vibe-arch] Already running. PID: ${existingPid}`);
    console.log(`[vibe-arch] Log: ${logFile}`);
    return;
  }

  if (!fs.existsSync(path.join(rootDir, '.arch-spec.json'))) {
    console.error('[ERROR] .arch-spec.json not found.');
    console.error('[FIX]   Run: vibe-arch init');
    process.exit(1);
  }

  const scriptPath = process.argv[1];

  let logFd: number;
  try {
    logFd = fs.openSync(logFile, 'a');
  } catch (e: any) {
    if (e.code === 'EACCES') {
      console.error(`[ERROR] Permission denied: cannot write log to ${logFile}`);
      process.exit(1);
    }
    throw e;
  }

  const child = child_process.spawn(
    process.execPath,
    [scriptPath, 'run-watcher', rootDir],
    {
      detached: true,
      stdio: ['ignore', logFd, logFd],
    }
  );

  child.unref();

  // #2 PID 저장 및 종료 시 자동 정리 등록
  fs.writeFileSync(pidFile, String(child.pid), 'utf-8');

  // 자식 프로세스 예기치 않은 종료 시 PID 파일 정리
  child.on('exit', () => {
    try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch {}
  });

  console.log(`[vibe-arch] Started. PID: ${child.pid}`);
  console.log(`[vibe-arch] Project: ${rootDir}`);
  console.log(`[vibe-arch] Log: ${logFile}`);
  console.log(`[vibe-arch] Stop: vibe-arch stop`);
}

export function stopDaemon(targetDir: string): void {
  const rootDir = path.resolve(targetDir);
  const pidFile = pidFilePath(rootDir);

  const pid = readPid(pidFile);
  if (!pid) {
    console.log('[vibe-arch] Not running.');
    return;
  }

  if (!isRunning(pid)) {
    console.log(`[vibe-arch] Process ${pid} already dead. Cleaning up.`);
    try { fs.unlinkSync(pidFile); } catch {}
    return;
  }

  try {
    // #2 SIGTERM 후 2초 내 미종료 시 SIGKILL로 강제 종료
    process.kill(pid, 'SIGTERM');
    setTimeout(() => {
      if (isRunning(pid)) {
        console.log(`[vibe-arch] Force killing PID ${pid}...`);
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }
      try { if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile); } catch {}
    }, 2000);
    console.log(`[vibe-arch] Stopped. PID: ${pid}`);
  } catch (e: any) {
    if (e.code === 'EPERM') {
      console.error(`[ERROR] Permission denied to kill PID ${pid}`);
      console.error(`[FIX]   Run: kill ${pid}`);
    } else {
      console.error(`[ERROR] Failed to stop:`, e.message);
    }
  }
}

export function statusDaemon(targetDir: string): void {
  const rootDir = path.resolve(targetDir);
  const pidFile = pidFilePath(rootDir);
  const logFile = logFilePath(rootDir);

  cleanStalePid(pidFile);
  const pid = readPid(pidFile);

  console.log(chalk.bold(`\n--- vibe-arch System Status ---`));
  
  if (pid && isRunning(pid)) {
    console.log(`Status:  ${chalk.green('● RUNNING')} (PID: ${pid})`);
  } else {
    console.log(`Status:  ${chalk.red('○ STOPPED')}`);
  }

  try {
    const stats = getArchitectureStats(rootDir);
    const barLength = 20;
    const filledLength = Math.round((stats.percentage / 100) * barLength);
    const bar = chalk.green('█'.repeat(filledLength)) + chalk.gray('░'.repeat(barLength - filledLength));

    console.log(`Health:  [${bar}] ${stats.percentage}%`);
    console.log(`Files:   ${stats.covered} / ${stats.total} covered`);
  } catch {
    console.log(`Health:  ${chalk.gray('Unknown (No .arch-spec.json)')}`);
  }

  console.log(`Project: ${rootDir}`);
  if (pid && isRunning(pid)) console.log(`Log:     ${logFile}`);
  console.log(`-------------------------------\n`);
}

export function logsDaemon(targetDir: string, lines: number = 50): void {
  const rootDir = path.resolve(targetDir);
  const logFile = logFilePath(rootDir);

  if (!fs.existsSync(logFile)) {
    console.log('[vibe-arch] No log file found. Has vibe-arch start been run?');
    return;
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const allLines = content.split('\n');
  console.log(allLines.slice(-lines).join('\n'));
}
