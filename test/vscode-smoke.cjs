const assert = require('node:assert/strict');
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
exports.run = async function () {
  const extension = vscode.extensions.getExtension('nesterenok.js-beautify-extentions');
  assert.ok(extension);
  await extension.activate();
  const fixtures = require('./formatting-fixtures.json');
  for (const kind of ['html', 'js', 'css']) {
    const fixture = fixtures.find(x => x.kind === kind);
    const document = await vscode.workspace.openTextDocument({ language: { html: 'html', js: 'javascript', css: 'css' }[kind], content: fixture.input });
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
  // Removing the config must switch the next request back to VS Code settings.
  fs.unlinkSync(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.jsbeautifyrc.json'));
  const angular = await vscode.workspace.openTextDocument({ language: 'html', content: fixtures[0].input });
  const angularEditor = await vscode.window.showTextDocument(angular);
  await vscode.commands.executeCommand('js-beautify-ext.beautifyFile');
  assert.equal(angular.getText(), fixtures[0].expected, 'VS Code settings must preserve Angular formatting');
  await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  fs.writeFileSync(path.join(__dirname, '../work/vscode-smoke-result.json'), JSON.stringify({ passed: true, version: vscode.version, checks: ['HTML including Angular @let', 'JavaScript', 'CSS', 'unchanged documents', 'multiple selections', 'single undo', 'format file command', 'range provider', 'VS Code settings after config removal'] }, null, 2));
};
