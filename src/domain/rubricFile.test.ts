import { expect, it, vi } from 'vitest';
import { parseRubricText, readRubricFile } from './rubricFile';
import { defaultRubric } from './defaultRubric';

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
  expect(() => parseRubricText('{"fields":[]}', 'empty-fields.json')).toThrow('empty-fields.json: Invalid rubric at line 1, column 11.');
  expect(() => parseRubricText('{"fields":[]}')).toThrow('The JSON is valid, but the rubric is invalid. Add at least one item to fields.');
});

it.each([
  ['{\n  "fields": [\n    {"field": "X", "field-type": "script"}\n  ]\n}', 'line 3, column 34', 'Unsupported field type'],
  ['[\n  {"field": "X", "field-type": "custom-number", "field-default": "bad"}\n]', 'line 2, column 66', 'Invalid default'],
  ['{\n  "fields": [{"label": "X", "type": "number", "default": "bad"}]\n}', 'line 2, column 58', 'Invalid default'],
  ['{\n  "fields": [\n    {"field": "X", "field-type": "range", "field-values": {\n      "min": 0,\n      "max": 10,\n      "step": 0\n    }}\n  ]\n}', 'line 6, column 15', 'Step must be a positive number'],
  ['{\n  "fields": [\n    {"field-type": "options"}\n  ]\n}', 'line 3, column 5', 'containing object'],
  ['{\n  "version": 0,\n  "fields": [{"field": "Notes"}]\n}', 'line 2, column 14', 'positive integer'],
  ['{\n  "fields": [] ,\n  "fields": [ {"field": "X", "field-type": "bogus"} ]\n}', 'line 3, column 44', 'Unsupported field type']
])('locates schema errors in the original source: %s', (source, position, reason) => {
  expect(() => parseRubricText(source)).toThrow(position);
  expect(() => parseRubricText(source)).toThrow(reason);
  expect(() => parseRubricText(source)).toThrow('^');
});

it.each([
  file('', 'empty.json'),
  file(valid, 'rubric.txt'),
  { ...file(valid), size:1_000_001 },
  { ...file(valid), text:async () => { throw new Error('Unreadable'); } },
  file('null'),
  file('{"fields": [null]}'),
  file('{"fields": [{"field": "X", "field-type": "options", "field-values": []}]}')
])('always gives numeric line and column information for an upload failure', async selected => {
  await expect(readRubricFile(selected)).rejects.toThrow(/line \d+, column \d+/);
});
it('labels file-level locations as references instead of parsed source errors', async () => {
  await expect(readRubricFile(file(valid, 'rubric.docx'))).rejects.toThrow('line 1, column 1 (file-level reference; contents not parsed)');
});
it('locates an invalid classification reference inside its array', () => {
  const source = JSON.stringify({ ...defaultRubric, classification:{ ...defaultRubric.classification, domainFields:['dose', 'missing'] } }, null, 2);
  const lines = source.split('\n');
  const index = lines.findIndex(line => line.includes('"missing"'));
  expect(() => parseRubricText(source)).toThrow('line ' + (index + 1) + ', column ' + (lines[index].indexOf('"missing"') + 1));
  expect(() => parseRubricText(source)).toThrow('Invalid domainFields reference: missing');
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
