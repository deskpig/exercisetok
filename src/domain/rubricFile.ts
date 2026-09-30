import { printParseErrorCode, visit } from 'jsonc-parser';
import { normalizeRubric } from './rubricImport';
import type { Rubric } from './types';

const syntaxReasons: Record<string, string> = {
  InvalidSymbol: 'Unexpected symbol. JSON property names and text values must use double quotes.',
  InvalidNumberFormat: 'Invalid number format.',
  PropertyNameExpected: 'Expected a property name in double quotes. Check for an extra comma before the closing brace.',
  ValueExpected: 'Expected a JSON value. Check for a missing value or an extra comma before a closing bracket.',
  ColonExpected: 'Expected a colon (:) after the property name.',
  CommaExpected: 'Expected a comma (,) between items or properties.',
  CloseBraceExpected: 'Missing closing brace (}).',
  CloseBracketExpected: 'Missing closing bracket (]).',
  EndOfFileExpected: 'Unexpected content after the JSON value. Remove any extra text.',
  InvalidCommentToken: 'Comments are not allowed in JSON. Remove the comment.',
  UnexpectedEndOfComment: 'An unfinished comment was found. Remove comments from the JSON file.',
  UnexpectedEndOfString: 'Missing closing double quote for a text value.',
  UnexpectedEndOfNumber: 'The number is incomplete.',
  InvalidUnicode: 'Invalid Unicode escape; use four hexadecimal digits after \\u.',
  InvalidEscapeCharacter: 'Invalid backslash escape inside a string.',
  InvalidCharacter: 'Invalid character inside a string. Escape line breaks as \\n.'
};

function excerpt(text: string, line: number, column: number) {
  const raw = text.split(/\r\n|\r|\n/)[line] ?? '';
  const start = Math.max(0, column - 60);
  const prefix = start ? '…' : '';
  const shown = prefix + raw.slice(start, start + 140).replace(/\t/g, '  ') + (raw.length > start + 140 ? '…' : '');
  const pointer = ' '.repeat(prefix.length + raw.slice(start, column).replace(/\t/g, '  ').length) + '^';
  return (shown || '(end of file)') + '\n' + pointer;
}

export function parseRubricText(text: string, filename = 'rubric.json'): Rubric {
  const source = text.replace(/^\uFEFF/, '');
  if (!source.trim()) throw new Error(filename + ': The JSON file is empty. Add a fields array or download an example.');
  let diagnostic = '';
  // Collect a precise location independently of browser-specific JSON.parse error wording.
  visit(source, { onError(code, offset, _length, line, column) {
    if (diagnostic) return;
    const reason = source.slice(offset).startsWith('...')
      ? 'Replace the ... placeholder with field items, or download a complete example.'
      : syntaxReasons[printParseErrorCode(code)] ?? 'Invalid JSON syntax.';
    diagnostic = filename + ': Invalid JSON at line ' + (line + 1) + ', column ' + (column + 1) + '.\n' + reason + '\n' + excerpt(source, line, column);
  } }, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false });
  if (diagnostic) throw new Error(diagnostic);
  // Never use the diagnostic parser's fault-tolerant output as an accepted rubric.
  const value: unknown = JSON.parse(source);
  try { return normalizeRubric(value); }
  catch (cause) { throw new Error(filename + ': The JSON is valid, but the rubric is invalid. ' + (cause as Error).message); }
}

export async function readRubricFile(file: Pick<File, 'name' | 'size' | 'text'>): Promise<Rubric> {
  if (!/\.json$/i.test(file.name)) {
    const extension = file.name.match(/\.[^.]+$/)?.[0] ?? 'no extension';
    throw new Error(file.name + ': Unsupported file type (' + extension + '). Choose a .json text file.');
  }
  if (file.size > 1_000_000) throw new Error(file.name + ': File is ' + (file.size / 1_000_000).toFixed(2) + ' MB; the limit is 1 MB.');
  let text: string;
  try { text = await file.text(); }
  catch (cause) { throw new Error(file.name + ': The file could not be opened. ' + (cause as Error).message + ' Try choosing it again.'); }
  return parseRubricText(text, file.name);
}
