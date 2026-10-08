/* Lesson content. Each lesson is a short sequence of steps; every lesson has at least one hands-on lab. */
window.LAI_LESSONS = [
  {
    id: 'what', n: 1, title: 'What counts as AI?', mins: 10, skill: 'Spot it',
    summary: 'Sort everyday tech into “learned from examples” and “follows rules”.',
    steps: [
      { type: 'intro', title: 'AI is a label, not magic',
        body: '<p>In this course, <strong>AI</strong> means software that makes a prediction, a decision, or a piece of content by using patterns, usually learned from lots of examples, rather than only following rules a person wrote line by line.</p><p>That definition matters. It tells you what to ask about any AI tool: <em>what did it learn from, and how could that go wrong?</em></p>',
        points: ['Every lesson runs the same loop: <b>predict</b>, <b>try</b>, <b>check</b>, <b>decide</b>.', 'Nothing is graded. Your answers stay on this device.'] },
      { type: 'predict', q: 'A calculator answers 37 × 48 instantly and never gets it wrong. Is it AI?',
        options: ['Yes. It’s fast and always right.', 'No. It follows exact rules someone wrote.', 'Only if it’s on a phone.'], correct: 1,
        reveal: 'A calculator follows exact, hand-written rules for arithmetic. Being fast or accurate doesn’t make something AI. Learning patterns from examples does.' },
      { type: 'sort', prompt: 'Sort each one. Use your best guess, then check.',
        bins: ['Learned from examples', 'Follows hand-written rules', 'Could be either'],
        cards: [
          { t: 'Email spam filter', bin: 0, why: 'Trained on millions of emails people marked as spam or not spam.' },
          { t: 'Thermostat set to 20°C', bin: 1, why: 'One rule: heat on below 20°C, off above it.' },
          { t: 'Phone autocorrect', bin: 0, why: 'Learns which words usually follow others, including from your own typing.' },
          { t: 'Traffic light on a timer', bin: 1, why: 'Fixed timings set by an engineer.' },
          { t: 'Chess computer', bin: 2, why: 'Older engines used hand-tuned rules and search. Newer ones learn by playing millions of games.' },
          { t: 'Music recommendations', bin: 0, why: 'Learns from what millions of listeners played, skipped, and saved.' },
          { t: 'Chatbot', bin: 0, why: 'Learned to predict text from a huge collection of writing.' },
          { t: 'Calculator', bin: 1, why: 'Exact arithmetic rules.' }
        ] },
      { type: 'quiz', q: 'Which is the best clue that a system learned from examples?',
        options: ['It sounds like a person.', 'Its behaviour changes if you train it on different data.', 'It answers quickly.', 'It runs on a computer.'], correct: 1,
        explain: 'If different training data would make it act differently, it learned from examples. Sounding human is a style, not a clue.' },
      { type: 'reflect', prompt: 'Name one AI system you used this week. What do you think it learned from?', placeholder: 'e.g. My video app learned from what people like me watched…' }
    ]
  },
  {
    id: 'learn', n: 2, title: 'How machines learn from examples', mins: 15, skill: 'Train it',
    summary: 'Train a spam filter, test it on new emails, then feed it bad labels.',
    steps: [
      { type: 'intro', title: 'Examples in, pattern out',
        body: '<p>To <strong>train</strong> a model you give it examples with the right answer attached, called <strong>labels</strong>. The model adjusts itself until it can separate the examples as well as it can.</p><p>The real test comes after training: how well does it do on examples it has <em>never seen</em>?</p>' },
      { type: 'predict', q: 'You train a spam filter, but some of your training emails are labelled wrong. What happens?',
        options: ['It notices the mistakes and ignores them.', 'It learns the wrong pattern, at least a little.', 'It refuses to train.'], correct: 1,
        reveal: 'A model has no idea which labels are wrong. It tries to fit all of them. Bad labels pull the pattern in the wrong direction.' },
      { type: 'lab', lab: 'classifier', title: 'Spam filter lab',
        task: 'Press <b>Train</b>, then <b>Test on 20 new emails</b>. Next, add mislabelled examples, train again, and test again. Watch what happens to the test score.' },
      { type: 'quiz', q: 'A model scores 100% on its training examples but 60% on new ones. What does that tell you?',
        options: ['It’s an excellent model.', 'It fits its examples but doesn’t generalise well.', 'The new examples are wrong.', 'It needs a faster computer.'], correct: 1,
        explain: 'Doing well on examples it has already seen proves little. What counts is how it handles new cases, which is why testers keep some data hidden.' },
      { type: 'reflect', prompt: 'Who decides the labels for an AI system? Why does that matter?', placeholder: 'A sentence or two is enough.' }
    ]
  },
  {
    id: 'words', n: 3, title: 'Predicting the next word', mins: 15, skill: 'Look inside',
    summary: 'Drive a tiny language model. Watch fluent text turn out false.',
    steps: [
      { type: 'intro', title: 'A chatbot’s core job',
        body: '<p>Language models write by repeatedly predicting <strong>what word comes next</strong>, based on patterns in the text they were trained on.</p><p>The lab uses a tiny model trained on about 30 sentences. Real models use far more text and context, but the core move is the same: pick a likely next word.</p>' },
      { type: 'predict', q: 'A model writes: “The capital of Australia is Sydney.” (It’s Canberra.) Why might that happen?',
        options: ['It lied on purpose.', '“Sydney” often follows “Australia is” in its training text.', 'Its internet connection dropped.'], correct: 1,
        reveal: 'The model picks the likely word, not the true one. If “Sydney” shows up near “Australia” more often in its text, it wins. Try it in the lab.' },
      { type: 'lab', lab: 'nextword', title: 'Next-word lab',
        task: 'Click predictions to build a sentence. Then use <b>Write the rest</b> at low and high randomness. Open the training text and change it to see the predictions shift.' },
      { type: 'quiz', q: 'When a model’s answer sounds fluent and confident, that shows…',
        options: ['the answer is probably true.', 'the words are likely together in its training text.', 'the model checked a source.', 'a person reviewed it.'], correct: 1,
        explain: 'Fluency comes from patterns in text. Truth has to be checked against something outside the model.' },
      { type: 'reflect', prompt: 'When would a likely-sounding but wrong answer cause real trouble for you?', placeholder: 'Think about homework, health, money, news…' }
    ]
  },
  {
    id: 'sure', n: 4, title: 'Confident isn’t correct', mins: 12, skill: 'Measure trust',
    summary: 'Rate your own confidence, then compare yourself with an overconfident app.',
    steps: [
      { type: 'intro', title: 'What “96% sure” should mean',
        body: '<p>Being <strong>calibrated</strong> means your confidence matches how often you’re right. If you say “90% sure” on ten questions, you should get about nine right.</p><p>People and AI tools can both be badly calibrated. Let’s measure you first.</p>' },
      { type: 'lab', lab: 'calibration', title: 'Calibration game',
        task: 'Mark each statement true or false and say how sure you are. Then see how your confidence matched reality, and meet SureBot.' },
      { type: 'quiz', q: 'An app says it’s “96% confident”. What would tell you whether to trust that number?',
        options: ['How polished the app looks.', 'How often it’s actually right when it says 96%, on questions like yours.', 'Whether it says “definitely”.', 'How many people downloaded it.'], correct: 1,
        explain: 'A confidence number only means something if it has been tested: when it says 96%, is it right about 96 times in 100?' },
      { type: 'reflect', prompt: 'Were you overconfident, underconfident, or about right? What surprised you?', placeholder: 'Use your results from the game.' }
    ]
  },
  {
    id: 'claims', n: 5, title: 'Check the claim', mins: 15, skill: 'Verify it',
    summary: 'Break an AI summary into claims and check each against sources.',
    steps: [
      { type: 'intro', title: 'Split it, then check it',
        body: '<p>An AI answer usually mixes several claims together. Some may be true, some false, some impossible to check. Pull them apart and test each against a source <strong>outside the model</strong>.</p><p>Three verdicts are enough: <strong>Supported</strong>, <strong>Contradicted</strong>, or <strong>Not enough evidence</strong>.</p>' },
      { type: 'predict', q: 'An AI answer cites a report, but you can’t find the report anywhere. What’s the best move?',
        options: ['Trust it. AI wouldn’t invent a report.', 'Treat that claim as not verified yet.', 'Ask the same AI if it’s sure.'], correct: 1,
        reveal: 'Models can produce citations that look real but don’t exist. Asking the same model again isn’t independent checking.' },
      { type: 'lab', lab: 'claims', title: 'Evidence check',
        task: 'Give each of the four claims a verdict using the source cards. Hints are there if you need them. Your first call is kept even if you change it.' },
      { type: 'quiz', q: 'Is asking the same chatbot “Are you sure?” independent verification?',
        options: ['Yes, it double-checks itself.', 'No. It’s the same source checking itself.'], correct: 1,
        explain: 'Independent means a different source: the original document, a trusted reference, or a qualified person.' },
      { type: 'reflect', prompt: 'Which claim was hardest to judge, and why?', placeholder: 'Name the claim and what made it tricky.' }
    ]
  },
  {
    id: 'bias', n: 6, title: 'Bias in, bias out', mins: 15, skill: 'Question it',
    summary: 'Run a club-selection model trained on unfair history and try to fix it.',
    steps: [
      { type: 'intro', title: 'Models copy the past',
        body: '<p>A model trained on past decisions learns those decisions, <strong>including their unfairness</strong>. If a club mostly accepted students from one school, a model trained on that history will tend to do the same.</p>' },
      { type: 'predict', q: 'If you delete the “school” column from the data, does the bias go away?',
        options: ['Yes, the model can’t see school any more.', 'Not necessarily. Other details can stand in for school.', 'It gets worse.'], correct: 1,
        reveal: 'Things like bus route or postcode can reveal the same information. These are called <strong>proxies</strong>. Try it in the lab.' },
      { type: 'lab', lab: 'bias', title: 'Selection simulator',
        task: 'Both schools have students with exactly the same skills. Change how skewed the history was, try hiding the school column, then try retraining on fair data.' },
      { type: 'quiz', q: 'What fixed the gap most reliably in the simulator?',
        options: ['Hiding the school column.', 'Retraining on fair historical data.', 'Selecting fewer students.'], correct: 1,
        explain: 'Hiding a column leaves proxies behind. Fixing what the model learns from addresses the cause.' },
      { type: 'reflect', prompt: 'Where could a model trained on past decisions be unfair in your school or town?', placeholder: 'One example is enough.' }
    ]
  },
  {
    id: 'prompt', n: 7, title: 'Prompting with purpose', mins: 12, skill: 'Direct it',
    summary: 'Build a prompt from ingredients and see which ones change the result.',
    steps: [
      { type: 'intro', title: 'A prompt is a brief',
        body: '<p>Vague requests get generic answers. A good prompt says <strong>who it’s for</strong>, <strong>what limits apply</strong>, <strong>what shape the answer should take</strong>, and <strong>how you’ll check it</strong>.</p>' },
      { type: 'lab', lab: 'prompt', title: 'Prompt lab',
        task: 'Add ingredients to the prompt, then run it. Aim for at least 3 of 4 on the scorecard. The outputs were written for this lab, so no AI account is needed.' },
      { type: 'quiz', q: 'Why ask a model to flag what it’s unsure about?',
        options: ['It makes the answer longer.', 'It shows you what to check before you rely on it.', 'It makes the model smarter.'], correct: 1,
        explain: 'You stay responsible for the result. Flags tell you where to look first.' },
      { type: 'reflect', prompt: 'Write a prompt you could actually use this week, with at least three ingredients.', placeholder: 'I’m a … I need … Format it as … Flag …' }
    ]
  },
  {
    id: 'rules', n: 8, title: 'Your AI rules', mins: 10, skill: 'Own it',
    summary: 'Write your personal rules for when and how you use AI.',
    steps: [
      { type: 'intro', title: 'Five letters to remember: CLEAR',
        body: '<p><b>C</b>heck what AI use is allowed. <b>L</b>eave out private information. <b>E</b>valuate accuracy and bias. <b>A</b>cknowledge AI help. <b>R</b>emain responsible for the result.</p><p>Turn those into rules that fit <em>your</em> life.</p>' },
      { type: 'lab', lab: 'rules', title: 'Rule builder',
        task: 'Pick or write one rule for each letter. Copy your card when it’s done.' },
      { type: 'reflect', prompt: 'When would you choose not to use AI at all, even if you’re allowed to?', placeholder: 'Be specific.' }
    ]
  }
];
