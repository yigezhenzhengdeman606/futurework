// Independent of API loading: a failed request must never prevent skipping.
const intro = document.querySelector('#intro');
const skip = document.querySelector('#intro-skip');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let timer;
let finished = false;
const welcome = document.querySelector('#ai-welcome');
const welcomeForm = document.querySelector('#ai-welcome-form');
const provider = document.querySelector('#welcome-provider');
const model = document.querySelector('#welcome-model');

function completeWelcome(config = null) {
  document.dispatchEvent(new CustomEvent('ai-configured', {detail: config}));
  welcome.close();
  welcomeForm.reset();
  document.body.classList.remove('intro-playing');
  document.querySelector('main')?.focus({preventScroll: true});
}

document.querySelector('#ai-welcome-skip').addEventListener('click', () => completeWelcome());
document.querySelector('#ai-welcome-offline').addEventListener('click', () => completeWelcome());
welcome.addEventListener('cancel', event => {event.preventDefault(); completeWelcome();});
provider.addEventListener('change', () => {
  model.value = provider.value === 'deepseek' ? 'deepseek-flash' : 'gpt-4.1-mini';
});
welcomeForm.addEventListener('submit', event => {
  event.preventDefault();
  // Validate trimmed values too: whitespace must not masquerade as a saved key.
  const key = document.querySelector('#welcome-key');
  key.value = key.value.trim();
  model.value = model.value.trim();
  if (!welcomeForm.reportValidity()) return;
  completeWelcome({provider: provider.value, model: model.value, key: key.value});
});

function finish() {
  clearTimeout(timer);
  if (finished) return;
  finished = true;
  if (intro.open) intro.close();
  welcome.showModal();
  document.body.classList.add('intro-playing');
}

skip.addEventListener('click', finish);
intro.addEventListener('cancel', event => {
  event.preventDefault();
  finish();
});
reducedMotion.addEventListener('change', event => {
  if (event.matches) finish();
});

if (!reducedMotion.matches) {
  intro.showModal();
  document.body.classList.add('intro-playing');
  timer = setTimeout(finish, 8000);
} else finish();
