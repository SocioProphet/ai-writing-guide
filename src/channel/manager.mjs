/**
 * Channel Manager
 *
 * Manages the distribution channel (stable vs edge) for AIWG.
 * - Stable: Uses the npm-installed package
 * - Edge: Uses a git clone of the main branch for bleeding-edge updates
 *
 * @module src/channel/manager
 * @version 2024.12.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration paths
const CONFIG_DIR = path.join(os.homedir(), '.aiwg');
const CONFIG_FILE = path.join(CONFIG_DIR, 'channel.json');
const EDGE_INSTALL_PATH = path.join(os.homedir(), '.local', 'share', 'ai-writing-guide');
const REPO_URL = 'https://github.com/jmagly/aiwg.git';

/**
 * Default channel configuration
 */
const DEFAULT_CONFIG = {
  channel: 'stable',
  edgePath: EDGE_INSTALL_PATH,
  lastUpdateCheck: null,
  updateCheckInterval: 86400000, // 24 hours in ms
};

/**
 * Get the package root directory
 * @returns {string} Path to package root
 */
export function getPackageRoot() {
  // Go up from src/channel to package root
  return path.resolve(__dirname, '..', '..');
}

/**
 * Load channel configuration
 * @returns {Promise<object>} Channel configuration
 */
export async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save channel configuration
 * @param {object} config - Configuration to save
 */
export async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the current channel
 * @returns {Promise<string>} 'stable' or 'edge'
 */
export async function getChannel() {
  const config = await loadConfig();
  return config.channel;
}

/**
 * Get the framework root path based on current channel
 * @returns {Promise<string>} Path to framework root
 */
export async function getFrameworkRoot() {
  const config = await loadConfig();

  if (config.channel === 'edge') {
    // Check if edge installation exists
    try {
      await fs.access(config.edgePath);
      return config.edgePath;
    } catch {
      // Edge path doesn't exist, fall back to stable
      console.warn('Edge installation not found, using stable channel');
      return getPackageRoot();
    }
  }

  return getPackageRoot();
}

/**
 * Switch to edge (bleeding edge) channel
 * Clones or updates the git repository for latest main branch
 */
export async function switchToEdge() {
  const config = await loadConfig();

  console.log('Switching to edge channel (bleeding edge from main branch)...');
  console.log('');

  // Check if edge installation exists
  const edgeExists = await fs.access(config.edgePath).then(() => true).catch(() => false);

  if (edgeExists) {
    // Update existing installation
    console.log(`Updating edge installation at ${config.edgePath}...`);
    try {
      execSync('git fetch --all', { cwd: config.edgePath, stdio: 'inherit' });
      execSync('git checkout main', { cwd: config.edgePath, stdio: 'inherit' });
      execSync('git pull --ff-only', { cwd: config.edgePath, stdio: 'inherit' });
      // Ensure sparse checkout excludes .aiwg/ on existing installs
      try {
        const sparseConfig = path.join(config.edgePath, '.git', 'info', 'sparse-checkout');
        const hasSparse = await fs.access(sparseConfig).then(() => true).catch(() => false);
        if (!hasSparse) {
          execSync('git sparse-checkout init --cone', { cwd: config.edgePath, stdio: 'pipe' });
          execSync('git sparse-checkout set --no-cone "/*" "!/.aiwg"', { cwd: config.edgePath, stdio: 'pipe' });
        }
      } catch {
        // Sparse checkout is optional — older git may not support it
      }
      console.log('Edge installation updated successfully.');
    } catch (error) {
      console.error('Failed to update edge installation:', error.message);
      console.log('Try removing the directory and running again:');
      console.log(`  rm -rf ${config.edgePath}`);
      console.log('  aiwg --use-main');
      process.exit(1);
    }
  } else {
    // Clone fresh
    console.log(`Cloning repository to ${config.edgePath}...`);
    await fs.mkdir(path.dirname(config.edgePath), { recursive: true });
    try {
      execSync(`git clone --branch main ${REPO_URL} "${config.edgePath}"`, { stdio: 'inherit' });
      // Exclude dogfooding artifacts from edge clones — users want framework source only
      try {
        execSync('git sparse-checkout init --cone', { cwd: config.edgePath, stdio: 'pipe' });
        execSync('git sparse-checkout set --no-cone "/*" "!/.aiwg"', { cwd: config.edgePath, stdio: 'pipe' });
      } catch {
        // Sparse checkout is optional — older git versions may not support it
        console.log('Note: sparse checkout not available, .aiwg/ will be present in edge install.');
      }
      console.log('Edge installation created successfully.');
    } catch (error) {
      console.error('Failed to clone repository:', error.message);
      process.exit(1);
    }
  }

  // Update config
  config.channel = 'edge';
  await saveConfig(config);

  console.log('');
  console.log('Switched to edge channel.');
  console.log('You are now using the latest code from the main branch.');
  console.log('');
  console.log('To update edge installation: aiwg -update');
  console.log('To switch back to stable:   aiwg --use-stable');
}

/**
 * Switch to dev mode (use local repo as framework source)
 * @param {string} devPath - Path to the local development repository
 */
export async function switchToDev(devPath) {
  const config = await loadConfig();

  const resolvedPath = path.resolve(devPath);

  console.log('Switching to dev mode (local repository source)...');
  console.log('');

  // Verify the path looks like an AIWG repo
  try {
    await fs.access(path.join(resolvedPath, 'agentic', 'code', 'frameworks'));
  } catch {
    console.error(`Error: ${resolvedPath} does not appear to be an AIWG repository.`);
    console.error('Expected to find agentic/code/frameworks/ directory.');
    process.exit(1);
  }

  config.channel = 'edge';
  config.edgePath = resolvedPath;
  config.devMode = true;
  await saveConfig(config);

  console.log('Switched to dev mode.');
  console.log(`Framework source: ${resolvedPath}`);
  console.log('');
  console.log('Commands:');
  console.log('  aiwg use all          Deploy from local source');
  console.log('  aiwg version          Verify dev mode active');
  console.log('  aiwg --use-stable     Switch back to npm package');
}

/**
 * Switch to stable (npm) channel
 */
export async function switchToStable() {
  const config = await loadConfig();

  console.log('Switching to stable channel (npm package)...');
  console.log('');

  config.channel = 'stable';
  config.devMode = false;
  await saveConfig(config);

  console.log('Switched to stable channel.');
  console.log('You are now using the npm-installed package.');
  console.log('');
  console.log('To update: npm update -g aiwg');
  console.log('To switch to edge: aiwg --use-main');
}

/**
 * Get version information based on current channel
 * @returns {Promise<object>} Version info
 */
export async function getVersionInfo() {
  const config = await loadConfig();
  const packageRoot = getPackageRoot();

  // Read package.json version
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  const info = {
    version: packageJson.version,
    channel: config.channel,
    packageRoot,
    devMode: config.devMode || false,
  };

  if (config.channel === 'edge') {
    // Get git info for edge channel
    try {
      const gitHash = execSync('git rev-parse --short HEAD', {
        cwd: config.edgePath,
        encoding: 'utf8',
      }).trim();
      const gitBranch = execSync('git branch --show-current', {
        cwd: config.edgePath,
        encoding: 'utf8',
      }).trim();
      info.edgePath = config.edgePath;
      info.gitHash = gitHash;
      info.gitBranch = gitBranch;
    } catch {
      // Git info not available
    }
  }

  return info;
}

/**
 * Update the edge installation from git
 */
export async function updateEdge() {
  const config = await loadConfig();

  if (config.channel !== 'edge') {
    console.log('Not in edge channel. Use npm update -g aiwg for stable channel.');
    return;
  }

  console.log('Updating edge installation...');

  try {
    execSync('git fetch --all', { cwd: config.edgePath, stdio: 'inherit' });
    execSync('git pull --ff-only', { cwd: config.edgePath, stdio: 'inherit' });
    console.log('');
    console.log('Edge installation updated successfully.');
  } catch (error) {
    console.error('Update failed:', error.message);
    console.log('');
    console.log('If you have local changes, try:');
    console.log(`  cd ${config.edgePath}`);
    console.log('  git stash');
    console.log('  git pull');
    console.log('  git stash pop');
    process.exit(1);
  }
}
