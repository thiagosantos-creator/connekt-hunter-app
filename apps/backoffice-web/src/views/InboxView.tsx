import { useEffect, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, DataTable, EmptyState, InlineMessage, PageContent, PageHeader, Select, TableSkeleton, spacing } from '@connekt/ui';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { HeadhunterInboxItem } from '../services/types.js';

const priorityVariant: Record<string, 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

export function InboxView() {
  const { user } = useAuth();
  const [items, setItems] = useState<HeadhunterInboxItem[]>([]);
  const [priority, setPriority] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const orgId = user?.organizationIds?.[0] ?? '';

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({ organizationId: orgId, ...(priority ? { priority } : {}) });
      setItems(await apiGet<HeadhunterInboxItem[]>(`/headhunter-inbox?${query.toString()}`));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [orgId, priority]);

  return (
    <PageContent>
      <PageHeader title="Inbox Operacional" description="Tarefas pendentes priorizadas por urgência e tempo em aberto." />
      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}
      <Card>
        <CardHeader><CardTitle>Tarefas pendentes priorizadas</CardTitle></CardHeader>
        <CardContent>
          <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }]} />
          {loading ? <TableSkeleton rows={5} columns={6} /> : items.length === 0 ? <EmptyState title="Inbox vazia" description="Sem pendências críticas no momento. Revise vagas ativas e convites pendentes." /> : (
            <DataTable
              data={items}
              rowKey={(row) => row.id}
              columns={[
                {
                  key: 'priority',
                  header: 'Prioridade',
                  render: (row: HeadhunterInboxItem) => (
                    <Badge variant={priorityVariant[row.priority] ?? 'info'} size="sm">
                      {row.priority === 'high' ? 'Alta' : row.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  ),
                },
                { key: 'vacancyTitle', header: 'Vaga', render: (row: HeadhunterInboxItem) => row.vacancyTitle },
                { key: 'candidateEmail', header: 'Candidato', render: (row: HeadhunterInboxItem) => row.candidateEmail },
                { key: 'status', header: 'Status', render: (row: HeadhunterInboxItem) => row.status },
                { key: 'ageHours', header: 'Em aberto', render: (row: HeadhunterInboxItem) => `${row.ageHours}h` },
                {
                  key: 'quickActions',
                  header: 'Ações rápidas',
                  render: (row: HeadhunterInboxItem) => (
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {row.quickActions.map((action) => (
                        <Badge key={action} variant="info" size="sm">{action}</Badge>
                      ))}
                    </div>
                  ),
                },
              ]}
              emptyMessage="Sem pendências"
            />
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
