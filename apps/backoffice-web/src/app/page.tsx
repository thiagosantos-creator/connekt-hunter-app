import Link from 'next/link';
import { SectionCard } from '@connekt-hunter/ui';

export default function HomePage() {
  return (
    <main style={{ padding: '48px', display: 'grid', gap: '24px' }}>
      <SectionCard
        title="Connekt Hunter Backoffice"
        description="Workspace operacional com shell autenticada e áreas placeholder para o time interno."
      >
        <p>
          Operação autenticada para administradores, headhunters e clientes.
        </p>
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
