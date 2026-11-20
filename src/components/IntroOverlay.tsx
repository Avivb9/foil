import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, FlaskConical, ListOrdered, Swords, Target, Users } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { INTRO } from '../data/intro';
import { useUI } from '../store/ui';
import { LogoMark } from './Logo';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.12 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }),
};

export function IntroOverlay() {
  const { introOpen, closeIntro } = useUI();

  useEffect(() => {
    if (!introOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeIntro();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [introOpen, closeIntro]);

  return (
    <AnimatePresence>
      {introOpen && (
        <motion.div
          key="intro"
          role="dialog"
          aria-modal="true"
          aria-label="About Foil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          className="no-print fixed inset-0 z-[100] overflow-y-auto bg-sand-950 text-sand-100"
        >
          {/* backdrop */}
          <div className="pointer-events-none fixed inset-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-ember-600/30 blur-[120px]"
            />
            <div className="absolute -bottom-60 -left-40 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="grain absolute inset-0 opacity-40" />
          </div>

          <div className="relative mx-auto max-w-5xl px-6 pb-32 pt-8 sm:px-10">
            <div className="flex items-center justify-between">
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2.5">
                <LogoMark size={30} />
                <span className="display text-xl font-semibold text-sand-50">{INTRO.title}</span>
              </motion.div>
              <button onClick={closeIntro} className="rounded-md px-2 py-1 text-sm text-sand-400 transition hover:text-sand-100">
                {INTRO.skip} <span className="ml-1 rounded border border-sand-700 px-1.5 py-0.5 font-mono text-[10px] text-sand-500">Esc</span>
              </button>
            </div>

            {/* hero */}
            <div className="mt-16 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <motion.div custom={0} variants={rise} initial="hidden" animate="show">
                <LogoMark size={88} className="rounded-2xl shadow-[0_20px_60px_-15px_rgba(59,99,246,0.55)]" />
              </motion.div>
              <div>
                <motion.h1 custom={1} variants={rise} initial="hidden" animate="show" className="display text-[80px] font-semibold leading-[0.9] text-sand-50 sm:text-[104px]">
                  {INTRO.title}
                  <span className="text-ember-500">.</span>
                </motion.h1>
                <motion.p custom={2} variants={rise} initial="hidden" animate="show" className="display mt-3 max-w-2xl text-3xl font-medium leading-tight tracking-[-0.02em] text-sand-200 sm:text-[36px]">
                  {INTRO.tagline}
                </motion.p>
              </div>
            </div>

            {/* what it does */}
            <Section icon={<Swords className="h-4 w-4" />} heading={INTRO.what.heading} i={3} className="mt-16">
              <p className="max-w-3xl text-xl leading-relaxed text-sand-100">{INTRO.what.body}</p>
            </Section>

            {/* who + problem */}
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              <Section icon={<Users className="h-4 w-4" />} heading={INTRO.who.heading} i={4}>
                <p className="text-[17px] leading-relaxed text-sand-300">{INTRO.who.body}</p>
              </Section>
              <Section icon={<Target className="h-4 w-4" />} heading={INTRO.problem.heading} i={5}>
                <p className="text-[17px] leading-relaxed text-sand-300">{INTRO.problem.body}</p>
              </Section>
            </div>

            {/* how it works */}
            <Section icon={<ListOrdered className="h-4 w-4" />} heading={INTRO.steps.heading} i={6} className="mt-12">
              <ol className="grid gap-4 md:grid-cols-3">
                {INTRO.steps.items.map((s, i) => (
                  <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <span className="display text-4xl font-semibold text-ember-500">{i + 1}</span>
                    <p className="mt-3 text-[15px] leading-relaxed text-sand-200">{s}</p>
                  </li>
                ))}
              </ol>
            </Section>

            {/* demo version */}
            <motion.section
              custom={7}
              variants={rise}
              initial="hidden"
              animate="show"
              className="mt-12 flex gap-4 rounded-2xl border border-ember-500/30 bg-ember-500/[0.08] p-5 sm:p-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ember-500/20 text-ember-300">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ember-300">{INTRO.demo.heading}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-sand-200">{INTRO.demo.body}</p>
              </div>
            </motion.section>
          </div>

          {/* sticky footer + CTA */}
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 26 }}
            className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-sand-950/85 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
              <p className="text-sm text-sand-400">
                {INTRO.footer.prefix} ·{' '}
                <a href={INTRO.footer.url} target="_blank" rel="noreferrer" className="text-sand-200 underline-offset-4 hover:text-ember-300 hover:underline">
                  {INTRO.footer.site}
                </a>
              </p>
              <button
                onClick={closeIntro}
                autoFocus
                className="group inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-ember-500 px-6 text-[15px] font-semibold text-white shadow-[0_8px_30px_-6px_rgba(59,99,246,0.55)] transition hover:bg-ember-400 focus-visible:ring-offset-sand-950"
              >
                {INTRO.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, heading, children, i, className }: { icon: ReactNode; heading: string; children: ReactNode; i: number; className?: string }) {
  return (
    <motion.section custom={i} variants={rise} initial="hidden" animate="show" className={className}>
      <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sand-400">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ember-500/15 text-ember-400">{icon}</span>
        {heading}
      </h2>
      {children}
    </motion.section>
  );
}
