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
fs.writeFileSync(path.join(workspace, '.vscode/settings.json'), JSON.stringify({
  'editor.defaultFormatter': 'banegasn.js-beautify-extentions', 'editor.insertSpaces': true,
  'editor.tabSize': 4, 'extensions.autoUpdate': false, 'js-beautify-for-vscode.html.templating': ['angular'],
  'html.format.indentHandlebars': true, 'html.format.wrapAttributes': 'preserve', 'html.format.wrapLineLength': 140
}));
fs.rmSync(path.join(root, 'work/vscode-smoke-result.json'), { force: true });
runTests({
  version: '1.136.1',
  vscodeExecutablePath: process.env.VSCODE_EXECUTABLE,
  extensionDevelopmentPath: process.env.EXTENSION_UNDER_TEST || root,
  extensionTestsPath: path.join(__dirname, 'vscode-smoke.cjs'),
  launchArgs: [workspace, '--user-data-dir', path.join(root, 'work/vscode-user'), '--extensions-dir', path.join(root, 'work/vscode-extensions'), '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes']
}).catch(error => { console.error(error); process.exitCode = 1; });
