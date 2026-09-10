const { buildSync } = require('esbuild');
const vm = require('node:vm');
function loadSource(entryPoint, mocks = {}) {
  const { outputFiles } = buildSync({ entryPoints: [entryPoint], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vscode', 'fs/promises'] });
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${outputFiles[0].text}\n})`)(name => mocks[name] ?? require(name), module, module.exports);
  return module.exports;
}
module.exports = { loadSource };
