import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every CSS custom property the UI consumes must be DEFINED by the design
// system, in both the light (:root) and dark (.dark) blocks. The 2026-04-02
// token rewrite deleted --button-outline / --badge-outline / --sidebar-border
// while shadcn's button, badge and sidebar components still read them — an
// undefined var() invalidates the whole declaration, so outline borders fell
// back to currentColor and the sidebar rail lost its edge. A build cannot
// catch that; this test does.

const ROOT = join(__dirname, '..', '..');
const CSS = readFileSync(join(ROOT, 'client', 'src', 'index.css'), 'utf8');
const TAILWIND = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');

// Provided at runtime, not by the stylesheet.
const RUNTIME_VARS = [
  /^--radix-/,          // Radix primitives set these inline
  /^--sidebar-width/,   // shadcn sidebar sets these via style={{}}
  /^--spacing-4$/,      // pre-existing: Tailwind-v4 token used by shadcn sidebar on a v3 config (not this branch's regression)
  /^--skeleton-width$/, // shadcn SidebarMenuSkeleton sets it inline per row
];

// Tokens whose light value is unusable on a dark surface and therefore MUST be
// overridden in .dark, not merely inherited (a black 10% border is invisible
// on a near-black background).
const MUST_OVERRIDE_IN_DARK = ['--button-outline', '--badge-outline'];

function blockVars(selector: string): Set<string> {
  // first `selector {` inside @layer base, up to its closing brace
  const start = CSS.indexOf(`${selector} {`);
  expect(start, `${selector} block present in index.css`).toBeGreaterThan(-1);
  const end = CSS.indexOf('\n  }', start);
  const body = CSS.slice(start, end);
  return new Set([...body.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => `--${m[1]}`));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !p.endsWith('index.css')) out.push(p);
  }
  return out;
}

function consumedVars(): Map<string, string[]> {
  const uses = new Map<string, string[]>();
  const files = [...walk(join(ROOT, 'client', 'src')), join(ROOT, 'tailwind.config.ts')];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/var\((--[a-z0-9-]+)/g)) {
      const v = m[1];
      if (RUNTIME_VARS.some((re) => re.test(v))) continue;
      if (!uses.has(v)) uses.set(v, []);
      uses.get(v)!.push(f.replace(ROOT, '').replace(/\\/g, '/'));
    }
  }
  return uses;
}

describe('design tokens — every consumed CSS variable is defined', () => {
  const light = blockVars(':root');
  const dark = blockVars('.dark');
  const consumed = consumedVars();

  it('scans a realistic surface (sanity: the scan found components and the config)', () => {
    expect(consumed.size).toBeGreaterThan(20);
    expect(light.size).toBeGreaterThan(20);
  });

  it('defines every consumed variable in :root (light)', () => {
    const missing = [...consumed.keys()].filter((v) => !light.has(v)).sort();
    expect(missing, missing.map((v) => `${v} <- ${consumed.get(v)!.join(', ')}`).join('\n')).toEqual([]);
  });

  it('defines every consumed variable for dark mode (.dark override or inherited from :root)', () => {
    const missing = [...consumed.keys()].filter((v) => !dark.has(v) && !light.has(v)).sort();
    expect(missing, missing.map((v) => `${v} <- ${consumed.get(v)!.join(', ')}`).join('\n')).toEqual([]);
  });

  it('overrides surface-relative tokens explicitly in .dark', () => {
    const missing = MUST_OVERRIDE_IN_DARK.filter((v) => !dark.has(v));
    expect(missing, `${missing.join(', ')} inherit a light-surface value into dark mode`).toEqual([]);
  });

  it('exposes sidebar.border in the tailwind palette (sidebar-border utilities are used by ui/sidebar.tsx)', () => {
    const sidebarBlock = TAILWIND.slice(TAILWIND.indexOf('sidebar: {'));
    const block = sidebarBlock.slice(0, sidebarBlock.indexOf('}'));
    expect(block).toMatch(/border:\s*'hsl\(var\(--sidebar-border\)\)'/);
  });
});
