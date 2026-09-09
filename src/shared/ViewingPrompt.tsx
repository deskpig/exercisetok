export function ExpandIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6" />
  </svg>;
}

export function ViewingPrompt({ url, onDismiss }: { url?: string; onDismiss?: () => void }) {
  return <section className="card viewing-prompt" aria-label="Start viewing">
    <strong>Ready to code a TikTok</strong>
    <p>Open TikTok, choose a video, then click its <span className="expand-hint"><ExpandIcon /> Expand</span> button to open the full video view. The rubric will appear when the video is detected.</p>
    <div className="actions">
      <button onClick={() => { void chrome.tabs.create({ url: 'https://www.tiktok.com/' }); }}>Open TikTok</button>
      {url && <button className="secondary" onClick={() => { void chrome.tabs.create({ url }); }}><ExpandIcon /> Open full video</button>}
      {onDismiss && <button className="secondary" onClick={onDismiss}>Continue coding</button>}
    </div>
  </section>;
}
