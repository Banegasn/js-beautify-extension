# Changelog

### 1.0.8 (2026-09-10) — fork Banegasn/js-beautify-extension
- Update js-beautify to 2.0.3, preserving the Angular `@let` TEXT-token patch.
- Update build and packaging tools; replace deprecated `vscode` development package with `@types/vscode`; remove unused ESLint plugin and track the lockfile.
- Activate on supported languages/commands and initialize js-beautify on first formatting request.
- Skip unchanged edits, apply all selections in one undoable transaction, share concurrent configuration reads, and reject failed requests instead of leaving promises pending.
- Add formatting regression tests and real VS Code integration tests.
- Require VS Code 1.136 or newer, matching the API typings used for this build.

### 1.0.7 (2026-09-10) — fork Banegasn/js-beautify-extension
- Angular `@let` declarations no longer break the indentation of the template that follows them (js-beautify tokenizer treated `@let` as a control-flow block; patched via `patch-package`, see [beautifier/js-beautify#2319](https://github.com/beautifier/js-beautify/issues/2319))
- Pin js-beautify to 1.15.4

### 1.0.6 (2024-05-02)
- Add JSON Validation for .beautifyrc.json

### 1.0.4 (2024-04-05)
- Change README table format for marketplace visualstudio

### 1.0.3 (2024-04-05)
**Update:**
- Track creation/deletion/change of .jsbeautifyrc.json
- Updated Readme file

**Fixed bugs:**
- After activating Angulat templating, the size of the indents increases [#3](https://github.com/NesTeRDGIT/js-beautify-extension/issues/3) 