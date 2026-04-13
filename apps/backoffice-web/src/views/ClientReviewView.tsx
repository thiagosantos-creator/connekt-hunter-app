import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  InlineMessage,
  PageContent,
  PageHeader,
  StatusPill,
  TableSkeleton,
  spacing,
} from '@connekt/ui';
import { CandidateProfileModal } from '../components/candidate/CandidateProfileModal.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet, apiPost } from '../services/api.js';
import type { Decision, ShortlistItemWithApplication } from '../services/types.js';

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
  const [items, setItems] = useState<ShortlistItemWithApplication[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      apiGet<ShortlistItemWithApplication[]>('/shortlist/items').then(setItems),
      apiGet<Array<{ id: string; shortlistItemId: string; decision: string }>>('/client-decisions')
        .then((decisionList) => {
          const map: Record<string, string> = {};
          decisionList.forEach((item) => { map[item.shortlistItemId] = item.decision; });
          setDecisions(map);
        })
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  const decide = async (shortlistItemId: string, decision: DecisionKind) => {
    if (!user) return;
    try {
      await apiPost<Decision>('/client-decisions', {
        shortlistItemId,
        reviewerId: user.id,
        decision,
      });
      setDecisions((prev) => ({ ...prev, [shortlistItemId]: decision }));
      setMsg(`Decisão "${decisionLabel[decision]}" registrada com sucesso.`);
      setMsgVariant('success');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
      setMsgVariant('error');
    }
  };

  const columns = [
    {
      key: 'candidate',
      header: 'Candidato',
      render: (row: ShortlistItemWithApplication) => row.application.candidate.profile?.fullName || row.application.candidate.email,
      searchValue: (row: ShortlistItemWithApplication) => `${row.application.candidate.profile?.fullName ?? ''} ${row.application.candidate.email}`,
    },
    {
      key: 'vacancy',
      header: 'Vaga',
      render: (row: ShortlistItemWithApplication) => row.application.vacancy.title,
      searchValue: (row: ShortlistItemWithApplication) => row.application.vacancy.title,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ShortlistItemWithApplication) => <StatusPill status={row.application.status} />,
    },
    {
      key: 'decision',
      header: 'Decisão',
      render: (row: ShortlistItemWithApplication) => {
        const current = decisions[row.id] as DecisionKind | undefined;
        if (current) {
          return <Badge variant={decisionBadgeVariant[current]}>{decisionLabel[current]}</Badge>;
        }

        return (
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            {(['approve', 'interview', 'hold', 'reject'] as DecisionKind[]).map((kind) => (
              <Button key={kind} variant={decisionButtonVariant[kind]} size="sm" onClick={() => { void decide(row.id, kind); }}>
                {decisionLabel[kind]}
              </Button>
            ))}
          </div>
        );
      },
    },
    {
      key: 'profile',
      header: 'Dossiê',
      render: (row: ShortlistItemWithApplication) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedApplicationId(row.applicationId)}>
          Abrir perfil
        </Button>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Revisão do cliente"
        description="Analise o dossiê visual do candidato, compare sinais de IA e registre a decisão final."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum candidato na shortlist"
          description="Os candidatos aparecerão aqui quando forem enviados para revisão."
        />
      ) : (
        <DataTable<ShortlistItemWithApplication>
          columns={columns}
          data={items}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum candidato na shortlist"
          searchable
          searchPlaceholder="Buscar candidato ou vaga..."
        />
      )}

      <CandidateProfileModal
        applicationId={selectedApplicationId}
        open={Boolean(selectedApplicationId)}
        onClose={() => setSelectedApplicationId(null)}
        viewerRole="client"
      />
    </PageContent>
  );
}
