#!/usr/bin/env bash
# ==============================================================================
# run-project.sh - Local development helper for fzl-fund-ui monorepo
# ==============================================================================

set -euo pipefail

# Ensure we operate from the monorepo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

# ANSI color codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_BLUE="\033[34m"
CLR_GREEN="\033[32m"
CLR_YELLOW="\033[33m"
CLR_CYAN="\033[36m"
CLR_RED="\033[31m"

log_info() {
  echo -e "${CLR_BLUE}${CLR_BOLD}[INFO]${CLR_RESET} $1"
}

log_success() {
  echo -e "${CLR_GREEN}${CLR_BOLD}[SUCCESS]${CLR_RESET} $1"
}

log_warn() {
  echo -e "${CLR_YELLOW}${CLR_BOLD}[WARN]${CLR_RESET} $1"
}

log_error() {
  echo -e "${CLR_RED}${CLR_BOLD}[ERROR]${CLR_RESET} $1"
}

show_help() {
  echo -e "${CLR_BOLD}FZL UI Monorepo Development Runner${CLR_RESET}

Usage:
  ./run-project.sh [TARGET] [OPTIONS]

Targets:
  ${CLR_CYAN}appshell${CLR_RESET}      (default) Build component libraries and run the Lit Appshell showcase
  ${CLR_CYAN}lit${CLR_RESET}           Build design tokens and run webcomponents-lit dev server
  ${CLR_CYAN}es6${CLR_RESET}           Build design tokens and run webcomponents-es6 dev server
  ${CLR_CYAN}angular${CLR_RESET}       Build design tokens and run webcomponents-angular dev server
  ${CLR_CYAN}build${CLR_RESET}         Run full build across all workspaces
  ${CLR_CYAN}test${CLR_RESET}          Run tests across all workspaces
  ${CLR_CYAN}sync-docs${CLR_RESET}     Analyze manifests and synchronize Markdown documentation

Options:
  -s, --skip-build   Skip building packages before starting the dev server
  -h, --help         Show this help message and exit

Examples:
  ./run-project.sh                   # Build dependencies and start appshell
  ./run-project.sh appshell -s       # Start appshell immediately without rebuilding
  ./run-project.sh lit               # Work on Lit components
  ./run-project.sh test              # Run vitest test suite"
}

TARGET="appshell"
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    appshell|lit|es6|angular|build|test|sync-docs)
      TARGET="$1"
      shift
      ;;
    -s|--skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      echo ""
      show_help
      exit 1
      ;;
  esac
done

# Check prerequisites
if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js is not installed or not in PATH. Please install Node.js >= 20.0.0."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  log_error "npm is not installed or not in PATH. Please install npm >= 10.0.0."
  exit 1
fi

# Check if dependencies need installation
if [ ! -d "node_modules" ]; then
  log_warn "'node_modules' directory not found. Running npm install..."
  npm install
  log_success "Dependencies installed."
fi

case "${TARGET}" in
  appshell)
    if [ "${SKIP_BUILD}" = false ]; then
      log_info "Building workspace packages (tokens, es6, lit, angular)..."
      npm run build:tokens
      npm run build:lit
      npm run build:es6
      npm run build:angular
      log_success "Workspace packages built successfully."
    else
      log_info "Skipping package build step (--skip-build active)."
    fi

    log_info "Starting Appshell Showcase server on http://localhost:5173 ..."
    exec npm run dev:appshell
    ;;

  lit)
    if [ "${SKIP_BUILD}" = false ]; then
      log_info "Building design tokens..."
      npm run build:tokens
    fi
    log_info "Starting Lit components dev server..."
    exec npm run dev:lit
    ;;

  es6)
    if [ "${SKIP_BUILD}" = false ]; then
      log_info "Building design tokens..."
      npm run build:tokens
    fi
    log_info "Starting Vanilla ES6 components dev server..."
    exec npm run dev:es6
    ;;

  angular)
    if [ "${SKIP_BUILD}" = false ]; then
      log_info "Building design tokens..."
      npm run build:tokens
    fi
    log_info "Starting Angular Elements dev server..."
    exec npm run dev:angular
    ;;

  build)
    log_info "Building all workspaces..."
    exec npm run build
    ;;

  test)
    log_info "Running test suites..."
    exec npm test
    ;;

  sync-docs)
    log_info "Synchronizing docs with Custom Elements Manifests..."
    exec npm run docs:sync
    ;;
esac
