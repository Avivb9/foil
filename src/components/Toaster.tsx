import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUI } from '../store/ui';
import { cx } from './ui';

const ICONS = {
  default: null,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-ember-500" />,
};

export function Toaster() {
  const { toasts, dismissToast } = useUI();
  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-sand-800 bg-sand-900 px-4 py-3 text-sand-50 shadow-lift"
          >
            {ICONS[t.tone] && <div className="mt-0.5">{ICONS[t.tone]}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.body && <p className="mt-0.5 text-[13px] text-sand-300">{t.body}</p>}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismissToast(t.id);
                }}
                className={cx('shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-ember-300 hover:bg-white/10')}
              >
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="shrink-0 rounded p-0.5 text-sand-400 hover:text-sand-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
