const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers.cjs');
const uri = value => ({ toString: () => value });
const document = (path, languageId = 'html') => ({ uri: uri(path), languageId });
function environment() {
  const files = new Map(); const reads = []; const watchers = new Map(); const scopes = [];
  let configurationChanged, foldersChanged;
  const folders = ['a', 'b'].map(name => ({ uri: uri(`file:///${name}`), name }));
  const disposable = () => ({ dispose() {} });
  class FileSystemError extends Error { constructor(code) { super(code); this.code = code; } }
  const workspace = {
    getWorkspaceFolder: resource => folders.find(folder => resource.toString().startsWith(folder.uri.toString() + '/')),
    fs: { readFile: async resource => {
      const key = resource.toString(); reads.push(key);
      if (!files.has(key)) throw new FileSystemError('FileNotFound');
      const value = files.get(key); if (value instanceof Error) throw value;
      return new TextEncoder().encode(value);
    } },
    createFileSystemWatcher: pattern => {
      const handlers = {}; let disposed = false;
      const watcher = {
        onDidCreate: fn => { handlers.create = fn; return disposable(); },
        onDidChange: fn => { handlers.change = fn; return disposable(); },
        onDidDelete: fn => { handlers.delete = fn; return disposable(); },
        dispose: () => { disposed = true; },
        emit: name => handlers[name](), get disposed() { return disposed; }
      };
      assert.equal(pattern.pattern, '.jsbeautifyrc.json');
      watchers.set(pattern.base.uri.toString(), watcher); return watcher;
    },
    onDidChangeConfiguration: fn => { configurationChanged = fn; return disposable(); },
    onDidChangeWorkspaceFolders: fn => { foldersChanged = fn; return disposable(); },
    getConfiguration: (section, scope) => {
      scopes.push(scope);
      if (section) return { get: () => ['angular'] };
      return { files: {}, html: { format: { wrapLineLength: scope.languageId === 'html' ? 80 : 120 } }, javascript: { format: {} } };
    }
  };
  const vscode = { workspace, FileSystemError, Uri: { joinPath: (base, child) => uri(base.toString() + '/' + child) }, RelativePattern: class { constructor(base, pattern) { this.base = base; this.pattern = pattern; } } };
  const { OptionsResolver } = loadSource('src/options/OptionsResolver.ts', { vscode });
  return { resolver: new OptionsResolver(), workspace, files, reads, watchers, scopes, folders,
    changeSettings: key => configurationChanged({ affectsConfiguration: section => key.startsWith(section) }),
    removeFolder: folder => { folders.splice(folders.indexOf(folder), 1); foldersChanged({ removed: [folder], added: [] }); }
  };
}
test('each workspace folder gets its own config with one read shared across documents', async () => {
  const e = environment();
  e.files.set('file:///a/.jsbeautifyrc.json', '{"html":{"indent_size":2}}');
  e.files.set('file:///b/.jsbeautifyrc.json', '{"html":{"indent_size":8}}');
  const [a, b, a2] = await Promise.all([
    e.resolver.getOptionAsync(document('file:///a/one.html'), 'html'),
    e.resolver.getOptionAsync(document('file:///b/one.html'), 'html'),
    e.resolver.getOptionAsync(document('file:///a/two.html'), 'html')
  ]);
  assert.deepEqual([a.indent_size, b.indent_size, a2.indent_size], [2, 8, 2]);
  assert.equal(e.reads.length, 2); assert.equal(e.watchers.size, 2); e.resolver.dispose();
});
test('missing configuration is cached; external creation, change and deletion invalidate it', async () => {
  const e = environment(), doc = document('file:///a/page.html');
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).wrap_line_length, 80);
  await e.resolver.getOptionAsync(doc, 'html'); assert.equal(e.reads.length, 1);
  const watcher = e.watchers.get('file:///a');
  e.files.set('file:///a/.jsbeautifyrc.json', '{"html":{"indent_size":2}}'); watcher.emit('create');
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).indent_size, 2);
  e.files.set('file:///a/.jsbeautifyrc.json', '{"html":{"indent_size":8}}'); watcher.emit('change');
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).indent_size, 8);
  e.files.delete('file:///a/.jsbeautifyrc.json'); watcher.emit('delete');
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).wrap_line_length, 80);
  assert.equal(e.reads.length, 4); e.resolver.dispose();
});
test('unrelated folders retain their cached config when one changes', async () => {
  const e = environment();
  const a = document('file:///a/page.html'), b = document('file:///b/page.html');
  await e.resolver.getOptionAsync(a, 'html'); await e.resolver.getOptionAsync(b, 'html');
  e.watchers.get('file:///a').emit('change'); await e.resolver.getOptionAsync(b, 'html');
  assert.equal(e.reads.length, 2); e.resolver.dispose();
});
test('external and untitled documents use scoped VS Code settings without reading a project config', async () => {
  const e = environment();
  for (const path of ['file:///outside/page.html', 'untitled:Untitled-1']) {
    const doc = document(path);
    assert.equal((await e.resolver.getOptionAsync(doc, 'html')).wrap_line_length, 80);
    assert.ok(e.scopes.includes(doc));
  }
  assert.equal(e.reads.length, 0); assert.equal(e.watchers.size, 0); e.resolver.dispose();
});
test('settings cache respects document language and invalidates only relevant configuration changes', async () => {
  const e = environment(), html = document('file:///a/page.html'), js = document('file:///a/file.js', 'javascript');
  assert.equal((await e.resolver.getOptionAsync(html, 'html')).wrap_line_length, 80);
  assert.equal((await e.resolver.getOptionAsync(js, 'html')).wrap_line_length, 120);
  const count = e.scopes.length;
  e.changeSettings('workbench.colorTheme'); await e.resolver.getOptionAsync(html, 'html'); assert.equal(e.scopes.length, count);
  e.changeSettings('html.format.wrapLineLength'); await e.resolver.getOptionAsync(html, 'html'); assert.ok(e.scopes.length > count);
  assert.equal(e.reads.length, 1); e.resolver.dispose();
});
test('folder removal and disposal release watchers', async () => {
  const e = environment(); await e.resolver.getOptionAsync(document('file:///a/page.html'), 'html');
  const a = e.watchers.get('file:///a'); e.removeFolder(e.folders[0]); assert.ok(a.disposed);
  await e.resolver.getOptionAsync(document('file:///b/page.html'), 'html');
  const b = e.watchers.get('file:///b'); e.resolver.dispose(); assert.ok(b.disposed);
});
test('read failures reject instead of silently using another folder and can retry', async () => {
  const e = environment(), doc = document('file:///a/page.html');
  e.files.set('file:///a/.jsbeautifyrc.json', new Error('permission denied'));
  await assert.rejects(e.resolver.getOptionAsync(doc, 'html'), /permission denied/);
  e.files.set('file:///a/.jsbeautifyrc.json', '{"html":{"indent_size":2}}');
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).indent_size, 2); e.resolver.dispose();
});
test('an invalidated read cannot replace the new cached configuration', async () => {
  const e = environment(), doc = document('file:///a/page.html'); const complete = [];
  e.workspace.fs.readFile = () => new Promise(resolve => complete.push(resolve));
  const old = e.resolver.getOptionAsync(doc, 'html'); e.watchers.get('file:///a').emit('change');
  const current = e.resolver.getOptionAsync(doc, 'html');
  complete[1](new TextEncoder().encode('{"html":{"indent_size":8}}')); await current;
  complete[0](new TextEncoder().encode('{"html":{"indent_size":2}}')); await old;
  assert.equal((await e.resolver.getOptionAsync(doc, 'html')).indent_size, 8); e.resolver.dispose();
});
