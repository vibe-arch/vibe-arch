import * as fs from "fs";
import * as path from "path";
import * as inquirer from "inquirer";
import chalk from "chalk";
import {
  getProjectContext,
  getAiArchitectureRecommendation,
  ProjectContext,
} from "../analyzer";
import { generateArchSpec, updateAiContexts } from "../generator";
import { ArchitecturePattern, ArchSpec } from "../types";

interface InitOptions {
  arch?: string;
  lang?: string;
  yes?: boolean;
  injection?: string;
}

export async function initCommand(
  targetDir: string,
  options: InitOptions = {},
): Promise<void> {
  const rootDir = path.resolve(targetDir);
  const isNonInteractive = !!(options.yes || !process.stdin.isTTY);

  console.log(chalk.blue(`\n[vibe-arch] Analyzing Project: ${rootDir}\n`));

  const context = getProjectContext(rootDir);
  let selectedArchitecture: ArchitecturePattern | undefined;

  if (!isNonInteractive) {
    // 아키텍처 선택 옵션
    const { archChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "archChoice",
        message: "How would you like to define the architecture pattern?",
        choices: [
          {
            name: "🤖 Let AI recommend (requires OPENAI_API_KEY)",
            value: "ai",
          },
          { name: "📋 Choose manually", value: "manual" },
        ],
      },
    ]);

    if (archChoice === "ai") {
      console.log(
        chalk.blue(
          "\n[vibe-arch] Calling AI for architecture recommendation...\n",
        ),
      );
      const recommendation = await getAiArchitectureRecommendation(context);

      if (recommendation) {
        console.log(
          chalk.green(`✅ AI recommends: ${chalk.bold(recommendation)}\n`),
        );

        const { confirmArch } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmArch",
            message: `Use ${recommendation} architecture?`,
            default: true,
          },
        ]);

        if (confirmArch) {
          selectedArchitecture = recommendation;
        }
      } else {
        console.log(
          chalk.yellow(
            "\n[INFO] Could not get AI recommendation. Falling back to manual selection...\n",
          ),
        );
      }
    }

    // AI 실패 시 또는 수동 선택 시
    if (!selectedArchitecture) {
      const { architecture } = await inquirer.prompt([
        {
          type: "list",
          name: "architecture",
          message: "Select the architecture pattern:",
          choices: [
            { name: "🔷 Hexagonal (Ports & Adapters)", value: "hexagonal" },
            { name: "🧹 Clean Architecture", value: "clean" },
            { name: "🎬 MVC (Model-View-Controller)", value: "mvc" },
            { name: "📚 Layered (3-tier)", value: "layered" },
            { name: "🧩 Modular (Feature-based)", value: "modular" },
          ],
          default: "layered",
        },
      ]);
      selectedArchitecture = architecture as ArchitecturePattern;
    }
  } else {
    // 비대화형 모드: --arch 플래그가 있으면 사용, 없으면 AI 추천 시도
    if (options.arch) {
      selectedArchitecture = options.arch as ArchitecturePattern;
    } else {
      console.log(
        chalk.blue("[vibe-arch] Analyzing project for optimal architecture..."),
      );
      const recommendation = await getAiArchitectureRecommendation(context);
      if (recommendation) {
        selectedArchitecture = recommendation;
        console.log(chalk.green(`[vibe-arch] Selected: ${recommendation}\n`));
      } else {
        // AI 실패 시 지능형 기본값 선택
        selectedArchitecture = getSmartDefaultArchitecture(context);
        console.log(
          chalk.green(`[vibe-arch] Selected: ${selectedArchitecture}\n`),
        );
      }
    }
  }

  let injectionMode = "inline";
  if (!isNonInteractive) {
    const { mode } = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "Where should architecture metadata be stored?",
        choices: [
          {
            name: "📝 Inline (at the top of each source file)",
            value: "inline",
          },
          {
            name: "📁 Sidecar (mirroring structure in /arch directory)",
            value: "sidecar",
          },
          { name: "🚫 Disabled (no per-file metadata)", value: "disabled" },
        ],
        default: "inline",
      },
    ]);
    injectionMode = mode;
  } else if (options.injection) {
    // 비대화형 모드에서 --injection 옵션이 있으면 사용
    const valid = ["inline", "sidecar", "disabled"];
    if (valid.includes(options.injection)) {
      injectionMode = options.injection;
    } else {
      console.log(
        chalk.yellow(
          `[WARN] Invalid injection mode: ${options.injection}. Using default: inline\n`,
        ),
      );
    }
  }

  const spec: ArchSpec = {
    architecture: selectedArchitecture,
    language: options.lang || context.language || "typescript",
    root: rootDir,
    bounded_contexts: [],
    layers: getDefaultLayers(selectedArchitecture),
    comment_injection: injectionMode as any,
    ai_targets: ["CLAUDE.md", "GEMINI.md", "AI.md"],
  };

  saveSpec(rootDir, spec);
  console.log(
    chalk.green(
      `\n✅ [SUCCESS] Initialized with ${chalk.bold(selectedArchitecture)} architecture!`,
    ),
  );
}

function saveSpec(rootDir: string, spec: ArchSpec) {
  const specJsonPath = path.join(rootDir, ".arch-spec.json");
  const specYamlPath = path.join(rootDir, ".arch-spec.yaml");
  fs.writeFileSync(specJsonPath, JSON.stringify(spec, null, 2), "utf-8");
  fs.writeFileSync(specYamlPath, generateArchSpec(spec), "utf-8");
  updateAiContexts(rootDir, spec);
}

function getDefaultLayers(
  architecture: ArchitecturePattern,
): Record<string, any> {
  const templates: Record<string, Record<string, any>> = {
    hexagonal: {
      core: {
        patterns: ["domain", "port", "model", "entity"],
        forbidden_deps: ["application", "infrastructure"],
        allowed_deps: [],
      },
      application: {
        patterns: ["service", "usecase", "handler", "command", "query"],
        forbidden_deps: ["infrastructure"],
        allowed_deps: ["core"],
      },
      infrastructure: {
        patterns: [
          "adapter",
          "config",
          "repository",
          "persistence",
          "web",
          "external",
        ],
        forbidden_deps: [],
        allowed_deps: ["core", "application"],
      },
    },
    modular: {
      app: {
        patterns: ["app", "index", "main"],
        forbidden_deps: [],
        allowed_deps: ["module", "shared"],
      },
      module: {
        patterns: ["feature", "module"],
        forbidden_deps: ["app"],
        allowed_deps: ["shared", "module"],
      },
      shared: {
        patterns: ["shared", "common", "types"],
        forbidden_deps: ["app", "module"],
        allowed_deps: [],
      },
    },
    layered: {
      presentation: {
        patterns: ["controller", "ui"],
        forbidden_deps: ["persistence"],
        allowed_deps: ["business"],
      },
      business: {
        patterns: ["service", "logic"],
        forbidden_deps: [],
        allowed_deps: ["persistence"],
      },
      persistence: {
        patterns: ["repository", "dao"],
        forbidden_deps: ["presentation"],
        allowed_deps: [],
      },
    },
  };
  return templates[architecture] || templates["layered"];
}

/**
 * 프로젝트 구조를 분석하여 최적의 아키텍처를 추천합니다 (AI 없을 때 사용).
 */
function getSmartDefaultArchitecture(
  context: ProjectContext,
): ArchitecturePattern {
  const deps = context.packageJson?.dependencies || {};
  const tree = context.tree.map((p: string) => p.toLowerCase());

  // React/Vue 감지 (프론트엔드 = modular)
  if (deps.react || deps.vue || deps.svelte || deps.angular) {
    return "modular";
  }

  // Express/Fastify/Spring 감지 (백엔드 = layered)
  if (deps.express || deps.fastify || deps.koa || deps.spring) {
    return "layered";
  }

  // 마이크로서비스 구조 감지 (여러 도메인 폴더 = hexagonal)
  const domainFolders = tree.filter(
    (p: string) =>
      p.includes("/src/") &&
      ["api", "domain", "service", "adapter", "port"].some((keyword) =>
        p.includes(keyword),
      ),
  );
  if (domainFolders.length > 5) {
    return "hexagonal";
  }

  // feature/ module/ 폴더 감지 (feature-based = modular)
  if (
    tree.some((p: string) => p.includes("feature/") || p.includes("module/"))
  ) {
    return "modular";
  }

  // 기본값: layered
  return "layered";
}
