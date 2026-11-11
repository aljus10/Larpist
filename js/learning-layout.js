// Included inside the observatory closure by tools/upgrade-layout.py.
// Keep lesson and conversation state separate from the timeline's narration.
let lessonStep = 0;
let lessonPrediction = null;
let lessonHasListened = false;
let lessonSession = 0;
let lessonTimer = null;
let lessonWaiting = null;
const lessonEnd = years.includes(2024) ? years.indexOf(2024) : lastYearIndex;
function updateLearningContext() {
  const context = qs('#er-view-context');
  if (context) context.textContent = `${state.area.name} · ${state.track === 'temperature' ? 'Temperature' : 'Rain'} · ${years[state.index]}`;
}
function appendConversation(question, answer) {
  const log = qs('#er-chat-log');
  for (const [label, text, type] of [['You', question, 'user'], ['Dr. Jo · scripted guide', answer, 'guide']]) {
    const message = document.createElement('div');
    message.className = `er-chat-message ${type}`;
    const name = document.createElement('small');
    name.textContent = label;
    const body = document.createElement('p');
    body.textContent = text;
    message.append(name, body);
    log.append(message);
  }
  log.scrollTop = log.scrollHeight;
}
function cancelLessonSound() {
  lessonSession++;
  clearTimeout(lessonTimer);
  if (lessonWaiting) { lessonWaiting(); lessonWaiting = null; }
  const listen = qs('#er-lesson-listen');
  if (listen) listen.disabled = false;
}
function setExperienceMode(mode) {
  cancelLessonSound();
  stopPlayback();
  abortTour();
  document.body.dataset.mode = mode;
  qsa('.er-mode-switch button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  if (mode === 'learn') setSlide(0);
}
function resetLesson() {
  cancelLessonSound();
  lessonStep = 0;
  lessonPrediction = null;
  lessonHasListened = false;
  qsa('[data-predict]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  updateLesson();
}
function updateLesson() {
  const rain = state.track === 'rain';
  qs('#er-lesson-progress').textContent = ['STEP 1 OF 3 · PREDICT', 'STEP 2 OF 3 · LISTEN', 'STEP 3 OF 3 · EXPLAIN'][lessonStep];
  qs('#er-lesson-title').textContent = lessonStep === 2 ? 'What changed between the years?' : rain ? 'Which year will sound rainier?' : 'Which year will sound higher?';
  qs('.er-predictions').hidden = lessonStep === 2;
  qs('#er-lesson-listen').textContent = lessonHasListened ? 'Listen again' : 'Listen & compare';
  qs('[data-predict=first]').textContent = years[0];
  qs('[data-predict=last]').textContent = years[lessonEnd];
  qs('#er-lesson-next').textContent = lessonStep === 2 ? 'Explore freely →' : 'Next step →';
  if (lessonStep === 2) {
    const a = currentSeries.series[0], b = currentSeries.series[lessonEnd];
    const delta = b - a;
    const direction = delta === 0 ? 'The two values are equal.' : rain ? `The ${delta > 0 ? years[lessonEnd] : years[0]} value is wetter, so it makes a denser rain texture.` : `The ${delta > 0 ? years[lessonEnd] : years[0]} value is warmer, so it produces a higher note.`;
    qs('#er-lesson-feedback').textContent = `${state.area.name}: ${years[0]} ${formatValue(a)} → ${years[lessonEnd]} ${formatValue(b)}. ${direction} Sound is a designed translation of the data.`;
  } else {
    qs('#er-lesson-feedback').textContent = lessonStep === 0 ? 'Choose a year, then listen to both. Sound is generated from data.' : `Listen to ${years[0]} first, then ${years[lessonEnd]}. Compare the sound and the values.`;
  }
}
async function listenToLesson() {
  cancelLessonSound();
  abortTour();
  stopPlayback();
  const session = lessonSession;
  if (!await initAudio()) {
    qs('#er-lesson-feedback').textContent = 'Audio could not start. You can still compare the values; try Listen again to retry.';
    return;
  }
  if (session !== lessonSession) return;
  const button = qs('#er-lesson-listen');
  button.disabled = true;
  if (lessonStep < 2) lessonStep = 1;
  updateLesson();
  for (const index of [0, lessonEnd]) {
    if (session !== lessonSession) return;
    state.index = index;
    render();
    playActiveSound(0.8);
    qs('#er-lesson-feedback').textContent = `${state.isMuted ? 'Sound is muted. Showing' : 'Listening to'} ${years[index]} · ${formatValue(currentSeries.series[index])}`;
    await new Promise(resolve => { lessonWaiting = resolve; lessonTimer = setTimeout(resolve, 1400); });
    lessonWaiting = null;
  }
  if (session !== lessonSession) return;
  lessonHasListened = true;
  button.disabled = false;
  const a = currentSeries.series[0], b = currentSeries.series[lessonEnd];
  const selected = lessonPrediction === 'first' ? a : b;
  const correct = lessonPrediction && selected === Math.max(a, b);
  qs('#er-lesson-feedback').textContent = `${lessonPrediction ? correct ? 'Your prediction matched the data. ' : 'The other year has the higher value. ' : ''}${years[0]}: ${formatValue(a)}. ${years[lessonEnd]}: ${formatValue(b)}. Select Next step to see why.`;
}
function initializeLearningLayout() {
  qs('.er-console-header').prepend(qs('#ai-assistant-stage'));
  const conversation = document.createElement('section');
  conversation.className = 'er-conversation';
  conversation.setAttribute('aria-label', 'Ask about this view');
  const start = qs('.er-chat-heading');
  const siblings = [];
  for (let node = start; node; node = node.nextElementSibling) siblings.push(node);
  siblings.forEach(node => conversation.append(node));
  qs('.er-carousel-container').after(conversation);
  qsa('.er-mode-switch button').forEach(button => button.addEventListener('click', () => setExperienceMode(button.dataset.mode)));
  qsa('[data-predict]').forEach(button => button.addEventListener('click', () => {
    lessonPrediction = button.dataset.predict;
    qsa('[data-predict]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    qs('#er-lesson-feedback').textContent = `You chose ${button.textContent}. Listen to test your prediction.`;
  }));
  qs('#er-lesson-listen').addEventListener('click', listenToLesson);
  qs('#er-lesson-repeat').addEventListener('click', resetLesson);
  qs('#er-lesson-next').addEventListener('click', () => {
    if (lessonStep === 2) return setExperienceMode('explore');
    if (lessonStep === 1 && !lessonHasListened) {
      qs('#er-lesson-feedback').textContent = 'Listen & compare first, then continue to the explanation.';
      return;
    }
    lessonStep++;
    updateLesson();
  });
  // A manual timeline or track action cancels a pending lesson before it can jump years.
  qsa('[data-track], #er-year-slider, [data-action=play-start], [data-action=restart], [data-action=compare], #btn-frame-toggle, #btn-custom-bounds').forEach(control => {
    control.addEventListener(control.id === 'er-year-slider' ? 'input' : 'click', cancelLessonSound, true);
  });
  qsa('[data-track]').forEach(control => control.addEventListener('click', resetLesson));
  qsa('.er-tempo-picker button').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
  setSlide(0);
  updateLesson();
}
