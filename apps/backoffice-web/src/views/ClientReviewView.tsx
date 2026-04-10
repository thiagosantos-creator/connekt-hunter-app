import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, Decision } from '../services/types.js';
import {
  Button,
  Badge,
  StatusPill,
  DataTable,
  PageHeader,
  PageContent,
  InlineMessage,
  EmptyState,
  spacing,
} from '@connekt/ui';

type DecisionKind = 'approve' | 'reject' | 'interview' | 'hold';

const decisionLabel: Record<DecisionKind, string> = {
  approve: 'Aprovar',
  reject: 'Rejeitar',
  interview: 'Entrevistar',
  hold: 'Aguardar',
};

const decisionBadgeVariant: Record<DecisionKind, 'success' | 'danger' | 'info' | 'warning'> = {
  approve: 'success',
  reject: 'danger',
  interview: 'info',
  hold: 'warning',
};

const decisionButtonVariant: Record<DecisionKind, 'success' | 'danger' | 'outline' | 'secondary'> = {
  approve: 'success',
  interview: 'outline',
  hold: 'secondary',
  reject: 'danger',
};

export function ClientReviewView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    void apiGet<Application[]>('/applications').then(setApps);
  }, []);

  const decide = async (appId: string, decision: string) => {
    if (!user) return;
    try {
      await apiPost<Decision>('/client-decisions', {
        shortlistItemId: appId,
        reviewerId: user.id,
        decision,
      });
      setDecisions((prev) => ({ ...prev, [appId]: decision }));
      setMsg(`Decisão "${decisionLabel[decision as DecisionKind] ?? decision}" registrada.`);
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const columns = [
    {
      key: 'candidate',
      header: 'Candidato',
      render: (row: Application) => row.candidate.email,
    },
    {
      key: 'vacancy',
      header: 'Vaga',
      render: (row: Application) => row.vacancy.title,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Application) => <StatusPill status={row.status} />,
    },
    {
      key: 'decision',
      header: 'Decisão',
      render: (row: Application) => {
        const d = decisions[row.id];
        if (d) {
          return (
            <Badge variant={decisionBadgeVariant[d as DecisionKind] ?? 'neutral'}>
              {decisionLabel[d as DecisionKind] ?? d}
            </Badge>
          );
        }
        return (
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            {(['approve', 'interview', 'hold', 'reject'] as DecisionKind[]).map((kind) => (
              <Button
                key={kind}
                variant={decisionButtonVariant[kind]}
                size="sm"
                onClick={() => { void decide(row.id, kind); }}
              >
                {decisionLabel[kind]}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Revisão do Cliente"
        description="Revise os candidatos selecionados e registre sua decisão."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      {apps.length === 0 ? (
        <EmptyState
          title="Nenhuma aplicação encontrada"
          description="Aplicações aparecerão aqui quando disponíveis para revisão."
        />
      ) : (
        <DataTable<Application>
          columns={columns}
          data={apps}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma aplicação encontrada"
        />
      )}
    </PageContent>
  );
}
