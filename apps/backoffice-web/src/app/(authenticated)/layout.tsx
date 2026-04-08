import type { ReactNode } from 'react';

import { BackofficeShell } from '@/components/backoffice-shell';

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <BackofficeShell>{children}</BackofficeShell>;
}
