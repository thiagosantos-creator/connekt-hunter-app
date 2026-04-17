import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { hasPermission } from '../services/rbac.js';
import type { Organization, Vacancy } from '../services/types.js';
import { VacancyWizard } from '../components/vacancies/VacancyWizard.js';
import { VacancyPreview } from '../components/vacancies/VacancyPreview.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  DataTable,
  InlineMessage,
  PageContent,
  PageHeader,
  StatBox,
  spacing,
  colors,
  radius,
  fontWeight,
  fontSize,
  Input,
  Select,
} from '@connekt/ui';

export function VacanciesView() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'vacancies:write');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  
  /* Wizard state */
  const [showWizard, setShowWizard] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);

  /* Magic Assistant state */
  const [showMagicStart, setShowMagicStart] = useState(false);
  const [magicForm, setMagicForm] = useState({
    title: '',
    seniority: 'Pleno',
    sector: '',
    workModel: 'Híbrido',
    location: ''
  });
  const [magicLoading, setMagicLoading] = useState(false);

  /* Preview state */
  const [previewVacancy, setPreviewVacancy] = useState<Vacancy | null>(null);

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((item) => ({
        value: item.id,
        label: item.tenantSettings?.publicName || item.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id: string) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  const stats = useMemo(() => {
    const total = vacancies.length;
    const published = vacancies.filter((item) => item.publicationType === 'public' && item.status === 'active').length;
    return { total, published };
  }, [vacancies]);

  const load = async () => {
    setLoading(true);
    try {
      const [vacanciesData, organizationsData] = await Promise.all([
        apiGet<Vacancy[]>('/vacancies'),
        apiGet<Organization[]>('/organizations').catch(() => []),
      ]);
      setVacancies(vacanciesData);
      setOrganizations(organizationsData);
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!orgId && orgOptions.length > 0) {
      setOrgId(orgOptions[0].value);
    }
  }, [orgId, orgOptions]);

  const handleWizardSave = async (formData: any) => {
    setLoading(true);
    try {
      const payload = {
        organizationId: orgId,
        ...formData,
        experienceYearsMin: formData.experienceYearsMin ? Number(formData.experienceYearsMin) : undefined,
        experienceYearsMax: formData.experienceYearsMax ? Number(formData.experienceYearsMax) : undefined,
        salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
      };

      if (editingVacancy && editingVacancy.id) {
        await apiPatch(`/vacancies/${editingVacancy.id}`, payload);
        setMsg('Vaga atualizada com sucesso.');
      } else {
        await apiPost('/vacancies', payload);
        setMsg('Vaga criada com sucesso.');
      }
      
      setMsgVariant('success');
      setShowWizard(false);
      setEditingVacancy(null);
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicGenerate = async () => {
    if (!magicForm.title) return;
    setMagicLoading(true);
    try {
      const aiResponse = await apiPost<any>('/vacancies/assist-content', magicForm);
      
      // Transform AI response to Wizard format
      const preFilledData = {
        ...magicForm,
        description: aiResponse.summary,
        requiredSkills: aiResponse.requiredSkills || [],
        desiredSkills: aiResponse.desiredSkills || [],
      };

      setEditingVacancy(null); // Clear editing to indicate new vacancy
      setEditingVacancy(preFilledData as any);
      setShowMagicStart(false);
      setShowWizard(true);
    } catch (err) {
      setMsg('Erro ao gerar conteúdo assistivo: ' + String(err));
      setMsgVariant('error');
    } finally {
      setMagicLoading(false);
    }
  };

  const executeStatusAction = async (vacancyId: string, action: string) => {
    try {
      const patchData: Record<string, any> = {};
      if (action === 'unpublish') patchData.publicationType = 'draft';
      else if (action === 'close') patchData.status = 'disabled';
      else if (action === 'freeze') patchData.status = 'frozen';
      else if (action === 'reopen') patchData.status = 'active';
      
      await apiPatch(`/vacancies/${vacancyId}`, patchData);
      setMsg('Status atualizado com sucesso.');
      setMsgVariant('success');
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao atualizar.');
      setMsgVariant('error');
    }
  };

  return (
    <PageContent style={{ maxWidth: 1400 }}>
      <PageHeader 
        title="Gestão de Vagas" 
        description="Visualize e gerencie o ciclo de vida das suas oportunidades."
        actions={canWrite && (
          <Button onClick={() => { setShowMagicStart(true); }}>
            ✚ Nova Vaga Assistida
          </Button>
        )}
      />

      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {/* Stats Premium */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.md, marginBottom: spacing.xl }}>
        <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, ${colors.surface}, #f8fafc)`, border: `1px solid ${colors.borderLight}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Total de Vagas</div>
          <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.total}</div>
        </div>
        <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #ecfdf5, #fff)`, border: `1px solid ${colors.successLight}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(16, 185, 129, 0.1)', width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
          <div style={{ fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Publicadas (Ativas)</div>
          <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.successDark }}>{stats.published}</div>
        </div>
      </div>

      <div style={{ background: colors.surface, borderRadius: radius.xl, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: `1px solid rgba(0,0,0,0.04)` }}>
        <div style={{ padding: 0 }}>
          <DataTable<Vacancy>
            data={vacancies}
            rowKey={(v) => v.id}
            searchable
            pageSize={15}
            columns={[
              { 
                key: 'title', 
                header: 'Vaga', 
                render: (v) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: fontWeight.bold, color: colors.text, fontSize: fontSize.md }}>{v.title}</span>
                    <span style={{ fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'capitalize' }}>
                      {v.seniority} • {v.sector}
                    </span>
                  </div>
                ) 
              },
              { key: 'organization', header: 'Empresa', render: (v) => (
                <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary }}>
                  {v.organization?.name || v.organizationId || '-'}
                </span>
              )},
              { key: 'dates', header: 'Datas Operacionais', render: (v) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textSecondary }}>
                    <span style={{ opacity: 0.7 }}>📅</span> {v.publishedAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(v.publishedAt)) : '—'}
                  </div>
                  {v.closedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: colors.textMuted }}>
                      <span style={{ opacity: 0.7 }}>🏁</span> {new Intl.DateTimeFormat('pt-BR').format(new Date(v.closedAt))}
                    </div>
                  )}
                </div>
              )},
              { key: 'status', header: 'Status', render: (v) => {
                const colorsMap: Record<string, 'success' | 'warning' | 'danger'> = {
                   active: 'success',
                   frozen: 'warning',
                   disabled: 'danger',
                };
                const labelsMap: Record<string, string> = {
                   active: 'Ativa',
                   frozen: 'Pausada',
                   disabled: 'Encerrada',
                };
                const variant = colorsMap[v.status ?? ''] || 'info';
                const label = labelsMap[v.status ?? ''] || v.status;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    <div style={{ 
                      width: 8, height: 8, borderRadius: '50%', 
                      background: v.status === 'active' ? colors.success : colors.textMuted,
                      boxShadow: v.status === 'active' ? `0 0 10px ${colors.success}88` : 'none'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Badge variant={variant} style={{ textTransform: 'capitalize', fontWeight: fontWeight.bold }}>{label}</Badge>
                      {v.publicationType === 'public' ? (
                        <span style={{ fontSize: 10, color: colors.successDark, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>🌐 Pública</span>
                      ) : (
                        <span style={{ fontSize: 10, color: colors.textTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>🔒 Privada</span>
                      )}
                    </div>
                  </div>
                );
              }},
              { key: 'actions', header: 'Ações', render: (v) => {
                const isPublic = v.publicationType === 'public' && v.status === 'active';
                const copyLink = async () => {
                  try {
                    const candidateUrl = import.meta.env.VITE_CANDIDATE_WEB_URL || 'http://localhost:5174';
                    await navigator.clipboard.writeText(`${candidateUrl}/vacancies/${v.id}`);
                    setMsg('Link de compartilhamento copiado!');
                    setMsgVariant('success');
                  } catch (e) {
                    setMsg('Falha ao copiar link.');
                    setMsgVariant('error');
                  }
                };
                return (
                  <div style={{ display: 'flex', gap: spacing.xs }}>
                    {isPublic && (
                      <>
                        <Button size="sm" variant="ghost" onClick={copyLink} title="Copiar Link Público">🔗</Button>
                        <Button size="sm" variant="ghost" as="a" href={`${import.meta.env.VITE_CANDIDATE_WEB_URL || 'http://localhost:5174'}/vacancies/${v.id}`} target="_blank" title="Abrir no Portal do Candidato">🌐</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setPreviewVacancy(v)} title="Preview Interno">👁️</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingVacancy(v); setShowWizard(true); }} title="Editar Vaga">✏️</Button>
                    {v.status === 'active' ? (
                      <Button size="sm" variant="ghost" onClick={() => executeStatusAction(v.id, 'close')} title="Encerrar Vaga">🚫</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => executeStatusAction(v.id, 'reopen')} title="Reabrir Vaga">✅</Button>
                    )}
                  </div>
                );
              }}
            ]}
          />
        </div>
      </div>

      {showWizard && (
        <VacancyWizard 
          organizations={organizations}
          orgId={orgId}
          setOrgId={setOrgId}
          initialData={editingVacancy}
          onClose={() => { setShowWizard(false); setEditingVacancy(null); }}
          onSave={handleWizardSave}
        />
      )}

      {showMagicStart && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)', padding: spacing.md
        }}>
          <Card style={{ width: '100%', maxWidth: 500 }}>
            <CardHeader>
              <CardTitle>Início Mágico com IA</CardTitle>
              <CardDescription>Diga-nos o básico e a IA construirá toda a vaga para você.</CardDescription>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.md }}>
              <Input 
                label="Título do Cargo" 
                placeholder="Ex: Desenvolvedor Senior" 
                value={magicForm.title} 
                onChange={e => setMagicForm(f => ({ ...f, title: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Select 
                  label="Senioridade" 
                  value={magicForm.seniority}
                  onChange={e => setMagicForm(f => ({ ...f, seniority: e.target.value }))}
                  options={[{value:'junior', label:'Junior'}, {value:'pleno', label:'Pleno'}, {value:'senior', label:'Senior'}, {value:'especialista', label:'Especialista'}]}
                />
                <Input 
                  label="Setor" 
                  placeholder="Ex: Tecnologia" 
                  value={magicForm.sector} 
                  onChange={e => setMagicForm(f => ({ ...f, sector: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Select 
                  label="Modelo" 
                  value={magicForm.workModel}
                  onChange={e => setMagicForm(f => ({ ...f, workModel: e.target.value }))}
                  options={[{value:'remote', label:'Remoto'}, {value:'hybrid', label:'Híbrido'}, {value:'onsite', label:'Presencial'}]}
                />
                <Input 
                  label="Localização" 
                  placeholder="Ex: São Paulo, SP" 
                  value={magicForm.location} 
                  onChange={e => setMagicForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                <Button fullWidth loading={magicLoading} onClick={handleMagicGenerate} disabled={!magicForm.title}>
                  ✨ Gerar Vaga Completa
                </Button>
                <Button fullWidth variant="ghost" onClick={() => setShowMagicStart(false)}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {previewVacancy && (
        <VacancyPreview 
          vacancy={previewVacancy}
          organization={organizations.find(o => o.id === previewVacancy.organizationId)}
          onClose={() => setPreviewVacancy(null)}
        />
      )}
    </PageContent>
  );
}
