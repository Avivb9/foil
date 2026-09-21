import { motion } from 'framer-motion';
import { PhoneOff, Quote, Wrench } from 'lucide-react';
import { useState } from 'react';
import { LENSES } from '../../data/personas';
import { composeSegments } from '../../logic/compose';
import type { DiffOp } from '../../logic/diff';
import { COMPONENT_SHORT } from '../../logic/scoring';
import type { Fields, Objection, Persona } from '../../logic/types';
import { Avatar, cx } from '../ui';
import { COMPONENT_COLORS, Highlighted, SeverityChip, StreamText } from './bits';

// ─── Statement preview ─────────────────────────────────────────────────────

export function StatementPreview({ company, fields, size = 'lg' }: { company: string; fields: Fields; size?: 'md' | 'lg' }) {
  const segs = composeSegments(company, fields);
  if (!segs.length) {
    return <p className="text-sm italic text-sand-400">Your positioning statement appears here as you fill in the five components.</p>;
  }
  return (
    <p className={cx('display leading-snug text-sand-900', size === 'lg' ? 'text-[21px]' : 'text-[17px]')}>
      {segs.map((s, i) =>
        s.key ? (
          <span
            key={i}
            title={COMPONENT_SHORT[s.key]}
            className={cx('underline decoration-2 underline-offset-[5px] decoration-dotted', COMPONENT_COLORS[s.key].line)}
          >
            <Highlighted text={s.text} />
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

export function PreviewLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-sand-500">
      {(Object.keys(COMPONENT_COLORS) as (keyof typeof COMPONENT_COLORS)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cx('h-1.5 w-1.5 rounded-full', COMPONENT_COLORS[k].bg)} />
          {COMPONENT_SHORT[k]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="hl-buzz px-1 text-sand-700">abc</span> buzzword
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="hl-placeholder">[gap]</span> to fill
      </span>
    </div>
  );
}

// ─── Persona card ──────────────────────────────────────────────────────────

export function PersonaCard({ persona, objection, stream, onStreamed }: { persona: Persona; objection: Objection; stream?: boolean; onStreamed?: () => void }) {
  const [stage, setStage] = useState(stream ? 0 : 3);
  const sevBorder =
    objection.severity === 'dealbreaker' ? 'before:bg-red-500' : objection.severity === 'serious' ? 'before:bg-amber-500' : 'before:bg-sand-300';
  return (
    <motion.article
      layout
      initial={stream ? { opacity: 0, y: 16, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={cx('card relative overflow-hidden p-5 pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1', sevBorder)}
    >
      <header className="flex items-start gap-3">
        <Avatar name={persona.name} color={persona.color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-[15px] font-semibold text-sand-900">{persona.name}</h3>
            <span className="rounded-md bg-sand-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-sand-500">{LENSES[persona.lens].label}</span>
          </div>
          <p className="truncate text-[12.5px] text-sand-500">{persona.role}</p>
        </div>
        {stage >= 2 ? <SeverityChip severity={objection.severity} /> : <span className="h-5 w-20 animate-pulse rounded-full bg-sand-100" />}
      </header>

      <blockquote className="display mt-4 flex gap-2 text-[19px] leading-snug text-sand-900">
        <Quote className="mt-1 h-4 w-4 shrink-0 rotate-180 text-ember-400" />
        <span>
          {stream ? <StreamText text={objection.gut} speed={45} onDone={() => setStage((s) => Math.max(s, 1))} /> : objection.gut}
        </span>
      </blockquote>

      <div className={cx('mt-3 text-[14px] leading-relaxed text-sand-700 transition-opacity', stage >= 1 ? 'opacity-100' : 'opacity-0')}>
        {!stream && objection.objection}
        {stream && stage >= 1 && (
          <StreamText
            text={objection.objection}
            speed={22}
            onDone={() => {
              setStage((s) => Math.max(s, 2));
              window.setTimeout(() => {
                setStage(3);
                onStreamed?.();
              }, 220);
            }}
          />
        )}
      </div>

      {stage >= 3 && (
        <motion.div initial={stream ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
          {objection.extra && (
            <div className="rounded-lg border border-dashed border-sand-300 bg-sand-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sand-500">
                <PhoneOff className="h-3 w-3" /> {objection.extra.label}
              </p>
              <p className="font-mono text-[12.5px] leading-relaxed text-sand-700">{objection.extra.text}</p>
            </div>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50/70 p-3 text-[13px] text-emerald-900 ring-1 ring-inset ring-emerald-200/70">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <p>
              <span className="font-semibold">How to fix it: </span>
              {objection.fix}
            </p>
          </div>
        </motion.div>
      )}
    </motion.article>
  );
}

export function PersonaCardSkeleton({ persona }: { persona: Persona }) {
  return (
    <div className="card flex items-center gap-3 p-5 opacity-70">
      <Avatar name={persona.name} color={persona.color} size={40} className="grayscale" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-sand-200" />
        <div className="h-2.5 w-52 animate-pulse rounded bg-sand-100" />
      </div>
      <span className="text-xs text-sand-400">{persona.name.split(' ')[0]} is reading…</span>
    </div>
  );
}

// ─── Diff ──────────────────────────────────────────────────────────────────

export function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <p className="display text-[18px] leading-[1.7] text-sand-800">
      {ops.map((o, i) =>
        o.type === 'same' ? (
          <span key={i}>{o.text}</span>
        ) : o.type === 'del' ? (
          <del key={i} className="rounded bg-red-50 px-0.5 text-red-500 decoration-red-400 decoration-2">
            {o.text}
          </del>
        ) : (
          <ins key={i} className={cx('rounded px-0.5 no-underline', /\[/.test(o.text) ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900')}>
            {o.text}
          </ins>
        ),
      )}
    </p>
  );
}
