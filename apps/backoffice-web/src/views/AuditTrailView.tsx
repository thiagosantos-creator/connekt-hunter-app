import { useEffect, useMemo, useState } from 'react';
import { PageContent, PageHeader, DataTable, EmptyState, InlineMessage, TableSkeleton } from '@connekt/ui';
import { listAuditEvents } from '../services/account.js';
import { useAuth } from '../hooks/useAuth.js';
import { hasPermission } from '../services/rbac.js';
import type { AuditEvent } from '../services/types.js';

export function AuditTrailView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void listAuditEvents()
      .then(setEvents)
      .catch((err) => setError(`Não foi possível carregar os eventos: ${String(err)}`))
      .finally(() => setLoading(false));
  }, []);

  const columns = useMemo(
    () => [
      { key: 'date', header: 'Data', render: (row: AuditEvent) => new Date(row.createdAt).toLocaleString('pt-BR') },
      { key: 'action', header: 'Ação', render: (row: AuditEvent) => row.action },
      { key: 'actor', header: 'Ator', render: (row: AuditEvent) => row.actorEmail },
      { key: 'target', header: 'Alvo', render: (row: AuditEvent) => row.target ?? '-' },
    ],
    [],
  );

  if (!hasPermission(user, 'audit:read')) {
    return (
      <PageContent>
        <PageHeader title="Auditoria" description="Acesso restrito por permissão." />
        <EmptyState title="Sem permissão" description="Somente administradores podem visualizar logs de auditoria." />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <PageHeader title="Auditoria" description="Eventos de login/logout, senha, MFA e permissões." />
      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}
      {loading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : (
        <DataTable
          columns={columns}
          data={events}
          rowKey={(row) => row.id}
          searchable
          searchPlaceholder="Buscar evento"
          pageSize={15}
          emptyMessage="Nenhum evento de auditoria registrado"
        />
      )}
    </PageContent>
  );
}
