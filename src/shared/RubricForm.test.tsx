import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RubricForm } from './RubricForm';
import { defaultRubric } from '../domain/defaultRubric';
import { defaultAnswers } from '../domain/defaultAnswers';
import { ViewingPrompt } from './ViewingPrompt';

it('renders compact radio groups with the saved defaults checked and criteria collapsed', () => {
  const html = renderToStaticMarkup(<RubricForm rubric={defaultRubric} values={defaultAnswers(defaultRubric)} onChange={() => {}} />);
  expect(html).not.toContain('<select');
  expect(html).toContain('Secondary analysis (optional)');
  expect(html.match(/checked=""/g)).toHaveLength(10);
  expect(html).not.toContain('<details open');
  expect(html).toContain('Exercise and depression mentioned together');
});
it('shows an expand icon and start-viewing instructions without a detected video', () => {
  const html = renderToStaticMarkup(<ViewingPrompt />);
  expect(html).toContain('Open TikTok');
  expect(html).toContain('<svg');
  expect(html).toContain('Expand');
});
