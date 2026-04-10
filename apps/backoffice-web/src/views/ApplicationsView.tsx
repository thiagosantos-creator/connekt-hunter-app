import { useState, useEffect } from 'react';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application } from '../services/types.js';
import {
  Button,
  StatusPill,
  DataTable,
  PageHeader,
  PageContent,
  EmptyState,
} from '@connekt/ui';

export function ApplicationsView() {
  useAuth();
  const [apps, setApps] = useState<Application[]>([]);

  const load = () => {
    apiGet<Application[]>('/applications').then(setApps).catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

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
      key: 'createdAt',
      header: 'Data',
      render: (row: Application) => new Date(row.createdAt).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Aplicações"
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            Atualizar
          </Button>
        }
      />

      {apps.length === 0 ? (
        <EmptyState
          title="Nenhuma aplicação encontrada"
          description="As aplicações aparecerão aqui quando candidatos se inscreverem."
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
