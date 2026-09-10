import * as vscode from 'vscode';
import { Document } from "../document/Document";
import { Formatters } from "../formatters/Formatters";
import { IOptionsPersistent } from '../options/IOptionsPersistent';
import * as path from 'path';
import * as fs from 'fs';
import { OptionsVsCodePersistent } from '../options/OptionsVsPersistent';
import { OptionsFilePersistent } from '../options/OptionsFilePersistent';
import { Options } from '../options/Options';

export class Extension implements vscode.Disposable {
    private readonly configFileName = '.jsbeautifyrc.json';
    private formatters = new Formatters();
    private optionsPersistent?: IOptionsPersistent;
    private vsCodeDispose: vscode.Disposable[] = [];

    activate(context: vscode.ExtensionContext) {
        this.dispose();
        
        const pathConfigFile = this.getConfigFilePath();
        this.optionsPersistent = pathConfigFile == null ? new OptionsVsCodePersistent() : new OptionsFilePersistent(pathConfigFile);
        this.register();
        
        let sub = context.subscriptions;
        sub.push(this);
        sub.push(vscode.commands.registerCommand('js-beautify-ext.beautify', () => this.beautifyHandler(true)));
        sub.push(vscode.commands.registerCommand('js-beautify-ext.beautifyFile', () => this.beautifyHandler(false)));
        sub.push(vscode.workspace.onDidSaveTextDocument((document) => this.saveTextDocumentHandler(document)));
        sub.push(vscode.workspace.onDidChangeConfiguration(() => this.changeConfigurationHandler()));
        sub.push(vscode.workspace.onDidOpenTextDocument(() => this.checkOptionsPersistent()));
    }

    /** Форматировать текущий документ */
    private async beautifyHandler(isSelection: boolean) {
        const active = vscode.window.activeTextEditor;
        if (!active) return;
        const formatter = this.formatters.getFormatter(active.document);
        if (!formatter || !this.optionsPersistent) return;
        const doc = new Document(active.document, formatter);
        const options = this.mergeOptions(
            await this.optionsPersistent.getOptionAsync(formatter.type),
            vscode.workspace.getConfiguration().editor
        );
        if (isSelection) {
            const edits = await doc.formatSelection(active.selections, options);
            if (edits.length) await this.replaceEditorText(active, edits);
        } else {
            const edit = await doc.formatFullAsync(options);
            if (edit) await this.replaceEditorText(active, [edit]);
        }
    }

    private saveTextDocumentHandler(document: vscode.TextDocument) {
        if (this.optionsPersistent instanceof OptionsFilePersistent && this.optionsPersistent.filename == document.fileName) {
            this.optionsPersistent.reset();
        }
    }

        private changeConfigurationHandler() {
            //При изменении конфигурации сбрасываем конфигурацию если она OptionsVsCodePersistent
        if (this.optionsPersistent instanceof OptionsVsCodePersistent) {
            this.optionsPersistent.reset();
        }
    }

    /** Проверить конфигурацию
     * Файл конфигурации появился или пропал
     */
    private checkOptionsPersistent() {
        const pathConfigFile = this.getConfigFilePath();
        if(pathConfigFile != null && this.optionsPersistent instanceof OptionsVsCodePersistent){
            this.optionsPersistent = new OptionsFilePersistent(pathConfigFile);
        }
        if(pathConfigFile == null && this.optionsPersistent instanceof OptionsFilePersistent){
            this.optionsPersistent = new OptionsVsCodePersistent()
        }
    }

    /** Заменить текст в редакторе */
    private replaceEditorText(editor: vscode.TextEditor, values: ({ range: vscode.Range, text: string })[]) {
        return editor.edit(edit => {
            for (const value of values) edit.replace(value.range, value.text);
        });
    };

    /** Получить путь к файлу конфигурации */
    private getConfigFilePath(): string | null {
        const root = this.getWorkspaceRoot();
        if (root != null) {
            const fullPath = path.join(root, this.configFileName);
            return fs.existsSync(fullPath) ? fullPath : null
        }
        return null;
    }

    /** Получить корень проекта */
    private getWorkspaceRoot(): string | null {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return null;
        }
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
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
        if (!formatter || !this.optionsPersistent) return [];
        const options = this.mergeOptions(await this.optionsPersistent.getOptionAsync(formatter.type), vsOptions);
        const edits = await new Document(document, formatter).formatSelection([range], options);
        return edits.map(edit => vscode.TextEdit.replace(edit.range, edit.text));
    }

    private async provideDocumentFormattingEdits(document: vscode.TextDocument, vsOptions: vscode.FormattingOptions): Promise<vscode.TextEdit[]> {
        const formatter = this.formatters.getFormatter(document);
        if (!formatter || !this.optionsPersistent) return [];
        const options = this.mergeOptions(await this.optionsPersistent.getOptionAsync(formatter.type), vsOptions);
        const edit = await new Document(document, formatter).formatFullAsync(options);
        return edit ? [vscode.TextEdit.replace(edit.range, edit.text)] : [];
    }

    /** Смешать параметры хранилища и параметры от VsCode */
    private mergeOptions(options: Options, vsOptions: vscode.FormattingOptions):Options{
        options.indent_with_tabs = options.indent_with_tabs || !vsOptions.insertSpaces;
        options.indent_size = options.indent_size || vsOptions.tabSize;
        options.indent_char = options.indent_char || vsOptions.insertSpaces ? ' ': '\t';
        return options;
    }

    dispose(): void {
        this.vsCodeDispose.forEach(x=>x.dispose());
        this.vsCodeDispose = [];
    }
}