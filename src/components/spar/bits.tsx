import { animate, motion, useReducedMotion } from 'framer-motion';
import { AlertOctagon, AlertTriangle, CircleDot } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { SEVERITY_LABEL } from '../../logic/objections';
import { scoreBand } from '../../logic/scoring';
import { PLACEHOLDER_RE, findBuzzwords } from '../../logic/text';
import type { ComponentKey, Severity } from '../../logic/types';
import { cx } from '../ui';

export const COMPONENT_COLORS: Record<ComponentKey, { text: string; bg: string; line: string; hex: string }> = {
  alternatives: { text: 'text-violet-700', bg: 'bg-violet-500', line: 'decoration-violet-400', hex: '#8b5cf6' },
  unique: { text: 'text-ember-700', bg: 'bg-ember-500', line: 'decoration-ember-400', hex: '#f45412' },
  value: { text: 'text-emerald-700', bg: 'bg-emerald-500', line: 'decoration-emerald-400', hex: '#10b981' },
  target: { text: 'text-sky-700', bg: 'bg-sky-500', line: 'decoration-sky-400', hex: '#0ea5e9' },
  category: { text: 'text-amber-700', bg: 'bg-amber-500', line: 'decoration-amber-400', hex: '#f59e0b' },
};

export function toneColor(score: number) {
  const t = scoreBand(score).tone;
  return t === 'good' ? '#059669' : t === 'ok' ? '#65a30d' : t === 'warn' ? '#d97706' : '#dc2626';
}

// ─── AnimatedNumber ────────────────────────────────────────────────────────

export function AnimatedNumber({ value, from, duration = 1.1, className }: { value: number; from?: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(from ?? value);
  const prev = useRef(from ?? value);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <span className={cx('tabular-nums', className)}>{display}</span>;
}

// ─── ScoreRing ─────────────────────────────────────────────────────────────

export function ScoreRing({ score, size = 132, from, label = true, stroke = 10 }: { score: number; size?: number; from?: number; label?: boolean; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const band = scoreBand(score);
  const color = toneColor(score);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebe4d8" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c * (1 - (from ?? 0) / 100) }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display font-semibold leading-none text-sand-900" style={{ fontSize: size * 0.3 }}>
          <AnimatedNumber value={score} from={from} />
        </span>
        {label && (
          <span className="mt-1 text-[11px] font-medium" style={{ color }}>
            {band.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const color = toneColor(score);
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-sand-200">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${score}%`, background: color }} />
      </span>
      <span className="w-7 text-right text-sm font-semibold tabular-nums text-sand-900">{score}</span>
    </span>
  );
}

// ─── Delta chip ────────────────────────────────────────────────────────────

export function DeltaChip({ delta, className }: { delta: number; className?: string }) {
  if (!delta) return <span className={cx('rounded-full bg-sand-100 px-2 py-0.5 text-xs font-semibold text-sand-500', className)}>±0</span>;
  const up = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cx('rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700', className)}
    >
      {up ? '▲' : '▼'} {up ? '+' : ''}
      {delta}
    </motion.span>
  );
}

// ─── Severity ──────────────────────────────────────────────────────────────

const SEV_STYLE: Record<Severity, { cls: string; icon: ReactNode }> = {
  minor: { cls: 'bg-sand-100 text-sand-700 ring-sand-300', icon: <CircleDot className="h-3 w-3" /> },
  serious: { cls: 'bg-amber-50 text-amber-800 ring-amber-300', icon: <AlertTriangle className="h-3 w-3" /> },
  dealbreaker: { cls: 'bg-red-50 text-red-700 ring-red-300', icon: <AlertOctagon className="h-3 w-3" /> },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEV_STYLE[severity];
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', s.cls)}>
      {s.icon}
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

// ─── Highlighting ──────────────────────────────────────────────────────────

/** Renders text with buzzwords underlined in ember and [placeholders] boxed. */
export function Highlighted({ text, buzz = true }: { text: string; buzz?: boolean }) {
  const marks: { start: number; end: number; kind: 'buzz' | 'ph' }[] = [];
  if (buzz) for (const m of findBuzzwords(text)) marks.push({ start: m.index, end: m.index + m.length, kind: 'buzz' });
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  let pm: RegExpExecArray | null;
  while ((pm = re.exec(text))) marks.push({ start: pm.index, end: pm.index + pm[0].length, kind: 'ph' });
  marks.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  marks.forEach((m, i) => {
    if (m.start < pos) return;
    if (m.start > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, m.start)}</Fragment>);
    out.push(
      <span key={`m${i}`} className={m.kind === 'buzz' ? 'hl-buzz' : 'hl-placeholder'} title={m.kind === 'buzz' ? 'Buzzword' : 'Gap to fill'}>
        {text.slice(m.start, m.end)}
      </span>,
    );
    pos = m.end;
  });
  if (pos < text.length) out.push(<Fragment key="end">{text.slice(pos)}</Fragment>);
  return <>{out}</>;
}

// ─── StreamText ────────────────────────────────────────────────────────────

/** Types text out word by word. Calls onDone when finished. */
export function StreamText({
  text,
  speed = 28,
  start = true,
  onDone,
  highlight,
  className,
}: {
  text: string;
  speed?: number;
  start?: boolean;
  onDone?: () => void;
  highlight?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const tokens = useRef<string[]>([]);
  const [n, setN] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    tokens.current = text.match(/\S+\s*/g) ?? [];
    setN(0);
  }, [text]);

  useEffect(() => {
    if (!start) return;
    const total = tokens.current.length;
    if (reduce || total === 0) {
      setN(total);
      doneRef.current?.();
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= total) {
        window.clearInterval(id);
        doneRef.current?.();
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [start, text, speed, reduce]);

  const shown = tokens.current.slice(0, n).join('');
  const finished = n >= tokens.current.length;
  return (
    <span className={cx(!finished && start && 'caret', className)}>
      {highlight ? <Highlighted text={shown} /> : shown}
    </span>
  );
}
