import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Organization } from '../services/types.js';
import { hasPermission } from '../services/rbac.js';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  SectionTitle,
  Select,
  Skeleton,
  StatBox,
  Textarea,
  radius,
  spacing,
} from '@connekt/ui';

type PolicyRow = { id: string; roleKey: string; resource: string; action: string; scope: string; allowed: boolean };
type TemplateRow = { id: string; name: string; type: string; channel: string; versions?: Array<{ id: string; version: number; status: string }> };
type DispatchRow = { id: string; recipient: string; eventKey: string; channel: string; status: string; createdAt: string };
type HistoryRow = { id: string; action?: string; actorId?: string; createdAt?: string };
type Dashboard = { period?: string; latest?: Record<string, number>; funnel?: Record<string, number> };
type Health = { status: string; environment?: string; integrations?: Record<string, string> };
type Tenant = {
  planSegment: string; slaResponseHours: number; slaClosureHours: number; timezone: string; operationalCalendar: string;
  tenantStatus: 'trial' | 'active' | 'suspended'; logoUrl?: string | null; bannerUrl?: string | null; primaryColor?: string | null;
  secondaryColor?: string | null; publicName?: string | null; communicationDomain?: string | null; contactEmail?: string | null;
  dataRetentionDays: number; auditRetentionDays: number; mfaRequiredRoles: string[]; maxSessionMinutes: number;
  communicationWindowStart: string; communicationWindowEnd: string; frequencyLimitPerDay: number;
};
type Settings = {
  planSegment: string; slaResponseHours: number; slaClosureHours: number; timezone: string; operationalCalendar: string;
  tenantStatus: 'trial' | 'active' | 'suspended';
  branding: { publicName: string; communicationDomain: string; contactEmail: string; logoUrl: string; bannerUrl: string; primaryColor: string; secondaryColor: string };
  policy: { dataRetentionDays: number; auditRetentionDays: number; mfaRequiredRoles: string[]; maxSessionMinutes: number; communicationWindowStart: string; communicationWindowEnd: string; frequencyLimitPerDay: number };
};

const emptySettings: Settings = {
  planSegment: 'standard', slaResponseHours: 24, slaClosureHours: 336, timezone: 'America/Sao_Paulo', operationalCalendar: 'business-days', tenantStatus: 'trial',
  branding: { publicName: '', communicationDomain: '', contactEmail: '', logoUrl: '', bannerUrl: '', primaryColor: '', secondaryColor: '' },
  policy: { dataRetentionDays: 365, auditRetentionDays: 365, mfaRequiredRoles: [], maxSessionMinutes: 480, communicationWindowStart: '08:00', communicationWindowEnd: '20:00', frequencyLimitPerDay: 5 },
};

function toSettings(tenant: Tenant | null): Settings {
  if (!tenant) return emptySettings;
  return {
    planSegment: tenant.planSegment,
    slaResponseHours: tenant.slaResponseHours,
    slaClosureHours: tenant.slaClosureHours,
    timezone: tenant.timezone,
    operationalCalendar: tenant.operationalCalendar,
    tenantStatus: tenant.tenantStatus,
    branding: {
      publicName: tenant.publicName ?? '',
      communicationDomain: tenant.communicationDomain ?? '',
      contactEmail: tenant.contactEmail ?? '',
      logoUrl: tenant.logoUrl ?? '',
      bannerUrl: tenant.bannerUrl ?? '',
      primaryColor: tenant.primaryColor ?? '',
      secondaryColor: tenant.secondaryColor ?? '',
    },
    policy: {
      dataRetentionDays: tenant.dataRetentionDays,
      auditRetentionDays: tenant.auditRetentionDays,
      mfaRequiredRoles: tenant.mfaRequiredRoles ?? [],
      maxSessionMinutes: tenant.maxSessionMinutes,
      communicationWindowStart: tenant.communicationWindowStart,
      communicationWindowEnd: tenant.communicationWindowEnd,
      frequencyLimitPerDay: tenant.frequencyLimitPerDay,
    },
  };
}

const fmt = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, (char) => char.toUpperCase());

export function EnterpriseGovernanceView() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [dispatchAudit, setDispatchAudit] = useState<DispatchRow[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [draftPolicies, setDraftPolicies] = useState<PolicyRow[]>([]);
  const [roleKey, setRoleKey] = useState('admin');
  const [policyDraft, setPolicyDraft] = useState({ resource: 'vacancies', action: 'read', scope: 'tenant', allowed: true });
  const [grantForm, setGrantForm] = useState({ userId: '', resource: 'vacancies', action: 'read', scope: 'tenant', expiresAt: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'invite', channel: 'email', placeholders: '', content: '' });
  const [dispatchForm, setDispatchForm] = useState({ templateId: '', recipient: '', eventKey: 'manual.dispatch' });
  const [simulation, setSimulation] = useState<{ allowed: boolean; rationale: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackVariant, setFeedbackVariant] = useState<'success' | 'error'>('success');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const canManageTenant = hasPermission(user, 'tenant-admin:manage');
  const canManageAccess = hasPermission(user, 'access-control:manage');
  const canManageComms = hasPermission(user, 'communications:manage');

  const orgOptions = useMemo(() => organizations.length
    ? organizations.map((org) => ({ value: org.id, label: org.tenantSettings?.publicName || org.name }))
    : (user?.organizationIds ?? []).map((id) => ({ value: id, label: id })), [organizations, user?.organizationIds]);
  const rolePolicies = useMemo(() => draftPolicies.filter((row) => row.roleKey === roleKey), [draftPolicies, roleKey]);
  const kpis = dashboard?.latest ? Object.entries(dashboard.latest).filter(([, value]) => typeof value === 'number') : [];
  const funnel = dashboard?.funnel ? Object.entries(dashboard.funnel) : [];
  const integrations = health?.integrations ? Object.entries(health.integrations) : [];

  const msg = (variant: 'success' | 'error', text: string) => { setFeedbackVariant(variant); setFeedback(text); };

  const load = async (orgId: string) => {
    setLoading(true);
    try {
      const [nextTenant, nextHistory, nextPolicies, nextTemplates, nextDispatch, nextDashboard, nextHealth] = await Promise.all([
        canManageTenant ? apiGet<Tenant>(`/enterprise/tenant-admin/${orgId}`) : Promise.resolve(null),
        canManageTenant ? apiGet<HistoryRow[]>(`/enterprise/tenant-admin/${orgId}/history`) : Promise.resolve([]),
        canManageAccess ? apiGet<PolicyRow[]>(`/enterprise/access-control/${orgId}/policies`) : Promise.resolve([]),
        canManageComms ? apiGet<TemplateRow[]>(`/enterprise/communications/${orgId}/templates`) : Promise.resolve([]),
        canManageComms ? apiGet<DispatchRow[]>(`/enterprise/communications/${orgId}/dispatch-audit`) : Promise.resolve([]),
        apiGet<Dashboard>(`/enterprise/executive-dashboard/${orgId}`),
        apiGet<Health>('/health').catch(() => null),
      ]);
      setTenant(nextTenant); setSettings(toSettings(nextTenant)); setHistory(nextHistory); setPolicies(nextPolicies); setDraftPolicies(nextPolicies);
      setTemplates(nextTemplates); setDispatchAudit(nextDispatch); setDashboard(nextDashboard); setHealth(nextHealth);
      setDispatchForm((current) => ({ ...current, templateId: current.templateId || nextTemplates[0]?.id || '' })); setError('');
    } catch (err) { setError(String(err)); } finally { setLoading(false); }
  };

  useEffect(() => { if (!hasPermission(user, 'users:manage')) return; void apiGet<Organization[]>('/organizations').then(setOrganizations).catch(() => setOrganizations([])); }, [user]);
  useEffect(() => { if (!organizationId && orgOptions.length > 0) setOrganizationId(orgOptions[0].value); }, [organizationId, orgOptions]);
  useEffect(() => { if (organizationId) void load(organizationId); }, [organizationId, canManageTenant, canManageAccess, canManageComms]);

  if (!organizationId) return <PageContent><PageHeader title="Governança Enterprise" /><InlineMessage variant="warning">Sem tenant vinculado para governança.</InlineMessage></PageContent>;
  if (loading) return <PageContent><PageHeader title="Governança Enterprise" description="Administração centralizada do tenant, controle de acesso, comunicação e dashboard." /><div style={{ display: 'grid', gap: spacing.md }}>{[1, 2, 3].map((i) => <Card key={i}><CardContent><Skeleton style={{ height: 120, borderRadius: radius.md }} /></CardContent></Card>)}</div></PageContent>;

  const saveTenant = async () => { setBusy('tenant'); try { await apiPut(`/enterprise/tenant-admin/${organizationId}`, settings); msg('success', 'Configurações do tenant atualizadas.'); await load(organizationId); } catch (err) { msg('error', `Erro ao salvar tenant: ${String(err)}`); } finally { setBusy(''); } };
  const savePolicies = async () => { setBusy('policies'); try { await apiPost(`/enterprise/access-control/${organizationId}/policies`, { roleKey, rules: rolePolicies.map(({ resource, action, scope, allowed }) => ({ resource, action, scope, allowed })) }); msg('success', `Políticas do perfil ${roleKey} atualizadas.`); await load(organizationId); } catch (err) { msg('error', `Erro ao salvar políticas: ${String(err)}`); } finally { setBusy(''); } };
  const simulate = async () => { setBusy('simulate'); try { setSimulation(await apiPost(`/enterprise/access-control/${organizationId}/simulate`, { roleKey, resource: policyDraft.resource, action: policyDraft.action, scope: policyDraft.scope })); } catch (err) { msg('error', `Erro ao simular acesso: ${String(err)}`); } finally { setBusy(''); } };
  const grant = async () => { setBusy('grant'); try { await apiPost(`/enterprise/access-control/${organizationId}/grants`, grantForm); msg('success', 'Acesso temporário concedido.'); setGrantForm({ userId: '', resource: 'vacancies', action: 'read', scope: 'tenant', expiresAt: '' }); } catch (err) { msg('error', `Erro ao conceder acesso: ${String(err)}`); } finally { setBusy(''); } };
  const createTemplate = async () => { setBusy('template'); try { await apiPost(`/enterprise/communications/${organizationId}/templates`, { name: templateForm.name, type: templateForm.type, channel: templateForm.channel, placeholders: templateForm.placeholders.split(',').map((value) => value.trim()).filter(Boolean), content: templateForm.content }); msg('success', 'Template criado com sucesso.'); setTemplateForm({ name: '', type: 'invite', channel: 'email', placeholders: '', content: '' }); await load(organizationId); } catch (err) { msg('error', `Erro ao criar template: ${String(err)}`); } finally { setBusy(''); } };
  const publishTemplate = async (templateId: string) => { try { await apiPut(`/enterprise/communications/${organizationId}/templates/${templateId}/publish`, {}); msg('success', 'Template publicado.'); await load(organizationId); } catch (err) { msg('error', `Erro ao publicar template: ${String(err)}`); } };
  const dispatchTemplate = async () => { setBusy('dispatch'); try { await apiPost(`/enterprise/communications/${organizationId}/dispatch`, { ...dispatchForm, idempotencyKey: crypto.randomUUID() }); msg('success', 'Disparo solicitado com sucesso.'); setDispatchForm((current) => ({ ...current, recipient: '', eventKey: 'manual.dispatch' })); await load(organizationId); } catch (err) { msg('error', `Erro ao disparar template: ${String(err)}`); } finally { setBusy(''); } };

  return (
    <PageContent>
      <PageHeader title="Governança Enterprise" description="Administração centralizada do tenant, controle de acesso, comunicação e dashboard." />
      {feedback && <InlineMessage variant={feedbackVariant} onDismiss={() => setFeedback('')}>{feedback}</InlineMessage>}
      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}

      <Card style={{ marginBottom: spacing.lg }}><CardHeader><CardTitle>Escopo da governança</CardTitle></CardHeader><CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'minmax(240px, 360px) repeat(auto-fit, minmax(180px, 1fr))' }}><Select label="Tenant" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} options={orgOptions} /><StatBox label="Tenant settings" value={canManageTenant ? 'Editável' : 'Somente leitura'} /><StatBox label="Access control" value={canManageAccess ? 'Editável' : 'Sem permissão'} /><StatBox label="Comunicação" value={canManageComms ? 'Editável' : 'Sem permissão'} /><StatBox label="Dashboard" value={dashboard?.period ?? 'Disponível'} /></CardContent></Card>
      {kpis.length > 0 && <><SectionTitle>KPIs Executivos</SectionTitle><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>{kpis.map(([key, value]) => <StatBox key={key} label={fmt(key)} value={String(value)} />)}</div></>}
      {funnel.length > 0 && <><SectionTitle>Funil Operacional</SectionTitle><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>{funnel.map(([key, value]) => <StatBox key={key} label={fmt(key)} value={String(value)} />)}</div></>}

      <div style={{ display: 'grid', gap: spacing.md }}>
        <Card><CardHeader><CardTitle>Configuração do Tenant</CardTitle></CardHeader><CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Input label="Nome público" value={settings.branding.publicName} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, publicName: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Plano" value={settings.planSegment} onChange={(e) => setSettings((current) => ({ ...current, planSegment: e.target.value }))} disabled={!canManageTenant} />
          <Input label="Fuso horário" value={settings.timezone} onChange={(e) => setSettings((current) => ({ ...current, timezone: e.target.value }))} disabled={!canManageTenant} />
          <Input label="Calendário" value={settings.operationalCalendar} onChange={(e) => setSettings((current) => ({ ...current, operationalCalendar: e.target.value }))} disabled={!canManageTenant} />
          <Select label="Status" value={settings.tenantStatus} onChange={(e) => setSettings((current) => ({ ...current, tenantStatus: e.target.value as Settings['tenantStatus'] }))} disabled={!canManageTenant} options={[{ value: 'trial', label: 'Trial' }, { value: 'active', label: 'Ativo' }, { value: 'suspended', label: 'Suspenso' }]} />
          <Input label="Domínio" value={settings.branding.communicationDomain} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, communicationDomain: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="E-mail de contato" type="email" value={settings.branding.contactEmail} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, contactEmail: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Logo URL" value={settings.branding.logoUrl} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, logoUrl: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Banner URL" value={settings.branding.bannerUrl} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, bannerUrl: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Cor primária" value={settings.branding.primaryColor} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, primaryColor: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Cor secundária" value={settings.branding.secondaryColor} onChange={(e) => setSettings((current) => ({ ...current, branding: { ...current.branding, secondaryColor: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="SLA resposta (h)" type="number" value={settings.slaResponseHours} onChange={(e) => setSettings((current) => ({ ...current, slaResponseHours: Number(e.target.value) }))} disabled={!canManageTenant} />
          <Input label="SLA fechamento (h)" type="number" value={settings.slaClosureHours} onChange={(e) => setSettings((current) => ({ ...current, slaClosureHours: Number(e.target.value) }))} disabled={!canManageTenant} />
          <Input label="Retenção dados" type="number" value={settings.policy.dataRetentionDays} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, dataRetentionDays: Number(e.target.value) } }))} disabled={!canManageTenant} />
          <Input label="Retenção auditoria" type="number" value={settings.policy.auditRetentionDays} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, auditRetentionDays: Number(e.target.value) } }))} disabled={!canManageTenant} />
          <Input label="Sessão máxima" type="number" value={settings.policy.maxSessionMinutes} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, maxSessionMinutes: Number(e.target.value) } }))} disabled={!canManageTenant} />
          <Input label="Janela início" value={settings.policy.communicationWindowStart} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, communicationWindowStart: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Janela fim" value={settings.policy.communicationWindowEnd} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, communicationWindowEnd: e.target.value } }))} disabled={!canManageTenant} />
          <Input label="Limite diário" type="number" value={settings.policy.frequencyLimitPerDay} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, frequencyLimitPerDay: Number(e.target.value) } }))} disabled={!canManageTenant} />
          <Input label="Roles com MFA" value={settings.policy.mfaRequiredRoles.join(', ')} onChange={(e) => setSettings((current) => ({ ...current, policy: { ...current.policy, mfaRequiredRoles: e.target.value.split(',').map((value) => value.trim()).filter(Boolean) } }))} disabled={!canManageTenant} />
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => { void saveTenant(); }} loading={busy === 'tenant'} disabled={!canManageTenant}>Salvar tenant</Button></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Controle de Acesso</CardTitle></CardHeader><CardContent style={{ display: 'grid', gap: spacing.md }}>
          {canManageAccess ? <>
            <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Select label="Perfil" value={roleKey} onChange={(e) => setRoleKey(e.target.value)} options={[{ value: 'admin', label: 'Admin' }, { value: 'headhunter', label: 'Headhunter' }, { value: 'client', label: 'Client' }]} />
              <Input label="Recurso" value={policyDraft.resource} onChange={(e) => setPolicyDraft((current) => ({ ...current, resource: e.target.value }))} />
              <Select label="Ação" value={policyDraft.action} onChange={(e) => setPolicyDraft((current) => ({ ...current, action: e.target.value }))} options={[{ value: 'read', label: 'Read' }, { value: 'create', label: 'Create' }, { value: 'update', label: 'Update' }, { value: 'approve', label: 'Approve' }, { value: 'export', label: 'Export' }, { value: 'audit', label: 'Audit' }]} />
              <Select label="Escopo" value={policyDraft.scope} onChange={(e) => setPolicyDraft((current) => ({ ...current, scope: e.target.value }))} options={[{ value: 'own', label: 'Own' }, { value: 'team', label: 'Team' }, { value: 'tenant', label: 'Tenant' }]} />
              <div style={{ display: 'flex', alignItems: 'end' }}><Checkbox label="Permitido" checked={policyDraft.allowed} onChange={(checked) => setPolicyDraft((current) => ({ ...current, allowed: checked }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}><Button variant="outline" onClick={() => setDraftPolicies((current) => [...current, { id: `draft-${Date.now()}`, roleKey, ...policyDraft }])}>Adicionar regra</Button><Button onClick={() => { void savePolicies(); }} loading={busy === 'policies'}>Salvar regras do perfil</Button><Button variant="ghost" onClick={() => { void simulate(); }} loading={busy === 'simulate'}>Simular acesso</Button></div>
            {simulation && <InlineMessage variant={simulation.allowed ? 'success' : 'warning'}>{simulation.allowed ? 'Permitido' : 'Negado'} ({simulation.rationale})</InlineMessage>}
            <div style={{ display: 'grid', gap: spacing.sm }}>{rolePolicies.length ? rolePolicies.map((row) => <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, padding: spacing.md, border: '1px solid #ddd', borderRadius: radius.md }}><span>{row.resource} · {row.action} · {row.scope} · {row.allowed ? 'permitido' : 'negado'}</span><Button size="sm" variant="ghost" onClick={() => setDraftPolicies((current) => current.filter((item) => item.id !== row.id))}>Remover</Button></div>) : <InlineMessage variant="warning">Nenhuma regra em edição para o perfil selecionado.</InlineMessage>}</div>
            <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <Input label="Grant para userId" value={grantForm.userId} onChange={(e) => setGrantForm((current) => ({ ...current, userId: e.target.value }))} />
              <Input label="Grant recurso" value={grantForm.resource} onChange={(e) => setGrantForm((current) => ({ ...current, resource: e.target.value }))} />
              <Input label="Grant ação" value={grantForm.action} onChange={(e) => setGrantForm((current) => ({ ...current, action: e.target.value }))} />
              <Input label="Grant escopo" value={grantForm.scope} onChange={(e) => setGrantForm((current) => ({ ...current, scope: e.target.value }))} />
              <Input label="Expira em" type="datetime-local" value={grantForm.expiresAt} onChange={(e) => setGrantForm((current) => ({ ...current, expiresAt: e.target.value }))} />
              <div style={{ display: 'flex', alignItems: 'end' }}><Button onClick={() => { void grant(); }} loading={busy === 'grant'} disabled={!grantForm.userId || !grantForm.expiresAt}>Conceder acesso</Button></div>
            </div>
          </> : <InlineMessage variant="warning">Seu perfil não possui acesso ao detalhamento das políticas.</InlineMessage>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Centro de Comunicação</CardTitle></CardHeader><CardContent style={{ display: 'grid', gap: spacing.md }}>
          {canManageComms ? <>
            <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <Input label="Nome do template" value={templateForm.name} onChange={(e) => setTemplateForm((current) => ({ ...current, name: e.target.value }))} />
              <Input label="Tipo" value={templateForm.type} onChange={(e) => setTemplateForm((current) => ({ ...current, type: e.target.value }))} />
              <Select label="Canal" value={templateForm.channel} onChange={(e) => setTemplateForm((current) => ({ ...current, channel: e.target.value }))} options={[{ value: 'email', label: 'Email' }]} />
              <Input label="Placeholders" value={templateForm.placeholders} onChange={(e) => setTemplateForm((current) => ({ ...current, placeholders: e.target.value }))} placeholder="candidateName, vacancyTitle" />
              <div style={{ gridColumn: '1 / -1' }}><Textarea label="Conteúdo" value={templateForm.content} onChange={(e) => setTemplateForm((current) => ({ ...current, content: e.target.value }))} /></div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}><Button onClick={() => { void createTemplate(); }} loading={busy === 'template'} disabled={!templateForm.name || !templateForm.content}>Criar template</Button></div>
            </div>
            <DataTable columns={[{ key: 'name', header: 'Template', render: (row: TemplateRow) => row.name, searchValue: (row: TemplateRow) => row.name }, { key: 'type', header: 'Tipo', render: (row: TemplateRow) => row.type }, { key: 'channel', header: 'Canal', render: (row: TemplateRow) => row.channel }, { key: 'published', header: 'Status', render: (row: TemplateRow) => { const published = row.versions?.find((version) => version.status === 'published'); return published ? <Badge variant="success">v{published.version}</Badge> : <Badge variant="warning">Pendente</Badge>; } }, { key: 'actions', header: 'Ações', render: (row: TemplateRow) => <Button size="sm" variant="outline" onClick={() => { void publishTemplate(row.id); }}>Publicar</Button> }]} data={templates} rowKey={(row) => row.id} searchable searchPlaceholder="Buscar template" pageSize={6} emptyMessage="Nenhum template cadastrado." />
            <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <Select label="Template" value={dispatchForm.templateId} onChange={(e) => setDispatchForm((current) => ({ ...current, templateId: e.target.value }))} options={templates.map((template) => ({ value: template.id, label: template.name }))} />
              <Input label="Destinatário" value={dispatchForm.recipient} onChange={(e) => setDispatchForm((current) => ({ ...current, recipient: e.target.value }))} placeholder="talentos@empresa.com" />
              <Input label="Event key" value={dispatchForm.eventKey} onChange={(e) => setDispatchForm((current) => ({ ...current, eventKey: e.target.value }))} />
              <div style={{ display: 'flex', alignItems: 'end' }}><Button onClick={() => { void dispatchTemplate(); }} loading={busy === 'dispatch'} disabled={!dispatchForm.templateId || !dispatchForm.recipient}>Disparar template</Button></div>
            </div>
            <DataTable columns={[{ key: 'recipient', header: 'Destinatário', render: (row: DispatchRow) => row.recipient }, { key: 'eventKey', header: 'Evento', render: (row: DispatchRow) => row.eventKey }, { key: 'channel', header: 'Canal', render: (row: DispatchRow) => row.channel }, { key: 'status', header: 'Status', render: (row: DispatchRow) => row.status }, { key: 'createdAt', header: 'Quando', render: (row: DispatchRow) => new Date(row.createdAt).toLocaleString('pt-BR') }]} data={dispatchAudit} rowKey={(row) => row.id} pageSize={5} emptyMessage="Nenhum dispatch auditado." />
          </> : <InlineMessage variant="warning">Seu perfil não possui acesso ao centro de comunicação.</InlineMessage>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Status operacional</CardTitle></CardHeader><CardContent>{health ? <><div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}><Badge variant={health.status === 'ok' ? 'success' : 'warning'}>{health.status}</Badge>{health.environment && <Badge variant="neutral">{health.environment}</Badge>}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing.md }}>{integrations.map(([key, value]) => <StatBox key={key} label={fmt(key)} value={value} />)}</div></> : <InlineMessage variant="warning">Não foi possível carregar o status das integrações.</InlineMessage>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Histórico administrativo</CardTitle></CardHeader><CardContent>{canManageTenant ? <DataTable columns={[{ key: 'action', header: 'Evento', render: (row: HistoryRow) => row.action ?? '-', searchValue: (row: HistoryRow) => row.action ?? '' }, { key: 'actorId', header: 'Ator', render: (row: HistoryRow) => row.actorId ?? '-' }, { key: 'createdAt', header: 'Quando', render: (row: HistoryRow) => row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '-' }]} data={history} rowKey={(row) => row.id} pageSize={5} emptyMessage="Nenhum evento administrativo registrado." /> : <InlineMessage variant="warning">Seu perfil não possui acesso ao histórico administrativo.</InlineMessage>}</CardContent></Card>
      </div>
    </PageContent>
  );
}
