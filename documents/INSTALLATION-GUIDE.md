# Installation & Setup Guide

Complete setup instructions for the Acos GRAF Load Test v3.0 performance testing framework.

## Prerequisites

Before installing the framework, ensure your system meets the following requirements:

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Operating System** | Windows 10, macOS 10.14, Ubuntu 18.04+ | Latest stable versions |
| **RAM** | 4GB | 8GB+ for large-scale tests |
| **Storage** | 2GB free space | 5GB+ for reports and logs |
| **Network** | Stable internet connection | Low-latency connection to test environments |

### Required Software

#### 1. Node.js Installation

**Version Required**: 14.0.0 or higher (18.x LTS recommended)

**Installation Methods**:

**Windows:**
```powershell
# Using Chocolatey
choco install nodejs

# Using Winget
winget install OpenJS.NodeJS

# Or download from https://nodejs.org/
```

**macOS:**
```bash
# Using Homebrew
brew install node

# Using MacPorts
sudo port install nodejs18
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using snap
sudo snap install node --classic
```

**Verification:**
```bash
node --version    # Should show v14.0.0 or higher
npm --version     # Should show corresponding npm version
```

#### 2. K6 Installation

**Version Required**: Latest stable (v0.40.0+)

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install k6

# Using Scoop
scoop install k6

# Using MSI installer from https://k6.io/docs/getting-started/installation/
```

**macOS:**
```bash
# Using Homebrew (recommended)
brew install k6

# Using MacPorts
sudo port install k6
```

**Linux:**
```bash
# Ubuntu/Debian using APT
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# CentOS/RHEL using YUM
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6

# Using Docker (all platforms)
docker pull grafana/k6:latest
```

**Verification:**
```bash
k6 version    # Should show current version information
```

## Framework Installation

### 1. Project Download/Clone

**Option A: Download ZIP**
1. Download the project ZIP file
2. Extract to your desired location
3. Navigate to the extracted directory

**Option B: Git Clone**
```bash
# Clone the repository
git clone <repository-url>
cd WSPlussK6-Performance-Tests
```

### 2. Dependency Installation

Navigate to the project directory and install dependencies:

```bash
# Navigate to project directory
cd WSPlussK6-Performance-Tests

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected Output:**
```
acos-graf-load-test@3.0.0
├── eslint@8.x.x
├── prettier@2.x.x
└── husky@8.x.x
```

### 3. Configuration Setup

#### Environment Configuration

The framework comes with pre-configured environments, but you may need to customize them:

**File: `src/config/environments.json`**
```json
{
  "autotest": {
    "baseUrl": "https://autotest01.acoscloud.no",
    "description": "Auto-test environment",
    "timeout": 30000
  },
  "dev": {
    "baseUrl": "https://dev.acoscloud.no", 
    "description": "Development environment",
    "timeout": 30000
  }
}
```

**Customization Steps:**
1. Open `src/config/environments.json`
2. Modify URLs to match your target environments
3. Adjust timeout values if needed
4. Save the file

#### User Configuration

**File: `src/data/users-config.json`**

This file contains test user credentials. Update with valid test accounts:

```json
[
  {
    "username": "testuser1@domain.com",
    "password": "SecurePassword123",
    "role": "case_worker"
  },
  {
    "username": "testuser2@domain.com", 
    "password": "SecurePassword456",
    "role": "administrator"
  }
]
```

**Security Note**: Never commit real passwords to version control. Use dedicated test accounts with minimal permissions.

#### Test Scenario Configuration

**File: `src/config/autotest.json`**

Contains ONLY scenario execution shapes (executors, VUs, durations). **Performance thresholds are NOT defined here anymore** – they are centrally governed in `src/config/performance-thresholds.json`.

Minimal example (abridged):

```json
{
  "scenarios": {
    "smoke_test": { "executor": "constant-vus", "vus": 1, "duration": "30s" },
    "load_test":  { "executor": "ramping-vus", "startVUs": 1, "stages": [
      { "duration": "1m", "target": 5 },
      { "duration": "2m", "target": 5 },
      { "duration": "1m", "target": 0 }
    ] }
  }
}
```

> Note: Any legacy `thresholds` block previously present here has been removed to enforce single-source-of-truth governance.

#### Central Performance Thresholds & uiBands

All performance SLOs (k6 pass/fail thresholds) and presentation bands (Good/Watch/Investigate) live in:

```text
src/config/performance-thresholds.json
```

Structure (abridged):

```json
{
  "defaults": { "k6": { "http_req_duration": { "p95": 3000, "p99": 6000 }, "http_req_failed": { "rate": 0.05 } } },
  "operations": { "Create Case": { "k6": { "group_duration{group:::Create New Case}": { "p95": 3000 } } } },
  "uiBands": { "latencyMs": { "good": 800, "watch": 2000, "investigate": 2000 } }
}
```

| Section | Purpose |
|---------|---------|
| `defaults.k6` | Global p95/p99 + error/check failure targets applied to all operations unless overridden. |
| `operations` | Optional operation-specific group overrides for more granular SLOs. |
| `uiBands` | Drives HTML report coloring (does not influence test exit code). |

#### Validation & Governance

Automated scripts enforce correctness and prevent regression to inline thresholds:

| Command | Purpose |
|---------|---------|
| `npm run validate:thresholds` | Schema & ordering validation for `performance-thresholds.json`. |
| `npm run validate:no-inline-thresholds` | Scans test sources for disallowed inline `thresholds:` blocks. |
| `npm run validate:perf` | Runs both validations (recommended before commit). |

Husky `pre-commit` hook (installed via `npm run prepare`) automatically runs `validate:perf` and blocks non‑compliant commits.

Recommended workflow for changing a threshold:

1. Edit `performance-thresholds.json` (adjust `defaults`, add an `operations` entry, or tune `uiBands`).
2. Run `npm run validate:perf`.
3. Commit changes (hook re-validates).
4. Re-run representative tests and open the HTML report to review updated colors and pass/fail.

> Policy: Do not add `thresholds:` inside test files—central governance ensures consistency and reviewability.

## Verification & Testing

### 1. Installation Verification

Run the verification script to ensure everything is properly installed:

```bash
# Check all dependencies
npm run lint --version
npm run format --version  

# Verify K6 installation
k6 version

# Check Node.js version
node --version
npm --version
```

### 2. Configuration Test

Test the configuration loading:

```bash
# Test basic configuration
k6 run --dry-run tests/api/cases/create-sak.js

# Should show:
# - Test file loaded successfully
# - Configuration loaded
# - No execution (dry run)
```

### 3. First Test Run

Execute your first test to verify the complete setup:

```bash
# Run simple smoke test
npm run simple

# Expected output:
# ✓ Test execution completes without errors
# ✓ Report generated in src/reports/
# ✓ Performance metrics displayed
```

**Successful Test Indicators:**

- No error messages during execution
- Test completes with metrics summary
- HTML report generated in `src/reports/`
- Success rate > 95%

### 4. Report Verification

Check that reports are generated correctly:

```bash
# Open the generated report
npm run report:open

# Should open HTML report in default browser showing:
# - Performance metrics dashboard
# - Test execution timeline  
# - Error analysis (if any)
# - Threshold compliance status
```

## Environment-Specific Setup

### Development Environment

For development and testing of the framework itself:

```bash
# Install additional development tools
npm install --save-dev eslint-config-airbnb
npm install --save-dev @eslint/js

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run format"

# Configure IDE settings (VS Code)
# Add to .vscode/settings.json:
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"]
}
```

### CI/CD Environment

For automated testing in build pipelines:

```bash
# Install dependencies (in CI script)
npm ci

# Run tests with CI-friendly output
npm run test:simple -- --quiet --no-color

# Generate reports for CI artifacts
npm run test:load
cp src/reports/* $CI_ARTIFACTS_DIR/
```

### Production Monitoring

For production performance validation:

```bash
# Configure production environment
# Add / update prod entry in src/config/environments.json

# (Optional) Add prod scenario file if load pattern differs: src/config/prod.json
# Do NOT duplicate thresholds – they remain in performance-thresholds.json

# Run production smoke test (ensure appropriate credentials & safety)
npm run test:prod:smoke
```

When production performance expectations change, adjust only `performance-thresholds.json` (not per-environment scenario files) so governance stays centralized.

## Troubleshooting Installation

### Common Issues

#### K6 Installation Issues

**Problem**: K6 not found in PATH
 
```bash
# Windows - Add K6 to PATH manually
$env:PATH += ";C:\Program Files\k6"

# macOS/Linux - Check installation location
which k6
# If not found, reinstall using package manager
```

**Problem**: K6 version compatibility
 
```bash
# Check K6 version
k6 version

# If version < 0.40.0, update:
# Windows: choco upgrade k6
# macOS: brew upgrade k6  
# Linux: Follow installation steps again
```

#### Node.js Issues

**Problem**: Node version too old
 
```bash
# Check current version
node --version

# Upgrade Node.js:
# Windows: Download latest from nodejs.org
# macOS: brew upgrade node
# Linux: Use NodeSource repository for latest
```

**Problem**: npm permissions (Linux/macOS)
 
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

#### Framework Issues

**Problem**: Dependencies installation fails
 
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Tests fail immediately
 
```bash
# Check configuration files exist
ls src/config/
ls src/data/

# Verify user credentials format
cat src/data/users-config.json

# Test with verbose output
npm run test:simple -- --verbose
```

#### Configuration Issues

**Problem**: Authentication failures

1. Verify user credentials in `src/data/users-config.json`
2. Test credentials manually in target application
3. Check environment URLs in `src/config/environments.json`
4. Confirm network connectivity to target environment

**Problem**: Permission denied errors

1. Check file permissions: `chmod +x` on script files
2. Verify user account has required permissions in target system
3. Check firewall/proxy settings

### Environment Variables

Set environment variables for easier troubleshooting:

```bash
# Enable debug logging
export DEBUG=k6*

# Set custom configuration
export CONFIG_ENV=dev
export SCENARIO=smoke_test

# Enable verbose reporting
export ENABLE_VERBOSE_REPORT=true
```

### Getting Help

If you encounter issues not covered here:

1. **Check Configuration**: Verify all configuration files are properly formatted
2. **Review Logs**: Examine console output for specific error messages
3. **Test Incrementally**: Start with simple tests before complex scenarios
4. **Environment Check**: Ensure target environment is accessible and responsive

## Next Steps

After successful installation:

1. **Read the README**: Review `README.md` for overview and quick start
2. **Explore Commands**: Check `documents/NPM-COMMANDS-REFERENCE.md` for all available commands
3. **Understand Metrics**: Read `documents/METRICS-GUIDE.md` for performance analysis
4. **Review Architecture**: Study `documents/ARCHITECTURE.md` for system understanding

## Maintenance

### Regular Updates

Keep the framework updated:

```bash
# Update npm dependencies
npm update

# Update K6
# Windows: choco upgrade k6
# macOS: brew upgrade k6
# Linux: Follow installation steps for latest version

# Update Node.js when needed
# Check for LTS releases at nodejs.org
```

### Health Checks

Periodically verify the installation:

```bash
# Monthly health check
npm run simple
npm run report:open

# Verify all components working
npm run lint
npm run format
```

This completes the installation and setup process. You should now have a fully functional performance testing framework ready for use.
