// The Lantern Kitchen — entrypoint (Node 22, erasable TypeScript).
//
// Hands the game in: copies game/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with
// buildDossier from the kit's library (vendor/makefun-game.ts, unchanged).
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory is resolved from MAKEFUN_OUTPUT_DIR when set,
// falling back to /output. The directory itself is never removed — only
// its children are — so a bind-mounted /output still works. Two runs over
// the same repository write byte-identical output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.trim() !== '') return fromEnv;
  return '/output';
}

function clearChildren(dir: string): void {
  // Remove only the children of the output dir, never the dir itself:
  // the grader may bind-mount it, and removing a mount point fails.
  mkdirSync(dir, { recursive: true });
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function copyTree(src: string, dest: string): void {
  // Sorted, recursive, byte-for-byte copies, so two runs agree.
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      cpSync(from, to);
    }
    // Nothing else lives in the repository's game/ or screenshots/ trees.
  }
}

function main(): void {
  const out = outputDir();
  const gameSrc = join(REPO_ROOT, 'game');
  const shotsSrc = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('main.ts: game/ is missing from ' + REPO_ROOT);
  if (!existsSync(join(gameSrc, 'index.html'))) throw new Error('main.ts: game/index.html is missing');
  if (!existsSync(shotsSrc)) throw new Error('main.ts: screenshots/ is missing from ' + REPO_ROOT);

  clearChildren(out);
  copyTree(gameSrc, join(out, 'game'));
  copyTree(shotsSrc, join(out, 'screenshots'));

  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log('wrote ' + join(out, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
