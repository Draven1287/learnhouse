/* Snapshot copy: fake local-only demo accounts for the October 4 "greeting" version (old lesson ids). */
window.LAI_DEMO = {
  DEMO_PASSWORD: 'learn-demo-2026',
  accounts: [
    { id: 'new', label: 'New learner', name: 'Maya', email: 'maya@learningai.test', done: [], current: 'chapter-1', step: 0, cards: {} },
    { id: 'mid', label: 'Mid-course', name: 'Sam', email: 'sam@learningai.test', done: ['chapter-1'], current: 'chapter-2', step: 2,
      cards: { 1: ['Comparing options and checking my own writing', 'Names, addresses, and anything about my friends', 'Any fact I would repeat to someone else', 'Me.'] } },
    { id: 'late', label: 'Late in the course', name: 'Alex', email: 'alex@learningai.test', done: ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'chapter-6', 'chapter-7', 'chapter-8', 'chapter-9'], current: 'chapter-10', step: 4,
      cards: { 1: ['Planning, drafts, and explaining ideas back to me', 'My address, school name, and photos of friends', 'Dates, prices, and anything I would act on', 'Me.'] } },
    { id: 'done', label: 'Finished the course', name: 'Jordan', email: 'jordan@learningai.test', done: Array.from({ length: 15 }, (_, i) => `chapter-${i + 1}`), current: 'chapter-15', step: 0,
      cards: { 1: ['Brainstorming and first drafts', 'Anything that identifies me or other people', 'Every claim I would repeat', 'Me.'] } }
  ]
};
