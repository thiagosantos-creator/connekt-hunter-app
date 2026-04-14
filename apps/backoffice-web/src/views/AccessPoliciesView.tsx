import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Organization } from '../services/types.js';
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, InlineMessage, PageContent, PageHeader, Select, Skeleton, StatBox, spacing } from '@connekt/ui';

type TenantPolicy = {
  canInviteCandidates: boolean;
  canApproveDecisions: boolean;
  canAuditEvents: boolean;
  canAdministrateTenant: boolean;
};

const policyLabels: Record<keyof TenantPolicy, { label: string; description: string }> = {
  canInviteCandidates: { label: 'Pode convidar candidatos', description: 'Permite enviar convites a candidatos via e-mail, link ou telefone.' },
  canApproveDecisions: { label: 'Pode aprovar decisões', description: 'Permite registrar decisões sobre candidatos na shortlist.' },
  canAuditEvents: { label: 'Pode auditar eventos', description: 'Acesso à trilha de auditoria do sistema.' },
  canAdministrateTenant: { label: 'Pode administrar tenant', description: 'Gerenciamento completo de usuários, políticas e configurações.' },
};
const TOTAL_POLICIES = Object.keys(policyLabels).length;

export function AccessPoliciesView() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [policy, setPolicy] = useState<TenantPolicy>({ canInviteCandidates: true, canApproveDecisions: true, canAuditEvents: true, canAdministrateTenant: true });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [saving, setSaving] = useState(false);

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((organization) => ({
        value: organization.id,
        label: organization.tenantSettings?.publicName || organization.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  const enabledPoliciesCount = Object.values(policy).filter(Boolean).length;

  useEffect(() => {
    void apiGet<Organization[]>('/organizations')
      .then(setOrganizations)
      .catch(() => setOrganizations([]))
      .finally(() => setLoadingOrganizations(false));
  }, []);

  useEffect(() => {
    if (!orgId && orgOptions.length > 0) {
      setOrgId(orgOptions[0].value);
    }
  }, [orgId, orgOptions]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    void apiGet<TenantPolicy>(`/tenant-policies/${orgId}`)
      .then(setPolicy)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [orgId]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut(`/tenant-policies/${orgId}`, policy);
      setMsg('Política atualizada com sucesso.');
    } catch (err) {
      setMsg(`Erro ao salvar: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
      <PageContent>
      <PageHeader title="Políticas por Tenant" description="Configure permissões globais para cada organização." />
      {msg && <InlineMessage variant={msg.startsWith('Erro') ? 'error' : 'success'} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      <Card>
        <CardHeader><CardTitle>Controle de acesso</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {loadingOrganizations ? (
            <Skeleton style={{ height: 42, borderRadius: 6 }} />
          ) : orgOptions.length > 0 ? (
            <Select label="Tenant" value={orgId} onChange={(e) => setOrgId(e.target.value)} options={orgOptions} />
          ) : (
            <InlineMessage variant="warning">Nenhum tenant disponível para gestão.</InlineMessage>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md }}>
            <StatBox label="Políticas ativas" value={`${enabledPoliciesCount}/${TOTAL_POLICIES}`} />
            <StatBox label="Convites" value={policy.canInviteCandidates ? 'Liberado' : 'Bloqueado'} />
            <StatBox label="Decisões" value={policy.canApproveDecisions ? 'Liberado' : 'Bloqueado'} />
            <StatBox label="Auditoria" value={policy.canAuditEvents ? 'Liberado' : 'Bloqueado'} />
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ height: 32, borderRadius: 4 }} />)}
            </div>
          ) : (
            (Object.keys(policyLabels) as Array<keyof TenantPolicy>).map((key) => (
              <Checkbox
                key={key}
                label={policyLabels[key].label}
                description={policyLabels[key].description}
                checked={policy[key]}
                onChange={(checked) => setPolicy({ ...policy, [key]: checked })}
              />
            ))
          )}
          <Button onClick={() => { void save(); }} loading={saving} disabled={!orgId}>Salvar políticas</Button>
        </CardContent>
      </Card>
    </PageContent>
  );
}
