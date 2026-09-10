import type { Options } from '../options/Options';
import * as vscode from 'vscode';
import type { RangeValue } from './RangeValue';
import type { Formatter } from '../formatters/Formatter';

export class Document {
    constructor(private doc: vscode.TextDocument, private formatter: Formatter) {}

    getFullRange = () => this.doc.validateRange(new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE));

    async formatFullAsync(options: Options): Promise<RangeValue | null> {
        const range = this.getFullRange();
        const text = this.doc.getText(range);
        const formatted = this.formatter.formate(text, options);
        return text === formatted ? null : { range, text: formatted };
    }

    async formatSelection(selections: readonly vscode.Range[], options: Options): Promise<RangeValue[]> {
        const edits: RangeValue[] = [];
        for (const range of selections) {
            if (range.isEmpty) continue;
            const text = this.doc.getText(range);
            const formatted = this.formatter.formate(text, options);
            if (text !== formatted) edits.push({ range, text: formatted });
        }
        return edits;
    }
}
