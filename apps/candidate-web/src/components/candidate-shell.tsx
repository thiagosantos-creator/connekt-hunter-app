import type { ReactNode } from 'react';

import { WorkspaceShell } from '@connekt-hunter/ui';

import { candidateJourney } from '@/lib/journey';

export function CandidateShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <WorkspaceShell
      title="Candidate journey"
      subtitle="Jornada progressiva focada em onboarding, consentimento, mídia e entrevista inteligente."
      items={candidateJourney.map((item) => ({
        href: `/${item.key}`,
        label: item.label,
      }))}
    >
      {children}
    </WorkspaceShell>
  );
}
