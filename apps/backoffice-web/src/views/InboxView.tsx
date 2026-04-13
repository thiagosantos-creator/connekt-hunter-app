import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, DataTable, EmptyState, InlineMessage, PageContent, PageHeader, Select } from '@connekt/ui';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { HeadhunterInboxItem } from '../services/types.js';

export function InboxView() {
  const { user } = useAuth();
  const [items, setItems] = useState<HeadhunterInboxItem[]>([]);
  const [priority, setPriority] = useState('');
  const [error, setError] = useState('');

  const orgId = user?.organizationIds?.[0] ?? '';

  const load = async () => {
    if (!orgId) return;
    try {
      const query = new URLSearchParams({ organizationId: orgId, ...(priority ? { priority } : {}) });
      setItems(await apiGet<HeadhunterInboxItem[]>(`/headhunter-inbox?${query.toString()}`));
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    void load();
  }, [orgId, priority]);

  return (
    <PageContent>
      <PageHeader title="Inbox Operacional" />
      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}
      <Card>
        <CardHeader><CardTitle>Tarefas pendentes priorizadas</CardTitle></CardHeader>
        <CardContent>
          <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }]} />
          {items.length === 0 ? <EmptyState title="Inbox vazia" description="Sem pendências críticas no momento. Revise vagas ativas e convites pendentes." /> : (
            <DataTable
              data={items}
              rowKey={(row) => row.id}
              columns={[
                { key: 'priority', header: 'Prioridade', render: (row: HeadhunterInboxItem) => row.priority },
                { key: 'vacancyTitle', header: 'Vaga', render: (row: HeadhunterInboxItem) => row.vacancyTitle },
                { key: 'candidateEmail', header: 'Candidato', render: (row: HeadhunterInboxItem) => row.candidateEmail },
                { key: 'status', header: 'Status', render: (row: HeadhunterInboxItem) => row.status },
                { key: 'ageHours', header: 'Em aberto (h)', render: (row: HeadhunterInboxItem) => row.ageHours },
                { key: 'quickActions', header: 'Ações rápidas', render: (row: HeadhunterInboxItem) => row.quickActions.join(' · ') },
              ]}
              emptyMessage="Sem pendências"
            />
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
