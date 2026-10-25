import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RubricForm } from './RubricForm';
import { defaultRubric } from '../domain/defaultRubric';
import { defaultAnswers } from '../domain/defaultAnswers';
import { ViewingPrompt } from './ViewingPrompt';

it('renders compact radio groups, visible primary criteria, and open secondary defaults', () => {
  const html = renderToStaticMarkup(<RubricForm rubric={defaultRubric} values={defaultAnswers(defaultRubric)} onChange={() => {}} />);
  expect(html).not.toContain('<select');
  expect(html).toContain('Secondary analysis (optional)');
  expect(html.match(/checked=""/g)).toHaveLength(14);
  expect(html).toContain('<details class="secondary-analysis" open=""');
  expect(html).toContain('class="field-criteria"');
  expect(html).toContain('Link between exercise and depression made');
});
it('shows an expand icon and start-viewing instructions without a detected video', () => {
  const html = renderToStaticMarkup(<ViewingPrompt />);
  expect(html).toContain('Open TikTok');
  expect(html).toContain('<svg');
  expect(html).toContain('Expand');
});
