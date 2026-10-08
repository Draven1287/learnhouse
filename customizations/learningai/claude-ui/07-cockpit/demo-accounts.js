/* Demo accounts for testing the prototype's signed-in states.
   These are fake, local-only accounts: nothing here touches the live LearningAI backend or LearnHouse.
   All four share one demo password (DEMO_PASSWORD below). Replace this file with the real
   auth adapter when connecting to the API (see INTEGRATION.md).
   Lesson ids follow the review package (lai.ai-you-can-use.lNN); `step` is the 0-based core step
   (0 learn, 1 first choice, 2 second choice, 3 make it yours). `cards[n]` holds lesson n's written answers. */
window.LAI_DEMO = (L => ({
  DEMO_PASSWORD: 'learn-demo-2026',
  accounts: [
    { id: 'new', label: 'New learner', name: 'Maya', email: 'maya@learningai.test', done: [], current: L(1), step: 0, cards: {} },
    { id: 'mid', label: 'Mid-course', name: 'Sam', email: 'sam@learningai.test', done: [L(1)], current: L(2), step: 2,
      cards: { 1: ['Run a paper quiz in the library: it fits 10 minutes, costs nothing and needs no phones. I would check with the club lead first.'] } },
    { id: 'late', label: 'Late in the course', name: 'Alex', email: 'alex@learningai.test', done: Array.from({ length: 9 }, (_, i) => L(i + 1)), current: L(10), step: 1,
      cards: { 9: ['I would draw the poster myself, then ask a friend whether it still sounds like me before printing it.'] } },
    { id: 'done', label: 'Finished the course', name: 'Jordan', email: 'jordan@learningai.test', done: Array.from({ length: 15 }, (_, i) => L(i + 1)), current: L(15), step: 0,
      cards: { 15: ['Fixed the day and removed the pizza claim, tested it with two readers, and kept a paper version for anyone without a phone.'] } }
  ]
})) (n => `lai.ai-you-can-use.l${String(n).padStart(2, '0')}`);
