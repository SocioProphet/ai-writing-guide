# Prerequisites

Before installing AIWG, ensure you have the following requirements.

## Required

### Node.js ≥18.0.0 (LTS)

```bash
node --version  # Should show v18.x.x or higher
```

**Installation options:**

| Platform | Command |
|----------|---------|
| **macOS (Homebrew)** | `brew install node@18` |
| **Ubuntu/Debian** | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| **Fedora/RHEL** | `curl -fsSL https://rpm.nodesource.com/setup_18.x \| sudo bash - && sudo dnf install -y nodejs` |
| **NVM (All platforms)** | `nvm install 18 && nvm use 18` |
| **Windows** | Use WSL2, then follow Ubuntu instructions |

### AI Platform (Choose One or More)

| Platform | Best For | Install |
|----------|----------|---------|
| **Claude Code** | Multi-agent orchestration, artifact generation | [claude.ai/code](https://claude.ai/code) |
| **Warp Terminal** | Terminal-native AI, command-line workflows | [warp.dev](https://www.warp.dev/) |
| **Factory AI** | Custom droid workflows | [factory.ai](https://factory.ai/) |
| **Cursor** | IDE-native rules | [cursor.sh](https://cursor.sh/) |
| **GitHub Copilot** | GitHub integration | VS Code extension |

**Use multiple platforms for best results:**

```bash
aiwg use sdlc                      # Claude Code (default)
aiwg use sdlc --provider warp      # Warp Terminal
aiwg use sdlc --provider factory   # Factory AI
aiwg use sdlc --provider cursor    # Cursor IDE
```

## Platform Support Status

| Platform | Status | Notes |
|----------|--------|-------|
| **Claude Code** | ✅ Tested & Validated | Multi-agent orchestration, native plugins |
| **GitHub Copilot** | ✅ Tested & Validated | copilot-instructions.md |
| **Warp Terminal** | ✅ Tested & Validated | Terminal-native workflows |
| **Factory AI** | ✅ Tested & Validated | Native droid format, AGENTS.md |
| **OpenCode** | ✅ Tested & Validated | AGENTS.md |
| **Cursor** | ✅ Tested & Validated | Native rules format, AGENTS.md |
| **OpenAI/Codex** | ✅ Tested & Validated | Native prompts format, AGENTS.md |
| **Windsurf** | 🟡 Experimental | Should work, not validated |

## Operating Systems

| OS | Status |
|----|--------|
| **macOS** (Intel + Apple Silicon) | ✅ Supported |
| **Linux** (Ubuntu, Debian, Fedora, Arch, RHEL) | ✅ Supported |
| **WSL2** (Windows Subsystem for Linux) | ✅ Supported |
| **Native Windows** (PowerShell/CMD) | ❌ Not supported — Use WSL2 |

## Optional (Recommended)

### Git

Required for `aiwg -new` project scaffolding and version control.

```bash
git --version

# Install if needed:
# macOS: brew install git
# Ubuntu: sudo apt-get install git
# Fedora: sudo dnf install git
```

## Quick Compatibility Check

```bash
# Check Node.js
node --version && echo "✅ Node.js" || echo "❌ Node.js missing"

# Check Claude Code (if using)
claude --version 2>/dev/null && echo "✅ Claude Code" || echo "ℹ️ Claude Code not installed"

# Check Factory AI (if using)
factory --version 2>/dev/null && echo "✅ Factory AI" || echo "ℹ️ Factory AI not installed"

# Check Git (optional)
git --version && echo "✅ Git" || echo "ℹ️ Git optional"
```

**All checks passed?** Continue to [Quick Start](../quickstart.md)
