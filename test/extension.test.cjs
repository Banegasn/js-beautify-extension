const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');
const vscode = {
  Range: class Range { constructor(...coordinates) { this.coordinates = coordinates; } },
  TextEdit: { replace: (range, text) => ({ range, text }) },
  languages: { match: (selector, doc) => selector.includes(doc.languageId) ? 1 : 0 }
};
const { Document } = loadSource('src/document/Document.ts', { vscode });
const { Extension } = loadSource('src/extension/Extension.ts', { vscode });
const range = { isEmpty: false };
const doc = text => ({ languageId: 'html', getText: () => text, validateRange: () => range });

test('unchanged documents and selections produce no edits', async () => {
  const document = new Document(doc('unchanged'), { formate: text => text });
  assert.equal(await document.formatFullAsync({}), null);
  assert.deepEqual(await document.formatSelection([range], {}), []);
});
test('changed documents and nonempty selections produce the same formatter output', async () => {
  const document = new Document(doc('input'), { formate: () => 'output' });
  assert.deepEqual(await document.formatFullAsync({}), { range, text: 'output' });
  assert.deepEqual(await document.formatSelection([range, { isEmpty: true }], {}), [{ range, text: 'output' }]);
});
test('formatter failures reject instead of hanging', async () => {
  const document = new Document(doc('x'), { formate: () => { throw new Error('format failed'); } });
  await assert.rejects(document.formatFullAsync({}), /format failed/);
});
test('multiple selections are applied in one editor transaction', async () => {
  const extension = new Extension(); let transactions = 0; const actual = [];
  await extension.replaceEditorText({ edit: callback => { transactions++; callback({ replace: (...args) => actual.push(args) }); return Promise.resolve(true); } }, [{ range: 1, text: 'one' }, { range: 2, text: 'two' }]);
  assert.equal(transactions, 1); assert.deepEqual(actual, [[1, 'one'], [2, 'two']]);
});
test('unsupported documents resolve to no edits', async () => {
  const extension = new Extension();
  assert.deepEqual(await extension.provideDocumentFormattingEdits({ languageId: 'plaintext' }, {}), []);
});
test('providers propagate configuration errors', async () => {
  const extension = new Extension();
  extension.optionsPersistent = { getOptionAsync: async () => { throw new Error('invalid config'); } };
  await assert.rejects(extension.provideDocumentFormattingEdits(doc('x'), {}), /invalid config/);
});
test('disposal unregisters every formatting provider exactly once', () => {
  const extension = new Extension(); let count = 0;
  extension.vsCodeDispose = [{ dispose() { count++; } }, { dispose() { count++; } }];
  extension.dispose(); extension.dispose(); assert.equal(count, 2);
});
test('config cache shares concurrent reads and returns independent own properties', async () => {
  let reads = 0;
  const { OptionsFilePersistent } = loadSource('src/options/OptionsFilePersistent.ts', { 'fs/promises': { readFile: async () => { reads++; return '{"html":{"indent_size":2}}'; } } });
  const store = new OptionsFilePersistent('config');
  const [a, b] = await Promise.all([store.getOptionAsync('html'), store.getOptionAsync('html')]);
  assert.equal(reads, 1); assert.ok(Object.hasOwn(a, 'indent_size')); a.indent_size = 8; assert.equal(b.indent_size, 2);
  store.reset(); await store.getOptionAsync('html'); assert.equal(reads, 2);
});
test('invalid and missing configuration reject and permit retry', async () => {
  let reads = 0;
  const { OptionsFilePersistent } = loadSource('src/options/OptionsFilePersistent.ts', { 'fs/promises': { readFile: async () => { if (++reads === 1) throw new Error('ENOENT'); return reads === 2 ? '{' : ''; } } });
  const store = new OptionsFilePersistent('config');
  await assert.rejects(store.getOptionAsync('html'), /ENOENT/);
  await assert.rejects(store.getOptionAsync('html'), SyntaxError);
  assert.deepEqual(await store.getOptionAsync('html'), {});
});
test('reset during a pending read does not cache stale configuration', async () => {
  const resolve = [];
  const { OptionsFilePersistent } = loadSource('src/options/OptionsFilePersistent.ts', { 'fs/promises': { readFile: () => new Promise(done => resolve.push(done)) } });
  const store = new OptionsFilePersistent('config'); const old = store.getOptionAsync('html'); store.reset(); const current = store.getOptionAsync('html');
  resolve[1]('{"html":{"indent_size":4}}'); await current;
  resolve[0]('{"html":{"indent_size":2}}'); await old;
  assert.equal((await store.getOptionAsync('html')).indent_size, 4);
});
