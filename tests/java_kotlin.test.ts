import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { detectLanguage, findSrcDir, inferFileRole } from "../src/analyzer";
import { injectOrUpdateComment } from "../src/generator";
import { ArchSpec, FileRole } from "../src/types";

function setupTestProject(name: string) {
  const root = path.join(os.tmpdir(), "vibe-arch-test-" + name);
  if (fs.existsSync(root)) fs.rmSync(root, { recursive: true });
  fs.mkdirSync(root, { recursive: true });
  return root;
}

async function testJavaKotlinSupport() {
  console.log("Running Java/Kotlin Support Tests...");

  // 1. Test detectLanguage for Gradle/Kotlin
  const gradleRoot = setupTestProject("gradle-kotlin");
  fs.writeFileSync(path.join(gradleRoot, "build.gradle.kts"), "");
  fs.mkdirSync(path.join(gradleRoot, "src/main/kotlin"), { recursive: true });
  fs.writeFileSync(path.join(gradleRoot, "src/main/kotlin/Main.kt"), "package com.example;\n\nfun main() {}");
  
  const lang = detectLanguage(gradleRoot);
  if (lang !== "kotlin") throw new Error(`Expected language to be kotlin, but got ${lang}`);
  console.log("✓ detectLanguage (Gradle/Kotlin) passed");

  // 2. Test findSrcDir for src/main/kotlin
  const srcDir = findSrcDir(gradleRoot);
  const expectedSrcDir = path.join(gradleRoot, "src/main/kotlin");
  if (!srcDir || srcDir !== expectedSrcDir) throw new Error(`Expected srcDir to be ${expectedSrcDir}, but got ${srcDir}`);
  console.log("✓ findSrcDir (Kotlin) passed");

  // 3. Test injectOrUpdateComment for Java with package
  const javaFile = path.join(gradleRoot, "src/main/kotlin/App.java");
  fs.writeFileSync(javaFile, "package com.example.app;\n\npublic class App {}");
  
  const spec: ArchSpec = {
    architecture: "layered",
    language: "java",
    root: gradleRoot,
    bounded_contexts: [],
    layers: {
      presentation: { patterns: ["App"], forbidden_deps: [], allowed_deps: [] }
    }
  };
  fs.writeFileSync(path.join(gradleRoot, ".arch-spec.json"), JSON.stringify(spec));

  const role: FileRole = {
    filePath: javaFile,
    layer: "presentation",
    role: "presentation.App",
    boundedContext: "unknown",
    forbidden: [],
    depends: []
  };

  injectOrUpdateComment(javaFile, role, gradleRoot);
  
  const content = fs.readFileSync(javaFile, "utf-8");
  if (!content.startsWith("package com.example.app;")) throw new Error("Metadata should be after package statement");
  if (!content.includes("@arch")) throw new Error("Metadata block missing");
  if (content.indexOf("package") > content.indexOf("@arch")) throw new Error("Metadata should be after package statement");
  
  console.log("✓ injectOrUpdateComment (Java Package) passed");

  console.log("\nAll Java/Kotlin Support Tests Passed! 🚀");
}

testJavaKotlinSupport().catch(err => {
  console.error(err);
  process.exit(1);
});
