const path = require('node:path');
const fs = require('node:fs');
const { runTests } = require('@vscode/test-electron');
const root = path.resolve(__dirname, '..');
const workspace = path.join(root, 'work/smoke-workspace');
fs.mkdirSync(path.join(workspace, '.vscode'), { recursive: true });
fs.writeFileSync(path.join(workspace, '.jsbeautifyrc.json'), JSON.stringify({
  html: { templating: ['angular'], indent_handlebars: true, wrap_attributes: 'preserve', wrap_line_length: 140, indent_size: 4 },
  js: { templating: ['angular'], indent_size: 4 }, css: { templating: ['angular'], indent_size: 4 }
}));
const settings = {
  'editor.defaultFormatter': 'banegasn.js-beautify-extentions', 'editor.insertSpaces': true,
  'editor.tabSize': 4, 'extensions.autoUpdate': false, 'js-beautify-for-vscode.html.templating': ['angular'],
  'html.format.indentHandlebars': true, 'html.format.wrapAttributes': 'preserve', 'html.format.wrapLineLength': 140
};
fs.writeFileSync(path.join(workspace, '.vscode/settings.json'), JSON.stringify(settings));
const second = path.join(root, 'work/smoke-second');
fs.mkdirSync(path.join(second, '.vscode'), { recursive: true });
fs.writeFileSync(path.join(second, '.jsbeautifyrc.json'), JSON.stringify({ html: { indent_size: 2 } }));
fs.writeFileSync(path.join(second, '.vscode/settings.json'), JSON.stringify({ '[html]': { 'html.format.indentInnerHtml': true } }));
const workspaceFile = path.join(root, 'work/smoke.code-workspace');
fs.writeFileSync(workspaceFile, JSON.stringify({ folders: [{ path: workspace }, { path: second }], settings }));
fs.rmSync(path.join(root, 'work/vscode-smoke-result.json'), { force: true });
runTests({
  version: '1.136.1',
  vscodeExecutablePath: process.env.VSCODE_EXECUTABLE,
  extensionDevelopmentPath: process.env.EXTENSION_UNDER_TEST || root,
  extensionTestsPath: path.join(__dirname, 'vscode-smoke.cjs'),
  launchArgs: [workspaceFile, '--user-data-dir', path.join(root, 'work/vscode-user'), '--extensions-dir', path.join(root, 'work/vscode-extensions'), '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes']
}).catch(error => { console.error(error); process.exitCode = 1; });
