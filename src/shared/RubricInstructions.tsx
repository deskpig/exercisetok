import { useState, type ReactNode } from 'react';
import { fieldExamples, bandExample } from '../domain/rubricExamples';
import { download } from './download';

export function RubricInstructions({ onClose, children }: { onClose: () => void; children?: ReactNode }) {
  const [type, setType] = useState<keyof typeof fieldExamples>('options');
  const [bands, setBands] = useState(false);
  const [message, setMessage] = useState('');
  const example = type === 'range' && bands ? bandExample : fieldExamples[type];
  const file = JSON.stringify({ name: 'My study', fields: [example] }, null, 2);
  async function copyExample() {
    try { await navigator.clipboard.writeText(file); setMessage('Example JSON copied.'); }
    catch { setMessage('Use Download this example to save the JSON.'); }
  }
  return <aside className="help-box rubric-instructions" role="region" aria-label="Rubric instructions">
    <div className="row"><strong>Make a rubric</strong><button className="secondary" onClick={onClose}>Close instructions</button></div>
    <p>Upload a <strong>.json</strong> file, up to 1 MB. Only <code>fields</code> is required.</p>
    {children}
    <p className="code-caption">1. File structure</p>
    <pre className="code-sample"><code>{'{\n  "name": "My study",\n  "fields": [\n    ...\n  ]\n}'}</code></pre>
    <p className="code-caption">2. Replace … with field items. Click a type:</p>
    <div className="code-example">
      <div className="code-types" role="tablist" aria-label="Field type examples">
        {(Object.keys(fieldExamples) as (keyof typeof fieldExamples)[]).map(value => <button type="button" key={value} role="tab" aria-selected={type === value} aria-controls="field-example" onClick={() => { setType(value); setMessage(''); }}>{value}</button>)}
      </div>
      {type === 'range' && <div className="range-example-choice"><button className="secondary" aria-pressed={!bands} onClick={() => setBands(false)}>Number scale</button><button className="secondary" aria-pressed={bands} onClick={() => setBands(true)}>Labeled bands</button></div>}
      <pre className="code-sample" id="field-example" role="tabpanel" aria-label={type + ' example'}><code>{JSON.stringify(example, null, 2)}</code></pre>
    </div>
    <p className="muted">{type === 'custom-string' ? 'Free text needs no field-values. ' : type === 'custom-number' ? 'Number limits are optional. ' : ''}Defaults are optional. Separate field items with commas. Name, IDs, and version can be omitted.</p>
    <div className="actions"><button className="secondary" onClick={() => download('my-rubric.json', file)}>Download this example</button><button className="secondary" onClick={() => { void copyExample(); }}>Copy example JSON</button></div>
    {message && <p role="status">{message}</p>}
  </aside>;
}
