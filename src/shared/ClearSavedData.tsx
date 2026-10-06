import { useEffect, useRef, useState } from 'react';
import { repository } from '../storage/repository';
import { Icon } from './Icon';

export function ClearSavedData({ onCleared }: { onCleared: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (step > 0 && !dialog.current?.open) dialog.current?.showModal();
    if (step === 0 && dialog.current?.open) dialog.current.close();
  }, [step]);
  async function clear() {
    setBusy(true); setMessage('');
    try {
      await repository.clearResearchData();
      setStep(0); setMessage('Saved sessions, lists, and ratings cleared.'); onCleared();
    } catch { setMessage('Could not clear saved data. Try again.'); }
    finally { setBusy(false); }
  }
  return <section className="saved-data">
    <button className="secondary" onClick={() => { setMessage(''); setStep(1); }}><Icon name="trash" />Clear saved sessions & lists</button>
    {step === 0 && message && <p role="status">{message}</p>}
    <dialog ref={dialog} className="clear-dialog" aria-labelledby="clear-title" onCancel={e => { e.preventDefault(); if (!busy) setStep(0); }}>
      <h2 id="clear-title">{step === 2 ? 'Are you sure?' : 'Clear saved research data?'}</h2>
      <p>{step === 2 ? 'This permanently deletes all saved sessions, TikTok lists, and ratings from this extension. This cannot be undone.' : 'This includes imported lists and their ratings. Export anything you want to keep before continuing.'}</p>
      <p className="muted">Downloaded files and your rubric/rater preferences stay on your computer.</p>
      <div className="actions"><button className="secondary" disabled={busy} onClick={() => setStep(0)}>Cancel</button>
        {step === 1 ? <button onClick={() => setStep(2)}>Continue</button> : <button className="danger" disabled={busy} onClick={() => { void clear(); }}>{busy ? 'Clearing…' : 'Yes, permanently clear'}</button>}
      </div>
      {step > 0 && message && <p role="alert">{message}</p>}
    </dialog>
  </section>;
}
