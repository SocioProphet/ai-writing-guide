#!/usr/bin/env node
/**
 * Stub CLI for ralph-external e2e tests.
 *
 * Mimics claude --output-format stream-json output, emitting a completion
 * marker that analyzeWithPatterns() detects, then exits.
 *
 * Flags:
 *   --stub-fail     Exit non-zero with no completion marker
 *   --stub-crash    Write partial output then exit 1
 */

const args = process.argv.slice(2);
const shouldFail = args.includes('--stub-fail');
const shouldCrash = args.includes('--stub-crash');

// Emit stream-json style lines (what claude --output-format stream-json produces)
const messages = [
  JSON.stringify({ type: 'system', subtype: 'init', session_id: 'stub-session-001' }),
  JSON.stringify({ type: 'assistant', message: 'Working on the task...' }),
  JSON.stringify({ type: 'assistant', message: 'Making progress on the objective.' }),
];

for (const msg of messages) {
  process.stdout.write(msg + '\n');
}

if (shouldCrash) {
  process.stderr.write('Error: unexpected termination\n');
  process.exit(1);
}

if (!shouldFail) {
  // Emit completion marker that analyzeWithPatterns() detects via COMPLETION_PATTERNS
  process.stdout.write(JSON.stringify({
    ralph_external_completion: true,
    success: true,
    reason: 'Stub task completed successfully',
  }) + '\n');

  process.stdout.write(JSON.stringify({
    type: 'result',
    subtype: 'success',
    result: 'Task completed',
  }) + '\n');
}

process.exit(shouldFail ? 1 : 0);
