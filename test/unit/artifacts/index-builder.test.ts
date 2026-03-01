/**
 * Artifact Index Builder Tests
 *
 * @source @src/artifacts/index-builder.ts
 * @implements #415
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFrontmatter, extractMentions, buildIndex } from '../../../src/artifacts/index-builder.js';
import { INDEX_DIR } from '../../../src/artifacts/types.js';

describe('Artifact Index Builder', () => {
  describe('parseFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
title: Test Document
type: use-case
tags:
  - auth
  - security
---
# Test

Body content here.`;
      const result = parseFrontmatter(content);
      expect(result.data.title).toBe('Test Document');
      expect(result.data.type).toBe('use-case');
      expect(result.data.tags).toEqual(['auth', 'security']);
      expect(result.body).toContain('# Test');
    });

    it('should return empty data for content without frontmatter', () => {
      const content = '# Just a heading\n\nSome content.';
      const result = parseFrontmatter(content);
      expect(result.data).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle malformed YAML gracefully', () => {
      const content = `---
invalid: yaml: [broken
---
# Body`;
      const result = parseFrontmatter(content);
      expect(result.data).toEqual({});
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---
# Body`;
      const result = parseFrontmatter(content);
      expect(result.data).toEqual({});
      expect(result.body).toContain('# Body');
    });
  });

  describe('extractMentions', () => {
    it('should extract @-mention file references', () => {
      const content = `
See @src/artifacts/types.ts for type definitions.
Also references @.aiwg/requirements/UC-001.md and @.aiwg/architecture/sad.md
`;
      const mentions = extractMentions(content);
      expect(mentions).toContain('src/artifacts/types.ts');
      expect(mentions).toContain('.aiwg/requirements/UC-001.md');
      expect(mentions).toContain('.aiwg/architecture/sad.md');
    });

    it('should deduplicate mentions', () => {
      const content = `
Ref @src/foo.ts and also @src/foo.ts again.
`;
      const mentions = extractMentions(content);
      const fooCount = mentions.filter(m => m === 'src/foo.ts').length;
      expect(fooCount).toBe(1);
    });

    it('should return empty array for content without mentions', () => {
      const content = 'No mentions here.';
      const mentions = extractMentions(content);
      expect(mentions).toEqual([]);
    });
  });

  describe('buildIndex', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-index-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should build index from .aiwg/ directory', async () => {
      // Create test artifacts
      const aiwgDir = path.join(tmpDir, '.aiwg', 'requirements');
      fs.mkdirSync(aiwgDir, { recursive: true });

      fs.writeFileSync(path.join(aiwgDir, 'UC-001.md'), `---
title: User Login
type: use-case
tags:
  - auth
  - security
---
# UC-001: User Login

Users can log in with email and password.
`);

      fs.writeFileSync(path.join(aiwgDir, 'UC-002.md'), `---
title: User Registration
type: use-case
tags:
  - auth
---
# UC-002: User Registration

New users can register.

@.aiwg/requirements/UC-001.md
`);

      // Suppress console output during build
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await buildIndex(tmpDir, { force: true });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();

      // Check index files exist
      const indexDir = path.join(tmpDir, INDEX_DIR);
      expect(fs.existsSync(path.join(indexDir, 'metadata.json'))).toBe(true);
      expect(fs.existsSync(path.join(indexDir, 'tags.json'))).toBe(true);
      expect(fs.existsSync(path.join(indexDir, 'dependencies.json'))).toBe(true);
      expect(fs.existsSync(path.join(indexDir, 'stats.json'))).toBe(true);

      // Check metadata content
      const metadata = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));
      expect(metadata.version).toBe('1.0.0');
      expect(Object.keys(metadata.entries)).toHaveLength(2);

      const uc001 = metadata.entries['.aiwg/requirements/UC-001.md'];
      expect(uc001).toBeDefined();
      expect(uc001.title).toBe('User Login');
      expect(uc001.type).toBe('use-case');
      expect(uc001.phase).toBe('requirements');
      expect(uc001.tags).toContain('auth');
      expect(uc001.checksum).toHaveLength(16);

      // Check tag index
      const tags = JSON.parse(fs.readFileSync(path.join(indexDir, 'tags.json'), 'utf-8'));
      expect(tags.auth).toHaveLength(2);
      expect(tags.security).toHaveLength(1);

      // Check stats
      const stats = JSON.parse(fs.readFileSync(path.join(indexDir, 'stats.json'), 'utf-8'));
      expect(stats.totalArtifacts).toBe(2);
      expect(stats.byPhase.requirements).toBe(2);
      expect(stats.byType['use-case']).toBe(2);
    });

    it('should handle incremental builds', async () => {
      // Create one artifact
      const aiwgDir = path.join(tmpDir, '.aiwg', 'requirements');
      fs.mkdirSync(aiwgDir, { recursive: true });

      fs.writeFileSync(path.join(aiwgDir, 'UC-001.md'), `---
title: User Login
type: use-case
---
# UC-001
`);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // First build
      await buildIndex(tmpDir, { force: true });

      // Add another artifact
      fs.writeFileSync(path.join(aiwgDir, 'UC-002.md'), `---
title: User Registration
type: use-case
---
# UC-002
`);

      // Incremental build (force = false by default)
      await buildIndex(tmpDir, {});

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();

      const indexDir = path.join(tmpDir, INDEX_DIR);
      const metadata = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));
      expect(Object.keys(metadata.entries)).toHaveLength(2);
    });

    it('should infer type from filename patterns', async () => {
      const aiwgDir = path.join(tmpDir, '.aiwg', 'architecture');
      fs.mkdirSync(aiwgDir, { recursive: true });

      fs.writeFileSync(path.join(aiwgDir, 'adr-001-foo.md'), '# ADR-001\nSome decision.');
      fs.writeFileSync(path.join(aiwgDir, 'sad.md'), '# Software Architecture\nOverview.');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await buildIndex(tmpDir, { force: true });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();

      const indexDir = path.join(tmpDir, INDEX_DIR);
      const metadata = JSON.parse(fs.readFileSync(path.join(indexDir, 'metadata.json'), 'utf-8'));

      const adr = metadata.entries['.aiwg/architecture/adr-001-foo.md'];
      expect(adr.type).toBe('adr');

      const sad = metadata.entries['.aiwg/architecture/sad.md'];
      expect(sad.type).toBe('architecture');
    });

    it('should exit with error when .aiwg/ does not exist', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      await expect(buildIndex(path.join(tmpDir, 'nonexistent'))).rejects.toThrow('process.exit');

      exitSpy.mockRestore();
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
