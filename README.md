# vibe-arch — AI Architecture Context Manager 🚀

**The Multi-Platform AI Architecture Context Manager for Vibe Coding.**

**vibe-arch** is a universal tool designed to help AI agents (Claude, Gemini, GPT, etc.) perfectly understand your project's architecture and write code strictly within your defined rules. Say goodbye to repeatedly explaining complex guidelines in your prompts—this tool dynamically injects the optimal context into the AI in real time.

---

## 📦 Installation

### npm (Recommended)

```bash
npm install -g vibe-arch
```

### Local Installation

```bash
git clone https://github.com/vibe-arch/vibe-arch.git
cd vibe-arch
npm install
npm run build
npm install -g .
```

### Verify Installation

```bash
vibe-arch --help
```

---

## 🔑 Setup: OpenAI API Key (Optional)

If you want better, context-aware architecture recommendations, set your OpenAI API key:

```bash
# Windows
setx OPENAI_API_KEY "sk-your-api-key-here"

# macOS/Linux
export OPENAI_API_KEY="sk-your-api-key-here"
```

**No API key? No problem!** The tool can still analyze your project structure and fall back to local logic to select the best architecture automatically.

---

## ✨ Key Features

- 🧠 **AI-Driven Deep Scan:** Comprehensively analyzes your project structure and dependencies to detect the project type (Client, Server, etc.) and recommend the best architecture.
- 📂 **Flexible Metadata Storage:** Choose between **Inline** injection (metadata inside source code) or **Sidecar** mirroring (metadata kept in a separate directory).
- 🏗️ **Architecture Guardrails:** Supports specialized patterns like **FSD (Feature-Sliced Design)**, **Atomic Design**, **Hexagonal**, **Clean**, **Layered**, and **Modular**, ensuring real-time AI context.
- 📖 **AI Behavior Guide:** Automatically generates instructions that force the AI to read metadata (Inline or Sidecar) before modifying any file.
- 🚫 **Custom Architecture:** Use the **None** option to define your own layers or override pre-defined templates in `.arch-spec.json`.
- 🛠️ **Background Monitoring:** Runs as a daemon to inject architecture info in real time without hogging your terminal.

---

## 📄 Man Page

### NAME

    vibe-arch — Real-time architecture context and metadata management tool for AI agents

### SYNOPSIS

    vibe-arch <command> [directory] [options]

### DESCRIPTION

    vibe-arch defines your project's architectural rules and manages metadata
    via source code comments (Inline) or a mirrored directory (Sidecar),
    ensuring AI agents are instantly aware of constraints in real time.

### COMMANDS

    init [dir]
        Comprehensively analyzes the project structure to generate AI prompts.
        Interactively completes the .arch-spec.json configuration based on AI judgment.
        [Options: --arch, --lang, --injection, --yes]

    update [dir]
        Synchronizes all source files according to the configured architecture rules.
        Injects comments at the top of files (Inline) or bulk creates/updates
        metadata documents in the arch/ folder (Sidecar).
        [Options: (none)]

    start [dir]
        Starts the background monitoring daemon. Detects file changes in real time
        and instantly updates architecture metadata and AI context files (e.g., CLAUDE.md).
        [Options: (none)]

    stop [dir]
        Safely stops the running background daemon and cleans up PID files.
        [Options: (none)]

    status [dir]
        Reports the daemon's running status and the project's current architecture
        coverage (Health) along with visual graphs.
        [Options: (none)]

    logs [dir]
        Outputs the tail of the daemon execution logs.
        [Options: --lines]

### OPTIONS

    --arch <pattern>
        Specifies the architecture pattern to analyze (hexagonal, clean, mvc, layered, modular).
        (init command only)

    --lang <language>
        Specifies the primary language of the project (typescript, java, python, go, etc.).
        (init command only)

    --injection <mode>
        Specifies the metadata storage method (inline, sidecar, disabled). Default is inline.
        (init command only)

    -y, --yes
        Runs in non-interactive mode. Automatically completes setup with defaults,
        optimized for AI agent execution environments.
        (init command only)

    --lines <n>
        Specifies the number of log lines to output when using the logs command. Default is 50.
        (logs command only)

### FILES

    .arch-spec.json
        The core configuration file containing the project's architecture rules and layer definitions.

    CLAUDE.md, GEMINI.md, AI.md
        Architecture guideline files provided to AI agents in real time.

    arch/
        The folder used in Sidecar mode to store metadata by mirroring the source code structure.

---

## 💡 Examples

### 1️⃣ **Initializing a New Project**

#### Scenario: Starting a React project with Feature-Sliced Design (FSD)

```bash
# Interactive mode: Make all choices manually
$ vibe-arch init

[vibe-arch] Analyzing Project: /my-react-app

? What kind of project is this?
  ❯ 🌐 Client (Frontend / Mobile)
    🖥️  Server (Backend)
    📱 Mobile (Native / Hybrid)
    🛠️  Library / CLI Tool

(Selected: Client)

? Select the architecture pattern for client:
  ❯ 🔪 FSD (Feature-Sliced Design)
    ⚛️  Atomic Design
    📚 Layered (3-tier UI)
    🧩 Modular (Feature-based)
    🎬 MVC (Model-View-Controller)
    🚫 None (Custom / Minimal)

✅ [SUCCESS] Initialized with fsd architecture!
```
# Generated files:
# ✓ .arch-spec.json
# ✓ CLAUDE.md
# ✓ GEMINI.md
# ✓ AI.md
```

---

#### Scenario: Automated initialization in a CI/CD pipeline (GitHub Actions)

```bash
# Non-interactive mode: Complete setup in a single line
$ vibe-arch init -y --arch modular --injection sidecar

[vibe-arch] Analyzing Project: /project
[vibe-arch] Analyzing project for optimal architecture...
[vibe-arch] Selected: modular

✅ [SUCCESS] Initialized with modular architecture!
```

---

#### Scenario: Forcing a Hexagonal architecture on an existing project

```bash
# Specify the pattern explicitly
$ vibe-arch init /path/to/project --arch hexagonal --lang typescript

[vibe-arch] Analyzing Project: /path/to/project
[vibe-arch] Selected: hexagonal

? Where should architecture metadata be stored?
  ❯ 📝 Inline (at the top of each source file)
    📁 Sidecar (mirroring structure in /arch directory)

✅ [SUCCESS] Initialized with hexagonal architecture!
```

---

### 2️⃣ **Bulk Syncing Architecture Metadata**

#### Scenario: You added new files and want to apply architecture metadata across the board

```bash
$ vibe-arch update

[vibe-arch] Bulk updating architecture metadata for all source files...
✅ [vibe-arch] Successfully synced 42 files.

# Result:
# - src/components/Button.tsx    → @arch metadata added
# - src/services/api.ts          → @arch metadata added
# - src/utils/helpers.ts         → @arch metadata added
# ... (All 42 files processed)

# CLAUDE.md is also automatically updated!
```

---

### 3️⃣ **Starting the Background Daemon (Real-time Watcher)**

#### Scenario: Developing in Cursor IDE and wanting metadata injected automatically upon file creation

```bash
# Start the daemon (Runs in the background, frees your terminal)
$ vibe-arch start

[vibe-arch] Daemon started. PID: 2840
[vibe-arch] Log: ~/.vibe-arch/logs/project_key.log

# Works silently in the background:
# - Detects file creation → Injects @arch metadata
# - Detects file modifications → Updates CLAUDE.md
# - Detects rule violations → Writes to logs
```

---

### 4️⃣ **Checking Daemon Status**

#### Scenario: Verifying if the daemon is running properly

```bash
$ vibe-arch status

[vibe-arch] Daemon Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Running (PID: 2840)
📊 Architecture: modular
📝 Coverage: 38/42 files (90%)

Architecture Breakdown:
  🧩 modular ████████████░░░░ 28 files
  📚 shared  ██████░░░░░░░░░░  5 files
  🎯 app     ███░░░░░░░░░░░░░  5 files

Last Updated: 2 seconds ago
```

---

### 5️⃣ **Viewing Daemon Logs**

#### Scenario: Something seems wrong, or a new file wasn't processed

```bash
# Check the last 100 lines of the log
$ vibe-arch logs --lines 100

[2026-03-15T10:23:45.123Z] [vibe-arch] File created: src/components/Modal.tsx
[2026-03-15T10:23:46.456Z] [vibe-arch] Injected @arch metadata
[2026-03-15T10:24:12.789Z] [vibe-arch] File modified: src/services/auth.ts
[2026-03-15T10:24:13.012Z] [vibe-arch] Updated CLAUDE.md
[2026-03-15T10:25:01.345Z] [vibe-arch] Daemon health check: OK
...
```

---

### 6️⃣ **Stopping the Daemon**

#### Scenario: Wrapping up work and shutting down the watcher

```bash
$ vibe-arch stop

[vibe-arch] Stopping daemon (PID: 2840)
[vibe-arch] Cleanup complete.

# When you need it again:
$ vibe-arch start
```

---

## 🎯 **Real-world Workflows**

### The Ultimate Developer Workflow

#### **Step 1: Project Setup (One-time)**

```bash
# Create a new project
$npx create-react-app my-app$ cd my-app

# Install vibe-arch
$ npm install vibe-arch

# Initialize architecture (Interactive)
$ vibe-arch init
→ AI recommends "modular"
→ Choose "Inline" metadata

✅ .arch-spec.json generated
✅ CLAUDE.md generated
```

#### **Step 2: Start Background Watcher**

```bash
$ vibe-arch start

✅ Background file monitoring started
```

#### **Step 3: Daily Development (Automated)**

```
(Writing code in Cursor IDE)
→ Create a new component file
→ vibe-arch detects it automatically
→ @arch metadata injected instantly
→ CLAUDE.md refreshed
→ Claude uses the latest architecture context ✅
```

#### **Step 4: AI Code Generation / Review**

```bash
# Prompting Claude:

"Can you understand the structure of src/components/Button.tsx and add the following feature?"

(Claude reads the @arch metadata)
→ Understands this file belongs to the "presentation" layer
→ Knows it can only communicate with the "business" layer
→ Knows direct access to the "persistence" layer is forbidden
→ Generates code maintaining the correct architecture ✅
```

---

### CI/CD Pipeline Example

#### **Automated Context Sync in GitHub Actions**

```yaml
name: Sync vibe-arch Metadata

on:
  push:
    branches: [main]

jobs:
  arch-setup:
    runs-on: ubuntu-latest
    permissions:
      contents: write # ⚠️ Required to push changes back to the repo
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install vibe-arch
        run: npm install -g vibe-arch

      - name: Sync architecture metadata
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: vibe-arch init -y --injection sidecar

      - name: Commit and Push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .arch-spec.json CLAUDE.md GEMINI.md AI.md arch/
          git commit -m "chore: update architecture metadata [skip ci]" || echo "No changes to commit"
          git push
```

---

### Team Collaboration Example

#### **Pre-Review Health Check**

```bash
$ vibe-arch status

✅ Running (PID: 2840)
📊 Architecture: hexagonal
📝 Coverage: 95/100 files (95%)

# → "Great! Most files have metadata.
#    We can easily verify architecture rules during PR reviews."
```

---

## 🚀 **More Use Cases**

| Scenario                                            | Recommended Command           |
| :-------------------------------------------------- | :---------------------------- |
| Onboarding a new team member to the architecture    | Show them `CLAUDE.md`         |
| Bulk applying metadata to a legacy codebase         | `vibe-arch update`            |
| Real-time context syncing during active development | `vibe-arch start`             |
| Checking architecture coverage before deployment    | `vibe-arch status`            |
| Making data-driven architecture decisions           | `vibe-arch logs --lines 1000` |

### 🧩 **Architecture Matrix**

| Category         | Supported Patterns                                              |
| :--------------- | :-------------------------------------------------------------- |
| **🖥️ Server**   | Hexagonal, Clean, Layered, Modular, MVC, None                   |
| **🌐 Client**   | FSD (Feature-Sliced Design), Atomic Design, Layered, Modular, MVC, None |
| **📱 Mobile**   | FSD, Atomic Design, Layered, Modular, MVC, None                 |
| **🛠️ Library**  | Modular, MVC, None                                              |

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

### Ways to Contribute

- 🐛 Report bugs via [GitHub Issues](https://github.com/vibe-arch/vibe-arch/issues)
- 💡 Suggest improvements and new features
- 📝 Improve documentation
- 💻 Submit code improvements via Pull Requests
- 🌍 Help translate or localize for other languages

---

## 📞 Support

- 📖 **Documentation**: Check [README.md](README.md) and [Examples](#-examples)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/vibe-arch/vibe-arch/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/vibe-arch/vibe-arch/discussions)
- 📧 **Email**: Open an issue if you need to reach out privately

---

## 📊 Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and changes.

---

## 📄 License

MIT License.
