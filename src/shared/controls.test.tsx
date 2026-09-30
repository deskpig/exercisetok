// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RubricInstructions } from './RubricInstructions';
import { RubricForm } from './RubricForm';
import { ClearSavedData } from './ClearSavedData';
import { defaultRubric } from '../domain/defaultRubric';
import { defaultAnswers } from '../domain/defaultAnswers';
import { normalizeRubric } from '../domain/rubricImport';
import { repository } from '../storage/repository';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  if (!HTMLDialogElement.prototype.showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable:true, writable:true, value:() => undefined });
  if (!HTMLDialogElement.prototype.close) Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable:true, writable:true, value:() => undefined });
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function(this: HTMLDialogElement) { this.setAttribute('open', ''); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function(this: HTMLDialogElement) { this.removeAttribute('open'); });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function button(text: string) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent === text);
  if (!found) throw new Error('Missing button: ' + text);
  return found;
}
async function click(text: string) { await act(async () => button(text).click()); }

it('switches the code example between field types and produces usable fields', async () => {
  const close = vi.fn();
  await act(async () => root.render(<RubricInstructions onClose={close} />));
  expect(host.querySelectorAll('pre')).toHaveLength(2);
  for (const type of ['options', 'range', 'custom-string', 'custom-number']) {
    await click(type);
    const example = JSON.parse(host.querySelector('#field-example code')!.textContent!);
    expect(example['field-type']).toBe(type);
    expect(() => normalizeRubric({ fields:[example] })).not.toThrow();
  }
  await click('range'); await click('Labeled bands');
  expect(host.querySelector('#field-example')!.textContent).toContain('10,000+');
  await click('Close instructions'); expect(close).toHaveBeenCalledOnce();
});
it('uses true/false booleans and categorical engagement sliders with no likes/shares', async () => {
  const change = vi.fn();
  await act(async () => root.render(<RubricForm rubric={defaultRubric} values={defaultAnswers(defaultRubric)} onChange={change} />));
  const conflict = [...host.querySelectorAll('fieldset')].find(node => node.querySelector('legend')!.textContent!.startsWith('Overall message conflicts'))!;
  expect(conflict.textContent).toContain('FalseTrue');
  expect(conflict.querySelector<HTMLInputElement>('input[value=false]')!.checked).toBe(true);
  await act(async () => conflict.querySelector<HTMLInputElement>('input[value=true]')!.click());
  expect(change).toHaveBeenLastCalledWith('conflict', true);
  const actionable = [...host.querySelectorAll('legend')].find(node => node.textContent!.startsWith('Guidance is overall'))!;
  expect(actionable.textContent).not.toContain('*');
  expect(host.textContent).not.toContain('Likes at collection');
  expect(host.textContent).not.toContain('Shares at collection');
  const sliders = host.querySelectorAll<HTMLInputElement>('input[type=range]');
  expect(sliders).toHaveLength(2);
  expect(sliders[0].getAttribute('aria-valuetext')).toBe('Not recorded');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(sliders[0], '10');
    sliders[0].dispatchEvent(new Event('input', { bubbles:true }));
  });
  expect(change).toHaveBeenLastCalledWith('views_range', '100,000,000+');
});
it('requires both confirmations, and Cancel at either step never deletes data', async () => {
  const clear = vi.spyOn(repository, 'clearResearchData').mockResolvedValue();
  const done = vi.fn();
  await act(async () => root.render(<ClearSavedData onCleared={done} />));
  await click('Clear saved sessions & lists');
  expect(clear).not.toHaveBeenCalled();
  await click('Cancel'); expect(clear).not.toHaveBeenCalled();
  await click('Clear saved sessions & lists'); await click('Continue');
  expect(host.querySelector('dialog h2')!.textContent).toBe('Are you sure?');
  expect(clear).not.toHaveBeenCalled();
  await click('Cancel'); expect(clear).not.toHaveBeenCalled();
  await click('Clear saved sessions & lists'); await click('Continue'); await click('Yes, permanently clear');
  expect(clear).toHaveBeenCalledOnce(); expect(done).toHaveBeenCalledOnce();
  expect(host.querySelector('dialog')!.open).toBe(false);
});
