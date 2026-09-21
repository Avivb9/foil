import { ArrowLeft, Check, Copy, Download, ExternalLink, FileDown, Globe, Link2, Lock, Swords, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReportDocument, useReportData } from '../components/ReportDocument';
import { Button, Modal, Segmented } from '../components/ui';
import { reportToMarkdown } from '../logic/markdown';
import type { Report } from '../logic/types';
import { useApp } from '../store/app';
import { copyText, toast } from '../store/ui';
import NotFound from './NotFound';
import { shareUrl } from './Reports';

export default function ReportView() {
  const { id } = useParams();
  const report = useApp((s) => s.reports.find((r) => r.id === id));
  if (!report) return <NotFound title="Report not found" body="It may have been deleted. Reports you save from a spar appear under Reports." />;
  return <View key={report.id} report={report} />;
}

function View({ report }: { report: Report }) {
  const personas = useApp((s) => s.personas);
  const weights = useApp((s) => s.weights);
  const spars = useApp((s) => s.spars);
  const deleteReport = useApp((s) => s.deleteReport);
  const renameReport = useApp((s) => s.renameReport);
  const nav = useNavigate();
  const data = useReportData(report, personas, weights);
  const [shareOpen, setShareOpen] = useState(false);
  const [access, setAccess] = useState<'link' | 'workspace'>('link');
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const url = shareUrl(report.slug);
  const sparExists = spars.some((s) => s.id === report.sparId);

  const copyMarkdown = async () => {
    const md = reportToMarkdown(report, data.result, data.objections, data.panel, data.rewrite, weights, url);
    const ok = await copyText(md);
    toast(ok ? { tone: 'success', title: 'Copied as markdown', body: `${md.split('\n').length} lines, ready for Notion, Confluence or Slack.` } : { tone: 'error', title: 'Couldn’t access the clipboard' });
  };

  const downloadPdf = () => {
    setPdfBusy(true);
    toast({ tone: 'info', title: 'Preparing PDF…', body: 'Choose “Save as PDF” in the print dialog.' });
    window.setTimeout(() => {
      setPdfBusy(false);
      window.print();
    }, 700);
  };

  const copyLink = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
    toast(ok ? { tone: 'success', title: 'Share link copied' } : { tone: 'error', title: 'Couldn’t access the clipboard' });
  };

  return (
    <div className="print-full mx-auto max-w-[1040px] px-4 pb-24 pt-6 sm:px-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/reports" className="flex items-center gap-1.5 text-[13px] font-medium text-sand-600 hover:text-sand-900">
          <ArrowLeft className="h-4 w-4" /> All reports
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {sparExists && (
            <Button size="sm" variant="ghost" icon={<Swords className="h-3.5 w-3.5" />} onClick={() => nav(`/spars/${report.sparId}`)}>
              Open spar
            </Button>
          )}
          <Button size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyMarkdown}>
            Copy as markdown
          </Button>
          <Button size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={downloadPdf} loading={pdfBusy}>
            Download PDF
          </Button>
          <Button size="sm" variant="primary" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => setShareOpen(true)}>
            Share link
          </Button>
          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleteOpen(true)} aria-label="Delete report" />
        </div>
      </div>

      <div className="no-print mb-4">
        <input
          value={report.title}
          onChange={(e) => renameReport(report.id, e.target.value)}
          onBlur={(e) => !e.target.value.trim() && renameReport(report.id, `${report.snapshot.company} positioning report`)}
          aria-label="Report title"
          className="w-full rounded-md bg-transparent px-1 py-0.5 text-sm text-sand-500 outline-none hover:bg-sand-200/40 focus:bg-white focus:ring-2 focus:ring-ember-200"
        />
      </div>

      <ReportDocument report={report} personas={personas} weights={weights} />

      <p className="print-only mt-6 text-center text-xs text-sand-500">Generated with Foil · {url}</p>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this report"
        description="Recipients see a read-only copy. They can’t edit the spar or see the rest of the workspace."
        footer={
          <>
            <Button variant="ghost" icon={<ExternalLink className="h-4 w-4" />} onClick={() => nav(`/share/${report.slug}`)}>
              Preview as a viewer
            </Button>
            <Button variant="primary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-sand-200 bg-sand-50 p-1.5 pl-3">
            <Globe className="h-4 w-4 shrink-0 text-sand-400" />
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-sand-700 outline-none" aria-label="Share URL" />
            <Button size="sm" onClick={copyLink} icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[13px] text-sand-700">
              {access === 'link' ? <Globe className="h-4 w-4 text-sand-500" /> : <Lock className="h-4 w-4 text-sand-500" />}
              {access === 'link' ? 'Anyone with the link can view' : 'Only Northbeam members can view'}
            </span>
            <Segmented
              size="sm"
              layoutId="share-access"
              value={access}
              onChange={(v) => {
                setAccess(v);
                toast({ title: v === 'link' ? 'Link sharing on' : 'Restricted to Northbeam' });
              }}
              options={[
                { value: 'link', label: 'Anyone with link' },
                { value: 'workspace', label: 'Workspace' },
              ]}
            />
          </div>
          <button
            onClick={() => {
              const md = `**${report.title}**: ${data.result.overall}/100, ${data.objections.filter((o) => o.severity === 'dealbreaker').length} deal-breakers. ${url}`;
              copyText(md).then((ok) => toast(ok ? { tone: 'success', title: 'Slack-ready summary copied' } : { tone: 'error', title: 'Couldn’t access the clipboard' }));
            }}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ember-600 hover:text-ember-700"
          >
            <Download className="h-3.5 w-3.5 rotate-180" /> Copy a one-line summary for Slack
          </button>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this report?"
        description="The share link will stop working for anyone who has it."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                deleteReport(report.id);
                toast({ title: 'Report deleted' });
                nav('/reports');
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
