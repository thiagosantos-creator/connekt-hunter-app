import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button, Card, CardContent, CardHeader, CardTitle, InlineMessage, PageContent, PageHeader, Select, spacing } from '@connekt/ui';

type TenantPolicy = {
  canInviteCandidates: boolean;
  canApproveDecisions: boolean;
  canAuditEvents: boolean;
  canAdministrateTenant: boolean;
};

export function AccessPoliciesView() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState(user?.organizationIds?.[0] ?? '');
  const [policy, setPolicy] = useState<TenantPolicy>({ canInviteCandidates: true, canApproveDecisions: true, canAuditEvents: true, canAdministrateTenant: true });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!orgId) return;
    void apiGet<TenantPolicy>(`/tenant-policies/${orgId}`).then(setPolicy).catch(() => null);
  }, [orgId]);

  const save = async () => {
    await apiPut(`/tenant-policies/${orgId}`, policy);
    setMsg('Política atualizada.');
  };

  return (
    <PageContent>
      <PageHeader title="Políticas por Tenant" />
      {msg && <InlineMessage variant="success" onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      <Card>
        <CardHeader><CardTitle>Controle de acesso</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Select label="Tenant" value={orgId} onChange={(e) => setOrgId(e.target.value)} options={(user?.organizationIds ?? []).map((id) => ({ value: id, label: id }))} />
          {([
            ['canInviteCandidates', 'Pode convidar'],
            ['canApproveDecisions', 'Pode aprovar'],
            ['canAuditEvents', 'Pode auditar'],
            ['canAdministrateTenant', 'Pode administrar'],
          ] as const).map(([key, label]) => (
            <label key={key}><input type="checkbox" checked={policy[key]} onChange={(e) => setPolicy({ ...policy, [key]: e.target.checked })} /> {label}</label>
          ))}
          <Button onClick={() => { void save(); }}>Salvar políticas</Button>
        </CardContent>
      </Card>
    </PageContent>
  );
}
