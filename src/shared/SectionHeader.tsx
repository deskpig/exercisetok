import type { ReactNode } from 'react';

export function SectionHeader({ eyebrow, title, description, children, level = 2 }: {
  eyebrow: string; title: string; description?: string; children?: ReactNode; level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return <header className="section-header">
    <span className="eyebrow">{eyebrow}</span>
    <Heading>{title}</Heading>
    {description && <p className="section-description">{description}</p>}
    {children}
  </header>;
}
