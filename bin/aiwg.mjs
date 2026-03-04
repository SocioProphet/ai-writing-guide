#!/usr/bin/env node

/**
 * AIWG CLI Entry Point
 *
 * This is the main entry point for the aiwg CLI when installed via npm.
 * It handles:
 * - Channel detection (stable vs edge mode)
 * - Background update checking
 * - Command routing to appropriate handlers (via facade)
 *
 * The facade allows switching between legacy and new routers via:
 * - AIWG_USE_NEW_ROUTER environment variable
 * - --experimental-router or --legacy-router CLI flags
 *
 * @module bin/aiwg
 * @version 2026.1.7
 * @implements @.aiwg/requirements/use-cases/UC-004-extension-system.md
 * @source @src/cli/facade.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { run } from '../src/cli/facade.mjs';
import { checkForUpdates } from '../src/update/checker.mjs';
import { getChannel, getPackageRoot } from '../src/channel/manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the package root (where package.json lives)
const packageRoot = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);

  // Handle special channel switching commands first
  if (args[0] === '--use-main' || args[0] === '--use-edge') {
    const { switchToEdge } = await import('../src/channel/manager.mjs');
    await switchToEdge();
    return;
  }

  if (args[0] === '--use-dev') {
    const { switchToDev } = await import('../src/channel/manager.mjs');
    // Accept optional path argument, default to cwd
    const devPath = args[1] || process.cwd();
    await switchToDev(devPath);
    return;
  }

  if (args[0] === '--use-stable' || args[0] === '--use-npm') {
    const { switchToStable } = await import('../src/channel/manager.mjs');
    await switchToStable();
    return;
  }

  // Non-blocking update check (runs in background)
  checkForUpdates().catch(() => {
    // Silently ignore update check failures
  });

  // Dev mode: delegate to the dev repo's CLI facade so all code runs from
  // the local build (not just framework content). This ensures commands like
  // `aiwg index stats` use the locally compiled TypeScript.
  const { loadConfig } = await import('../src/channel/manager.mjs');
  const config = await loadConfig();
  if (config.devMode && config.edgePath && config.edgePath !== packageRoot) {
    const devFacade = path.join(config.edgePath, 'src', 'cli', 'facade.mjs');
    try {
      const { run: devRun } = await import(devFacade);
      await devRun(args, { cwd: process.cwd() });
      return;
    } catch (err) {
      console.error(`Dev mode: failed to load facade from ${config.edgePath}`);
      console.error(`  ${err.message}`);
      console.error('Falling back to installed version.');
    }
  }

  // Run the CLI via facade (supports both legacy and new routers)
  await run(args, { cwd: process.cwd() });
}

main().catch((error) => {
  console.error('Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
