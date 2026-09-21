// All copy for the intro overlay lives here.

export const INTRO = {
  eyebrow: 'PMM portfolio project',
  title: 'Foil',
  hook: 'Attack your positioning before the market does.',
  author: { name: 'Aviv Braun', role: 'B2B Product Marketing Manager', site: 'avivbraun.com', url: 'https://avivbraun.com' },

  problem: {
    heading: 'The problem',
    body: [
      'Most positioning statements die on the first sales call. Not because the product is weak, but because nobody stress-tested the words before they shipped.',
      'I’ve watched it happen from the PMM seat. We test messaging on stakeholders who are too polite: the CEO who wrote half of it, the product team who loves the features, the AE who nods in the review and then improvises on the call anyway. The first honest feedback arrives from a prospect, and by then it’s on the website.',
    ],
  },

  who: {
    heading: 'Who feels it',
    body: 'PMMs and founders who are about to launch or reposition, and who need to know which sentence will fall apart in front of a CFO, a competitor’s AE or an analyst before those people ever see it.',
  },

  steps: {
    heading: 'Try it in 3 steps',
    items: [
      { title: 'Load a sample or enter your positioning', body: 'Open the Kestrel spar and use Load example, or type your own five Dunford components.' },
      { title: 'Start a spar with five buyer personas', body: 'A CFO, a rival AE, an engineering director, an SDR and an analyst each attack a different part of it.' },
      { title: 'Apply the rewrite and watch the score move', body: 'Foil strips the buzzwords, marks the gaps, and re-scores. Save it as a version to track the trend.' },
    ],
  },

  metrics: {
    heading: 'How I’d measure it',
    items: [
      { value: '+25 pts', label: 'Positioning score lift after rewrite', note: 'Average first-rewrite lift, per spar' },
      { value: '>90%', label: 'Statements with a clearly named category', note: 'Share of spars scoring 70+ on category' },
      { value: '>70%', label: 'Objections resolved before launch', note: 'Deal-breakers cleared by the final version' },
    ],
  },

  approach: {
    heading: 'My approach',
    items: [
      {
        title: 'Why five personas',
        body: 'Each one attacks a different component of April Dunford’s framework. Dana (CFO) goes after value and proof. Marcus (rival AE) goes after differentiation against the alternatives. Priya (engineering) goes after the mechanism. Tyler (SDR) tests whether a human can actually say it. Helen (analyst) tests the category. Five lenses means no component gets a free pass.',
      },
      {
        title: 'Why a transparent scoring model',
        body: 'A score you can’t explain is a score nobody trusts. Every point in Foil comes from a visible rule: buzzwords, numbers, proof sources, role and company-size signals, category fit, overlap with the alternatives, readability. The weights are editable in Settings, and every component shows the one line that cost it the most.',
      },
    ],
  },

  closing: 'Working prototype built with Claude Code.',
  cta: 'Start exploring',
  skip: 'Skip intro',
};
