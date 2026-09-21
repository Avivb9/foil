import { motion } from 'framer-motion';
import { FileText, Link2, MoreHorizontal, Search, Trash2, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScorePill } from '../components/spar/bits';
import { Avatar, Badge, Button, EmptyState, IconButton, Menu, Modal, Skeleton } from '../components/ui';
import { formatDateTime, relativeTime } from '../logic/format';
import { generateObjections } from '../logic/objections';
import { scoreSnapshot } from '../logic/scoring';
import type { Persona } from '../logic/types';
import { useApp } from '../store/app';
import { copyText, toast } from '../store/ui';

export const shareUrl = (slug: string) => `${window.location.origin}/share/${slug}`;

let firstLoad = true;

export default function Reports() {
  const reports = useApp((s) => s.reports);
  const personas = useApp((s) => s.personas);
  const weights = useApp((s) => s.weights);
  const deleteReport = useApp((s) => s.deleteReport);
  const spars = useApp((s) => s.spars);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(firstLoad);
  const [toDelete, setToDelete] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setLoading(false);
      firstLoad = false;
    }, 550);
    return () => window.clearTimeout(t);
  }, []);

  const rows = useMemo(
    () =>
      reports
        .map((r) => {
          const panel = r.snapshot.personaIds.map((id) => personas.find((p) => p.id === id)).filter(Boolean) as Persona[];
          const objs = generateObjections(r.snapshot.company, r.snapshot.fields, r.snapshot.mode, panel, weights);
          return { r, score: scoreSnapshot(r.snapshot, weights).overall, deal: objs.filter((o) => o.severity === 'dealbreaker').length };
        })
        .filter(({ r }) => `${r.title} ${r.snapshot.company} ${r.createdBy}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => new Date(b.r.createdAt).getTime() - new Date(a.r.createdAt).getTime()),
    [reports, personas, weights, q],
  );

  const copyLink = async (slug: string) => {
    const ok = await copyText(shareUrl(slug));
    toast(ok ? { tone: 'success', title: 'Share link copied', body: 'Anyone with the link can view a read-only copy.' } : { tone: 'error', title: 'Couldn’t access the clipboard' });
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-20 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[34px] font-semibold leading-tight">Reports</h1>
          <p className="mt-1 text-sm text-sand-600">Saved spar results to share with sales, leadership or an agency. Export as markdown or PDF.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports" className="input pl-9" aria-label="Search reports" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        {!loading &&
          rows.map(({ r, score, deal }, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => nav(`/reports/${r.id}`)}
              className="card group flex cursor-pointer flex-col p-5 transition hover:border-sand-300 hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ember-50 text-ember-600 ring-1 ring-ember-200">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold leading-snug text-sand-900 group-hover:text-ember-700">{r.title}</p>
                  <p className="mt-0.5 text-xs text-sand-500">
                    {r.snapshot.company} · {r.snapshot.mode} mode
                    {!spars.some((s) => s.id === r.sparId) && ' · spar archived'}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Menu
                    align="right"
                    width="w-48"
                    trigger={({ toggle }) => (
                      <IconButton label={`Actions for ${r.title}`} onClick={toggle} className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </IconButton>
                    )}
                    items={[
                      { label: 'Open report', icon: <FileText className="h-4 w-4" />, onSelect: () => nav(`/reports/${r.id}`) },
                      { label: 'Copy share link', icon: <Link2 className="h-4 w-4" />, onSelect: () => copyLink(r.slug) },
                      { label: 'Open read-only view', icon: <ExternalLink className="h-4 w-4" />, onSelect: () => nav(`/share/${r.slug}`) },
                      { divider: true, label: '' },
                      { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => setToDelete(r.id) },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <ScorePill score={score} />
                {deal > 0 ? <Badge tone="red">{deal} deal-breaker{deal > 1 ? 's' : ''}</Badge> : <Badge tone="green">No deal-breakers</Badge>}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-sand-200/80 pt-3 text-xs text-sand-500">
                <Avatar name={r.createdBy} size={20} />
                <span className="flex-1">{r.createdBy}</span>
                <span title={formatDateTime(r.createdAt)}>{relativeTime(r.createdAt)}</span>
              </div>
            </motion.div>
          ))}
      </div>
      {!loading && rows.length === 0 && (
        <div className="card mt-2">
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title={q ? `No reports match “${q}”` : 'No reports yet'}
            body={q ? 'Try the company name instead.' : 'Open a spar and choose Create report from the actions menu to save one here.'}
            action={q ? <Button onClick={() => setQ('')}>Clear search</Button> : <Button variant="primary" onClick={() => nav('/')}>Go to spars</Button>}
          />
        </div>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this report?"
        description="The share link will stop working for anyone who has it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                if (toDelete) deleteReport(toDelete);
                setToDelete(null);
                toast({ title: 'Report deleted' });
              }}
            >
              Delete report
            </Button>
          </>
        }
      />
    </div>
  );
}
