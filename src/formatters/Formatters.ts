import type * as Beautify from 'js-beautify';

// Load the formatter only on the first formatting request.
let beautify: typeof Beautify | undefined;
function getBeautify(): typeof Beautify {
  return beautify ??= require('js-beautify') as typeof Beautify;
}
import { Formatter } from './Formatter';
import * as vscode from 'vscode';
import { FormatType } from './FormatType';

/** Доступные форматеры */
export class Formatters {
  private _formats = new Map<FormatType, Formatter>();

  constructor() {
    const jsData = new Formatter(['javascript', 'typescript', 'json', 'jsonc'], FormatType.js, (text, options) => getBeautify().js(text, options));
    const htmlData = new Formatter(['html', 'htm'], FormatType.html, (text, options) => getBeautify().html(text, options));
    const cssData = new Formatter(['css', 'scss', 'less'], FormatType.css, (text, options) => getBeautify().css(text, options));

    this._formats.set(jsData.type, jsData);
    this._formats.set(htmlData.type, htmlData);
    this._formats.set(cssData.type, cssData);
  }

  get formats(): ReadonlyMap<FormatType, Formatter> {
    return this._formats;
  }

  /** Получить тип документа */
  getType(doc: vscode.TextDocument): FormatType | null {
    for (let [format, data] of this._formats) {
      if (vscode.languages.match(data.selector, doc)) {
        return format;
      }
    }
    return null;
  }

  /** Получить форматер */
  getFormatter(format: FormatType): Formatter | null;
  getFormatter(doc: vscode.TextDocument): Formatter | null;
  getFormatter(formatOrDoc: vscode.TextDocument | FormatType): Formatter | null {
    const format = this.isFormatEnum(formatOrDoc) ? formatOrDoc : this.getType(formatOrDoc);
    if (format !== null) {
      return this._formats.get(format) ?? null;
    }
    return null;
  }

  private isFormatEnum(value: any): value is FormatType {
    return Object.values(FormatType).includes(value);
  }
}