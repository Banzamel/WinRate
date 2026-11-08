import type { ReactNode } from 'react';

export function Card({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return <section className="card">{title ? <h2>{title}</h2> : null}{children}</section>;
}
