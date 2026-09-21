import { LENSES } from '../data/personas';
import { composeStatement } from './compose';
import { SEVERITY_LABEL } from './objections';
import type { RewriteResult } from './rewrite';
import { COMPONENT_KEYS, COMPONENT_LABELS, scoreBand } from './scoring';
import type { Objection, Persona, Report, ScoreResult, Weights } from './types';
import { formatDate } from './format';

export function reportToMarkdown(
  report: Report,
  result: ScoreResult,
  objections: Objection[],
  personas: Persona[],
  rewrite: RewriteResult,
  weights: Weights,
  url: string,
): string {
  const s = report.snapshot;
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`*${s.company} · ${s.mode} mode · ${formatDate(s.at)} · prepared by ${report.createdBy} in Foil*`);
  lines.push('');
  lines.push(`## Score: ${result.overall}/100 (${scoreBand(result.overall).label})`);
  lines.push('');
  lines.push('| Component | Weight | Score | Why |');
  lines.push('|---|---:|---:|---|');
  for (const k of COMPONENT_KEYS) {
    lines.push(`| ${COMPONENT_LABELS[k]} | ${weights[k]} | ${result.components[k].score} | ${result.components[k].explanation.replace(/\|/g, '/')} |`);
  }
  lines.push('');
  lines.push(`Readability ${result.readability.adjustment >= 0 ? '+' : ''}${result.readability.adjustment}: ${result.readability.note}`);
  lines.push('');
  lines.push('## Positioning statement');
  lines.push('');
  lines.push(`> ${composeStatement(s.company, s.fields)}`);
  lines.push('');
  lines.push('## What the panel said');
  lines.push('');
  for (const o of objections) {
    const p = personas.find((x) => x.id === o.personaId);
    if (!p) continue;
    lines.push(`### ${p.name}, ${p.role} (${LENSES[p.lens].label}): ${SEVERITY_LABEL[o.severity]}`);
    lines.push('');
    lines.push(`> “${o.gut}”`);
    lines.push('');
    lines.push(o.objection);
    lines.push('');
    if (o.extra) {
      lines.push(`*${o.extra.label}:* ${o.extra.text}`);
      lines.push('');
    }
    lines.push(`**How to fix it:** ${o.fix}`);
    lines.push('');
  }
  lines.push('## Suggested rewrite');
  lines.push('');
  lines.push(`> ${rewrite.statement}`);
  lines.push('');
  for (const c of rewrite.changes) lines.push(`- **${COMPONENT_LABELS[c.component]}:** ${c.note}`);
  lines.push('');
  lines.push(`[View the full report](${url})`);
  return lines.join('\n');
}
