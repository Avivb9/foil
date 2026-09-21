import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BarChart3, Compass, Swords, Users } from 'lucide-react';
import { useEffect } from 'react';
import { INTRO } from '../data/intro';
import { DEFAULT_PERSONAS } from '../data/personas';
import { useUI } from '../store/ui';
import { LogoMark } from './Logo';
import { Avatar } from './ui';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] } }),
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
              className="absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-ember-600/25 blur-[120px]"
            />
            <div className="absolute -bottom-60 -left-40 h-[520px] w-[520px] rounded-full bg-amber-700/10 blur-[120px]" />
            <div className="grain absolute inset-0 opacity-40" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-8 sm:px-10">
            <div className="flex items-center justify-between">
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2.5">
                <LogoMark size={30} />
                <span className="text-sm text-sand-400">
                  by{' '}
                  <a href={INTRO.author.url} target="_blank" rel="noreferrer" className="text-sand-200 underline-offset-4 hover:text-ember-300 hover:underline">
                    {INTRO.author.name}
                  </a>
                </span>
              </motion.div>
              <button onClick={closeIntro} className="rounded-md px-2 py-1 text-sm text-sand-400 transition hover:text-sand-100">
                {INTRO.skip} <span className="ml-1 rounded border border-sand-700 px-1.5 py-0.5 font-mono text-[10px] text-sand-500">Esc</span>
              </button>
            </div>

            {/* hero */}
            <div className="mt-16 grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-end">
              <div>
                <motion.p custom={0} variants={rise} initial="hidden" animate="show" className="text-xs font-semibold uppercase tracking-[0.2em] text-ember-400">
                  {INTRO.eyebrow}
                </motion.p>
                <motion.h1 custom={1} variants={rise} initial="hidden" animate="show" className="display mt-4 text-[88px] font-semibold leading-[0.9] text-sand-50 sm:text-[120px]">
                  {INTRO.title}
                  <span className="text-ember-500">.</span>
                </motion.h1>
                <motion.p custom={2} variants={rise} initial="hidden" animate="show" className="display mt-5 max-w-xl text-3xl font-normal italic leading-tight text-sand-200 sm:text-[38px]">
                  {INTRO.hook}
                </motion.p>
              </div>
              <motion.div custom={3} variants={rise} initial="hidden" animate="show" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wider text-sand-400">Your panel</p>
                <ul className="mt-3 space-y-2.5">
                  {DEFAULT_PERSONAS.map((p, i) => (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.12 }}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={p.name} color={p.color} size={30} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-sand-100">{p.name}</p>
                        <p className="truncate text-xs text-sand-400">{p.role}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* problem + who */}
            <div className="mt-20 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
              <Section icon={<Swords className="h-4 w-4" />} heading={INTRO.problem.heading} i={4}>
                {INTRO.problem.body.map((p, i) => (
                  <p key={i} className="text-[17px] leading-relaxed text-sand-300 first:text-xl first:text-sand-100">
                    {p}
                  </p>
                ))}
              </Section>
              <Section icon={<Users className="h-4 w-4" />} heading={INTRO.who.heading} i={5}>
                <p className="text-[17px] leading-relaxed text-sand-300">{INTRO.who.body}</p>
              </Section>
            </div>

            {/* steps */}
            <Section icon={<ArrowRight className="h-4 w-4" />} heading={INTRO.steps.heading} i={6} className="mt-16">
              <ol className="grid gap-4 md:grid-cols-3">
                {INTRO.steps.items.map((s, i) => (
                  <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <span className="display text-4xl font-semibold text-ember-500">{i + 1}</span>
                    <p className="mt-3 font-semibold text-sand-50">{s.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-sand-400">{s.body}</p>
                  </li>
                ))}
              </ol>
            </Section>

            {/* metrics */}
            <Section icon={<BarChart3 className="h-4 w-4" />} heading={INTRO.metrics.heading} i={7} className="mt-16">
              <div className="grid gap-4 md:grid-cols-3">
                {INTRO.metrics.items.map((m) => (
                  <div key={m.label} className="border-l-2 border-ember-500/70 pl-4">
                    <p className="display text-5xl font-semibold text-sand-50">{m.value}</p>
                    <p className="mt-2 font-medium text-sand-200">{m.label}</p>
                    <p className="mt-0.5 text-sm text-sand-500">{m.note}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* approach */}
            <Section icon={<Compass className="h-4 w-4" />} heading={INTRO.approach.heading} i={8} className="mt-16">
              <div className="grid gap-6 md:grid-cols-2">
                {INTRO.approach.items.map((a) => (
                  <div key={a.title}>
                    <p className="font-semibold text-sand-50">{a.title}</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-sand-400">{a.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <p className="display mt-20 text-center text-2xl italic text-sand-400">{INTRO.closing}</p>
          </div>

          {/* sticky CTA */}
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 26 }}
            className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-sand-950/85 backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
              <p className="hidden text-sm text-sand-400 sm:block">
                {INTRO.author.name} · {INTRO.author.role} ·{' '}
                <a href={INTRO.author.url} target="_blank" rel="noreferrer" className="text-sand-200 hover:text-ember-300">
                  {INTRO.author.site}
                </a>
              </p>
              <button
                onClick={closeIntro}
                autoFocus
                className="group inline-flex h-12 items-center gap-2 rounded-xl bg-ember-500 px-6 text-[15px] font-semibold text-white shadow-[0_8px_30px_-6px_rgba(244,84,18,0.6)] transition hover:bg-ember-400 focus-visible:ring-offset-sand-950"
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

function Section({ icon, heading, children, i, className }: { icon: React.ReactNode; heading: string; children: React.ReactNode; i: number; className?: string }) {
  return (
    <motion.section custom={i} variants={rise} initial="hidden" animate="show" className={className}>
      <h2 className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sand-400">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ember-500/15 text-ember-400">{icon}</span>
        {heading}
      </h2>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}
