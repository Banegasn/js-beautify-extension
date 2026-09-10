# js-beautify for VS Code — Banegasn fork

Version 1.0.10 requires **VS Code 1.136+**. The extension ID is now
`banegasn.js-beautify-extentions`. Set `editor.defaultFormatter` to this ID and uninstall
`nesterenok.js-beautify-extentions` to avoid duplicate commands and formatters.
The `js-beautify-for-vscode.*` configuration keys remain unchanged.
The publisher ID is configured for local VSIX installation; Marketplace publication
requires registering the `banegasn` publisher separately.
This fork is installed from its VSIX; the Marketplace link below refers to the upstream extension.

The formatter uses js-beautify 2.0.3 with a reproducible `patch-package` fix for Angular
`@let` declarations. Enable Angular templating as described below; the `<!-- {} -->`
workaround is no longer needed.

## Configuration resolution

For each document, the extension uses `.jsbeautifyrc.json` in the root of that
**document's workspace folder**. Different folders in a multi-root workspace have
independent configurations. If the file does not exist, VS Code settings are resolved
for the document's URI and language, including folder and language overrides.
Unassociated untitled documents and files outside the workspace use their applicable
VS Code settings; they do not inherit the first workspace folder's config file.

Configuration files are read asynchronously and cached per folder. A non-recursive
watcher for `.jsbeautifyrc.json` invalidates only that folder's cache when the file is
created, changed or deleted, including changes made outside VS Code. Watcher events
are asynchronous, so external changes take effect when VS Code reports them.

Explicit `indent_with_tabs`, `indent_size` and `indent_char` values take precedence
over editor defaults. In particular, `indent_with_tabs: false` is preserved even if
the editor uses tabs. Angular `@let` strings support quoted semicolons, escaped quotes,
and template literals with nested interpolations.

## Development and verification

Use Node.js 22.12+ and npm. Install development dependencies when building:

```sh
npm ci
npm run check
npm test
npm run test:vscode
npm run package
```

`test:vscode` runs an isolated VS Code 1.136.1 instance. Set `VSCODE_EXECUTABLE` to an
existing VS Code executable to avoid downloading it (on macOS, the executable is
inside `Visual Studio Code.app/Contents/MacOS/Code`). Your usual profile is not used.
`npm run package` creates `js-beautify-extentions-1.0.10.vsix` with its formatter bundled.

The tests include 48 expected outputs captured from 1.0.7, Angular `@let` regressions,
configuration caching and failures, unchanged documents, and edit transactions.
The VS Code suite exercises document/range providers, both commands, multiple selections,
undo, quoted semicolons, explicit indentation, and live configuration updates in a
multi-root workspace, including folder/language overrides and untitled documents.

For an additional local comparison against a saved, patched 1.0.7 engine:

```sh
node test/compare-corpus.cjs /path/to/old/js-beautify /path/to/source-repo
node test/benchmark.cjs /path/to/old/extension.js dist/extension.js
```

The corpus comparison checks HTML, JS/TS and CSS/SCSS with Angular templating,
4-space indentation, preserved attributes, and a 140-column wrap limit; files over
200 KB are excluded. On 2026-09-10, 14,379 files from the two client repositories
produced identical output. This is sampled compatibility evidence, not a guarantee
for every input or option combination.

The extension now activates for supported languages/commands, loads the formatter
on first use, skips edits when the output is unchanged, and shares concurrent config
reads. For version 1.0.8, a local microbenchmark measured median bundle initialization at 0.074 ms before
and 0.020 ms after (1,000 iterations after 200 warmups). This excludes parsing,
activation and first-format work; it does not measure overall editor startup or
formatting speed. Bundle size changed from 110,674 to 110,288 bytes.

## Original extension documentation

VSCode by default uses [js-beautify](https://github.com/beautifier/js-beautify) to format the code, but not all js-beautify settings can be edited in VSCode

This extension uses either the VSCode settings for the js-beautify configuration or the .jsbeautifyrc.json file. If the .jsbeautifyrc.json file is present in the project root, then the settings from .jsbeautifyrc will be used, if not, then the VSCode settings will be used
<br/>
<br/>
[Marketplace Visual Studio](https://marketplace.visualstudio.com/items?itemName=nesterenok.js-beautify-extentions)


## Usage
<p align="center">
    <img src="https://github.com/NesTeRDGIT/js-beautify-extension/blob/main/raw/DemoActivate.gif?raw=true" alt="DemoActivate"/>
</p>

## VSCode Settings
Matching VSCode settings to js-beautify settings<br />
<i>You can find VSCode parameters using the search bar in the VSCode settings window</i><br />

**for all:**<br />
<table>
    <tr>
        <th>js-beautify-parameter</th>
        <th>vs-code-parameter</th>
    </tr>
    <tr>
        <td>indent_with_tabs</td>
        <td>editor.insertSpaces</td>
    </tr>
    <tr>
        <td>indent_size</td>
        <td>editor.tabSize <a href="https://code.visualstudio.com/docs/editor/codebasics#_autodetection">#?</a>
        </td>
    </tr>
    <tr>
        <td>indent_char</td>
        <td>editor.insertSpaces(true - ' ' else - '\t')</td>
    </tr>
    <tr>
        <td>end_with_newline</td>
        <td>files.insertFinalNewline</td>
    </tr>
    <tr>
        <td>eol</td>
        <td>files.eol</td>
    </tr>
</table>

**html:**<br />
<table>
    <tr>
        <th>js-beautify-parameter</th>
        <th>vs-code-parameter</th>
    </tr>
    <tr>
        <td>templating</td>
        <td>js-beautify-for-vscode:html.templating</td>
    </tr>
    <tr>
        <td>extra_liners</td>
        <td>html.format.extraLiners</td>
    </tr>
    <tr>
        <td>indent_handlebars</td>
        <td>html.format.indentHandlebars</td>
    </tr>
    <tr>
        <td>indent_inner_html</td>
        <td>html.format.indentInnerHtml</td>
    </tr>
    <tr>
        <td>max_preserve_newlines</td>
        <td>html.format.maxPreserveNewLines</td>
    </tr>
    <tr>
        <td>preserve_newlines</td>
        <td>html.format.preserveNewLines</td>
    </tr>
    <tr>
        <td>wrap_attributes</td>
        <td>html.format.wrapAttributes</td>
    </tr>
    <tr>
        <td>unformatted</td>
        <td>html.format.unformatted</td>
    </tr>
    <tr>
        <td>wrap_line_length</td>
        <td>html.format.wrapLineLength</td>
    </tr>
</table>

**css**<br />

<table>
    <tr>
        <th>js-beautify-parameter</th>
        <th>vs-code-parameter</th>
    </tr>
    <tr>
        <td>templating</td>
        <td>js-beautify-for-vscode:css.templating</td>
    </tr>
</table>

**js**<br />

<table>
    <tr>
        <th>js-beautify-parameter</th>
        <th>vs-code-parameter</th>
    </tr>
    <tr>
        <td>templating</td>
        <td>js-beautify-for-vscode:js.templating</td>
    </tr>
    <tr>
        <td>space_after_anon_function</td>
        <td>javascript.format.insertSpaceAfterFunctionKeywordForAnonymousFunctions</td>
    </tr>
    <tr>
        <td>space_in_paren</td>
        <td>format.insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis</td>
    </tr>
</table>

## File Settings (.jsbeautifyrc.json)
    {
        html: HTMLBeautifyOptions,
        css: CSSBeautifyOptions,
        js: JSBeautifyOptions
    }
HTMLBeautifyOptions/CSSBeautifyOptions/JSBeautifyOptions are [js-beautify](https://github.com/beautifier/js-beautify) settings<br />
JSON Schema: [beautifyrc.json](https://github.com/NesTeRDGIT/js-beautify-extension/blob/main/schema/beautifyrc.json)

## Support for Angular control flow formatting
Set parameters: <br />
- js-beautify-for-vscode:html.templating = ['angular']<br />
- html.format.indentHandlebars = true<br />
<p align="center">
    <img src="https://github.com/NesTeRDGIT/js-beautify-extension/blob/main/raw/DemoActivateAngular.gif?raw=true" alt="DemoActivateAngular"/>
</p>