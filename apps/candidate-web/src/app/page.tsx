import Link from 'next/link';
import { SectionCard } from '@connekt-hunter/ui';

export default function HomePage() {
  return (
    <main style={{ padding: '48px', display: 'grid', gap: '24px' }}>
      <SectionCard
        title="Connekt Hunter Candidate Experience"
        description="Workspace voltado ao candidato com entradas por token e vaga pública."
      >
        <p>Jornada progressiva do candidato sem landing page institucional.</p>
        <ul>
          <li>
            <Link href="/login">Entrar</Link>
          </li>
          <li>
            <Link href="/dashboard">Abrir primeira visão</Link>
          </li>
        </ul>
      </SectionCard>
    </main>
  );
}
