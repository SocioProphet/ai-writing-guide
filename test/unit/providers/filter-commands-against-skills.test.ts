import { describe, it, expect } from 'vitest';
import path from 'path';

// Import the function under test
// @ts-expect-error - .mjs module
import { filterCommandsAgainstSkills } from '../../../tools/agents/providers/base.mjs';

describe('filterCommandsAgainstSkills', () => {
  it('returns all commands when no skills exist', () => {
    const commands = ['/src/commands/foo.md', '/src/commands/bar.md'];
    const result = filterCommandsAgainstSkills(commands, []);
    expect(result).toEqual(commands);
  });

  it('returns all commands when no commands exist', () => {
    const skills = ['/src/skills/foo'];
    const result = filterCommandsAgainstSkills([], skills);
    expect(result).toEqual([]);
  });

  it('filters out commands that share a name with a skill', () => {
    const commands = [
      '/src/commands/doc-sync.md',
      '/src/commands/issue-list.md',
      '/src/commands/ralph.md'
    ];
    const skills = [
      '/src/skills/doc-sync',
      '/src/skills/ralph'
    ];
    const result = filterCommandsAgainstSkills(commands, skills);
    expect(result).toEqual(['/src/commands/issue-list.md']);
  });

  it('keeps commands with no matching skill', () => {
    const commands = [
      '/src/commands/unique-command.md'
    ];
    const skills = [
      '/src/skills/different-skill'
    ];
    const result = filterCommandsAgainstSkills(commands, skills);
    expect(result).toEqual(['/src/commands/unique-command.md']);
  });

  it('handles different file extensions correctly', () => {
    const commands = [
      '/src/commands/foo.yaml',
      '/src/commands/bar.md'
    ];
    const skills = [
      '/src/skills/foo'
    ];
    const result = filterCommandsAgainstSkills(commands, skills);
    expect(result).toEqual(['/src/commands/bar.md']);
  });

  it('matches based on basename only, ignoring directory paths', () => {
    const commands = [
      '/completely/different/path/commands/shared-name.md'
    ];
    const skills = [
      '/another/path/skills/shared-name'
    ];
    const result = filterCommandsAgainstSkills(commands, skills);
    expect(result).toEqual([]);
  });

  it('is case-sensitive', () => {
    const commands = [
      '/src/commands/DocSync.md'
    ];
    const skills = [
      '/src/skills/doc-sync'
    ];
    // Different case should not match
    const result = filterCommandsAgainstSkills(commands, skills);
    expect(result).toEqual(['/src/commands/DocSync.md']);
  });
});
