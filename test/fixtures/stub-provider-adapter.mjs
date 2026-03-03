/**
 * Stub ProviderAdapter for ralph-external e2e tests.
 *
 * Routes session launches to ralph-stub-cli.mjs instead of a real CLI binary.
 * Uses process.execPath (Node.js) as the binary so spawn() runs our stub script.
 */

import { ProviderAdapter, registerProvider } from '../../tools/ralph-external/lib/provider-adapter.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUB_CLI = join(__dirname, 'ralph-stub-cli.mjs');

/** @type {string[]} */
let _defaultStubFlags = [];

export class StubProviderAdapter extends ProviderAdapter {
  constructor(options = {}) {
    super();
    this.stubFlags = options.stubFlags || [];
  }

  getBinary() {
    return process.execPath; // Node.js binary
  }

  getName() {
    return 'stub';
  }

  getCapabilities() {
    return {
      streamJson: true,
      sessionResume: false,
      budgetControl: false,
      systemPrompt: false,
      agentMode: false,
      mcpConfig: false,
      maxTurns: false,
    };
  }

  buildSessionArgs(_options) {
    return [STUB_CLI, ...this.stubFlags];
  }

  buildAnalysisArgs(_options) {
    // Analysis calls also go through the stub (will fail gracefully,
    // triggering pattern-matching fallback in OutputAnalyzer)
    return [STUB_CLI];
  }

  mapModel(_genericModel) {
    return 'stub-model';
  }

  getEnvOverrides() {
    // Unset CLAUDECODE to prevent "cannot be launched inside another session" errors
    // when the test runner itself is inside Claude Code
    return { CI: 'true', CLAUDECODE: '' };
  }

  getTranscriptPath(_sessionId, _workingDir) {
    return null;
  }
}

/**
 * Register the stub provider so orchestrator.execute({ provider: 'stub' }) works.
 * Accepts optional default flags for the stub CLI (e.g., ['--stub-fail']).
 *
 * @param {string[]} [stubFlags] - Default flags to pass to ralph-stub-cli.mjs
 */
export function registerStubProvider(stubFlags = []) {
  _defaultStubFlags = stubFlags;
  registerProvider('stub', () => new StubProviderAdapter({ stubFlags: _defaultStubFlags }));
}
