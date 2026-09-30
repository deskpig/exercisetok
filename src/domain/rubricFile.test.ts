import { expect, it, vi } from 'vitest';
import { parseRubricText, readRubricFile } from './rubricFile';

const valid = '{"fields":[{"field":"Notes"}]}';
const file = (text: string, name = 'rubric.json') => ({ name, size:new TextEncoder().encode(text).length, text:vi.fn(async () => text) });

it('reports the filename, line, column, and missing colon with a source pointer', () => {
  expect(() => parseRubricText('{\n  "fields" []\n}', 'study.json')).toThrow('study.json: Invalid JSON at line 2, column 12.');
  expect(() => parseRubricText('{\n  "fields" []\n}')).toThrow('Expected a colon');
  expect(() => parseRubricText('{\n  "fields" []\n}')).toThrow('^');
});
it('keeps line and column locations correct for Windows line endings and BOMs', () => {
  expect(() => parseRubricText('\uFEFF{\r\n  "fields" []\r\n}')).toThrow('line 2, column 12');
});
it.each([
  ['{"fields":[{"field":"Notes"},]}', 'extra comma'],
  ['{"fields":[{"field":"Notes"}]', 'Missing closing brace'],
  ['{"fields": [ ... ]}', 'placeholder'],
  ['{ /* comment */ "fields":[] }', 'Comments are not allowed'],
  ['{"fields":[]} trailing text', 'Unexpected symbol']
])('rejects invalid JSON without silently repairing it: %s', (source, reason) => {
  expect(() => parseRubricText(source)).toThrow(reason);
  expect(() => parseRubricText(source)).toThrow(/line \d+, column \d+/);
});
it('distinguishes valid JSON with an invalid rubric from a syntax error', () => {
  expect(() => parseRubricText('{"fields":[]}', 'empty-fields.json')).toThrow('empty-fields.json: The JSON is valid, but the rubric is invalid. Add at least one item to fields.');
});
it('reports wrong file extensions before trying to read their content', async () => {
  const selected = file(valid, 'rubric.docx');
  await expect(readRubricFile(selected)).rejects.toThrow('Unsupported file type (.docx)');
  expect(selected.text).not.toHaveBeenCalled();
});
it('accepts uppercase JSON extensions and valid BOM-prefixed minimal rubrics', async () => {
  const result = await readRubricFile(file('\uFEFF' + valid, 'RUBRIC.JSON'));
  expect(result.fields[0].label).toBe('Notes');
});
it('reports the actual file size when the upload exceeds the limit', async () => {
  await expect(readRubricFile({ ...file(valid), size:1_500_000 })).rejects.toThrow('File is 1.50 MB; the limit is 1 MB.');
});
it('reports an empty document and a failed file read separately', async () => {
  await expect(readRubricFile(file(' \n '))).rejects.toThrow('JSON file is empty');
  await expect(readRubricFile({ ...file(valid), text:async () => { throw new Error('Permission denied.'); } })).rejects.toThrow('file could not be opened. Permission denied.');
});
