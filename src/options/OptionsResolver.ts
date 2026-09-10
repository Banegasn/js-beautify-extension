import * as vscode from 'vscode';
import { OptionsFilePersistent } from './OptionsFilePersistent';
import { OptionsVsCodePersistent } from './OptionsVsPersistent';
import type { FormatType } from '../formatters/FormatType';
import type { Options } from './Options';

interface FolderOptions {
    uri: vscode.Uri;
    watcher: vscode.FileSystemWatcher;
    pending?: Promise<OptionsFilePersistent | undefined>;
}

/** Resolve configuration using the document's own workspace folder and language. */
export class OptionsResolver implements vscode.Disposable {
    private folders = new Map<string, FolderOptions>();
    private documentOptions = new WeakMap<vscode.TextDocument, OptionsVsCodePersistent>();
    private subscriptions: vscode.Disposable[];

    constructor() {
        this.subscriptions = [
            vscode.workspace.onDidChangeConfiguration(event => {
                if (['js-beautify-for-vscode', 'html.format', 'javascript.format', 'files'].some(key => event.affectsConfiguration(key))) {
                    this.documentOptions = new WeakMap();
                }
            }),
            vscode.workspace.onDidChangeWorkspaceFolders(event => {
                for (const folder of event.removed) {
                    const key = folder.uri.toString();
                    this.folders.get(key)?.watcher.dispose();
                    this.folders.delete(key);
                }
                this.documentOptions = new WeakMap();
            })
        ];
    }

    async getOptionAsync(document: vscode.TextDocument, type: FormatType): Promise<Options> {
        const folder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (folder) {
            const entry = this.getFolder(folder);
            const pending = entry.pending ??= this.readFile(entry.uri);
            let file: OptionsFilePersistent | undefined;
            try {
                file = await pending;
            } catch (error) {
                if (entry.pending === pending) entry.pending = undefined;
                throw error;
            }
            if (file) return file.getOptionAsync(type);
        }
        let options = this.documentOptions.get(document);
        if (!options) {
            options = new OptionsVsCodePersistent(document);
            this.documentOptions.set(document, options);
        }
        return options.getOptionAsync(type);
    }

    private getFolder(folder: vscode.WorkspaceFolder): FolderOptions {
        const key = folder.uri.toString();
        let entry = this.folders.get(key);
        if (!entry) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, '.jsbeautifyrc.json'));
            const created: FolderOptions = { uri: vscode.Uri.joinPath(folder.uri, '.jsbeautifyrc.json'), watcher };
            const invalidate = () => { created.pending = undefined; };
            watcher.onDidCreate(invalidate);
            watcher.onDidChange(invalidate);
            watcher.onDidDelete(invalidate);
            entry = created;
            this.folders.set(key, entry);
        }
        return entry;
    }

    private async readFile(uri: vscode.Uri): Promise<OptionsFilePersistent | undefined> {
        try {
            const text = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            return new OptionsFilePersistent(uri.toString(), async () => text);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return undefined;
            throw error;
        }
    }

    dispose(): void {
        for (const entry of this.folders.values()) entry.watcher.dispose();
        this.folders.clear();
        this.documentOptions = new WeakMap();
        for (const subscription of this.subscriptions) subscription.dispose();
        this.subscriptions = [];
    }
}
