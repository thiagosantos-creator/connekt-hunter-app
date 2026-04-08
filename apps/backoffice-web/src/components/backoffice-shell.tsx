import type { ReactNode } from 'react';

import { WorkspaceShell } from '@connekt-hunter/ui';

import { navigationItems } from '@/lib/navigation';

export function BackofficeShell({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <WorkspaceShell
      title="Backoffice"
      subtitle="Shell autenticada inicial para a operação Connekt Hunter."
      items={navigationItems}
    >
      {children}
    </WorkspaceShell>
  );
}
