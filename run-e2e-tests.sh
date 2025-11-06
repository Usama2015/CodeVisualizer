#!/bin/bash

# CodeVisualizer E2E Test Runner
# This script sets up and runs comprehensive end-to-end tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$SCRIPT_DIR/e2e-tests"

# Default options
PARALLEL=false
COVERAGE=false
WATCH=false
UI=false
SUITE=""
HELP=false
CI=false
SETUP_ONLY=false
CLEANUP_ONLY=false
HEALTH_CHECK_ONLY=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[E2E]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[E2E]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[E2E]${NC} $1"
}

print_error() {
    echo -e "${RED}[E2E]${NC} $1"
}

# Function to show help
show_help() {
    cat << EOF
CodeVisualizer E2E Test Runner

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --parallel          Run tests in parallel for faster execution
    --coverage          Generate code coverage reports
    --watch            Run tests in watch mode (auto-rerun on changes)
    --ui               Open Vitest UI for interactive testing
    --ci               Run in CI mode (non-interactive, with JUnit output)
    --suite=SUITE      Run specific test suite only
                       Options: upload-flow, analysis-display, tabs, cross-browser

    --setup-only       Only set up test environment (start servers)
    --cleanup-only     Only clean up test environment (stop servers)
    --health-check     Only check if services are healthy

    --help, -h         Show this help message

EXAMPLES:
    $0                              # Run all tests
    $0 --parallel                   # Run tests in parallel
    $0 --suite=upload-flow          # Run only upload flow tests
    $0 --coverage --ci              # Generate coverage in CI mode
    $0 --watch                      # Interactive development mode
    $0 --ui                         # Open visual test interface
    $0 --setup-only                 # Just start the servers
    $0 --health-check               # Check if everything is running

TEST SUITES:
    upload-flow        Complete file upload and analysis initiation
    analysis-display   Data fetching, processing, and visualization
    tabs              Tab navigation and component integration
    cross-browser     Cross-browser compatibility and performance

REQUIREMENTS:
    - Node.js 18+
    - Ports 3000 and 3001 available
    - Frontend and backend dependencies installed

EOF
}

# Parse command line arguments
for arg in "$@"; do
    case $arg in
        --parallel)
            PARALLEL=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --ui)
            UI=true
            shift
            ;;
        --ci)
            CI=true
            shift
            ;;
        --suite=*)
            SUITE="${arg#*=}"
            shift
            ;;
        --setup-only)
            SETUP_ONLY=true
            shift
            ;;
        --cleanup-only)
            CLEANUP_ONLY=true
            shift
            ;;
        --health-check)
            HEALTH_CHECK_ONLY=true
            shift
            ;;
        --help|-h)
            HELP=true
            shift
            ;;
        *)
            print_error "Unknown option: $arg"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Show help if requested
if [ "$HELP" = true ]; then
    show_help
    exit 0
fi

# Check if we're in the right directory
if [ ! -f "$SCRIPT_DIR/package.json" ] || [ ! -d "$E2E_DIR" ]; then
    print_error "This script must be run from the CodeVisualizer project root"
    print_error "Expected directory structure:"
    print_error "  - package.json (project root)"
    print_error "  - e2e-tests/ (E2E test directory)"
    exit 1
fi

# Check Node.js version
check_node_version() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"

    if ! node -e "
        const current = '$NODE_VERSION'.split('.').map(Number);
        const required = '$REQUIRED_VERSION'.split('.').map(Number);
        const isValid = current[0] > required[0] ||
                       (current[0] === required[0] && current[1] >= required[1]);
        process.exit(isValid ? 0 : 1);
    "; then
        print_error "Node.js version $NODE_VERSION is not supported"
        print_error "Please install Node.js $REQUIRED_VERSION or higher"
        exit 1
    fi

    print_status "Node.js version: $NODE_VERSION ✓"
}

# Check if dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."

    # Check main project dependencies
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        print_warning "Main project dependencies not found, installing..."
        cd "$SCRIPT_DIR"
        npm install
    fi

    # Check frontend dependencies
    if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
        print_warning "Frontend dependencies not found, installing..."
        cd "$SCRIPT_DIR/frontend"
        npm install
    fi

    # Check backend dependencies
    if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
        print_warning "Backend dependencies not found, installing..."
        cd "$SCRIPT_DIR/backend"
        npm install
    fi

    # Check E2E test dependencies
    if [ ! -d "$E2E_DIR/node_modules" ]; then
        print_warning "E2E test dependencies not found, installing..."
        cd "$E2E_DIR"
        npm install
    fi

    print_success "All dependencies are ready"
}

# Check if ports are available
check_ports() {
    print_status "Checking port availability..."

    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is in use (this may be expected if servers are already running)"
    fi

    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is in use (this may be expected if servers are already running)"
    fi
}

# Setup test environment
setup_environment() {
    print_status "Setting up E2E test environment..."

    cd "$E2E_DIR"
    node scripts/start-servers.js &
    SERVER_PID=$!

    # Wait for servers to be ready
    print_status "Waiting for services to be ready..."
    if node scripts/health-check.js --wait; then
        print_success "All services are ready!"
        return 0
    else
        print_error "Services failed to start properly"
        return 1
    fi
}

# Run health check
run_health_check() {
    print_status "Running health check..."
    cd "$E2E_DIR"

    if node scripts/health-check.js; then
        print_success "All services are healthy!"
        return 0
    else
        print_error "Health check failed"
        return 1
    fi
}

# Cleanup environment
cleanup_environment() {
    print_status "Cleaning up test environment..."
    cd "$E2E_DIR"
    node scripts/stop-servers.js
    print_success "Cleanup completed"
}

# Run the actual tests
run_tests() {
    print_status "Running E2E tests..."

    cd "$E2E_DIR"

    # Build test command
    local cmd_args=()

    if [ "$PARALLEL" = true ]; then
        cmd_args+=(--parallel)
    fi

    if [ "$COVERAGE" = true ]; then
        cmd_args+=(--coverage)
    fi

    if [ "$WATCH" = true ]; then
        cmd_args+=(--watch)
    fi

    if [ "$UI" = true ]; then
        cmd_args+=(--ui)
    fi

    if [ "$CI" = true ]; then
        cmd_args+=(--reporter=junit)
    fi

    if [ -n "$SUITE" ]; then
        cmd_args+=(--suite="$SUITE")
    fi

    # Run the tests
    if node scripts/run-e2e-tests.js "${cmd_args[@]}"; then
        print_success "All tests passed!"
        return 0
    else
        print_error "Some tests failed"
        return 1
    fi
}

# Main execution logic
main() {
    print_status "CodeVisualizer E2E Test Runner"
    print_status "=============================="

    # Check prerequisites
    check_node_version
    check_dependencies
    check_ports

    # Handle special modes
    if [ "$CLEANUP_ONLY" = true ]; then
        cleanup_environment
        exit $?
    fi

    if [ "$HEALTH_CHECK_ONLY" = true ]; then
        run_health_check
        exit $?
    fi

    if [ "$SETUP_ONLY" = true ]; then
        setup_environment
        if [ $? -eq 0 ]; then
            print_success "Test environment is ready!"
            print_status "Servers are running. Use --cleanup-only to stop them."
            print_status "You can now run tests manually from the e2e-tests directory."
        fi
        exit $?
    fi

    # Full test run
    local exit_code=0

    # Setup
    if ! setup_environment; then
        print_error "Failed to setup test environment"
        exit 1
    fi

    # Run tests
    if ! run_tests; then
        exit_code=1
    fi

    # Cleanup
    cleanup_environment

    if [ $exit_code -eq 0 ]; then
        print_success "🎉 E2E tests completed successfully!"
    else
        print_error "❌ E2E tests failed"
    fi

    exit $exit_code
}

# Handle signals for cleanup
trap 'print_warning "Interrupted, cleaning up..."; cleanup_environment; exit 130' INT TERM

# Run main function
main