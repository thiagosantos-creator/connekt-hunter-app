import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { createManagedUser, listCandidateInvites, listManagedUsers, sendCandidateInvite, updateManagedUser } from '../services/account.js';
import { apiGet } from '../services/api.js';
import type { CandidateInvite, ManagedUser, Organization, Vacancy } from '../services/types.js';
import { hasPermission } from '../services/rbac.js';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  Select,
  StatBox,
  TableSkeleton,
  spacing,
} from '@connekt/ui';
import type { MessageVariant } from '@connekt/ui';

export function AdminUsersView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [inviteRows, setInviteRows] = useState<CandidateInvite[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<MessageVariant>('info');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteVacancyId, setInviteVacancyId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<ManagedUser['role']>('headhunter');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const canManage = hasPermission(user, 'users:manage');
  const canInvite = hasPermission(user, 'candidates:invite');

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((item) => ({
        value: item.id,
        label: item.tenantSettings?.publicName || item.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  const vacancyOptions = useMemo(
    () => vacancies
      .filter((item) => item.organizationId === organizationId)
      .map((item) => ({ value: item.id, label: item.title })),
    [organizationId, vacancies],
  );
  const organizationLabelById = useMemo(
    () => Object.fromEntries(
      organizations.map((item) => [item.id, item.tenantSettings?.publicName || item.name]),
    ),
    [organizations],
  );

  useEffect(() => {
    void Promise.all([
      apiGet<Organization[]>('/organizations').then(setOrganizations).catch(() => setOrganizations([])),
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
    ]);
  }, []);

  useEffect(() => {
    if (!organizationId && orgOptions.length > 0) {
      setOrganizationId(orgOptions[0].value);
    }
  }, [organizationId, orgOptions]);

  useEffect(() => {
    if (!organizationId) return;
    setLoadingUsers(true);
    setLoadingInvites(true);
    void listManagedUsers(organizationId)
      .then(setRows)
      .catch((error) => {
        setFeedbackVariant('error');
        setFeedback(String(error));
      })
      .finally(() => setLoadingUsers(false));
    void listCandidateInvites(organizationId)
      .then(setInviteRows)
      .catch(() => setInviteRows([]))
      .finally(() => setLoadingInvites(false));
  }, [organizationId]);

  const selectedOrganization = organizations.find((item) => item.id === organizationId) ?? null;
  const activeUsers = rows.filter((row) => row.isActive).length;
  const inactiveUsers = rows.length - activeUsers;
  const pendingInvites = inviteRows.filter((row) => row.status !== 'delivered' && row.status !== 'completed').length;
  const getOrganizationLabel = (id: string) => organizationLabelById[id] || id;
  const ownerLabel = (() => {
    if (!selectedOrganization?.ownerAdminUserId) return 'Não definido';
    const owner = rows.find((r) => r.id === selectedOrganization.ownerAdminUserId);
    return owner ? owner.name : selectedOrganization.ownerAdminUserId;
  })();

  const cols = useMemo(
    () => [
      {
        key: 'name',
        header: 'Nome',
        render: (row: ManagedUser) => row.name,
        sortValue: (row: ManagedUser) => row.name,
        searchValue: (row: ManagedUser) => row.name,
      },
      {
        key: 'email',
        header: 'E-mail',
        render: (row: ManagedUser) => row.email,
        sortValue: (row: ManagedUser) => row.email,
        searchValue: (row: ManagedUser) => row.email,
      },
      {
        key: 'role',
        header: 'Perfil',
        render: (row: ManagedUser) =>
          canManage ? (
            <Select
              value={row.role}
              onChange={(e) => {
                const role = e.target.value as ManagedUser['role'];
                void updateManagedUser({ organizationId: row.tenantId, userId: row.id, role })
                  .then((updated) => {
                    setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                    setFeedbackVariant('success');
                    setFeedback('Perfil atualizado.');
                  })
                  .catch((error) => {
                    setFeedbackVariant('error');
                    setFeedback(String(error));
                  });
               }}
               options={[
                 { value: 'admin', label: 'Admin' },
                 { value: 'headhunter', label: 'Headhunter' },
                 { value: 'client', label: 'Client' },
               ]}
            />
          ) : (
            row.role
          ),
      },
      {
        key: 'tenantId',
        header: 'Empresa',
        render: (row: ManagedUser) => getOrganizationLabel(row.tenantId),
        searchValue: (row: ManagedUser) => getOrganizationLabel(row.tenantId),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row: ManagedUser) =>
          canManage ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void updateManagedUser({ organizationId: row.tenantId, userId: row.id, isActive: !row.isActive })
                  .then((updated) => {
                    setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                    setFeedbackVariant('success');
                    setFeedback('Status do usuário atualizado.');
                  })
                  .catch((error) => {
                    setFeedbackVariant('error');
                    setFeedback(String(error));
                  });
               }}
             >
              {row.isActive ? 'Desativar' : 'Ativar'}
            </Button>
          ) : (
            <span>{row.isActive ? 'Ativo' : 'Inativo'}</span>
          ),
      },
    ],
    [canManage, organizationLabelById],
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
      setFeedbackVariant('success');
      setFeedback('Convite enviado com sucesso.');
      setInviteEmail('');
      setInviteVacancyId('');
      setInviteRows(await listCandidateInvites(organizationId));
    } catch (error) {
      setFeedbackVariant('error');
      setFeedback(`Erro ao enviar convite: ${String(error)}`);
    }
  };

  const createInternalUser = async () => {
    if (!organizationId || !newUserEmail || !newUserName) return;
    setCreatingUser(true);
    try {
      const created = await createManagedUser({
        organizationId,
        email: newUserEmail,
        name: newUserName,
        role: newUserRole,
        title: newUserTitle || undefined,
      });
      setRows((current) => {
        const remaining = current.filter((item) => item.id !== created.id);
        return [...remaining, created].sort((a, b) => a.email.localeCompare(b.email));
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('headhunter');
      setNewUserTitle('');
      setFeedbackVariant('success');
      setFeedback('Usuário interno criado ou associado à empresa com sucesso.');
    } catch (error) {
      setFeedbackVariant('error');
      setFeedback(`Erro ao criar usuário interno: ${String(error)}`);
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <PageContent>
      <PageHeader title="Gestão de Usuários" description="Administração persistida de usuários, permissões e governança de convites." />
      {feedback && <InlineMessage variant={feedbackVariant} onDismiss={() => setFeedback('')}>{feedback}</InlineMessage>}

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
        <CardHeader>
          <CardTitle>Empresa administrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Select label="Empresa" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} options={orgOptions} />
          {selectedOrganization && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md }}>
              <StatBox label="Usuários ativos" value={activeUsers} />
              <StatBox label="Usuários inativos" value={inactiveUsers} />
              <StatBox label="Convites pendentes" value={pendingInvites} />
              <StatBox label="Responsável" value={ownerLabel} />
            </div>
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <Card style={{ marginBottom: spacing.md }}>
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
            <Select
              label="Vaga"
              value={inviteVacancyId}
              onChange={(e) => setInviteVacancyId(e.target.value)}
              options={[
                { value: '', label: vacancyOptions.length > 0 ? 'Selecione uma vaga' : 'Nenhuma vaga disponível' },
                ...vacancyOptions,
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button onClick={() => { void invite(); }} disabled={!inviteEmail || !inviteVacancyId || !organizationId}>Enviar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader>
            <CardTitle>Criar usuário interno</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: spacing.sm }}>
            <Input
              label="Nome"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nome completo"
            />
            <Input
              label="E-mail"
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
            <Input
              label="Cargo"
              value={newUserTitle}
              onChange={(e) => setNewUserTitle(e.target.value)}
              placeholder="Recruiter"
            />
            <Select
              label="Perfil"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as ManagedUser['role'])}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'headhunter', label: 'Headhunter' },
                { value: 'client', label: 'Client' },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button
                onClick={() => { void createInternalUser(); }}
                loading={creatingUser}
                disabled={!organizationId || !newUserEmail || !newUserName}
              >
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canInvite && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardHeader>
            <CardTitle>Governança de convites</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <TableSkeleton rows={5} columns={4} />
            ) : (
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
                emptyMessage="Nenhum convite registrado para esta empresa."
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuários administrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <DataTable
              columns={cols}
              data={rows}
              rowKey={(row) => row.id}
              searchable
              searchPlaceholder="Buscar usuário por nome ou e-mail"
              pageSize={10}
              emptyMessage="Nenhum usuário encontrado para esta empresa."
            />
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
