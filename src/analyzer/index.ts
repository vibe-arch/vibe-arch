import * as fs from "fs";
import * as path from "path";
import { ArchSpec, ArchitecturePattern, FileRole, LayerRule } from "../types";

export interface ProjectContext {
  tree: string[];
  packageJson?: any;
  mainFiles: Record<string, string>;
  language: string;
}

/**
 * AI가 아키텍처를 판단할 수 있도록 모든 정보를 수집합니다.
 */
export function getProjectContext(rootDir: string): ProjectContext {
  const tree = collectFiles(rootDir, 10);
  const language = detectLanguage(rootDir);
  const mainFiles: Record<string, string> = {};

  const keyFiles = [
    "package.json",
    "tsconfig.json",
    "README.md",
    "src/index.ts",
    "src/main.ts",
    "app.ts",
  ];
  for (const f of keyFiles) {
    const fullPath = path.join(rootDir, f);
    if (fs.existsSync(fullPath)) {
      mainFiles[f] = fs.readFileSync(fullPath, "utf-8").slice(0, 3000);
    }
  }

  let packageJson;
  if (mainFiles["package.json"]) {
    try {
      packageJson = JSON.parse(mainFiles["package.json"]);
    } catch {}
  }

  return { tree, packageJson, mainFiles, language };
}

/**
 * AI에게 전달할 분석 프롬프트를 생성합니다.
 */
export function generateAiAnalysisPrompt(ctx: ProjectContext): string {
  return `
[AI ARCHITECTURE ANALYSIS REQUEST]
Please analyze this project structure and recommend the best Architecture Pattern.

1. Language: ${ctx.language}
2. Dependencies: ${JSON.stringify(ctx.packageJson?.dependencies || {}, null, 2)}
3. Directory Tree:
${ctx.tree.slice(0, 100).join("\n")}
... (and ${Math.max(0, ctx.tree.length - 100)} more files)

4. Key File Contents (Partial):
${Object.entries(ctx.mainFiles)
  .map(([f, c]) => `--- ${f} ---\n${c}\n`)
  .join("\n")}

REQUIRED OUTPUT:
Please provide a valid .arch-spec.json content.
Valid patterns: hexagonal, clean, mvc, layered, modular.
  `.trim();
}

function collectFiles(
  dir: string,
  maxDepth: number,
  currentDepth: number = 0,
  result: string[] = [],
): string[] {
  if (currentDepth > maxDepth) return result;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        [
          "node_modules",
          ".git",
          "dist",
          "build",
          "target",
          ".vibe-arch-meta",
        ].includes(entry.name)
      )
        continue;
      const relPath = path.join(dir, entry.name);
      result.push(relPath);
      if (entry.isDirectory()) {
        collectFiles(relPath, maxDepth, currentDepth + 1, result);
      }
    }
  } catch {}
  return result;
}

export function detectLanguage(rootDir: string): string {
  if (fs.existsSync(path.join(rootDir, "pom.xml"))) return "java";
  if (fs.existsSync(path.join(rootDir, "build.gradle")) || fs.existsSync(path.join(rootDir, "build.gradle.kts"))) {
    // Gradle 프로젝트에서 .kt 파일이 있으면 kotlin으로 우선 순위
    const tree = collectFiles(rootDir, 10);
    if (tree.some(f => f.endsWith(".kt") || f.endsWith(".kts"))) return "kotlin";
    return "java";
  }
  if (fs.existsSync(path.join(rootDir, "go.mod"))) return "go";
  if (fs.existsSync(path.join(rootDir, "tsconfig.json"))) return "typescript";
  if (fs.existsSync(path.join(rootDir, "package.json"))) return "javascript";
  return "unknown";
}

/**
 * 도구의 자체 추론을 최소화하고 'unknown'을 기본으로 반환하여 AI의 판단을 유도합니다.
 */
export function detectArchitecture(rootDir: string): ArchitecturePattern {
  return "unknown";
}

export function detectBoundedContexts(
  rootDir: string,
  architecture: ArchitecturePattern,
): string[] {
  const srcDir = findSrcDir(rootDir);
  if (!srcDir || srcDir === rootDir) return [];
  try {
    return fs
      .readdirSync(srcDir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          !["common", "shared", "utils", "types", "main", "test"].includes(
            e.name.toLowerCase(),
          ),
      )
      .map((e) => e.name);
  } catch {
    return [];
  }
}

export function findSrcDir(rootDir: string): string | null {
  for (const c of ["src/main/kotlin", "src/main/java", "src", "lib", "app", "."]) {
    const full = path.join(rootDir, c);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return full;
  }
  return null;
}

export function buildSpec(rootDir: string): ArchSpec {
  return {
    architecture: "unknown",
    language: detectLanguage(rootDir),
    root: rootDir,
    bounded_contexts: [],
    layers: {},
    comment_injection: "inline",
  };
}

export function inferFileRole(filePath: string, spec: ArchSpec): FileRole {
  const normalizedPath = filePath.split(path.sep).join("/");
  const parts = normalizedPath.toLowerCase().split("/");
  const fileName = path
    .basename(filePath, path.extname(filePath))
    .toLowerCase();

  let matchedLayer = "unknown";
  let bestScore = 0;

  for (const [layerName, rule] of Object.entries(spec.layers)) {
    let score = 0;
    const allPatterns = [...rule.patterns, ...(rule.custom_patterns || [])].map(
      (p) => p.toLowerCase(),
    );
    if (parts.some((p) => p === layerName.toLowerCase())) score += 5;
    if (parts.some((p) => allPatterns.some((pat) => p.includes(pat))))
      score += 3;
    if (allPatterns.some((pat) => fileName.includes(pat))) score += 2;
    if (score > bestScore) {
      bestScore = score;
      matchedLayer = layerName;
    }
  }

  let boundedContext = "unknown";
  for (const ctx of spec.bounded_contexts) {
    if (
      parts.some(
        (p) => p === ctx.toLowerCase() || p.includes(ctx.toLowerCase()),
      )
    ) {
      boundedContext = ctx;
      break;
    }
  }

  const rule = spec.layers[matchedLayer];
  return {
    filePath,
    layer: matchedLayer,
    role: `${matchedLayer}.${fileName}`,
    boundedContext,
    forbidden: rule?.forbidden_deps ?? [],
    depends: rule?.allowed_deps ?? [],
  };
}

/**
 * OpenAI API를 호출하여 아키텍처 패턴을 추천합니다.
 */
export async function getAiArchitectureRecommendation(
  ctx: ProjectContext,
): Promise<ArchitecturePattern | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const message = `
[ARCHITECTURE ANALYSIS REQUEST]
You are an expert software architect. Analyze this project and recommend ONE of these architecture patterns:
- hexagonal
- clean
- mvc
- layered
- modular

Project Info:
1. Language: ${ctx.language}
2. Dependencies: ${JSON.stringify(ctx.packageJson?.dependencies || {})}
3. Directory Structure (sample):
${ctx.tree.slice(0, 50).join("\n")}

Respond with ONLY the architecture pattern name, nothing else. Example: "modular"
    `.trim();

    const response = await client.chat.completions.create({
      model: "gpt-4-turbo",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const recommendation = response.choices[0]?.message?.content
      ?.toLowerCase()
      .trim();
    const valid = ["hexagonal", "clean", "mvc", "layered", "modular"];

    if (recommendation && valid.includes(recommendation)) {
      return recommendation as ArchitecturePattern;
    }
  } catch (e: any) {
    // API 실패 시 조용히 반환
  }

  return null;
}
