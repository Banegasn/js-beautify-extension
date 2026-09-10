const assert = require('node:assert/strict');
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
exports.run = async function () {
  const extension = vscode.extensions.getExtension('banegasn.js-beautify-extentions');
  assert.ok(extension);
  await extension.activate();
  const fixtures = require('./formatting-fixtures.json');
  const firstFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const secondFolder = vscode.workspace.workspaceFolders[1].uri.fsPath;
  for (const kind of ['html', 'js', 'css']) {
    const fixture = fixtures.find(x => x.kind === kind);
    const file = path.join(firstFolder, `fixture.${kind}`);
    fs.writeFileSync(file, fixture.input);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const editor = await vscode.window.showTextDocument(document);
    const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, { insertSpaces: true, tabSize: 4 });
    assert.ok(edits?.length, `${kind}: missing edits`);
    await editor.edit(builder => edits.forEach(edit => builder.replace(edit.range, edit.newText)));
    assert.equal(document.getText(), fixture.expected, `${kind}: output differs`);
    const repeat = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, { insertSpaces: true, tabSize: 4 });
    assert.equal((repeat ?? []).length, 0, `${kind}: unchanged document should have no edits`);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  }
  const document = await vscode.workspace.openTextDocument({ language: 'javascript', content: 'const a={x:1};\nconst b={y:2};' });
  const editor = await vscode.window.showTextDocument(document);
  editor.selections = [new vscode.Selection(0, 0, 0, document.lineAt(0).text.length), new vscode.Selection(1, 0, 1, document.lineAt(1).text.length)];
  await vscode.commands.executeCommand('js-beautify-ext.beautify');
  assert.match(document.getText(), /const a = \{/); assert.match(document.getText(), /const b = \{/);
  await vscode.commands.executeCommand('undo');
  assert.equal(document.getText(), 'const a={x:1};\nconst b={y:2};');
  await vscode.commands.executeCommand('js-beautify-ext.beautifyFile');
  assert.match(document.getText(), /const a = \{/);
  const rangeEdits = await vscode.commands.executeCommand('vscode.executeFormatRangeProvider', document.uri, new vscode.Range(0, 0, document.lineCount, 0), { insertSpaces: true, tabSize: 4 });
  assert.equal((rangeEdits ?? []).length, 0);
  await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  const source = '<div>\n<span>x</span>\n</div>';
  async function openFile(folder, name, content) {
    const file = path.join(folder, name); fs.writeFileSync(file, content);
    return vscode.workspace.openTextDocument(vscode.Uri.file(file));
  }
  async function output(doc, insertSpaces = true, tabSize = 4) {
    const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', doc.uri, { insertSpaces, tabSize });
    let text = doc.getText();
    for (const edit of [...(edits ?? [])].sort((a, b) => doc.offsetAt(b.range.start) - doc.offsetAt(a.range.start))) {
      text = text.slice(0, doc.offsetAt(edit.range.start)) + edit.newText + text.slice(doc.offsetAt(edit.range.end));
    }
    return text;
  }
  async function eventually(check) {
    const deadline = Date.now() + 5000;
    for (;;) {
      try { await check(); return; } catch (error) {
        if (Date.now() >= deadline || !(error instanceof assert.AssertionError)) throw error;
        await new Promise(resolve => setTimeout(resolve, 40));
      }
    }
  }
  const firstDoc = await openFile(firstFolder, 'first.html', source);
  const secondDoc = await openFile(secondFolder, 'second.html', source);
  assert.match(await output(firstDoc), /\n {4}<span>/);
  assert.match(await output(secondDoc), /\n {2}<span>/);
  const secondConfig = path.join(secondFolder, '.jsbeautifyrc.json');
  fs.writeFileSync(secondConfig, JSON.stringify({ html: { indent_size: 6 } }));
  await eventually(async () => assert.match(await output(secondDoc), /\n {6}<span>/));
  assert.match(await output(firstDoc), /\n {4}<span>/);
  fs.unlinkSync(secondConfig);
  await eventually(async () => assert.match(await output(secondDoc, true, 8), /\n {8}<span>/));
  const scoped = await openFile(secondFolder, 'scoped.html', '<html><body><p>x</p></body></html>');
  assert.match(await output(scoped), /\n {4}<body>/, 'folder/language override must be used');
  fs.writeFileSync(secondConfig, JSON.stringify({ html: { indent_with_tabs: false, indent_size: 2 } }));
  await eventually(async () => assert.match(await output(secondDoc, false, 8), /\n {2}<span>/));
  fs.writeFileSync(secondConfig, JSON.stringify({ html: { indent_with_tabs: false, indent_char: '\t', indent_size: 1 } }));
  await eventually(async () => assert.match(await output(secondDoc, true, 4), /\n\t<span>/));
  const quotedLet = await openFile(firstFolder, 'quoted-let.html', '<main>\n@if (ok) {\n@let x = { text: ";", a: 1 };\n<p>{{ x }}</p>\n}\n<footer>End</footer>\n</main>');
  assert.match(await output(quotedLet), /\n {8}<p>/);
  // No workspace configuration file should bleed into unassociated untitled documents.
  const untitled = await vscode.workspace.openTextDocument({ language: 'html', content: source });
  assert.match(await output(untitled, true, 3), /\n {3}<span>/);
  fs.writeFileSync(path.join(__dirname, '../work/vscode-smoke-result.json'), JSON.stringify({ passed: true, version: vscode.version, checks: ['HTML including Angular @let', 'JavaScript', 'CSS', 'unchanged documents', 'multiple selections', 'single undo', 'format file command', 'range provider', 'multiple workspace folders', 'external config create/change/delete', 'folder and language settings', 'explicit indentation overrides', 'quoted semicolons in @let', 'untitled document isolation'] }, null, 2));
};
