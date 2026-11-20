import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { COMPONENT_KEYS, COMPONENT_LABELS, COMPONENT_SHORT } from '../../logic/scoring';
import type { ComponentKey, ScoreResult, Weights } from '../../logic/types';
import { cx } from '../ui';
import { COMPONENT_COLORS, toneColor } from './bits';

export function ScoreRadar({ result, previous, height = 260 }: { result: ScoreResult; previous?: ScoreResult | null; height?: number }) {
  const data = COMPONENT_KEYS.map((k) => ({
    key: COMPONENT_SHORT[k],
    score: result.components[k].score,
    prev: previous ? previous.components[k].score : undefined,
  }));
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`Radar chart: ${data.map((d) => `${d.key} ${d.score}`).join(', ')}`}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#e4e7ec" />
          <PolarAngleAxis dataKey="key" tick={{ fill: '#344054', fontSize: 12, fontWeight: 500 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {previous && <Radar name="Previous run" dataKey="prev" stroke="#98a2b3" strokeDasharray="4 3" fill="#98a2b3" fillOpacity={0.08} isAnimationActive />}
          <Radar name="This run" dataKey="score" stroke="#3b63f6" strokeWidth={2} fill="#3b63f6" fillOpacity={0.18} isAnimationActive animationDuration={900} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e4e7ec', fontSize: 12, boxShadow: '0 8px 30px -8px rgba(16,24,40,0.16)' }}
            formatter={(v: number, name: string) => [`${v}/100`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ComponentBars({ result, previous, weights }: { result: ScoreResult; previous?: ScoreResult | null; weights: Weights }) {
  const [open, setOpen] = useState<ComponentKey | null>(null);
  return (
    <ul className="divide-y divide-sand-200/70">
      {COMPONENT_KEYS.map((k, i) => {
        const c = result.components[k];
        const prev = previous?.components[k].score;
        const delta = prev !== undefined ? c.score - prev : 0;
        const isOpen = open === k;
        return (
          <li key={k} className="py-3 first:pt-0 last:pb-0">
            <button onClick={() => setOpen(isOpen ? null : k)} className="w-full text-left" aria-expanded={isOpen}>
              <div className="flex items-center gap-3">
                <span className={cx('h-2 w-2 shrink-0 rounded-full', COMPONENT_COLORS[k].bg)} />
                <span className="flex-1 text-[13.5px] font-medium text-sand-900">{COMPONENT_LABELS[k]}</span>
                <span className="text-[11px] text-sand-400">weight {weights[k]}</span>
                {delta !== 0 && (
                  <span className={cx('text-[11px] font-semibold tabular-nums', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                )}
                <span className="w-8 text-right text-sm font-semibold tabular-nums">{c.score}</span>
                <ChevronDown className={cx('h-3.5 w-3.5 text-sand-400 transition', isOpen && 'rotate-180')} />
              </div>
              <div className="ml-5 mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200/70">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: toneColor(c.score) }}
                  initial={{ width: `${prev ?? 0}%` }}
                  animate={{ width: `${c.score}%` }}
                  transition={{ duration: 0.9, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="ml-5 mt-1.5 text-[12.5px] leading-snug text-sand-600">{c.explanation}</p>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-5 mt-2 space-y-1 overflow-hidden rounded-lg bg-sand-50 p-2.5 font-mono text-[11.5px]"
                >
                  {c.findings.length === 0 && <li className="text-sand-500">No signals found.</li>}
                  {c.findings.map((f, j) => (
                    <li key={j} className={f.startsWith('+') ? 'text-emerald-700' : 'text-red-700'}>
                      {f}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

export function Sparkline({ values, height = 36, width = 120 }: { values: number[]; height?: number; width?: number | string }) {
  const data = values.map((v, i) => ({ i, v }));
  const last = values[values.length - 1] ?? 0;
  return (
    <div style={{ height, width }} aria-label={`Score trend: ${values.join(', ')}`} role="img">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[0, 100]} hide />
          <Line type="monotone" dataKey="v" stroke={toneColor(last)} strokeWidth={2} dot={values.length < 8 ? { r: 2, strokeWidth: 0, fill: toneColor(last) } : false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
