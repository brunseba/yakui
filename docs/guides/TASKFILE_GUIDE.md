# Taskfile Usage Guide

This project uses [Task](https://taskfile.dev/) as a modern task runner to manage development workflows, cleaning operations, and build processes.

## Installation

First, install Task on your system:

### macOS (using Homebrew)
```bash
brew install go-task/tap/go-task
```

### Linux/macOS (using sh installer)
```bash
sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d
```

### Windows (using Chocolatey)
```bash
choco install go-task
```

## Basic Usage

### Show all available tasks
```bash
task --list
# or simply
task
```

## Development Tasks

### Start Development Environment
```bash
# Start both frontend and backend
task dev

# Start only frontend (port 5173)
task dev:frontend

# Start only backend (port 3001)
task dev:backend

# Clean and restart development environment
task dev:clean
```

### Quick Development Workflows
```bash
# Fresh start (clean everything + install + dev)
task fresh

# Quick restart (stop processes + dev)
task quick

# Complete reset (nuclear option - clean everything)
task reset
```

## Cleaning Tasks

### Development Cleaning
```bash
# Clean development processes and cache
task clean:dev

# Stop all development processes
task stop:dev

# Force stop all processes (nuclear option)
task stop:dev:force

# Clean build artifacts
task clean:build

# Clean node_modules
task clean:deps

# Clean all caches (npm, vite, etc.)
task clean:cache

# Clean log files
task clean:logs

# Clean everything (nuclear option)
task clean
```

## Process Management

### Check Running Processes
```bash
# Show what's using development ports
task ports

# Show all development-related processes
task ps:dev

# Show environment information
task info
```

### Health Checks
```bash
# Check backend health
task health

# Check API version
task version

# Check overall status
task status
```

## Docker Tasks

### Basic Docker Operations
```bash
# Start Docker development environment
task docker:up

# Stop Docker environment
task docker:down

# Clean Docker environment
task docker:clean

# Rebuild containers
task docker:rebuild
```

### Advanced Docker Operations
```bash
# View container logs
task docker:logs
task docker:logs:backend
task docker:logs:frontend

# Open shell in containers
task docker:shell:backend
task docker:shell:frontend

# Inspect Docker resources
task docker:inspect

# Check container health
task docker:health

# Restart services
task docker:restart
task docker:restart:backend
task docker:restart:frontend
```

## Testing Tasks

```bash
# Run all tests
task test

# Run tests with UI
task test:ui

# Run tests with coverage
task test:coverage

# Clean test artifacts and run fresh
task test:clean
```

## Build Tasks

```bash
# Build for production
task build

# Clean and rebuild
task build:clean
```

## Linting and Code Quality

```bash
# Run ESLint
task lint

# Run ESLint with auto-fix
task lint:fix
```

## Maintenance Tasks

```bash
# Update dependencies
task update

# Security audit
task security

# Fix security vulnerabilities
task security:fix
```

## Common Scenarios

### 🔧 "I want to start fresh development"
```bash
task fresh
```

### 🧹 "Something's broken, clean everything"
```bash
task reset
```

### 🚀 "Quick restart after changes"
```bash
task quick
```

### 🐳 "I prefer Docker development"
```bash
task docker:up
task docker:logs
```

### 💥 "Port conflicts or stuck processes"
```bash
task ps:dev       # See what's running
task stop:dev     # Try graceful stop first
task ports        # Check what's using the ports

# If processes are still stuck:
task stop:dev:force  # Nuclear option
task dev
```

### 🔍 "Check if everything is working"
```bash
task status
task health
```

### 🧪 "Run tests before committing"
```bash
task test:clean
task lint
```

## Advanced Features

### Task Dependencies
Tasks automatically handle dependencies. For example:
- `task dev` will run `task install` first if needed
- `task test` will ensure dependencies are installed

### Intelligent Caching
Task uses file-based caching:
- `task install` only runs if `package.json` or `package-lock.json` changed
- Build tasks check source file timestamps

### Process Safety
Cleaning tasks safely handle:
- Killing stuck processes without errors
- Cleaning non-existent files gracefully
- Port conflicts resolution

## Configuration

The Taskfile is configured with these variables:
- `PROJECT_NAME`: kubernetes-admin-ui
- `NODE_VERSION`: 18+
- `FRONTEND_PORT`: 5173
- `BACKEND_PORT`: 3001

You can override these by setting environment variables:
```bash
FRONTEND_PORT=3000 task dev:frontend
```

## Troubleshooting

### Task not found
Make sure Task is installed and in your PATH:
```bash
task --version
```

### Port conflicts
```bash
task ports     # See what's using the ports
task stop:dev  # Force stop development processes
```

### Dependency issues
```bash
task clean:deps  # Remove node_modules
task install     # Fresh install
```

### Docker issues
```bash
task docker:down        # Stop containers
task docker:clean       # Clean Docker resources
task docker:rebuild     # Rebuild everything
```

For more advanced Docker cleaning:
```bash
task docker:clean:all   # Nuclear option (removes everything)
```

## Task vs npm scripts

While you can still use `npm run` commands, Task provides:

✅ **Better process management** - Proper cleanup of stuck processes  
✅ **Intelligent dependencies** - Only install when needed  
✅ **Cross-platform compatibility** - Works same on macOS/Linux/Windows  
✅ **Advanced cleaning** - Comprehensive cleanup capabilities  
✅ **Docker integration** - Seamless container management  
✅ **Parallel execution** - Run multiple tasks simultaneously  
✅ **Error handling** - Graceful handling of failed commands  

## Help and Documentation

```bash
# Show all tasks with descriptions
task --list

# Show detailed task information
task --summary <task-name>

# Show this guide
cat docs/TASKFILE_GUIDE.md
```