import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/intro.js', import.meta.url), 'utf8');
function mount(reduced = false) {
  const handlers = {};
  const classes = new Set();
  let focused = false;
  let timeout;
  let cleared = false;
  const events = [];
  const elements = {};
  const element = id => elements[id] ||= {value: '', open: false, addEventListener(event, fn) {handlers[`${id}:${event}`] = fn;}, showModal() {this.open = true;}, close() {this.open = false;}, reset() {}, reportValidity() {return true;}};
  const intro = {open: false, showModal() {this.open = true;}, close() {this.open = false;}, addEventListener(event, fn) {handlers[event] = fn;}};
  const skip = {addEventListener(event, fn) {handlers.skip = fn;}};
  const motion = {matches: reduced, addEventListener(event, fn) {handlers.motion = fn;}};
  vm.runInNewContext(source, {
    document: {querySelector: selector => selector === '#intro' ? intro : selector === '#intro-skip' ? skip : selector === 'main' ? {focus() {focused = true;}} : element(selector), dispatchEvent(event) {events.push(event);}, body: {classList: {add: c => classes.add(c), remove: c => classes.delete(c)}}},
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    matchMedia: () => motion,
    setTimeout(fn, delay) {assert.equal(delay, 8000); timeout = fn; return 1;},
    clearTimeout() {cleared = true;}
  });
  return {intro, handlers, classes, elements, events, get focused() {return focused;}, get cleared() {return cleared;}, finish: () => timeout()};
}
test('skipping animation immediately opens AI onboarding; offline skip restores page', () => {
  const page = mount();
  assert.equal(page.intro.open, true);
  assert.equal(page.classes.has('intro-playing'), true);
  page.handlers.skip();
  assert.equal(page.intro.open, false);
  assert.equal(page.elements['#ai-welcome'].open, true);
  assert.equal(page.classes.has('intro-playing'), true);
  assert.equal(page.cleared, true);
  page.finish(); // Timer race after skipping remains harmless.
  page.handlers['#ai-welcome-skip:click']();
  assert.equal(page.elements['#ai-welcome'].open, false);
  assert.equal(page.classes.size, 0);
  assert.equal(page.focused, true);
  assert.equal(page.events[0].detail, null);
});
test('Escape and automatic completion both dismiss the opening', () => {
  const page = mount();
  let prevented = false;
  page.handlers.cancel({preventDefault() {prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(page.intro.open, false);
  assert.equal(page.elements['#ai-welcome'].open, true);
  const automatic = mount(); automatic.finish(); assert.equal(automatic.intro.open, false); assert.equal(automatic.elements['#ai-welcome'].open, true);
});
test('reduced motion bypasses intro and changing the preference closes it', () => {
  const page = mount(true);
  assert.equal(page.intro.open, false);
  assert.equal(page.elements['#ai-welcome'].open, true);
  const active = mount(); active.handlers.motion({matches: true}); assert.equal(active.intro.open, false);
});
test('saving onboarding shares config in memory and provider selection updates model', () => {
  const page = mount(true);
  page.elements['#welcome-provider'].value = 'deepseek';
  page.handlers['#welcome-provider:change']();
  assert.equal(page.elements['#welcome-model'].value, 'deepseek-flash');
  // Key element is queried lazily on submission.
  page.elements['#welcome-key'] = {value: '  sample-key  '};
  page.handlers['#ai-welcome-form:submit']({preventDefault() {}});
  assert.equal(page.events[0].type, 'ai-configured');
  assert.equal(page.events[0].detail.key, 'sample-key');
  assert.equal(page.events[0].detail.provider, 'deepseek');
  assert.equal(page.elements['#ai-welcome'].open, false);
});
test('Escape on AI onboarding selects offline mode', () => {
  const page = mount(true); let prevented = false;
  page.handlers['#ai-welcome:cancel']({preventDefault() {prevented = true;}});
  assert.equal(prevented, true); assert.equal(page.events[0].detail, null); assert.equal(page.classes.size, 0);
});
