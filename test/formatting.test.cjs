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
