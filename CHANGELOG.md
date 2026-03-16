# Changelog

All notable changes to vibe-arch will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-03-16

### Added

- 🏗️ **Platform Specialization**: New 2-step `init` process with project categories (Server, Client, Mobile, Library).
- 🧩 **New Architecture Patterns**: 
  - `fsd` - Feature-Sliced Design for modern frontend.
  - `atomic` - Atomic Design pattern for UI components.
  - `none` - Custom/Minimal architecture for full control.
- 🧪 **Comprehensive Test Suite**: Added core, ignore logic, CLI, and daemon integration tests.
- 🚀 **CI/CD Integration**: GitHub Actions workflow (Ubuntu/Windows) and `prepublishOnly` safety checks.
- 📖 **Enhanced AI Guides**: Context-aware guidance for `sidecar` mode and platform-specific rules in `GEMINI.md`, `CLAUDE.md`, and `AI.md`.

### Fixed

- 🛡️ **Shebang Preservation**: Metadata injection no longer breaks executable scripts (`#!`).
- 📂 **Ignore Pattern Accuracy**: Fixed over-broad path matching that ignored valid files like `distance.ts`.
- 💻 **Windows Compatibility**: Full support for CRLF line endings in metadata parsing and injection.
- ⚙️ **CI/CD Fix**: Added `package-lock.json` to repository for stable builds.

### Changed

- 🤖 **Manual First**: Temporarily disabled AI architecture recommendation in favor of manual selection and smart defaults.

## [0.1.0] - 2026-03-15

### Added

- 🤖 **AI-Driven Deep Scan**: Automatic project architecture analysis using OpenAI API
- 🧠 **Smart Default Architecture**: Intelligent architecture detection based on project structure and dependencies
- 📂 **Flexible Metadata Storage**: Support for both Inline and Sidecar metadata storage modes
- 🏗️ **5 Architecture Patterns**: Hexagonal, Clean, MVC, Layered, and Modular patterns
- 📖 **AI Behavior Guide**: Automatic generation of architecture guidelines for AI agents
- 🛠️ **Background Daemon**: Real-time file monitoring and metadata injection
- ⚡ **CLI Commands**:
  - `init` - Initialize project with AI analysis
  - `update` - Bulk synchronize architecture metadata
  - `start` - Start background daemon
  - `stop` - Stop background daemon
  - `status` - Show daemon status and coverage
  - `logs` - View daemon logs
- 🔧 **Configuration Options**:
  - `--arch <pattern>` - Specify architecture pattern
  - `--lang <language>` - Specify project language
  - `--injection <mode>` - Specify metadata storage mode
  - `-y, --yes` - Non-interactive mode with smart defaults
  - `--lines <n>` - Control log output
- 📚 **Comprehensive Documentation**:
  - Detailed README with examples
  - Man page format documentation
  - CI/CD pipeline examples
  - Real-world workflow examples
- 💻 **Cross-Platform Support**:
  - Windows UTF-8 encoding support
  - Linux and macOS compatible
  - Node.js 16+ support
- 📝 **Generated Files**:
  - `.arch-spec.json` - Architecture configuration
  - `.arch-spec.yaml` - YAML format configuration
  - `CLAUDE.md` - Claude AI guidelines
  - `GEMINI.md` - Gemini AI guidelines
  - `AI.md` - Generic AI guidelines
  - `arch/` - Sidecar metadata directory (optional)

### Technical Details

- Written in TypeScript with full type safety
- Zero runtime dependencies (bundled)
- Efficient file watching with chokidar
- OpenAI API integration for architecture recommendations
- Interactive CLI with inquirer
- Colored output with chalk

## [0.0.1] - Initial Development

- Project scaffolding and structure setup
- Basic TypeScript configuration
- Dependency management setup
