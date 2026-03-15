import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import chalk from "chalk";
import { ArchSpec } from "../types";
import { inferFileRole } from "../analyzer";
import { injectOrUpdateComment, updateAiContexts } from "../generator";

const SOURCE_EXTENSIONS = [
  ".java",
  ".kt",
  ".ts",
  ".tsx",
  ".js",
  ".py",
  ".go",
  ".dart",
  ".swift",
];

const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/target/**",
  "**/.gradle/**",
  "**/CLAUDE.md",
  "**/GEMINI.md",
  "**/AI.md",
  "**/.arch-spec.*",
  "arch/**",
];

function collectAllSourceFiles(
  rootDir: string,
  dir: string = rootDir,
  result: string[] = [],
): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Ignore patterns check
      if (
        IGNORE_PATTERNS.some((pattern) => {
          const normalized = pattern
            .replace(/\*\*\//g, "")
            .replace(/\/\*\*/g, "")
            .replace(/\*/g, "");
          return (
            relativePath.includes(normalized) ||
            relativePath.startsWith(normalized)
          );
        })
      )
        continue;

      if (entry.isDirectory()) {
        collectAllSourceFiles(rootDir, fullPath, result);
      } else if (SOURCE_EXTENSIONS.includes(path.extname(fullPath))) {
        result.push(fullPath);
      }
    }
  } catch {}
  return result;
}

// 디바운스 맵
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms = 300): void {
  const existing = debounceMap.get(key);
  if (existing) clearTimeout(existing);
  debounceMap.set(
    key,
    setTimeout(() => {
      debounceMap.delete(key);
      fn();
    }, ms),
  );
}

function loadSpec(specJsonPath: string): ArchSpec {
  return JSON.parse(fs.readFileSync(specJsonPath, "utf-8"));
}

/**
 * 실시간 감시를 시작합니다 (백그라운드 데몬 등에서 사용).
 */
export function startWatcher(targetDir: string): void {
  const rootDir = path.resolve(targetDir);
  const specJsonPath = path.join(rootDir, ".arch-spec.json");

  if (!fs.existsSync(specJsonPath)) return;

  let spec: ArchSpec = loadSpec(specJsonPath);
  console.log(
    chalk.blue(
      `[vibe-arch] Monitoring: ${spec.architecture} / ${spec.language}`,
    ),
  );

  const watcher = chokidar.watch(rootDir, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("all", (event, filePath) => {
    const ext = path.extname(filePath);
    if (!SOURCE_EXTENSIONS.includes(ext)) return;

    debounce(filePath, () => {
      try {
        if (!fs.existsSync(filePath)) return;
        const role = inferFileRole(filePath, spec);
        injectOrUpdateComment(filePath, role, rootDir);
        updateAiContexts(rootDir, spec, path.relative(rootDir, filePath));
      } catch {}
    });
  });
}

/**
 * 모든 소스 파일을 돌며 아키텍처 메타데이터를 일괄 적용합니다 (vibe-arch update).
 */
export function fullUpdate(targetDir: string): void {
  const rootDir = path.resolve(targetDir);
  const specJsonPath = path.join(rootDir, ".arch-spec.json");

  if (!fs.existsSync(specJsonPath)) {
    console.error(
      chalk.red("[ERROR] .arch-spec.json not found. Run: vibe-arch init"),
    );
    process.exit(1);
  }

  const spec = loadSpec(specJsonPath);
  console.log(
    chalk.blue(
      "[vibe-arch] Bulk updating architecture metadata for all source files...",
    ),
  );

  const files = collectAllSourceFiles(rootDir);
  let count = 0;
  for (const file of files) {
    const role = inferFileRole(file, spec);
    injectOrUpdateComment(file, role, rootDir);
    count++;
  }

  updateAiContexts(rootDir, spec);
  console.log(chalk.green(`[vibe-arch] Successfully synced ${count} files.\n`));
}

/**
 * 아키텍처 커버리지 통계를 계산합니다.
 */
export function getArchitectureStats(targetDir: string): {
  total: number;
  covered: number;
  percentage: number;
} {
  const rootDir = path.resolve(targetDir);
  const specJsonPath = path.join(rootDir, ".arch-spec.json");
  if (!fs.existsSync(specJsonPath))
    return { total: 0, covered: 0, percentage: 0 };

  const spec = loadSpec(specJsonPath);
  const files = collectAllSourceFiles(rootDir);
  let covered = 0;

  for (const file of files) {
    if (spec.comment_injection === "sidecar") {
      const sp = path.join(
        rootDir,
        "arch",
        path.relative(rootDir, file) + ".md",
      );
      if (fs.existsSync(sp)) covered++;
    } else {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("@arch") && content.includes("@arch-end")) covered++;
    }
  }

  return {
    total: files.length,
    covered,
    percentage:
      files.length > 0 ? Math.round((covered / files.length) * 100) : 0,
  };
}
