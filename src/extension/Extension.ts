import * as vscode from 'vscode';
import { Document } from "../document/Document";
import { Formatters } from "../formatters/Formatters";
import { OptionsResolver } from '../options/OptionsResolver';
import { Options } from '../options/Options';

export class Extension implements vscode.Disposable {
    private formatters = new Formatters();
    private optionsResolver?: OptionsResolver;
    private vsCodeDispose: vscode.Disposable[] = [];

    activate(context: vscode.ExtensionContext) {
        this.dispose();
        
        this.optionsResolver = new OptionsResolver();
        this.vsCodeDispose.push(this.optionsResolver);
        this.register();
        this.vsCodeDispose.push(
            vscode.commands.registerCommand('js-beautify-ext.beautify', () => this.beautifyHandler(true)),
            vscode.commands.registerCommand('js-beautify-ext.beautifyFile', () => this.beautifyHandler(false))
        );
        context.subscriptions.push(this);
    }

    /** Форматировать текущий документ */
    private async beautifyHandler(isSelection: boolean) {
        const active = vscode.window.activeTextEditor;
        if (!active) return;
        const formatter = this.formatters.getFormatter(active.document);
        if (!formatter || !this.optionsResolver) return;
        const doc = new Document(active.document, formatter);
        const options = this.mergeOptions(
            await this.optionsResolver.getOptionAsync(active.document, formatter.type),
            {
                insertSpaces: active.options.insertSpaces === true,
                tabSize: typeof active.options.tabSize === 'number' ? active.options.tabSize : 4
            }
        );
        if (isSelection) {
            const edits = await doc.formatSelection(active.selections, options);
            if (edits.length) await this.replaceEditorText(active, edits);
        } else {
            const edit = await doc.formatFullAsync(options);
            if (edit) await this.replaceEditorText(active, [edit]);
        }
    }

    /** Заменить текст в редакторе */
    private replaceEditorText(editor: vscode.TextEditor, values: ({ range: vscode.Range, text: string })[]) {
        return editor.edit(edit => {
            for (const value of values) edit.replace(value.range, value.text);
        });
    };

    /** Регистрация форматеров для событий */
    register = () => {
        this.formatters.formats.forEach(x => {
            const registerDocumentRangeFormattingEditProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(x.selector, {
                provideDocumentRangeFormattingEdits: (document, range, options) => {
                    return this.provideDocumentRangeFormattingEdits(document, range, options)
                }
            });

            const registerDocumentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider(x.selector, {
                provideDocumentFormattingEdits: (document, options) => {
                    return this.provideDocumentFormattingEdits(document, options)
                }
            });

            this.vsCodeDispose.push(registerDocumentRangeFormattingEditProvider);
            this.vsCodeDispose.push(registerDocumentFormattingEditProvider);
        })
    };

    private async provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, vsOptions: vscode.FormattingOptions): Promise<vscode.TextEdit[]> {
        const formatter = this.formatters.getFormatter(document);
        if (!formatter || !this.optionsResolver) return [];
        const options = this.mergeOptions(await this.optionsResolver.getOptionAsync(document, formatter.type), vsOptions);
        const edits = await new Document(document, formatter).formatSelection([range], options);
        return edits.map(edit => vscode.TextEdit.replace(edit.range, edit.text));
    }

    private async provideDocumentFormattingEdits(document: vscode.TextDocument, vsOptions: vscode.FormattingOptions): Promise<vscode.TextEdit[]> {
        const formatter = this.formatters.getFormatter(document);
        if (!formatter || !this.optionsResolver) return [];
        const options = this.mergeOptions(await this.optionsResolver.getOptionAsync(document, formatter.type), vsOptions);
        const edit = await new Document(document, formatter).formatFullAsync(options);
        return edit ? [vscode.TextEdit.replace(edit.range, edit.text)] : [];
    }

    /** Смешать параметры хранилища и параметры от VsCode */
    private mergeOptions(options: Options, vsOptions: vscode.FormattingOptions):Options{
        const indentWithTabs = options.indent_with_tabs ?? !vsOptions.insertSpaces;
        return {
            ...options,
            indent_with_tabs: indentWithTabs,
            indent_size: options.indent_size ?? vsOptions.tabSize,
            indent_char: options.indent_char ?? (indentWithTabs ? '\t' : ' ')
        };
    }

    dispose(): void {
        this.vsCodeDispose.forEach(x=>x.dispose());
        this.vsCodeDispose = [];
        this.optionsResolver = undefined;
    }
}