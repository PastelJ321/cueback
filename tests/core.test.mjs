import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function loadPureTypeScript(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => dependencies[name], module, module.exports);
  return module.exports;
}
const { AppDataStore } = loadPureTypeScript('../src/state/appDataStore.ts');
const { assertCanAddPresentation, assertCanAddQuestion, ProRequiredError } = loadPureTypeScript('../src/state/limits.ts');
const purchaseRules = loadPureTypeScript('../src/state/purchaseRules.ts');
const { createTestStoreInitializer, hasProEntitlement, isPurchaseCancelled, isTestStoreKey } = purchaseRules;
const { RevenueCatFlow, selectCurrentPackage } = loadPureTypeScript('../src/services/revenueCatFlow.ts', {
  '../state/purchaseRules': purchaseRules,
});
const { LEGACY_STORAGE_KEY, loadStoredAppData, STORAGE_KEY } = loadPureTypeScript('../src/storage/loadStoredAppData.ts');

const empty = () => ({ version: 1, presentations: [], questions: [] });

test('serialized writes keep rapid changes and publish only after storage succeeds', async () => {
  const saved = [];
  const published = [];
  const store = new AppDataStore(empty(), async (next) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    saved.push(next);
  }, (next) => published.push(next));
  const add = (id) => store.update((latest) => ({
    next: { ...latest, presentations: [...latest.presentations, { id }] }, result: id,
  }));
  await Promise.all([add('a'), add('b'), add('c')]);
  assert.deepEqual(saved.at(-1).presentations.map((item) => item.id), ['a', 'b', 'c']);
  assert.equal(published.length, 3);
});

test('failed storage write leaves visible data unchanged and queue recovers', async () => {
  const published = [];
  let fail = true;
  const store = new AppDataStore(empty(), async () => {
    if (fail) { fail = false; throw new Error('disk'); }
  }, (next) => published.push(next));
  const add = (id) => store.update((latest) => ({
    next: { ...latest, presentations: [...latest.presentations, { id }] }, result: id,
  }));
  await assert.rejects(add('lost'), /disk/);
  await add('kept');
  assert.deepEqual(published.at(-1).presentations.map((item) => item.id), ['kept']);
});

test('creation limits are enforced at the mutation boundary', async () => {
  const data = { ...empty(), presentations: [{ id: 'p' }], questions: Array.from({ length: 5 }, (_, n) => ({ id: `${n}`, presentationId: 'p' })) };
  assert.throws(() => assertCanAddPresentation(data, false), ProRequiredError);
  assert.throws(() => assertCanAddQuestion(data, 'p', false), ProRequiredError);
  assert.doesNotThrow(() => assertCanAddQuestion(data, 'p', true));
  assert.throws(() => assertCanAddQuestion(data, 'deleted', true), /no longer exists/);
  const store = new AppDataStore({ ...empty(), presentations: [{ id: 'p' }] }, async () => {}, () => {});
  const add = () => store.update((latest) => {
    assertCanAddQuestion(latest, 'p', false);
    return { next: { ...latest, questions: [...latest.questions, { presentationId: 'p' }] }, result: undefined };
  });
  const settled = await Promise.allSettled(Array.from({ length: 7 }, add));
  assert.equal(settled.filter((item) => item.status === 'fulfilled').length, 5);
  assert.equal(settled.filter((item) => item.status === 'rejected').length, 2);
});

test('Pro is derived only from active entitlement; cancellation never grants it', () => {
  assert.equal(hasProEntitlement({ entitlements: { active: {} } }), false);
  assert.equal(hasProEntitlement({ entitlements: { active: { pro: { identifier: 'pro' } } } }), true);
  assert.equal(isPurchaseCancelled({ userCancelled: true }), true);
  assert.equal(isPurchaseCancelled({ code: '1', userCancelled: null }), true);
  assert.equal(isPurchaseCancelled(new Error('failed')), false);
  assert.equal(isTestStoreKey('test_example'), true);
  assert.equal(isTestStoreKey('appl_example'), false);
});

test('Current Offering chooses an available monthly package, then a real fallback', () => {
  const monthly = { identifier: '$rc_monthly', product: { title: 'Monthly', priceString: '$4.99' } };
  const annual = { identifier: '$rc_annual', product: { title: 'Annual', priceString: '$29.99' } };
  assert.equal(selectCurrentPackage({ current: { monthly, availablePackages: [annual, monthly] } }), monthly);
  assert.equal(selectCurrentPackage({ current: { monthly: null, availablePackages: [annual] } }), annual);
  assert.equal(selectCurrentPackage({ current: { monthly, availablePackages: [annual] } }), annual);
  assert.throws(() => selectCurrentPackage({ current: null }), /No Current Offering/);
  assert.throws(() => selectCurrentPackage({ current: { monthly: null, availablePackages: [] } }), /no available packages/);
});

const customer = (pro) => ({ entitlements: { active: pro ? { pro: { identifier: 'pro' } } : {} } });

test('purchase and restore require the entitlement returned by their SDK calls', async () => {
  const item = { identifier: '$rc_monthly' };
  let purchaseInfo = customer(true);
  let restoreInfo = customer(true);
  const flow = new RevenueCatFlow({
    purchasePackage: async () => ({ customerInfo: purchaseInfo }),
    restorePurchases: async () => restoreInfo,
  });
  assert.equal((await flow.purchase(item)).kind, 'granted');
  purchaseInfo = customer(false);
  assert.equal((await flow.purchase(item)).kind, 'inactive');
  assert.equal((await flow.restore()).kind, 'granted');
  restoreInfo = customer(false);
  assert.equal((await flow.restore()).kind, 'inactive');
});

test('cancel and purchase failure do not return a Pro grant', async () => {
  const item = { identifier: '$rc_monthly' };
  const cancelled = new RevenueCatFlow({
    purchasePackage: async () => { throw { code: '1', userCancelled: true }; },
    restorePurchases: async () => customer(false),
  });
  assert.equal((await cancelled.purchase(item)).kind, 'cancelled');
  const failed = new RevenueCatFlow({
    purchasePackage: async () => { throw new Error('network'); },
    restorePurchases: async () => { throw new Error('restore failed'); },
  });
  assert.equal((await failed.purchase(item)).kind, 'failed');
  assert.equal((await failed.restore()).kind, 'failed');
});

test('one lock blocks duplicate purchase, duplicate restore, and overlapping operations', async () => {
  let releasePurchase;
  let releaseRestore;
  let purchaseCalls = 0;
  let restoreCalls = 0;
  const flow = new RevenueCatFlow({
    purchasePackage: () => { purchaseCalls += 1; return new Promise((resolve) => { releasePurchase = resolve; }); },
    restorePurchases: () => { restoreCalls += 1; return new Promise((resolve) => { releaseRestore = resolve; }); },
  });
  const firstPurchase = flow.purchase({ identifier: '$rc_monthly' });
  assert.equal(flow.isBusy, true);
  assert.equal((await flow.purchase({ identifier: '$rc_monthly' })).kind, 'busy');
  assert.equal((await flow.restore()).kind, 'busy');
  assert.equal(purchaseCalls, 1);
  assert.equal(restoreCalls, 0);
  releasePurchase({ customerInfo: customer(true) });
  assert.equal((await firstPurchase).kind, 'granted');
  const firstRestore = flow.restore();
  assert.equal((await flow.restore()).kind, 'busy');
  assert.equal((await flow.purchase({ identifier: '$rc_monthly' })).kind, 'busy');
  assert.equal(restoreCalls, 1);
  releaseRestore(customer(false));
  assert.equal((await firstRestore).kind, 'inactive');
  assert.equal(flow.isBusy, false);
});

test('Test Store SDK setup accepts only a public test key and runs once', () => {
  const configured = [];
  const initialize = createTestStoreInitializer((key) => configured.push(key));
  assert.throws(() => initialize('sk_secret'), /public Test Store key/);
  initialize('test_example');
  initialize('test_example');
  assert.deepEqual(configured, ['test_example']);
});

test('a failed SDK setup can be retried without marking initialization complete', () => {
  let attempts = 0;
  const initialize = createTestStoreInitializer(() => {
    attempts += 1;
    if (attempts === 1) throw new Error('native setup failed');
  });
  assert.throws(() => initialize('test_example'), /native setup failed/);
  initialize('test_example');
  initialize('test_example');
  assert.equal(attempts, 2);
});

test('a failed billing operation releases its lock for retry', async () => {
  let attempts = 0;
  const flow = new RevenueCatFlow({
    purchasePackage: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('temporary network failure');
      return { customerInfo: customer(true) };
    },
    restorePurchases: async () => customer(false),
  });
  assert.equal((await flow.purchase({ identifier: '$rc_monthly' })).kind, 'failed');
  assert.equal(flow.isBusy, false);
  assert.equal((await flow.purchase({ identifier: '$rc_monthly' })).kind, 'granted');
});

test('legacy data is copied to the current key without deleting the old copy', async () => {
  const values = new Map([[LEGACY_STORAGE_KEY, JSON.stringify({ ...empty(), presentations: [{ id: 'saved' }] })]]);
  const load = () => loadStoredAppData(async (key) => values.get(key) ?? null, async (key, value) => { values.set(key, value); });
  assert.equal((await load()).presentations[0].id, 'saved');
  assert.equal(values.get(STORAGE_KEY), values.get(LEGACY_STORAGE_KEY));
  values.set(STORAGE_KEY, JSON.stringify({ ...empty(), presentations: [{ id: 'newer' }] }));
  assert.equal((await load()).presentations[0].id, 'newer');
});

test('semantic matching uses alternate transcripts and declines weak matches', async () => {
  const constants = loadPureTypeScript('../src/constants/semantic.ts');
  const semantic = loadPureTypeScript('../src/services/semanticMatching.ts', { '../constants/semantic': constants });
  const question = { id: 'q', question: 'Why diversify?', answer: 'My prepared answer.' };
  const embeddings = new Map([
    ['unrelated', [0, 1]], ['Why diversify?', [1, 0]], ['diversification question', [1, 0]],
  ]);
  const embed = async (text) => embeddings.get(text);
  const strong = await semantic.findSemanticMatches(['unrelated', 'diversification question'], [question], embed);
  assert.equal(strong.confidentQuestionId, 'q');
  assert.equal(strong.matchedTranscript, 'diversification question');
  const weak = await semantic.findSemanticMatches(['unrelated'], [question], embed);
  assert.equal(weak.confidentQuestionId, null);
  assert.equal(weak.matches[0].score, 0);
  assert.equal(strong.embeddingsToCache[0].embeddingTextHash, semantic.hashQuestionText(question.question));
});

test('refreshing a sample never replaces an edited answer', () => {
  let nextId = 0;
  const samples = loadPureTypeScript('../src/data/sampleData.ts', {
    '../utils/id': { createId: (prefix) => `${prefix}-${++nextId}` },
  });
  const { presentation, questions } = samples.createSamplePresentation();
  assert.equal(samples.isReplaceableSamplePresentation(presentation, questions), true);
  assert.equal(samples.isReplaceableSamplePresentation(presentation, questions.slice(0, 5)), true);
  const edited = questions.map((item, index) => index === 0 ? { ...item, answer: 'My edited answer.' } : item);
  assert.equal(samples.isReplaceableSamplePresentation(presentation, edited), false);
});
