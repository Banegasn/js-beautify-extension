const test = require('node:test');
const assert = require('node:assert/strict');
const beautify = require('js-beautify');
const fixtures = require('./formatting-fixtures.json');
for (const [i, fixture] of fixtures.entries()) {
  test(`formatting parity with 1.0.7: ${fixture.kind} fixture ${i + 1}`, () => {
    assert.equal(beautify[fixture.kind](fixture.input, fixture.options), fixture.expected);
  });
}
test('Angular @let preserves the closing block and following sibling indentation', () => {
  const input = '<main>\n@if (ok) {\n@let obj = { a: 1 };\n<button (click)="go()">{{ obj.a }}</button>\n}\n<footer>End</footer>\n</main>';
  const options = { templating: ['angular'], indent_handlebars: true, indent_size: 2 };
  const output = beautify.html(input, options);
  assert.match(output, /\n    <button/);
  assert.match(output, /\n  }\n  <footer>/);
  assert.equal(beautify.html(output, options), output);
});

for (const expression of [
  "{ text: ';', a: 1 }",
  "'; }'",
  '{ text: "a;b", nested: { a: 1 } }',
  String.raw`'escaped\'; }'`,
  String.raw`"escaped\"; }"`,
  String.raw`'backslash\\'; @let second = { text: ';' }`,
  '`value; }`',
  '`value ${"; }"}`',
  '`value ${{ key: "; }" }.key}`',
  '`outer ${`inner ${";"}; }`} end;`',
  String.raw`'line\n; }'`,
]) {
  test(`Angular @let ignores quoted semicolons: ${expression}`, () => {
    const declaration = `@let value = ${expression};`;
    const options = { templating: ['angular'], indent_handlebars: true, indent_size: 2 };
    const input = `<main>\n@if (ok) {\n${declaration}\n<p>{{ value }}</p>\n}\n<footer>End</footer>\n</main>`;
    const result = beautify.html(input, options);
    assert.ok(result.includes(declaration), 'declaration text must remain unchanged');
    assert.match(result, /\n    <p>/);
    assert.match(result, /\n  }\n  <footer>/);
    assert.equal(beautify.html(result, options), result);
  });
}
