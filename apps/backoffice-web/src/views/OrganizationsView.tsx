import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../services/api.js';
import type { Organization } from '../services/types.js';
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle, DataTable, InlineMessage, Input, PageContent, PageHeader, Select, spacing } from '@connekt/ui';

export function OrganizationsView() {
  const [rows, setRows] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [ownerAdminUserId, setOwnerAdminUserId] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => setRows(await apiGet<Organization[]>('/organizations'));
  useEffect(() => { void load().catch(() => setRows([])); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/organizations', { name, status, ownerAdminUserId });
      setName('');
      setOwnerAdminUserId('');
      setMsg('Empresa criada com sucesso.');
      await load();
    } catch (err) {
      setMsg(String(err));
    }
  };

  return (
    <PageContent>
      <PageHeader title="Empresas / Tenants" />
      {msg && <InlineMessage variant="success" onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      <Card style={{ marginBottom: spacing.lg }}>
        <form onSubmit={(e) => { void create(e); }}>
          <CardHeader><CardTitle>Novo Tenant</CardTitle></CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input label="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} required />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'active', label: 'Ativa' }, { value: 'disabled', label: 'Desativada' }]} />
            <Input label="Owner/Admin responsável" value={ownerAdminUserId} onChange={(e) => setOwnerAdminUserId(e.target.value)} />
          </CardContent>
          <CardFooter><Button type="submit">Criar tenant</Button></CardFooter>
        </form>
      </Card>
      <DataTable data={rows} rowKey={(r) => r.id} columns={[
        { key: 'name', header: 'Empresa', render: (row: Organization) => row.name },
        { key: 'status', header: 'Status', render: (row: Organization) => row.status },
        { key: 'ownerAdminUserId', header: 'Owner/Admin', render: (row: Organization) => row.ownerAdminUserId ?? '-' },
        { key: 'planSegment', header: 'Plano', render: (row: Organization) => row.tenantSettings?.planSegment ?? '-' },
        { key: 'timezone', header: 'Timezone', render: (row: Organization) => row.tenantSettings?.timezone ?? '-' },
      ]}
      />
    </PageContent>
  );
}
