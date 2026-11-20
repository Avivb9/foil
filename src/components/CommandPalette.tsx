import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CreditCard,
  FileText,
  Keyboard,
  LayoutList,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { scorePositioning } from '../logic/scoring';
import { useApp } from '../store/app';
import { useUI } from '../store/ui';
import { cx } from './ui';

interface Cmd {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
}

export function CommandPalette() {
  const { paletteOpen, setPalette, openIntro, setShortcuts } = useUI();
  const spars = useApp((s) => s.spars);
  const reports = useApp((s) => s.reports);
  const weights = useApp((s) => s.weights);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(!useUI.getState().paletteOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPalette]);

  useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const close = () => setPalette(false);
  const go = (path: string) => () => nav(path);

  const commands = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      { id: 'new', group: 'Actions', label: 'Start a new spar', icon: <Plus className="h-4 w-4" />, hint: 'N', keywords: 'create positioning', run: go('/spars/new') },
      { id: 'strong', group: 'Actions', label: 'Open Kestrel with the strong example', icon: <Sparkles className="h-4 w-4" />, keywords: 'load example sample', run: go('/spars/kestrel?example=strong') },
      { id: 'weights', group: 'Actions', label: 'Adjust scoring weights', icon: <SlidersHorizontal className="h-4 w-4" />, keywords: 'settings scoring', run: go('/settings/scoring') },
      { id: 'invite', group: 'Actions', label: 'Invite a teammate', icon: <Users className="h-4 w-4" />, keywords: 'member workspace', run: go('/settings/workspace?invite=1') },
      { id: 'about', group: 'Actions', label: 'About Foil', icon: <BookOpen className="h-4 w-4" />, keywords: 'intro help overview', run: openIntro },
      { id: 'keys', group: 'Actions', label: 'Keyboard shortcuts', icon: <Keyboard className="h-4 w-4" />, run: () => setShortcuts(true) },
      { id: 'nav-spars', group: 'Go to', label: 'Spars', icon: <LayoutList className="h-4 w-4" />, hint: 'G S', run: go('/') },
      { id: 'nav-personas', group: 'Go to', label: 'Personas', icon: <Users className="h-4 w-4" />, hint: 'G P', run: go('/personas') },
      { id: 'nav-reports', group: 'Go to', label: 'Reports', icon: <FileText className="h-4 w-4" />, hint: 'G R', run: go('/reports') },
      { id: 'nav-settings', group: 'Go to', label: 'Settings', icon: <Settings className="h-4 w-4" />, run: go('/settings/profile') },
      { id: 'nav-billing', group: 'Go to', label: 'Billing', icon: <CreditCard className="h-4 w-4" />, keywords: 'plan invoice', run: go('/settings/billing') },
    ];
    for (const s of spars) {
      const src = s.lastRun ?? { company: s.company, fields: s.draft, mode: s.mode };
      const score = scorePositioning(src.company, src.fields, src.mode, weights).overall;
      list.push({ id: `spar-${s.id}`, group: 'Spars', label: s.company, hint: `${score}/100`, icon: <Swords className="h-4 w-4" />, keywords: `${s.product} ${s.segment} ${s.owner}`, run: go(`/spars/${s.id}`) });
    }
    for (const r of reports.slice(0, 8)) {
      list.push({ id: `rep-${r.id}`, group: 'Reports', label: r.title, icon: <FileText className="h-4 w-4" />, keywords: r.createdBy, run: go(`/reports/${r.id}`) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spars, reports, weights]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(t));
  }, [q, commands]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const exec = (c: Cmd | undefined) => {
    if (!c) return;
    close();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      exec(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  let lastGroup = '';

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="no-print fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="fixed inset-0 bg-sand-950/40 backdrop-blur-[2px]" onClick={close} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-sand-200 bg-[#ffffff] shadow-lift"
            role="dialog"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 border-b border-sand-200 px-4">
              <Search className="h-4 w-4 text-sand-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search spars, reports, actions…"
                className="h-12 flex-1 bg-transparent text-[15px] text-sand-900 placeholder:text-sand-400 focus:outline-none"
                aria-label="Search commands"
              />
              <kbd className="kbd">Esc</kbd>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-sand-500">
                  No results for “{q}”. Try a company name like <span className="font-medium text-sand-700">Kestrel</span>.
                </div>
              )}
              {filtered.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <div key={c.id}>
                    {header && <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-sand-400">{header}</div>}
                    <button
                      data-idx={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => exec(c)}
                      className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm', i === active ? 'bg-ember-50 text-sand-900' : 'text-sand-700')}
                    >
                      <span className={cx(i === active ? 'text-ember-600' : 'text-sand-400')}>{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="text-xs tabular-nums text-sand-400">{c.hint}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-sand-200 bg-sand-50/70 px-4 py-2 text-[11.5px] text-sand-500">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">↵</kbd> open
              </span>
              <span className="ml-auto">{filtered.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
