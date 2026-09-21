import { motion } from 'framer-motion';
import { ArrowDownUp, CopyPlus, FileText, Filter, MoreHorizontal, Plus, Search, Swords, Trash2, TrendingUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScorePill } from '../components/spar/bits';
import { Sparkline } from '../components/spar/charts';
import { Avatar, Badge, Button, EmptyState, IconButton, Menu, Modal, Skeleton, cx } from '../components/ui';
import { formatDateTime, relativeTime } from '../logic/format';
import { generateObjections } from '../logic/objections';
import { scoreSnapshot } from '../logic/scoring';
import type { SparStatus } from '../logic/types';
import { useApp } from '../store/app';
import { toast } from '../store/ui';
import { STATUS_TONE } from './SparWorkspace';

type SortKey = 'recent' | 'score-desc' | 'score-asc' | 'name';
const SORTS: Record<SortKey, string> = { recent: 'Last run', 'score-desc': 'Highest score', 'score-asc': 'Lowest score', name: 'Company name' };
const STATUSES: (SparStatus | 'All')[] = ['All', 'Draft', 'Needs work', 'In review', 'Launch-ready'];

let firstLoad = true;

export default function SparsList() {
  const spars = useApp((s) => s.spars);
  const weights = useApp((s) => s.weights);
  const personas = useApp((s) => s.personas);
  const duplicateSpar = useApp((s) => s.duplicateSpar);
  const deleteSpar = useApp((s) => s.deleteSpar);
  const createReport = useApp((s) => s.createReport);
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState<SparStatus | 'All'>('All');
  const [owner, setOwner] = useState<string>('Anyone');
  const [sort, setSort] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(firstLoad);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => {
      setLoading(false);
      firstLoad = false;
    }, 650);
    return () => window.clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (q) params.set('q', q);
    else params.delete('q');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const rows = useMemo(
    () =>
      spars.map((s) => {
        const src = s.lastRun ?? { company: s.company, fields: s.draft, mode: s.mode, personaIds: [] };
        const score = scoreSnapshot(src, weights).overall;
        const trend = s.versions.map((v) => scoreSnapshot(v, weights).overall);
        const panel = personas.filter((p) => p.enabled);
        const deal = s.lastRun ? generateObjections(s.lastRun.company, s.lastRun.fields, s.lastRun.mode, panel, weights).filter((o) => o.severity === 'dealbreaker').length : 0;
        return { s, score, trend, deal };
      }),
    [spars, weights, personas],
  );

  const owners = useMemo(() => ['Anyone', ...Array.from(new Set(spars.map((s) => s.owner)))], [spars]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter(
      ({ s }) =>
        (status === 'All' || s.status === status) &&
        (owner === 'Anyone' || s.owner === owner) &&
        (!t || `${s.company} ${s.product} ${s.segment} ${s.owner}`.toLowerCase().includes(t)),
    );
    const at = (x: (typeof rows)[number]) => new Date(x.s.lastRun?.at ?? x.s.updatedAt).getTime();
    return list.sort((a, b) =>
      sort === 'recent' ? at(b) - at(a) : sort === 'score-desc' ? b.score - a.score : sort === 'score-asc' ? a.score - b.score : a.s.company.localeCompare(b.s.company),
    );
  }, [rows, q, status, owner, sort]);

  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length) : 0;
  const ready = rows.filter((r) => r.s.status === 'Launch-ready').length;
  const openDeal = rows.reduce((a, r) => a + r.deal, 0);
  const lifts = rows.filter((r) => r.trend.length > 1).map((r) => r.trend[r.trend.length - 1] - r.trend[0]);
  const avgLift = lifts.length ? Math.round(lifts.reduce((a, b) => a + b, 0) / lifts.length) : 0;
  const filtersOn = status !== 'All' || owner !== 'Anyone' || q;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[34px] font-semibold leading-tight">Spars</h1>
          <p className="mt-1 text-sm text-sand-600">Every positioning statement your team is pressure-testing before it ships.</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => nav('/spars/new')}>
          New spar
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Average score" value={avg} suffix="/100" loading={loading} />
        <Stat label="Avg. lift across versions" value={avgLift} prefix={avgLift > 0 ? '+' : ''} suffix=" pts" loading={loading} accent />
        <Stat label="Launch-ready" value={ready} suffix={` of ${rows.length}`} loading={loading} />
        <Stat label="Open deal-breakers" value={openDeal} loading={loading} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, product, owner" className="input pl-9" aria-label="Search spars" />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-700">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-sand-200 bg-sand-100/80 p-0.5">
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={cx('rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition', status === st ? 'bg-white text-sand-900 shadow-card ring-1 ring-sand-200' : 'text-sand-500 hover:text-sand-800')}
            >
              {st}
            </button>
          ))}
        </div>
        <Menu
          trigger={({ toggle }) => (
            <Button size="md" onClick={toggle} icon={<Filter className="h-3.5 w-3.5" />}>
              {owner === 'Anyone' ? 'Owner' : owner}
            </Button>
          )}
          items={owners.map((o) => ({ label: o, checked: o === owner, onSelect: () => setOwner(o) }))}
          width="w-52"
        />
        <Menu
          align="right"
          trigger={({ toggle }) => (
            <Button size="md" onClick={toggle} icon={<ArrowDownUp className="h-3.5 w-3.5" />}>
              {SORTS[sort]}
            </Button>
          )}
          items={(Object.keys(SORTS) as SortKey[]).map((k) => ({ label: SORTS[k], checked: k === sort, onSelect: () => setSort(k) }))}
          width="w-48"
        />
        {filtersOn && (
          <button
            onClick={() => {
              setQ('');
              setStatus('All');
              setOwner('Anyone');
            }}
            className="text-[13px] font-medium text-ember-600 hover:text-ember-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-200/80 bg-sand-50/70 text-[11.5px] font-semibold uppercase tracking-wide text-sand-500">
                <th className="px-5 py-3">Company</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Trend</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Last run</th>
                <th className="px-3 py-3">Owner</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-sand-100 last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-40" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-3 py-4">
                        <Skeleton className="h-3 w-16" />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
              {!loading &&
                filtered.map(({ s, score, trend, deal }, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.035 }}
                    onClick={() => nav(`/spars/${s.id}`)}
                    className="group cursor-pointer border-b border-sand-100 transition last:border-0 hover:bg-ember-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand-900 text-[15px] font-semibold text-sand-50">{s.company.charAt(0)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-sand-900 group-hover:text-ember-700">{s.company}</p>
                          <p className="truncate text-xs text-sand-500">
                            {s.product} · {s.segment}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <ScorePill score={score} />
                        {deal > 0 && (
                          <span title={`${deal} open deal-breakers`} className="rounded-full bg-red-50 px-1.5 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-200">
                            {deal}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">{trend.length > 1 ? <Sparkline values={trend} width={84} height={28} /> : <span className="text-xs text-sand-400">1 version</span>}</td>
                    <td className="px-3 py-3.5">
                      <Badge tone={STATUS_TONE[s.status]} dot>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5 text-[13px] text-sand-600" title={s.lastRun ? formatDateTime(s.lastRun.at) : ''}>
                      {s.lastRun ? relativeTime(s.lastRun.at) : <span className="text-sand-400">Not run</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="flex items-center gap-2 text-[13px] text-sand-700">
                        <Avatar name={s.owner} size={22} />
                        {s.owner}
                      </span>
                    </td>
                    <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <Menu
                        align="right"
                        width="w-48"
                        trigger={({ toggle }) => (
                          <IconButton label={`Actions for ${s.company}`} onClick={toggle} className="h-8 w-8 opacity-60 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </IconButton>
                        )}
                        items={[
                          { label: 'Open spar', icon: <Swords className="h-4 w-4" />, onSelect: () => nav(`/spars/${s.id}`) },
                          {
                            label: 'Create report',
                            icon: <FileText className="h-4 w-4" />,
                            onSelect: () => {
                              if (!s.lastRun) return toast({ tone: 'error', title: 'Run this spar first' });
                              const r = createReport(s.id, s.lastRun);
                              toast({ tone: 'success', title: 'Report created', action: { label: 'Open', onClick: () => nav(`/reports/${r.id}`) } });
                            },
                          },
                          {
                            label: 'Duplicate',
                            icon: <CopyPlus className="h-4 w-4" />,
                            onSelect: () => {
                              duplicateSpar(s.id);
                              toast({ tone: 'success', title: `${s.company} duplicated` });
                            },
                          },
                          { divider: true, label: '' },
                          { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => setToDelete(s.id) },
                        ]}
                      />
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={rows.length ? 'No spars match these filters' : 'No spars yet'}
            body={rows.length ? 'Try a different search or clear the filters.' : 'Start your first spar to see how five buyer personas react to your positioning.'}
            action={
              rows.length ? (
                <Button
                  onClick={() => {
                    setQ('');
                    setStatus('All');
                    setOwner('Anyone');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => nav('/spars/new')}>
                  New spar
                </Button>
              )
            }
          />
        )}
      </div>
      {!loading && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-sand-500">
          <TrendingUp className="h-3.5 w-3.5" /> Scores use your workspace weights and recalculate if you change them in Settings.
        </p>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={`Delete ${spars.find((s) => s.id === toDelete)?.company ?? 'spar'}?`}
        description="This removes the spar, its versions and its reports for everyone in the workspace."
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                const name = spars.find((s) => s.id === toDelete)?.company;
                if (toDelete) deleteSpar(toDelete);
                setToDelete(null);
                toast({ title: `${name} deleted` });
              }}
            >
              Delete spar
            </Button>
          </>
        }
      />
    </div>
  );
}

function Stat({ label, value, prefix = '', suffix = '', loading, accent }: { label: string; value: number; prefix?: string; suffix?: string; loading: boolean; accent?: boolean }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[12px] font-medium text-sand-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className={cx('display mt-1 text-[28px] font-semibold leading-none tabular-nums', accent ? 'text-emerald-700' : 'text-sand-900')}>
          {prefix}
          {value}
          <span className="font-sans text-sm font-medium text-sand-400">{suffix}</span>
        </p>
      )}
    </div>
  );
}
