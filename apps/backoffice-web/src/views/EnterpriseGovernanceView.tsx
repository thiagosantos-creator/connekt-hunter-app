import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

interface GovernanceData {
  tenant: Record<string, unknown>;
  accessPolicies: unknown[];
  templates: unknown[];
  dashboard: Record<string, unknown>;
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

  if (!organizationId) return <div style={{ padding: 24 }}>Sem tenant vinculado para governança.</div>;
  if (loading) return <div style={{ padding: 24 }}>Carregando centro enterprise...</div>;
  if (error) return <div style={{ padding: 24, color: '#b42318' }}>Erro: {error}</div>;

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Governança Enterprise</h1>
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Tenant Admin</h2>
        <pre>{JSON.stringify(data?.tenant, null, 2)}</pre>
      </section>
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Access Control</h2>
        <p>Políticas: {data?.accessPolicies.length ?? 0}</p>
      </section>
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Communication Center</h2>
        <p>Templates: {data?.templates.length ?? 0}</p>
      </section>
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2>Executive Dashboard</h2>
        <pre>{JSON.stringify(data?.dashboard, null, 2)}</pre>
      </section>
    </main>
  );
}
