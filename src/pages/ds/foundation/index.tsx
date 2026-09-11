import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router';

/**
 * Maintainer-only reference for the design system foundation tokens in
 * `src/index.css` — colour, type, spacing, radius, motion. Dev-only route
 * (see src/main.tsx); never ships in production.
 */
export function Component() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-8 text-[var(--text-primary)]">
      <header className="mb-10">
        <Link to="/" className="label text-[var(--accent)]">
          ← back
        </Link>
        <h1 className="h1 mt-2">Design system foundation</h1>
        <p className="body mt-1">
          Live reference for every token in <code className="data">src/index.css</code>. Values are read from computed
          styles, not hardcoded, so this page can't drift from the real CSS.
        </p>
      </header>

      <ColorSection />
      <TypeSection />
      <SpacingSection />
      <RadiusSection />
      <MotionSection />
    </div>
  );
}

function useCssVar(varName: string, scopeRef?: RefObject<HTMLElement | null>) {
  const [value, setValue] = useState('');
  useLayoutEffect(() => {
    const el = scopeRef?.current ?? document.documentElement;
    setValue(getComputedStyle(el).getPropertyValue(varName).trim());
  }, [varName, scopeRef]);
  return value;
}

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: 'Surface', tokens: ['bg-base', 'bg-elevated', 'bg-overlay', 'border-hairline'] },
  { title: 'Text', tokens: ['text-primary', 'text-secondary', 'text-muted'] },
  { title: 'Accent', tokens: ['accent', 'accent-track', 'gold'] },
  { title: 'Freshness', tokens: ['fresh', 'aging', 'stale'] },
  { title: 'Semantic', tokens: ['error'] },
];

function ColorSection() {
  return (
    <section className="mb-12">
      <h2 className="h2 mb-4">Colour</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ThemeColumn theme="dark" />
        <ThemeColumn theme="light" />
      </div>
    </section>
  );
}

function ThemeColumn({ theme }: { theme: 'dark' | 'light' }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      data-theme={theme}
      className="rounded-card border border-[var(--border-hairline)] bg-[var(--bg-base)] p-4 text-[var(--text-primary)]"
    >
      <div className="label mb-3">{theme}</div>
      <div className="flex flex-col gap-4">
        {COLOR_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="label mb-2 text-[var(--text-muted)]">{group.title}</div>
            <div className="flex flex-col gap-2">
              {group.tokens.map((name) => (
                <Swatch key={name} name={name} scopeRef={ref} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Swatch({ name, scopeRef }: { name: string; scopeRef: RefObject<HTMLElement | null> }) {
  const value = useCssVar(`--${name}`, scopeRef);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border-hairline)]"
        style={{ background: `var(--${name})` }}
      />
      <div className="min-w-0">
        <div className="data">{name}</div>
        <div className="label truncate normal-case">{value || '—'}</div>
      </div>
    </div>
  );
}

const TYPE_ROLES: { cls: string; label: string; sample: string }[] = [
  { cls: 'num-xl', label: '.num-xl — 72/700 mono, roll-up numeral', sample: '87%' },
  { cls: 'h1', label: '.h1 — 32/800, wordmark / screen title', sample: 'idleFantasy-dex' },
  { cls: 'h2', label: '.h2 — 20/700, sub-header / sheet title', sample: 'Quests' },
  { cls: 'h3', label: '.h3 — 18/700, Goal card name', sample: 'Raid boss drops' },
  { cls: 'button-label', label: '.button-label — 15/700', sample: 'Upload save export' },
  { cls: 'body', label: '.body — 15/400', sample: 'See how far every goal is from done.' },
  { cls: 'data', label: '.data — 15/500 mono', sample: '142 / 189' },
  { cls: 'list-row', label: '.list-row — 14/400 mono', sample: 'Ardougne Elite Diary' },
  { cls: 'label', label: '.label — 12/500 mono uppercase', sample: '47 LEFT' },
];

function TypeSection() {
  return (
    <section className="mb-12">
      <h2 className="h2 mb-4">Type</h2>
      <div className="flex flex-col gap-4">
        {TYPE_ROLES.map((role) => (
          <div key={role.cls} className="border-b border-[var(--border-hairline)] pb-4">
            <div className="label mb-1 text-[var(--text-muted)]">{role.label}</div>
            <div className={role.cls}>{role.sample}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SPACE_STEPS = [1, 2, 3, 4, 6, 8, 10, 12];

function SpacingSection() {
  return (
    <section className="mb-12">
      <h2 className="h2 mb-4">Spacing</h2>
      <div className="flex flex-col gap-2">
        {SPACE_STEPS.map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div className="label w-24 shrink-0">--space-{n}</div>
            <div className="h-4 bg-[var(--accent)]" style={{ width: `var(--space-${n})` }} />
          </div>
        ))}
      </div>
    </section>
  );
}

const RADIUS_TOKENS = [
  { name: 'radius-button', label: 'button — 12px' },
  { name: 'radius-card', label: 'card — 16px' },
  { name: 'radius-sheet', label: 'sheet — 22px' },
  { name: 'radius-full', label: 'full / pill' },
];

function RadiusSection() {
  return (
    <section className="mb-12">
      <h2 className="h2 mb-4">Radius</h2>
      <div className="flex flex-wrap gap-6">
        {RADIUS_TOKENS.map((token) => (
          <div key={token.name} className="flex flex-col items-center gap-2">
            <div
              className="h-16 w-16 border border-[var(--accent)] bg-[var(--accent-track)]"
              style={{ borderRadius: `var(--${token.name})` }}
            />
            <div className="label">{token.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const MOTION_TOKENS = [
  'dur-fill',
  'dur-sheet',
  'dur-push',
  'dur-pulse',
  'stagger-seg',
  'stagger-card',
  'ease-out',
  'ease-sheet',
];

function MotionSection() {
  return (
    <section>
      <h2 className="h2 mb-4">Motion</h2>
      <table className="data w-full max-w-md border-collapse">
        <tbody>
          {MOTION_TOKENS.map((name) => (
            <MotionRow key={name} name={name} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MotionRow({ name }: { name: string }) {
  const value = useCssVar(`--${name}`);
  return (
    <tr className="border-b border-[var(--border-hairline)]">
      <td className="py-2 pr-4 text-[var(--text-muted)]">--{name}</td>
      <td className="py-2">{value || '—'}</td>
    </tr>
  );
}
