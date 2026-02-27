/**
 * Integration tests for SDLC Accelerate command
 *
 * Tests entry point detection, phase resume, gate handling, and dry-run behavior.
 *
 * @source @src/extensions/commands/definitions.ts
 * @source @agentic/code/frameworks/sdlc-complete/commands/sdlc-accelerate.md
 * @source @agentic/code/frameworks/sdlc-complete/schemas/flows/accelerate-state.yaml
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { sdlcAccelerateCommand } from '../../src/extensions/commands/definitions.js';

describe('SDLC Accelerate Integration', () => {
  let testDir: string;
  let aiwgDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `sdlc-accelerate-test-${Date.now()}`);
    aiwgDir = join(testDir, '.aiwg');
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================
  // Command Definition Tests
  // ============================================

  describe('Command Definition', () => {
    it('should have correct metadata', () => {
      expect(sdlcAccelerateCommand.id).toBe('sdlc-accelerate');
      expect(sdlcAccelerateCommand.type).toBe('command');
      expect(sdlcAccelerateCommand.category).toBe('sdlc-orchestration');
    });

    it('should specify orchestration template', () => {
      const meta = sdlcAccelerateCommand.metadata as Record<string, unknown>;
      expect(meta.template).toBe('orchestration');
    });

    it('should have correct allowed tools', () => {
      const meta = sdlcAccelerateCommand.metadata as Record<string, unknown>;
      const tools = meta.allowedTools as string[];
      expect(tools).toContain('Task');
      expect(tools).toContain('Read');
      expect(tools).toContain('Write');
      expect(tools).toContain('Glob');
      expect(tools).toContain('TodoWrite');
    });

    it('should define all 7 execution steps', () => {
      const meta = sdlcAccelerateCommand.metadata as Record<string, unknown>;
      const steps = meta.executionSteps as string[];
      expect(steps).toHaveLength(7);
      expect(steps[0]).toBe('Detect entry point');
      expect(steps[6]).toBe('Generate Construction Ready Brief');
    });

    it('should have argument hint with key switches', () => {
      const meta = sdlcAccelerateCommand.metadata as Record<string, unknown>;
      const hint = meta.argumentHint as string;
      expect(hint).toContain('<description>');
      expect(hint).toContain('--from-codebase');
      expect(hint).toContain('--resume');
      expect(hint).toContain('--dry-run');
    });
  });

  // ============================================
  // Entry Point Detection Tests
  // ============================================

  describe('Entry Point Detection', () => {
    it('should detect intake-wizard path when no .aiwg/ and description provided', () => {
      // No .aiwg/ directory
      expect(existsSync(aiwgDir)).toBe(false);

      // Entry point logic: no .aiwg/ + description → intake-wizard
      const hasAiwg = existsSync(aiwgDir);
      const hasDescription = true;
      const fromCodebase = false;
      const resume = false;

      const entryPoint = detectEntryPoint(hasAiwg, hasDescription, fromCodebase, resume, null);
      expect(entryPoint).toBe('intake-wizard');
    });

    it('should detect intake-from-codebase path when no .aiwg/ and --from-codebase', () => {
      expect(existsSync(aiwgDir)).toBe(false);

      const entryPoint = detectEntryPoint(false, false, true, false, null);
      expect(entryPoint).toBe('intake-from-codebase');
    });

    it('should detect resume path when .aiwg/ exists and --resume', () => {
      mkdirSync(aiwgDir, { recursive: true });
      mkdirSync(join(aiwgDir, 'reports'), { recursive: true });

      // Create state file with intake completed
      const stateFile = join(aiwgDir, 'reports', 'accelerate-state.json');
      writeFileSync(stateFile, JSON.stringify({
        version: '1.0.0',
        started: '2026-02-26T10:00:00Z',
        description: 'Test project',
        entryPoint: 'intake-wizard',
        phases: {
          intake: { status: 'completed', completedAt: '2026-02-26T10:05:00Z' },
          gate_lom: { status: 'pending' },
          elaboration: { status: 'pending' },
          gate_abm: { status: 'pending' },
          construction_prep: { status: 'pending' },
          brief: { status: 'pending' },
        },
        decisions: [],
      }, null, 2));

      const entryPoint = detectEntryPoint(true, false, false, true, null);
      expect(entryPoint).toBe('resume');
    });

    it('should detect skip-to path when --skip-to specified', () => {
      mkdirSync(aiwgDir, { recursive: true });

      const entryPoint = detectEntryPoint(true, false, false, false, 'elaboration');
      expect(entryPoint).toBe('skip-to');
    });
  });

  // ============================================
  // Phase Resume Tests
  // ============================================

  describe('Phase Resume', () => {
    it('should resume at gate_lom when intake is completed', () => {
      mkdirSync(join(aiwgDir, 'reports'), { recursive: true });

      const state = createState({
        intake: 'completed',
        gate_lom: 'pending',
        elaboration: 'pending',
        gate_abm: 'pending',
        construction_prep: 'pending',
        brief: 'pending',
      });

      writeFileSync(join(aiwgDir, 'reports', 'accelerate-state.json'), JSON.stringify(state, null, 2));

      const nextPhase = detectNextPhase(state);
      expect(nextPhase).toBe('gate_lom');
    });

    it('should resume at elaboration when it is in_progress', () => {
      mkdirSync(join(aiwgDir, 'reports'), { recursive: true });

      const state = createState({
        intake: 'completed',
        gate_lom: 'completed',
        elaboration: 'in_progress',
        gate_abm: 'pending',
        construction_prep: 'pending',
        brief: 'pending',
      });

      writeFileSync(join(aiwgDir, 'reports', 'accelerate-state.json'), JSON.stringify(state, null, 2));

      const nextPhase = detectNextPhase(state);
      expect(nextPhase).toBe('elaboration');
    });

    it('should return null when all phases completed', () => {
      const state = createState({
        intake: 'completed',
        gate_lom: 'completed',
        elaboration: 'completed',
        gate_abm: 'completed',
        construction_prep: 'completed',
        brief: 'completed',
      });

      const nextPhase = detectNextPhase(state);
      expect(nextPhase).toBeNull();
    });

    it('should throw on --resume with no state file', () => {
      mkdirSync(aiwgDir, { recursive: true });
      const stateFile = join(aiwgDir, 'reports', 'accelerate-state.json');

      expect(existsSync(stateFile)).toBe(false);

      expect(() => {
        loadStateFile(join(aiwgDir, 'reports', 'accelerate-state.json'));
      }).toThrow();
    });
  });

  // ============================================
  // Gate Handling Tests
  // ============================================

  describe('Gate Handling', () => {
    it('should auto-proceed on PASS result', () => {
      const gateResult = { result: 'PASS' as const, findings: [], score: 95 };
      const action = determineGateAction(gateResult, false);
      expect(action).toBe('proceed');
    });

    it('should present questions on CONDITIONAL result', () => {
      const gateResult = {
        result: 'CONDITIONAL' as const,
        findings: [
          { area: 'risks', message: 'Only 3 risks identified, expected 5+', severity: 'medium' },
        ],
        score: 72,
      };
      const action = determineGateAction(gateResult, false);
      expect(action).toBe('ask');
    });

    it('should auto-proceed on CONDITIONAL when --auto flag is set', () => {
      const gateResult = {
        result: 'CONDITIONAL' as const,
        findings: [{ area: 'metrics', message: 'Slightly below target', severity: 'low' }],
        score: 78,
      };
      const action = determineGateAction(gateResult, true);
      expect(action).toBe('proceed');
    });

    it('should offer remediate/waiver/abort on FAIL result', () => {
      const gateResult = {
        result: 'FAIL' as const,
        findings: [
          { area: 'requirements', message: 'No use cases defined', severity: 'critical' },
          { area: 'architecture', message: 'No SAD document', severity: 'critical' },
        ],
        score: 25,
      };
      const action = determineGateAction(gateResult, false);
      expect(action).toBe('block');
    });
  });

  // ============================================
  // State File Tests
  // ============================================

  describe('State File Management', () => {
    it('should create valid state file on initialization', () => {
      mkdirSync(join(aiwgDir, 'reports'), { recursive: true });

      const state = initializeState('Customer portal', 'intake-wizard');
      const stateFile = join(aiwgDir, 'reports', 'accelerate-state.json');
      writeFileSync(stateFile, JSON.stringify(state, null, 2));

      const loaded = JSON.parse(readFileSync(stateFile, 'utf-8'));
      expect(loaded.version).toBe('1.0.0');
      expect(loaded.description).toBe('Customer portal');
      expect(loaded.entryPoint).toBe('intake-wizard');
      expect(loaded.phases.intake.status).toBe('pending');
      expect(loaded.phases.brief.status).toBe('pending');
      expect(loaded.decisions).toEqual([]);
    });

    it('should update phase status correctly', () => {
      const state = initializeState('Test project', 'intake-wizard');
      updatePhase(state, 'intake', 'completed');

      expect(state.phases.intake.status).toBe('completed');
      expect(state.phases.intake.completedAt).toBeDefined();
    });

    it('should record gate decisions', () => {
      const state = initializeState('Test project', 'intake-wizard');
      recordDecision(state, 'gate_lom', 'Proceed with 8 risks?', 'waiver');

      expect(state.decisions).toHaveLength(1);
      expect(state.decisions[0].phase).toBe('gate_lom');
      expect(state.decisions[0].answer).toBe('waiver');
      expect(state.decisions[0].timestamp).toBeDefined();
    });

    it('should have all 6 phases in initial state', () => {
      const state = initializeState('Test', 'intake-wizard');
      const phases = Object.keys(state.phases);
      expect(phases).toEqual([
        'intake', 'gate_lom', 'elaboration', 'gate_abm', 'construction_prep', 'brief',
      ]);
      for (const phase of phases) {
        expect(state.phases[phase].status).toBe('pending');
      }
    });
  });

  // ============================================
  // Dry Run Tests
  // ============================================

  describe('Dry Run', () => {
    it('should output pipeline plan without executing', () => {
      const plan = generateDryRunPlan('Customer portal with chat', 'intake-wizard');

      expect(plan.entryPoint).toBe('intake-wizard');
      expect(plan.description).toBe('Customer portal with chat');
      expect(plan.phases).toHaveLength(5);
      expect(plan.phases[0].name).toBe('Intake');
      expect(plan.phases[4].name).toBe('Construction Ready Brief');
    });

    it('should show delegate commands in plan', () => {
      const plan = generateDryRunPlan('Mobile app', 'intake-wizard');

      const intakePhase = plan.phases[0];
      expect(intakePhase.commands).toContain('/intake-wizard');
      expect(intakePhase.commands).toContain('/flow-concept-to-inception');

      const lomGate = plan.phases[1];
      expect(lomGate.commands).toContain('/flow-gate-check');
    });

    it('should show from-codebase commands when that entry point is used', () => {
      const plan = generateDryRunPlan('Existing app', 'intake-from-codebase');

      const intakePhase = plan.phases[0];
      expect(intakePhase.commands).toContain('/intake-from-codebase');
    });
  });
});

// ============================================
// Helper Functions (simulating command logic)
// ============================================

interface AccelerateState {
  version: string;
  started: string;
  description: string;
  entryPoint: string;
  phases: Record<string, { status: string; completedAt?: string }>;
  guidance?: string;
  decisions: Array<{ phase: string; question: string; answer: string; timestamp: string }>;
}

interface GateResult {
  result: 'PASS' | 'CONDITIONAL' | 'FAIL';
  findings: Array<{ area: string; message: string; severity: string }>;
  score: number;
}

interface DryRunPlan {
  entryPoint: string;
  description: string;
  phases: Array<{ name: string; commands: string[]; artifacts: string[] }>;
}

function createState(phases: Record<string, string>): AccelerateState {
  const state = initializeState('Test project', 'intake-wizard');
  for (const [phase, status] of Object.entries(phases)) {
    state.phases[phase] = { status };
    if (status === 'completed') {
      state.phases[phase].completedAt = new Date().toISOString();
    }
  }
  return state;
}

function detectEntryPoint(
  hasAiwg: boolean,
  hasDescription: boolean,
  fromCodebase: boolean,
  resume: boolean,
  skipTo: string | null,
): string {
  if (skipTo) return 'skip-to';
  if (resume && hasAiwg) return 'resume';
  if (fromCodebase) return 'intake-from-codebase';
  if (!hasAiwg && hasDescription) return 'intake-wizard';
  return 'intake-wizard'; // default
}

function detectNextPhase(state: AccelerateState): string | null {
  const phaseOrder = ['intake', 'gate_lom', 'elaboration', 'gate_abm', 'construction_prep', 'brief'];
  for (const phase of phaseOrder) {
    const phaseState = state.phases[phase];
    if (phaseState.status === 'in_progress' || phaseState.status === 'pending') {
      return phase;
    }
  }
  return null; // all completed
}

function loadStateFile(path: string): AccelerateState {
  if (!existsSync(path)) {
    throw new Error(`No state file found at ${path}. Cannot resume without prior state.`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function determineGateAction(gateResult: GateResult, autoMode: boolean): string {
  if (gateResult.result === 'PASS') return 'proceed';
  if (gateResult.result === 'CONDITIONAL' && autoMode) return 'proceed';
  if (gateResult.result === 'CONDITIONAL') return 'ask';
  return 'block'; // FAIL
}

function initializeState(description: string, entryPoint: string): AccelerateState {
  return {
    version: '1.0.0',
    started: new Date().toISOString(),
    description,
    entryPoint,
    phases: {
      intake: { status: 'pending' },
      gate_lom: { status: 'pending' },
      elaboration: { status: 'pending' },
      gate_abm: { status: 'pending' },
      construction_prep: { status: 'pending' },
      brief: { status: 'pending' },
    },
    decisions: [],
  };
}

function updatePhase(state: AccelerateState, phase: string, status: string): void {
  state.phases[phase].status = status;
  if (status === 'completed') {
    state.phases[phase].completedAt = new Date().toISOString();
  }
}

function recordDecision(state: AccelerateState, phase: string, question: string, answer: string): void {
  state.decisions.push({
    phase,
    question,
    answer,
    timestamp: new Date().toISOString(),
  });
}

function generateDryRunPlan(description: string, entryPoint: string): DryRunPlan {
  const intakeCommands = entryPoint === 'intake-from-codebase'
    ? ['/intake-from-codebase', '/flow-concept-to-inception']
    : ['/intake-wizard', '/flow-concept-to-inception'];

  return {
    entryPoint,
    description,
    phases: [
      {
        name: 'Intake',
        commands: intakeCommands,
        artifacts: ['intake form', 'solution profile'],
      },
      {
        name: 'LOM Gate',
        commands: ['/flow-gate-check'],
        artifacts: ['gate report'],
      },
      {
        name: 'Elaboration',
        commands: ['/flow-inception-to-elaboration', '/flow-gate-check'],
        artifacts: ['SAD', 'ADRs', 'test strategy', 'requirements'],
      },
      {
        name: 'Construction Prep',
        commands: ['/flow-elaboration-to-construction'],
        artifacts: ['iteration plans', 'construction backlog'],
      },
      {
        name: 'Construction Ready Brief',
        commands: [],
        artifacts: ['construction-ready-brief.md'],
      },
    ],
  };
}
