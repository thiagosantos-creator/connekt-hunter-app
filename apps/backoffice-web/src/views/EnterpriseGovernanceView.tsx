import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  InlineMessage,
  PageContent,
  PageHeader,
  SectionTitle,
  Skeleton,
  StatBox,
  colors,
  fontSize,
  radius,
  spacing,
} from '@connekt/ui';

interface GovernanceData {
  tenant: Record<string, unknown>;
  accessPolicies: unknown[];
  templates: unknown[];
  dashboard: Record<string, unknown>;
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

export function EnterpriseGovernanceView() {
  const { user } = useAuth();
  const [data, setData] = useState<GovernanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const organizationId = useMemo(() => user?.organizationIds?.[0], [user]);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    void Promise.all([
      apiGet(`/enterprise/tenant-admin/${organizationId}`),
      apiGet(`/enterprise/access-control/${organizationId}/policies`),
      apiGet(`/enterprise/communications/${organizationId}/templates`),
      apiGet(`/enterprise/executive-dashboard/${organizationId}`),
    ])
      .then(([tenant, accessPolicies, templates, dashboard]) => {
        setData({ tenant: tenant as Record<string, unknown>, accessPolicies: accessPolicies as unknown[], templates: templates as unknown[], dashboard: dashboard as Record<string, unknown> });
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [organizationId]);

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

  const kpiSnapshots = data?.dashboard as Record<string, unknown> | undefined;
  const kpiEntries = kpiSnapshots ? Object.entries(kpiSnapshots).filter(([, v]) => typeof v === 'number') : [];

  return (
    <PageContent>
      <PageHeader title="Governança Enterprise" description="Administração centralizada do tenant, controle de acesso, comunicação e dashboard." />

      {kpiEntries.length > 0 && (
        <>
          <SectionTitle>KPIs Executivos</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            {kpiEntries.map(([key, value]) => (
              <StatBox
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                value={String(value)}
              />
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
            {data?.tenant ? <KeyValueGrid data={data.tenant} /> : <span style={{ color: colors.textMuted }}>Sem dados</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controle de Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Badge variant="info">{data?.accessPolicies.length ?? 0} política(s)</Badge>
              <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>configurada(s) neste tenant</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Centro de Comunicação</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Badge variant="info">{data?.templates.length ?? 0} template(s)</Badge>
              <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>de comunicação disponíveis</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
