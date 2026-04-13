import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { listCandidateInvites, listManagedUsers, sendCandidateInvite, updateManagedUser } from '../services/account.js';
import type { CandidateInvite, ManagedUser } from '../services/types.js';
import { hasPermission } from '../services/rbac.js';
import {
  PageContent,
  PageHeader,
  DataTable,
  Button,
  Input,
  InlineMessage,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  spacing,
} from '@connekt/ui';

export function AdminUsersView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [inviteRows, setInviteRows] = useState<CandidateInvite[]>([]);
  const [feedback, setFeedback] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteVacancyId, setInviteVacancyId] = useState('');

  const canManage = hasPermission(user, 'users:manage');
  const canInvite = hasPermission(user, 'candidates:invite');
  const organizationId = user?.organizationIds?.[0] ?? user?.tenantId ?? '';

  useEffect(() => {
    if (!organizationId) return;
    void listManagedUsers(organizationId).then(setRows).catch((error) => setFeedback(String(error)));
    void listCandidateInvites(organizationId).then(setInviteRows).catch(() => setInviteRows([]));
  }, [organizationId]);

  const cols = useMemo(
    () => [
      { key: 'name', header: 'Nome', render: (row: ManagedUser) => row.name, sortValue: (row: ManagedUser) => row.name },
      { key: 'email', header: 'E-mail', render: (row: ManagedUser) => row.email, sortValue: (row: ManagedUser) => row.email },
      {
        key: 'role',
        header: 'Role',
        render: (row: ManagedUser) =>
          canManage ? (
            <select
              value={row.role}
              onChange={(e) => {
                const role = e.target.value as ManagedUser['role'];
                void updateManagedUser({ organizationId: row.tenantId, userId: row.id, role }).then((updated) => {
                  setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                  setFeedback('Role atualizada.');
                }).catch((error) => setFeedback(String(error)));
              }}
            >
              <option value="admin">admin</option>
              <option value="headhunter">headhunter</option>
              <option value="client">client</option>
            </select>
          ) : (
            row.role
          ),
      },
      { key: 'tenantId', header: 'Tenant', render: (row: ManagedUser) => row.tenantId },
      {
        key: 'status',
        header: 'Status',
        render: (row: ManagedUser) =>
          canManage ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void updateManagedUser({ organizationId: row.tenantId, userId: row.id, isActive: !row.isActive }).then((updated) => {
                  setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                  setFeedback('Status do usuÃ¡rio atualizado.');
                }).catch((error) => setFeedback(String(error)));
              }}
            >
              {row.isActive ? 'Desativar' : 'Ativar'}
            </Button>
          ) : (
            <span>{row.isActive ? 'Ativo' : 'Inativo'}</span>
          ),
      },
    ],
    [canManage],
  );

  if (!user) return null;

  const invite = async () => {
    try {
      await sendCandidateInvite({
        channel: 'email',
        destination: inviteEmail,
        consent: true,
        vacancyId: inviteVacancyId,
        organizationId,
      });
      setFeedback('Convite enviado com sucesso.');
      setInviteEmail('');
      setInviteVacancyId('');
      setInviteRows(await listCandidateInvites(organizationId));
    } catch (error) {
      setFeedback(`Erro ao enviar convite: ${String(error)}`);
    }
  };

  return (
    <PageContent>
      <PageHeader title="GestÃ£o de UsuÃ¡rios" description="AdministraÃ§Ã£o persistida de usuÃ¡rios, permissÃµes e governanÃ§a de convites." />
      {feedback && <InlineMessage variant="info">{feedback}</InlineMessage>}

      {canInvite && (
        <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
          <CardHeader>
            <CardTitle>Convidar candidato por e-mail</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: spacing.sm }}>
            <Input
              label="E-mail"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="candidato@email.com"
            />
            <Input
              label="Vacancy ID"
              value={inviteVacancyId}
              onChange={(e) => setInviteVacancyId(e.target.value)}
              placeholder="vacancy-id"
            />
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button onClick={() => void invite()} disabled={!inviteEmail || !inviteVacancyId}>Enviar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {inviteRows.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader>
            <CardTitle>GovernanÃ§a de convites</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'candidate', header: 'Candidato', render: (row: CandidateInvite) => row.candidate.email || row.candidate.phone || row.destination },
                { key: 'vacancy', header: 'Vaga', render: (row: CandidateInvite) => row.vacancy.title },
                { key: 'channel', header: 'Canal', render: (row: CandidateInvite) => row.channel },
                { key: 'status', header: 'Status', render: (row: CandidateInvite) => row.status },
              ]}
              data={inviteRows}
              rowKey={(row) => row.id}
              pageSize={5}
            />
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={cols}
        data={rows}
        rowKey={(row) => row.id}
        searchable
        searchPlaceholder="Buscar usuÃ¡rio por nome ou e-mail"
        pageSize={10}
      />
    </PageContent>
  );
}
