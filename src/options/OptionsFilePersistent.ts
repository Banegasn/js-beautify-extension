import { FormatType } from '../formatters/FormatType';
import type { IOptionsPersistent } from './IOptionsPersistent';
import type { Options } from './Options';
import type { JSBeautifyOptions, HTMLBeautifyOptions, CSSBeautifyOptions } from 'js-beautify';
import { readFile } from 'fs/promises';

export class OptionsFilePersistent implements IOptionsPersistent {
    private pending?: Promise<JsBeautifyOptionFile>;

    constructor(
        private _filename: string,
        private read: (filename: string) => Promise<string> = filename => readFile(filename, 'utf8')
    ) {}

    get filename(): string { return this._filename; }

    reset(filename?: string): void {
        if (filename) this._filename = filename;
        this.pending = undefined;
    }

    async getOptionAsync(type: FormatType): Promise<Options> {
        // Concurrent format requests share one read; reset invalidates that read.
        const pending = this.pending ??= this.read(this._filename).then(
            data => data.trim() ? JSON.parse(data) as JsBeautifyOptionFile : {}
        );
        try {
            const options = await pending;
            return { ...options[type] };
        } catch (error) {
            if (this.pending === pending) this.pending = undefined;
            throw error;
        }
    }
}

export interface JsBeautifyOptionFile {
    html?: HTMLBeautifyOptions;
    js?: JSBeautifyOptions;
    css?: CSSBeautifyOptions;
}
