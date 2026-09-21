import { ArrowRight, Eye, FileDown } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ReportDocument } from '../components/ReportDocument';
import { Button, EmptyState } from '../components/ui';
import { useApp } from '../store/app';

/** Read-only report view for people outside the workspace. No app chrome. */
export default function SharedReport() {
  const { slug } = useParams();
  const report = useApp((s) => s.reports.find((r) => r.slug === slug));
  const personas = useApp((s) => s.personas);
  const weights = useApp((s) => s.weights);
  const workspace = useApp((s) => s.workspaceName);

  return (
    <div className="min-h-screen bg-[#f6f2ea]">
      <header className="no-print sticky top-0 z-20 border-b border-sand-200/80 bg-[#f6f2ea]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden items-center gap-1.5 rounded-full bg-sand-200/70 px-2.5 py-1 text-[11.5px] font-medium text-sand-600 sm:flex">
              <Eye className="h-3.5 w-3.5" /> Read-only · shared by {workspace}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <Button size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => window.print()}>
                Save PDF
              </Button>
            )}
            <Link to="/" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sand-900 px-3 text-[13px] font-medium text-sand-50 hover:bg-sand-800">
              Try Foil <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>
      <main className="print-full mx-auto max-w-[1040px] px-4 pb-20 pt-8 sm:px-8">
        {report ? (
          <ReportDocument report={report} personas={personas} weights={weights} />
        ) : (
          <div className="card">
            <EmptyState
              icon={<Eye className="h-5 w-5" />}
              title="This link has expired"
              body="The report was deleted or its link was turned off. Ask the person who shared it for a new link."
              action={
                <Link to="/" className="inline-flex h-9 items-center rounded-lg bg-ember-500 px-4 text-sm font-medium text-white hover:bg-ember-600">
                  Go to Foil
                </Link>
              }
            />
          </div>
        )}
        <p className="mt-10 text-center text-xs text-sand-500">Pressure-tested with Foil · Attack your positioning before the market does.</p>
      </main>
    </div>
  );
}
