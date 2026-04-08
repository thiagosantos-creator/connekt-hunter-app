import type { ReactNode } from 'react';

export interface ShellItem {
  href: string;
  label: string;
}

export function WorkspaceShell(props: {
  title: string;
  subtitle: string;
  items: readonly ShellItem[];
  children: ReactNode;
}) {
  const { title, subtitle, items, children } = props;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: '100vh',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid #334155',
          padding: '24px',
          background: '#0f172a',
          color: '#e2e8f0',
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: '#94a3b8' }}>{subtitle}</p>
        <nav>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'grid',
              gap: '12px',
            }}
          >
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  style={{ color: '#38bdf8', textDecoration: 'none' }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main
        style={{ padding: '32px', background: '#020617', color: '#e2e8f0' }}
      >
        {children}
      </main>
    </div>
  );
}

export function SectionCard(props: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section
      style={{
        border: '1px solid #334155',
        borderRadius: '18px',
        padding: '20px',
        background: '#111827',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{props.title}</h2>
      <p style={{ color: '#94a3b8' }}>{props.description}</p>
      {props.children}
    </section>
  );
}
