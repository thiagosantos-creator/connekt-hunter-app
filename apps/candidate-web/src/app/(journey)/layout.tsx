import type { ReactNode } from 'react';

import { CandidateShell } from '@/components/candidate-shell';

export default function JourneyLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <CandidateShell>{children}</CandidateShell>;
}
