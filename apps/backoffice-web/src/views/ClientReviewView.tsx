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
  Textarea,
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
  const [commentAppId, setCommentAppId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

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

  const sendComment = async () => {
    if (!commentAppId || !commentText.trim()) return;
    setCommenting(true);
    try {
      await apiPost('/client-comments', { applicationId: commentAppId, comment: commentText });
      setMsg('Comentário enviado com sucesso.');
      setMsgVariant('success');
      setCommentAppId(null);
      setCommentText('');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
      setMsgVariant('error');
    } finally {
      setCommenting(false);
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
      header: 'Ações',
      render: (row: ShortlistItemWithApplication) => (
        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={() => setSelectedApplicationId(row.applicationId)}>
            Abrir perfil
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setCommentAppId(row.applicationId); setCommentText(''); }}>
            Comentar
          </Button>
        </div>
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

      {commentAppId && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: spacing.lg,
            borderRadius: 8,
            width: '100%',
            maxWidth: 480,
            display: 'grid',
            gap: spacing.md,
          }}>
            <h3 style={{ margin: 0 }}>Enviar comentário ao recrutador</h3>
            <Textarea
              label="Comentário sobre o candidato"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva seu feedback ou observação sobre o candidato..."
              rows={4}
            />
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setCommentAppId(null)}>Cancelar</Button>
              <Button
                onClick={() => { void sendComment(); }}
                loading={commenting}
                disabled={!commentText.trim()}
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
