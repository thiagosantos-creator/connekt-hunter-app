import { useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { addAuditEvent, listManagedUsers, saveManagedUsers, sendCandidateInvite } from '../services/account.js';
import type { ManagedUser } from '../services/types.js';
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
  const [rows, setRows] = useState<ManagedUser[]>(() => listManagedUsers(user));
  const [feedback, setFeedback] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteVacancyId, setInviteVacancyId] = useState('');

  const canManage = hasPermission(user, 'users:manage');
  const canInvite = hasPermission(user, 'candidates:invite');

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
                const next = rows.map((r) => (r.id === row.id ? { ...r, role } : r));
                setRows(next);
                saveManagedUsers(next);
                if (user) addAuditEvent('role.changed', user.email, row.id, { role });
                setFeedback('Role atualizada.');
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
                const next = rows.map((r) => (r.id === row.id ? { ...r, isActive: !r.isActive } : r));
                setRows(next);
                saveManagedUsers(next);
                if (user) addAuditEvent('user.toggled', user.email, row.id, { isActive: String(!row.isActive) });
                setFeedback('Status do usuário atualizado.');
              }}
            >
              {row.isActive ? 'Desativar' : 'Ativar'}
            </Button>
          ) : (
            <span>{row.isActive ? 'Ativo' : 'Inativo'}</span>
          ),
      },
    ],
    [canManage, rows, user],
  );

  if (!user) return null;

  const invite = async () => {
    try {
      await sendCandidateInvite({
        email: inviteEmail,
        vacancyId: inviteVacancyId,
        organizationId: user.tenantId ?? 'org-demo',
      });
      addAuditEvent('candidate.invited', user.email, inviteEmail, { vacancyId: inviteVacancyId });
      setFeedback('Convite enviado com sucesso.');
      setInviteEmail('');
      setInviteVacancyId('');
    } catch (error) {
      setFeedback(`Erro ao enviar convite: ${String(error)}`);
    }
  };

  return (
    <PageContent>
      <PageHeader title="Gestão de Usuários" description="Administração de usuários, permissões e convites." />
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

      <DataTable
        columns={cols}
        data={rows}
        rowKey={(row) => row.id}
        searchable
        searchPlaceholder="Buscar usuário por nome ou e-mail"
        pageSize={10}
      />
    </PageContent>
  );
}
