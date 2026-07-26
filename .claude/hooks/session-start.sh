#!/bin/bash
# SessionStart hook: install workspace dependencies so Expo/Next builds,
# typechecks, and `expo start` work in Claude Code on the web sessions.
# The repo is cloned without node_modules (it's gitignored), so a fresh
# remote session must install before any tooling can resolve packages
# such as expo-document-picker.
set -euo pipefail

# Only run in remote (Claude Code on the web) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# This is a pnpm workspace. Make sure pnpm is available.
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
fi

# Install all workspace dependencies from the committed lockfile.
# Idempotent and non-interactive; safe to run on every session start.
pnpm install --frozen-lockfile
