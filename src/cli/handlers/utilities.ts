/**
 * Utility Command Handlers
 *
 * Handlers for utility commands including card prefilling, contribution workflow,
 * metadata validation, health diagnostics, and update checking.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @tests @test/unit/cli/handlers/utilities.test.ts
 * @issue #33, #342
 */

import fs from 'fs';
import path from 'path';
import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';
import { forceUpdateCheck } from '../../update/checker.mjs';
import { useHandler as useFrameworkHandler } from './use.js';

/**
 * Maps framework registry IDs (e.g. 'sdlc-complete') to `aiwg use` names (e.g. 'sdlc').
 */
const REGISTRY_ID_TO_USE_NAME: Record<string, string> = {
  'sdlc-complete': 'sdlc',
  'media-marketing-kit': 'marketing',
  'media-curator': 'media-curator',
  'research-complete': 'research',
  'forensics-complete': 'forensics',
};

interface FrameworkRegistry {
  version: string;
  created: string;
  frameworks: Array<{
    id: string;
    installed: string;
    version: string;
  }>;
}

/**
 * Read the installed frameworks from the on-disk registry.
 */
function readFrameworkRegistry(cwd: string): FrameworkRegistry | null {
  const registryPath = path.join(cwd, '.aiwg', 'frameworks', 'registry.json');
  if (!fs.existsSync(registryPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Handler for prefill-cards command
 *
 * Prefills kanban cards with template data for project planning.
 *
 * Usage:
 *   aiwg -prefill-cards
 *   aiwg --prefill-cards
 *   aiwg -prefill-cards --board <board-name>
 */
export const prefillCardsHandler: CommandHandler = {
  id: 'prefill-cards',
  name: 'Prefill Cards',
  description: 'Prefill kanban cards with template data',
  category: 'utility',
  aliases: ['-prefill-cards', '--prefill-cards'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cards/prefill-cards.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for contribute-start command
 *
 * Starts a contribution workflow with issue tracking and branching.
 *
 * Usage:
 *   aiwg -contribute-start
 *   aiwg --contribute-start
 *   aiwg -contribute-start --issue <issue-number>
 */
export const contributeStartHandler: CommandHandler = {
  id: 'contribute-start',
  name: 'Start Contribution',
  description: 'Start a contribution workflow',
  category: 'utility',
  aliases: ['-contribute-start', '--contribute-start'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/contrib/start-contribution.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for validate-metadata command
 *
 * Validates metadata across framework components and artifacts.
 *
 * Usage:
 *   aiwg -validate-metadata
 *   aiwg --validate-metadata
 *   aiwg -validate-metadata --strict
 */
export const validateMetadataHandler: CommandHandler = {
  id: 'validate-metadata',
  name: 'Validate Metadata',
  description: 'Validate metadata across components',
  category: 'utility',
  aliases: ['-validate-metadata', '--validate-metadata'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/validate-metadata.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for doctor command
 *
 * Runs health diagnostics on the AIWG installation and workspace.
 *
 * Usage:
 *   aiwg doctor
 *   aiwg -doctor
 *   aiwg --doctor
 *   aiwg doctor --verbose
 */
export const doctorHandler: CommandHandler = {
  id: 'doctor',
  name: 'Doctor',
  description: 'Run health diagnostics',
  category: 'maintenance',
  aliases: ['-doctor', '--doctor'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const frameworkRoot = await getFrameworkRoot();
    const runner = createScriptRunner(frameworkRoot);

    return runner.run('tools/cli/doctor.mjs', ctx.args, {
      cwd: ctx.cwd,
    });
  },
};

/**
 * Handler for update command
 *
 * Updates AIWG and re-deploys installed frameworks/addons.
 * - Checks for npm/git updates first
 * - Reads .aiwg/frameworks/registry.json to detect installed items
 * - Re-deploys only those (preserving the user's current selection)
 * - Use --all to deploy everything (equivalent to `aiwg use all`)
 *
 * Usage:
 *   aiwg update                        # Update + re-deploy installed frameworks
 *   aiwg update --all                  # Update + deploy everything
 *   aiwg update --dry-run              # Show what would be updated
 *   aiwg update --provider <name>      # Pass through provider to deployment
 *   aiwg update --skip-check           # Skip npm/git update check, only re-deploy
 *
 * @issue #342
 */
export const updateHandler: CommandHandler = {
  id: 'update',
  name: 'Update',
  description: 'Update AIWG and re-deploy installed frameworks',
  category: 'maintenance',
  aliases: ['-update', '--update'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const args = ctx.args;
    const deployAll = args.includes('--all');
    const dryRun = args.includes('--dry-run');
    const skipCheck = args.includes('--skip-check');

    // Extract --provider value if present
    const providerIdx = args.findIndex(a => a === '--provider' || a === '--platform');
    const providerArgs = providerIdx >= 0 && args[providerIdx + 1]
      ? ['--provider', args[providerIdx + 1]]
      : [];

    // Step 1: Check for package updates (unless --skip-check)
    if (!skipCheck) {
      try {
        console.log('Checking for AIWG updates...\n');
        await forceUpdateCheck();
      } catch (error) {
        console.error(`Warning: Update check failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log('Continuing with re-deployment...\n');
      }
    }

    // Step 2: Determine what to re-deploy
    if (deployAll) {
      // --all: deploy everything (equivalent to `aiwg use all`)
      const frameworks = ['all'];
      if (dryRun) {
        console.log('Dry run: Would re-deploy all frameworks and addons');
        return { exitCode: 0 };
      }

      console.log('Re-deploying all frameworks and addons...\n');
      const result = await useFrameworkHandler.execute({
        ...ctx,
        args: [...frameworks, ...providerArgs],
      });
      return result;
    }

    // Read registry to determine installed frameworks
    const registry = readFrameworkRegistry(ctx.cwd);
    if (!registry || registry.frameworks.length === 0) {
      console.log('No frameworks found in .aiwg/frameworks/registry.json');
      console.log('');
      console.log('To deploy a framework first, run:');
      console.log('  aiwg use sdlc');
      console.log('  aiwg use marketing');
      console.log('  aiwg use all');
      return { exitCode: 0 };
    }

    // Map registry IDs to framework use-names
    const installedFrameworks: string[] = [];
    const unmapped: string[] = [];

    for (const fw of registry.frameworks) {
      const useName = REGISTRY_ID_TO_USE_NAME[fw.id];
      if (useName) {
        installedFrameworks.push(useName);
      } else {
        unmapped.push(fw.id);
      }
    }

    if (installedFrameworks.length === 0) {
      console.log('No recognized frameworks in registry');
      if (unmapped.length > 0) {
        console.log(`Unrecognized entries: ${unmapped.join(', ')}`);
      }
      return { exitCode: 0 };
    }

    // Report what will be updated
    console.log(`Installed frameworks: ${installedFrameworks.join(', ')}`);
    if (unmapped.length > 0) {
      console.log(`Skipping unrecognized: ${unmapped.join(', ')}`);
    }
    console.log('');

    if (dryRun) {
      console.log('Dry run: Would re-deploy the following frameworks:');
      for (const fw of installedFrameworks) {
        console.log(`  - ${fw}`);
      }
      return { exitCode: 0 };
    }

    // Step 3: Re-deploy each installed framework
    const results: Array<{ framework: string; exitCode: number }> = [];

    for (const fw of installedFrameworks) {
      console.log(`Re-deploying ${fw}...`);
      const result = await useFrameworkHandler.execute({
        ...ctx,
        args: [fw, ...providerArgs],
      });
      results.push({ framework: fw, exitCode: result.exitCode });

      if (result.exitCode !== 0) {
        console.error(`Warning: Failed to re-deploy ${fw}`);
      }
    }

    // Step 4: Report summary
    console.log('');
    console.log('Update Summary:');
    const succeeded = results.filter(r => r.exitCode === 0);
    const failed = results.filter(r => r.exitCode !== 0);

    for (const r of results) {
      const status = r.exitCode === 0 ? 'updated' : 'FAILED';
      console.log(`  ${r.framework}: ${status}`);
    }

    console.log('');
    console.log(`Updated: ${succeeded.length}/${results.length}`);

    return {
      exitCode: failed.length > 0 ? 1 : 0,
      message: failed.length > 0
        ? `Some frameworks failed to update: ${failed.map(f => f.framework).join(', ')}`
        : `Successfully updated ${succeeded.length} framework(s)`,
    };
  },
};

/**
 * All utility handlers
 */
export const utilityHandlers: CommandHandler[] = [
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,
  doctorHandler,
  updateHandler,
];
