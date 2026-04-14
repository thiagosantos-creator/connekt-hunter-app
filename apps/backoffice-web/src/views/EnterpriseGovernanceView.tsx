import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Organization } from '../services/types.js';
import { hasPermission } from '../services/rbac.js';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  InlineMessage,
  PageContent,
  PageHeader,
  SectionTitle,
  Select,
  Skeleton,
  StatBox,
  colors,
  fontSize,
  radius,
  spacing,
} from '@connekt/ui';

interface AccessPolicyRow {
  id: string;
  roleKey: string;
  resource: string;
  action: string;
  scope: string;
  allowed: boolean;
}

interface CommunicationTemplateRow {
  id: string;
  name: string;
  type: string;
  channel: string;
  versions?: Array<{ id: string; version: number; status: string }>;
}

interface GovernanceHistoryRow {
  id: string;
  createdAt?: string;
  action?: string;
  actorId?: string;
}

interface KpiSnapshot {
  capturedAt?: string;
  period?: string;
  invites?: number;
  responses?: number;
  shortlisted?: number;
  approved?: number;
  onboarded?: number;
  slaMet?: number;
  slaBreached?: number;
}

interface DashboardData {
  period?: string;
  latest?: KpiSnapshot;
  trend?: KpiSnapshot[];
  funnel?: Record<string, number>;
}

interface HealthData {
  status: string;
  service: string;
  environment?: string;
  integrations?: Record<string, string>;
}

interface GovernanceData {
  tenant: Record<string, unknown> | null;
  history: GovernanceHistoryRow[];
  accessPolicies: AccessPolicyRow[];
  templates: CommunicationTemplateRow[];
  dashboard: DashboardData | null;
  health: HealthData | null;
}

function KeyValueGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: `${spacing.xs}px ${spacing.md}px` }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <span style={{ fontWeight: 600, fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' }}>
            {k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
          </span>
          <span style={{ fontSize: fontSize.sm, color: colors.text }}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

export function EnterpriseGovernanceView() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [data, setData] = useState<GovernanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canManageTenant = hasPermission(user, 'tenant-admin:manage');
  const canManageAccessControl = hasPermission(user, 'access-control:manage');
  const canManageCommunications = hasPermission(user, 'communications:manage');

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((organization) => ({
        value: organization.id,
        label: organization.tenantSettings?.publicName || organization.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId) ?? null,
    [organizationId, organizations],
  );

  useEffect(() => {
    if (!hasPermission(user, 'users:manage')) return;
    void apiGet<Organization[]>('/organizations')
      .then(setOrganizations)
      .catch(() => setOrganizations([]));
  }, [user]);

  useEffect(() => {
    if (!organizationId && orgOptions.length > 0) {
      setOrganizationId(orgOptions[0].value);
    }
  }, [organizationId, orgOptions]);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    const requests: Array<Promise<unknown>> = [
      canManageTenant ? apiGet(`/enterprise/tenant-admin/${organizationId}`) : Promise.resolve(null),
      canManageTenant ? apiGet(`/enterprise/tenant-admin/${organizationId}/history`) : Promise.resolve([]),
      canManageAccessControl ? apiGet(`/enterprise/access-control/${organizationId}/policies`) : Promise.resolve([]),
      canManageCommunications ? apiGet(`/enterprise/communications/${organizationId}/templates`) : Promise.resolve([]),
      apiGet(`/enterprise/executive-dashboard/${organizationId}`),
      apiGet('/health').catch(() => null),
    ];

    void Promise.all(requests)
      .then(([tenant, history, accessPolicies, templates, dashboard, health]) => {
        setData({
          tenant: tenant as Record<string, unknown> | null,
          history: history as GovernanceHistoryRow[],
          accessPolicies: accessPolicies as AccessPolicyRow[],
          templates: templates as CommunicationTemplateRow[],
          dashboard: dashboard as DashboardData,
          health: health as HealthData | null,
        });
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [canManageAccessControl, canManageCommunications, canManageTenant, organizationId]);

  if (!organizationId) {
    return (
      <PageContent>
        <PageHeader title="Governança Enterprise" />
        <InlineMessage variant="warning">Sem tenant vinculado para governança.</InlineMessage>
      </PageContent>
    );
  }

  if (loading) {
    return (
      <PageContent>
        <PageHeader title="Governança Enterprise" description="Administração centralizada do tenant, controle de acesso, comunicação e dashboard." />
        <div style={{ display: 'grid', gap: spacing.md }}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton style={{ height: 120, borderRadius: radius.md }} />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent>
        <PageHeader title="Governança Enterprise" />
        <InlineMessage variant="error">Erro ao carregar dados de governança: {error}</InlineMessage>
      </PageContent>
    );
  }

  const latestSnapshot = data?.dashboard?.latest;
  const snapshotEntries = latestSnapshot
    ? Object.entries(latestSnapshot).filter(([, value]) => typeof value === 'number')
    : [];
  const funnelEntries = data?.dashboard?.funnel ? Object.entries(data.dashboard.funnel) : [];
  const integrations = data?.health?.integrations ? Object.entries(data.health.integrations) : [];

  return (
    <PageContent>
      <PageHeader title="Governança Enterprise" description="Administração centralizada do tenant, controle de acesso, comunicação e dashboard." />

      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader>
          <CardTitle>Escopo da governança</CardTitle>
        </CardHeader>
        <CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'minmax(240px, 360px) repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Select label="Tenant" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} options={orgOptions} />
          <StatBox label="Configuração tenant" value={canManageTenant ? 'Editável' : 'Somente leitura'} subtext={selectedOrganization?.status ? `Status: ${selectedOrganization.status}` : undefined} />
          <StatBox label="Políticas de acesso" value={canManageAccessControl ? 'Disponível' : 'Sem permissão'} />
          <StatBox label="Comunicação enterprise" value={canManageCommunications ? 'Disponível' : 'Sem permissão'} />
          <StatBox label="Dashboard executivo" value="Disponível" subtext={data?.dashboard?.period ? `Período: ${data.dashboard.period}` : undefined} />
        </CardContent>
      </Card>

      {snapshotEntries.length > 0 && (
        <>
          <SectionTitle>KPIs Executivos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            {snapshotEntries.map(([key, value]) => (
              <StatBox
                key={key}
                label={formatLabel(key)}
                value={String(value)}
              />
            ))}
          </div>
        </>
      )}

      {funnelEntries.length > 0 && (
        <>
          <SectionTitle>Funil operacional</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            {funnelEntries.map(([key, value]) => (
              <StatBox key={key} label={formatLabel(key)} value={value} />
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'grid', gap: spacing.md }}>
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.tenant ? <KeyValueGrid data={data.tenant} /> : <InlineMessage variant="warning">Sem permissão para administrar configurações do tenant.</InlineMessage>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controle de Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageAccessControl ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
                  <Badge variant="info">{data?.accessPolicies.length ?? 0} política(s)</Badge>
                  <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>configurada(s) neste tenant</span>
                </div>
                <DataTable
                  columns={[
                    { key: 'roleKey', header: 'Perfil', render: (row: AccessPolicyRow) => row.roleKey, searchValue: (row: AccessPolicyRow) => row.roleKey, sortValue: (row: AccessPolicyRow) => row.roleKey },
                    { key: 'resource', header: 'Recurso', render: (row: AccessPolicyRow) => row.resource, searchValue: (row: AccessPolicyRow) => row.resource, sortValue: (row: AccessPolicyRow) => row.resource },
                    { key: 'action', header: 'Ação', render: (row: AccessPolicyRow) => row.action },
                    { key: 'scope', header: 'Escopo', render: (row: AccessPolicyRow) => row.scope },
                    {
                      key: 'allowed',
                      header: 'Decisão',
                      render: (row: AccessPolicyRow) => <Badge variant={row.allowed ? 'success' : 'danger'}>{row.allowed ? 'Permitido' : 'Negado'}</Badge>,
                    },
                  ]}
                  data={data?.accessPolicies ?? []}
                  rowKey={(row) => row.id}
                  pageSize={6}
                  searchable
                  searchPlaceholder="Buscar política por perfil ou recurso"
                  emptyMessage="Nenhuma política cadastrada."
                />
              </>
            ) : (
              <InlineMessage variant="warning">Seu perfil não possui acesso ao detalhamento das políticas.</InlineMessage>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Centro de Comunicação</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageCommunications ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
                  <Badge variant="info">{data?.templates.length ?? 0} template(s)</Badge>
                  <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>de comunicação disponíveis</span>
                </div>
                <DataTable
                  columns={[
                    { key: 'name', header: 'Template', render: (row: CommunicationTemplateRow) => row.name, searchValue: (row: CommunicationTemplateRow) => row.name, sortValue: (row: CommunicationTemplateRow) => row.name },
                    { key: 'type', header: 'Tipo', render: (row: CommunicationTemplateRow) => row.type },
                    { key: 'channel', header: 'Canal', render: (row: CommunicationTemplateRow) => row.channel },
                    {
                      key: 'versions',
                      header: 'Versões',
                      render: (row: CommunicationTemplateRow) => String(row.versions?.length ?? 0),
                    },
                    {
                      key: 'published',
                      header: 'Publicada',
                      render: (row: CommunicationTemplateRow) => {
                        const published = row.versions?.find((version) => version.status === 'published');
                        return published ? <Badge variant="success">v{published.version}</Badge> : <Badge variant="warning">Pendente</Badge>;
                      },
                    },
                  ]}
                  data={data?.templates ?? []}
                  rowKey={(row) => row.id}
                  pageSize={6}
                  searchable
                  searchPlaceholder="Buscar template"
                  emptyMessage="Nenhum template cadastrado."
                />
              </>
            ) : (
              <InlineMessage variant="warning">Seu perfil não possui acesso ao centro de comunicação.</InlineMessage>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status operacional de IA e infraestrutura</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.health ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
                  <Badge variant={data.health.status === 'ok' ? 'success' : 'warning'}>{data.health.status}</Badge>
                  {data.health.environment && <Badge variant="neutral">{data.health.environment}</Badge>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.md }}>
                  {integrations.map(([key, value]) => (
                    <StatBox key={key} label={formatLabel(key)} value={value} />
                  ))}
                </div>
              </>
            ) : (
              <InlineMessage variant="warning">Não foi possível carregar o status operacional das integrações.</InlineMessage>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageTenant ? (
              <DataTable
                columns={[
                  { key: 'action', header: 'Evento', render: (row: GovernanceHistoryRow) => row.action ?? '-', searchValue: (row: GovernanceHistoryRow) => row.action ?? '', sortValue: (row: GovernanceHistoryRow) => row.action ?? '' },
                  { key: 'actorId', header: 'Ator', render: (row: GovernanceHistoryRow) => row.actorId ?? '-' },
                  { key: 'createdAt', header: 'Quando', render: (row: GovernanceHistoryRow) => row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '-', sortValue: (row: GovernanceHistoryRow) => row.createdAt ?? '' },
                ]}
                data={data?.history ?? []}
                rowKey={(row) => row.id}
                pageSize={5}
                emptyMessage="Nenhum evento administrativo registrado."
              />
            ) : (
              <InlineMessage variant="warning">Seu perfil não possui acesso ao histórico administrativo.</InlineMessage>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
