import type { ComponentKey, Fields } from './types';
import { lcFirst, trimEnd } from './text';

export interface Segment {
  text: string;
  key?: ComponentKey;
}

const VERB_START =
  /^(cuts?|reduces?|saves?|increases?|grows?|closes?|recovers?|eliminates?|avoids?|lifts?|raises?|shortens?|halves?|doubles?|triples?|prevents?|catches?|delivers?|gives?|helps?|lets?|turns?|makes?|keeps?|gets?|pays?|drops?|shrinks?|returns?|frees?|brings?|finds?|flags?|stops?|removes?|replaces?)\b/i;

function article(category: string): string {
  const c = category.trim();
  if (/^(the|a|an)\s/i.test(c)) return '';
  if (/^(leading|only|first|#1|number one|premier|best|world's|largest)/i.test(c)) return 'the ';
  if (/^\[/.test(c)) return 'a ';
  return /^[aeiou]/i.test(c) && !/^(uni|use|eu)/i.test(c) ? 'an ' : 'a ';
}

function thatClause(unique: string): string {
  const u = trimEnd(unique);
  if (/^(that|which|who)\s/i.test(u)) return u.replace(/^(which|who)\s/i, 'that ');
  return `that ${lcFirst(u)}`;
}

function valueClause(value: string): string {
  const v = lcFirst(trimEnd(value));
  return VERB_START.test(v) ? v : `delivers ${v}`;
}

/**
 * Composes a positioning statement from the five components. Returned as
 * segments so the UI can show which component produced which words.
 */
export function composeSegments(company: string, f: Fields): Segment[] {
  const co = company.trim() || 'Your product';
  const segs: Segment[] = [];
  const cat = trimEnd(f.category);
  const uni = trimEnd(f.unique);
  const tgt = trimEnd(f.target);
  const alt = trimEnd(f.alternatives);
  const val = trimEnd(f.value);

  if (!cat && !uni && !tgt && !alt && !val) return [];

  segs.push({ text: `${co} is ` });
  if (cat) {
    segs.push({ text: article(cat) });
    segs.push({ text: lcFirstSoft(cat), key: 'category' });
  } else {
    segs.push({ text: 'a product' });
  }
  if (uni) {
    segs.push({ text: ' ' });
    segs.push({ text: thatClause(uni), key: 'unique' });
  }
  segs.push({ text: '.' });

  if (tgt) {
    segs.push({ text: ' Built for ' });
    segs.push({ text: lcFirstSoft(tgt), key: 'target' });
    segs.push({ text: '.' });
  }

  if (alt && val) {
    segs.push({ text: ' Unlike ' });
    segs.push({ text: lcFirstSoft(alt), key: 'alternatives' });
    segs.push({ text: `, ${co} ` });
    segs.push({ text: valueClause(val), key: 'value' });
    segs.push({ text: '.' });
  } else if (alt) {
    segs.push({ text: ' Teams choose it over ' });
    segs.push({ text: lcFirstSoft(alt), key: 'alternatives' });
    segs.push({ text: '.' });
  } else if (val) {
    segs.push({ text: ` ${co} ` });
    segs.push({ text: valueClause(val), key: 'value' });
    segs.push({ text: '.' });
  }
  return segs;
}

/** Lowercases the first letter unless it looks like a proper noun or acronym. */
function lcFirstSoft(s: string): string {
  const first = s.split(/\s+/)[0] ?? '';
  if (/^[A-Z][a-z]+[A-Z]/.test(first) || /^[A-Z]{2,}/.test(first) || /^[A-Z][a-z]*\b/.test(first) && isProper(first)) return s;
  return lcFirst(s);
}

const PROPER = new Set([
  'Splunk', 'Microsoft', 'Salesforce', 'HubSpot', 'Snowflake', 'Excel', 'Google', 'NetSuite', 'Gong', 'Monte',
  'Bill.com', 'Samsara', 'Fleetio', 'Zendesk', 'Jira', 'Coupa', 'Ramp', 'Brex', 'Datadog', 'Tipalti', 'SAP', 'Oracle',
  'Chorus', 'Clari', 'Outreach', 'Salesloft', 'QuickBooks', 'Great', 'Airflow', 'Torq', 'Tines',
]);
function isProper(w: string) {
  return PROPER.has(w.replace(/[^A-Za-z.]/g, ''));
}

export function composeStatement(company: string, f: Fields): string {
  return composeSegments(company, f)
    .map((s) => s.text)
    .join('');
}

/** The first sentence alone: what a rep would actually say out loud. */
export function leadSentence(statement: string): string {
  const m = statement.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : statement).trim();
}
