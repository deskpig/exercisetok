import { parseTree, printParseErrorCode, visit, type Node } from 'jsonc-parser';
import { normalizeRubric } from './rubricImport';
import { RubricValidationError, type RubricPath } from './rubric';
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

class RubricFileError extends Error {}

function located(filename: string, source: string, offset: number, heading: string, reason: string) {
  const before = source.slice(0, offset).split(/\r\n|\r|\n/);
  const line = before.length - 1;
  const column = before.at(-1)!.length;
  return filename + ': ' + heading + ' at line ' + (line + 1) + ', column ' + (column + 1) + '.\n' + reason + '\n' + excerpt(source, line, column);
}

function nodeAt(root: Node | undefined, path: RubricPath): Node | undefined {
  let node = root;
  for (const key of path) {
    // Use the last duplicate property, matching JSON.parse's value selection.
    node = typeof key === 'number' ? node?.children?.[key]
      : node?.children?.filter(property => property.children?.[0].value === key).at(-1)?.children?.[1];
  }
  return node;
}

function parseDocument(source: string, filename: string): Rubric {
  if (!source.trim()) throw new RubricFileError(located(filename, source, 0, 'Empty JSON', 'The JSON file is empty. Add a fields array or download an example.'));
  let diagnostic = '';
  // Browser-independent syntax positions, including missing punctuation at EOF.
  visit(source, { onError(code, offset) {
    if (diagnostic) return;
    const reason = source.slice(offset).startsWith('...')
      ? 'Replace the ... placeholder with field items, or download a complete example.'
      : syntaxReasons[printParseErrorCode(code)] ?? 'Invalid JSON syntax.';
    diagnostic = located(filename, source, offset, 'Invalid JSON', reason);
  } }, { disallowComments:true, allowTrailingComma:false, allowEmptyContent:false });
  if (diagnostic) throw new RubricFileError(diagnostic);
  // Never accept the diagnostic parser's fault-tolerant output as a rubric.
  const value: unknown = JSON.parse(source);
  try { return normalizeRubric(value); }
  catch (cause) {
    if (!(cause instanceof RubricValidationError)) throw cause;
    const tree = parseTree(source);
    const messages = cause.issues.slice(0, 10).map(issue => {
      const path = [...issue.path];
      let node = nodeAt(tree, path);
      while (!node && path.length) { path.pop(); node = nodeAt(tree, path); }
      const missing = path.length !== issue.path.length ? ' Location marks the containing object because the setting is missing.' : '';
      return located(filename, source, node?.offset ?? 0, 'Invalid rubric', 'The JSON is valid, but the rubric is invalid. ' + issue.message + missing);
    });
    if (cause.issues.length > 10) messages.push('Fix these errors and upload again to see remaining issues.');
    throw new RubricFileError(messages.join('\n\n'));
  }
}

export function parseRubricText(text: string, filename = 'rubric.json'): Rubric {
  const source = text.replace(/^\uFEFF/, '');
  try { return parseDocument(source, filename); }
  catch (cause) {
    if (cause instanceof RubricFileError) throw cause;
    throw new RubricFileError(located(filename, source, 0, 'Rubric read error', 'Document-start reference; could not finish reading this document. ' + (cause instanceof Error ? cause.message : String(cause))));
  }
}

export async function readRubricFile(file: Pick<File, 'name' | 'size' | 'text'>): Promise<Rubric> {
  // File-level failures have no parsed source position. Explicitly label the
  // document-start reference instead of pretending a content character failed.
  const fileError = (reason: string) => new RubricFileError(file.name + ': File error at line 1, column 1 (file-level reference; contents not parsed).\n' + reason);
  if (!/\.json$/i.test(file.name)) {
    const extension = file.name.match(/\.[^.]+$/)?.[0] ?? 'no extension';
    throw fileError('Unsupported file type (' + extension + '). Choose a .json text file.');
  }
  if (file.size > 1_000_000) throw fileError('File is ' + (file.size / 1_000_000).toFixed(2) + ' MB; the limit is 1 MB.');
  let text: string;
  try { text = await file.text(); }
  catch (cause) { throw fileError('The file could not be opened. ' + (cause instanceof Error ? cause.message : String(cause)) + ' Try choosing it again.'); }
  return parseRubricText(text, file.name);
}
