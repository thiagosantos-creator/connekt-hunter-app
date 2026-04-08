import { SectionCard } from '@connekt-hunter/ui';

export default function LoginPage() {
  return (
    <main style={{ padding: '48px', maxWidth: '640px' }}>
      <SectionCard
        title="Login"
        description="Entrada placeholder para autenticação corporativa, SSO e políticas futuras de IAM."
      >
        <p>
          O fluxo real será conectado ao módulo auth-iam e ao provedor federado
          definido nas specs.
        </p>
      </SectionCard>
    </main>
  );
}
