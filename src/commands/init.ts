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
import { ArchitecturePattern, ArchSpec, ProjectCategory } from "../types";

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
  let selectedCategory: ProjectCategory = "unknown";
  let selectedArchitecture: ArchitecturePattern | undefined;

  if (!isNonInteractive) {
    // 1단계: 프로젝트 카테고리 선택
    const { category } = await inquirer.prompt([
      {
        type: "list",
        name: "category",
        message: "What kind of project is this?",
        choices: [
          { name: "🖥️  Server (Backend)", value: "server" },
          { name: "🌐 Client (Frontend / Mobile)", value: "client" },
          { name: "📱 Mobile (Native / Hybrid)", value: "mobile" },
          { name: "🛠️  Library / CLI Tool", value: "library" },
          { name: "❓ Other / Unknown", value: "unknown" },
        ],
        default: "server",
      },
    ]);
    selectedCategory = category as ProjectCategory;

    // 2단계: 카테고리별 아키텍처 패턴 선택
    const patternChoices = getArchitectureChoices(selectedCategory);
    const { architecture } = await inquirer.prompt([
      {
        type: "list",
        name: "architecture",
        message: `Select the architecture pattern for ${selectedCategory}:`,
        choices: patternChoices,
        default: patternChoices[0].value,
      },
    ]);
    selectedArchitecture = architecture as ArchitecturePattern;
  } else {
    // 비대화형 모드: 스마트 기본값 사용
    selectedCategory = detectCategory(context);
    if (options.arch) {
      selectedArchitecture = options.arch as ArchitecturePattern;
    } else {
      console.log(
        chalk.blue("[vibe-arch] Analyzing project for optimal architecture..."),
      );
      selectedArchitecture = getSmartDefaultArchitecture(context);
      console.log(
        chalk.green(
          `[vibe-arch] Auto-selected: ${selectedCategory} / ${selectedArchitecture}\n`,
        ),
      );
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
    const valid = ["inline", "sidecar", "disabled"];
    if (valid.includes(options.injection)) {
      injectionMode = options.injection;
    }
  }

  const spec: ArchSpec = {
    architecture: selectedArchitecture,
    category: selectedCategory,
    language: options.lang || context.language || "typescript",
    root: rootDir,
    bounded_contexts: [],
    layers: getDefaultLayers(selectedArchitecture, selectedCategory),
    comment_injection: injectionMode as any,
    ai_hints: true,
    ai_targets: ["CLAUDE.md", "GEMINI.md", "AI.md"],
  };

  saveSpec(rootDir, spec);
  console.log(
    chalk.green(
      `\n✅ [SUCCESS] Initialized with ${chalk.bold(selectedArchitecture)} architecture!`,
    ),
  );
}

function getArchitectureChoices(category: ProjectCategory) {
  const common = [
    { name: "🧩 Modular (Feature-based)", value: "modular" },
    { name: "🎬 MVC (Model-View-Controller)", value: "mvc" },
    { name: "🚫 None (Custom / Minimal)", value: "none" },
  ];

  if (category === "client" || category === "mobile") {
    return [
      { name: "🔪 FSD (Feature-Sliced Design)", value: "fsd" },
      { name: "⚛️  Atomic Design", value: "atomic" },
      { name: "📚 Layered (3-tier UI)", value: "layered" },
      ...common,
    ];
  }

  return [
    { name: "📚 Layered (Controller-Service-Repo)", value: "layered" },
    { name: "🔷 Hexagonal (Ports & Adapters)", value: "hexagonal" },
    { name: "🧹 Clean Architecture", value: "clean" },
    ...common,
  ];
}

function saveSpec(rootDir: string, spec: ArchSpec) {
  const specJsonPath = path.join(rootDir, ".arch-spec.json");
  const specYamlPath = path.join(rootDir, ".arch-spec.yaml");
  fs.writeFileSync(specJsonPath, JSON.stringify(spec, null, 2), "utf-8");
  fs.writeFileSync(specYamlPath, generateArchSpec(spec), "utf-8");
  updateAiContexts(rootDir, spec);
}

function detectCategory(context: ProjectContext): ProjectCategory {
  const deps = context.packageJson?.dependencies || {};
  if (deps.react || deps.vue || deps.svelte || deps.next) return "client";
  if (deps.express || deps.nest || deps.fastify || deps.spring) return "server";
  if (deps.flutter || deps["react-native"]) return "mobile";
  return "unknown";
}

function getDefaultLayers(
  architecture: ArchitecturePattern,
  category: ProjectCategory = "unknown",
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
    fsd: {
      app: {
        patterns: ["app"],
        forbidden_deps: ["pages", "widgets", "features", "entities", "shared"],
        allowed_deps: ["pages", "widgets", "features", "entities", "shared"],
      },
      pages: {
        patterns: ["pages", "views"],
        forbidden_deps: ["app"],
        allowed_deps: ["widgets", "features", "entities", "shared"],
      },
      widgets: {
        patterns: ["widgets"],
        forbidden_deps: ["app", "pages"],
        allowed_deps: ["features", "entities", "shared"],
      },
      features: {
        patterns: ["features"],
        forbidden_deps: ["app", "pages", "widgets"],
        allowed_deps: ["entities", "shared"],
      },
      entities: {
        patterns: ["entities"],
        forbidden_deps: ["app", "pages", "widgets", "features"],
        allowed_deps: ["shared"],
      },
      shared: {
        patterns: ["shared", "common", "ui", "lib"],
        forbidden_deps: ["app", "pages", "widgets", "features", "entities"],
        allowed_deps: [],
      },
    },
    atomic: {
      atoms: {
        patterns: ["atoms"],
        forbidden_deps: ["molecules", "organisms", "templates", "pages"],
        allowed_deps: [],
      },
      molecules: {
        patterns: ["molecules"],
        forbidden_deps: ["organisms", "templates", "pages"],
        allowed_deps: ["atoms"],
      },
      organisms: {
        patterns: ["organisms"],
        forbidden_deps: ["templates", "pages"],
        allowed_deps: ["atoms", "molecules"],
      },
      templates: {
        patterns: ["templates"],
        forbidden_deps: ["pages"],
        allowed_deps: ["atoms", "molecules", "organisms"],
      },
      pages: {
        patterns: ["pages"],
        forbidden_deps: [],
        allowed_deps: ["atoms", "molecules", "organisms", "templates"],
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
        patterns: ["controller", "ui", "view"],
        forbidden_deps: ["persistence"],
        allowed_deps: ["business"],
      },
      business: {
        patterns: ["service", "logic", "usecase"],
        forbidden_deps: [],
        allowed_deps: ["persistence"],
      },
      persistence: {
        patterns: ["repository", "dao", "entity"],
        forbidden_deps: ["presentation"],
        allowed_deps: [],
      },
    },
    none: {},
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

  // React/Vue 감지 (프론트엔드 = fsd / modular)
  if (deps.react || deps.vue || deps.next) {
    if (tree.some(p => p.includes("entities") || p.includes("features"))) return "fsd";
    return "modular";
  }

  // Express/Fastify/Spring 감지 (백엔드 = layered)
  if (deps.express || deps.nest || deps.spring) {
    return "layered";
  }

  // 기본값: layered
  return "layered";
}
