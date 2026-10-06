// Small, shared line icons for the screenshot-based design adaptation.
// Icons are decorative; every action keeps its visible text label.
export type IconName = 'check' | 'back' | 'next' | 'upload' | 'download' | 'scan' | 'external' | 'play' | 'book' | 'close' | 'trash' | 'refresh';
const paths: Record<IconName, string> = {
  check:'m4 8 3 3 5-6',
  back:'m9.5 3.5-4.5 4.5 4.5 4.5M5 8h8',
  next:'m6.5 3.5 4.5 4.5-4.5 4.5M3 8h8',
  upload:'M8 11V2m-3 3 3-3 3 3M3 10v4h10v-4',
  download:'M8 2v9m-3-3 3 3 3-3M3 11v3h10v-3',
  scan:'M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4M5 8h6',
  external:'M9 2h5v5m0-5L7 9M6 3H2v11h11v-4',
  play:'m5 3 8 5-8 5Z',
  book:'M8 4C6 2 3 2 1.5 3v10c2-1 4-1 6.5 1m0-10c2-2 5-2 6.5-1v10c-2-1-4-1-6.5 1V4Z',
  close:'m4 4 8 8M12 4l-8 8',
  trash:'M2 4h12M6 4V2h4v2M4 4l.5 10h7L12 4M6.5 7v4m3-4v4',
  refresh:'M13 6a5 5 0 1 0 0 4M13 2v4H9'
};
export function Icon({ name }: { name: IconName }) {
  return <svg className="ui-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
