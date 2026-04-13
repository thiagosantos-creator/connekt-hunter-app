import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { hasPermission } from '../services/rbac.js';
import type { Vacancy, VacancyAssistSuggestion, VacancyTemplate } from '../services/types.js';
import {
  Button,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  DataTable,
  PageHeader,
  PageContent,
  InlineMessage,
  EmptyState,
  Badge,
  spacing,
} from '@connekt/ui';

export function VacanciesView() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [templates, setTemplates] = useState<VacancyTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [suggestion, setSuggestion] = useState<VacancyAssistSuggestion | null>(null);
  const [orgId, setOrgId] = useState(() => user?.organizationIds?.[0] ?? '');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    workModel: 'remote',
    seniority: 'pleno',
    sector: '',
    experienceYearsMin: '',
    experienceYearsMax: '',
    employmentType: 'clt',
    publicationType: 'draft',
    status: 'active',
    department: '',
    requiredSkills: '',
    desiredSkills: '',
    salaryMin: '',
    salaryMax: '',
  });

  const canWrite = hasPermission(user, 'vacancies:write');
  const orgOptions = user?.organizationIds?.map((id: string) => ({ value: id, label: id })) ?? [];

  const load = async () => {
    try {
      const [vacanciesData, templatesData] = await Promise.all([
        apiGet<Vacancy[]>('/vacancies'),
        apiGet<VacancyTemplate[]>('/vacancy-templates'),
      ]);
      setVacancies(vacanciesData);
      setTemplates(templatesData);
    } catch {
      /* ignored */
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost('/vacancies', {
        organizationId: orgId,
        ...form,
        requiredSkills: form.requiredSkills.split(',').map((v) => v.trim()).filter(Boolean),
        desiredSkills: form.desiredSkills.split(',').map((v) => v.trim()).filter(Boolean),
        experienceYearsMin: form.experienceYearsMin ? Number(form.experienceYearsMin) : undefined,
        experienceYearsMax: form.experienceYearsMax ? Number(form.experienceYearsMax) : undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      });
      setForm({
        ...form,
        title: '',
        description: '',
        location: '',
        sector: '',
        experienceYearsMin: '',
        experienceYearsMax: '',
        department: '',
        requiredSkills: '',
        desiredSkills: '',
        salaryMin: '',
        salaryMax: '',
      });
      setSuggestion(null);
      setMsg('Vaga criada com sucesso!');
      setMsgVariant('success');
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      const defaults = await apiPost<Partial<Vacancy>>(`/vacancy-templates/${selectedTemplateId}/apply`, {});
      setForm((prev) => ({
        ...prev,
        title: String(defaults.title ?? prev.title),
        description: String(defaults.description ?? prev.description),
        location: String(defaults.location ?? prev.location),
        workModel: String(defaults.workModel ?? prev.workModel),
        seniority: String(defaults.seniority ?? prev.seniority),
        sector: String(defaults.sector ?? prev.sector),
        employmentType: String(defaults.employmentType ?? prev.employmentType),
        publicationType: String(defaults.publicationType ?? prev.publicationType),
        status: String(defaults.status ?? prev.status),
        department: String(defaults.department ?? prev.department),
        requiredSkills: Array.isArray(defaults.requiredSkills) ? defaults.requiredSkills.join(', ') : prev.requiredSkills,
        desiredSkills: Array.isArray(defaults.desiredSkills) ? defaults.desiredSkills.join(', ') : prev.desiredSkills,
      }));
      setMsg('Template aplicado em 1 clique. VocÃª pode ajustar antes de publicar.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const generateSuggestion = async () => {
    try {
      const ai = await apiPost<VacancyAssistSuggestion>('/vacancies/assist-content', {
        title: form.title,
        seniority: form.seniority,
        sector: form.sector || form.department || 'geral',
        workModel: form.workModel,
        location: form.location,
      });
      setSuggestion(ai);
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const acceptSuggestionSection = (section: 'summary' | 'requiredSkills' | 'desiredSkills') => {
    if (!suggestion) return;
    if (section === 'summary') setForm((prev) => ({ ...prev, description: suggestion.summary }));
    if (section === 'requiredSkills') setForm((prev) => ({ ...prev, requiredSkills: suggestion.requiredSkills.join(', ') }));
    if (section === 'desiredSkills') setForm((prev) => ({ ...prev, desiredSkills: suggestion.desiredSkills.join(', ') }));
  };

  return (
    <PageContent>
      <PageHeader title="Vagas" />

      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {canWrite && (
        <Card style={{ marginBottom: spacing.lg }}>
          <form onSubmit={(e) => { void create(e); }}>
            <CardHeader><CardTitle>Criar Vaga PublicÃ¡vel</CardTitle></CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {orgOptions.length > 1 ? <Select label="OrganizaÃ§Ã£o" value={orgId} onChange={(e) => setOrgId(e.target.value)} options={orgOptions} required /> : <Input label="ID da OrganizaÃ§Ã£o" value={orgId} onChange={(e) => setOrgId(e.target.value)} />}

              <Select label="Template de vaga" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} options={[{ value: '', label: 'Selecione um template' }, ...templates.filter((t) => t.organizationId === orgId).map((t) => ({ value: t.id, label: `${t.name} (${t.role})` }))]} />
              <Button type="button" variant="secondary" onClick={() => { void applyTemplate(); }} disabled={!selectedTemplateId}>Aplicar template</Button>

              <Input label="TÃ­tulo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Textarea label="DescriÃ§Ã£o" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <Input label="LocalizaÃ§Ã£o" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Select label="Modalidade" value={form.workModel} onChange={(e) => setForm({ ...form, workModel: e.target.value })} options={[{ value: 'onsite', label: 'Presencial' }, { value: 'hybrid', label: 'HÃ­brido' }, { value: 'remote', label: 'Remoto' }]} />
              <Select label="Senioridade" value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })} options={[{ value: 'junior', label: 'JÃºnior' }, { value: 'pleno', label: 'Pleno' }, { value: 'senior', label: 'SÃªnior' }]} />
              <Input label="Setor" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              <Input label="ExperiÃªncia mÃ­nima (anos)" type="number" value={form.experienceYearsMin} onChange={(e) => setForm({ ...form, experienceYearsMin: e.target.value })} />
              <Input label="ExperiÃªncia mÃ¡xima (anos)" type="number" value={form.experienceYearsMax} onChange={(e) => setForm({ ...form, experienceYearsMax: e.target.value })} />
              <Select label="Tipo de contrataÃ§Ã£o" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} options={[{ value: 'clt', label: 'CLT' }, { value: 'pj', label: 'PJ' }, { value: 'contract', label: 'Contrato' }, { value: 'intern', label: 'EstÃ¡gio' }]} />
              <Select label="Tipo de publicaÃ§Ã£o" value={form.publicationType} onChange={(e) => setForm({ ...form, publicationType: e.target.value })} options={[{ value: 'restricted', label: 'Restrita' }, { value: 'public', label: 'PÃºblica' }, { value: 'draft', label: 'Rascunho' }, { value: 'confidential', label: 'Confidencial' }]} />
              <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Ativo' }, { value: 'expired', label: 'Expirado' }, { value: 'frozen', label: 'Congelado' }, { value: 'disabled', label: 'Desativada' }]} />
              <Input label="Departamento/Ã¡rea interna" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <Input label="Skills obrigatÃ³rias (csv)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
              <Input label="Skills desejÃ¡veis (csv)" value={form.desiredSkills} onChange={(e) => setForm({ ...form, desiredSkills: e.target.value })} />

              <Button type="button" variant="secondary" onClick={() => { void generateSuggestion(); }}>
                Sugerir conteÃºdo com IA
              </Button>

              {suggestion && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview IA</CardTitle>
                    <Badge variant="warning">RevisÃ£o humana obrigatÃ³ria</Badge>
                  </CardHeader>
                  <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <p><strong>Resumo:</strong> {suggestion.summary}</p>
                    <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('summary')}>Aceitar resumo</Button>
                    <p><strong>ObrigatÃ³rios:</strong> {suggestion.requiredSkills.join(', ')}</p>
                    <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('requiredSkills')}>Aceitar obrigatÃ³rios</Button>
                    <p><strong>DesejÃ¡veis:</strong> {suggestion.desiredSkills.join(', ')}</p>
                    <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('desiredSkills')}>Aceitar desejÃ¡veis</Button>
                  </CardContent>
                </Card>
              )}

              <Input label="Faixa salarial mÃ­nima" type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
              <Input label="Faixa salarial mÃ¡xima" type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </CardContent>
            <CardFooter><Button type="submit" loading={loading}>{loading ? 'Criando…' : 'Criar vaga'}</Button></CardFooter>
          </form>
        </Card>
      )}

      {vacancies.length === 0 ? (
        <EmptyState title="Nenhuma vaga cadastrada" description={canWrite ? 'Crie a primeira vaga acima.' : 'Nenhuma vaga disponÃ­vel.'} />
      ) : (
        <DataTable<Vacancy>
          columns={[
            { key: 'title', header: 'TÃ­tulo', render: (row: Vacancy) => row.title },
            { key: 'organizationId', header: 'OrganizaÃ§Ã£o', render: (row: Vacancy) => row.organization?.name ?? row.organizationId },
            { key: 'sector', header: 'Setor', render: (row: Vacancy) => row.sector ?? row.department ?? '-' },
            { key: 'workModel', header: 'Modalidade', render: (row: Vacancy) => row.workModel ?? '-' },
            { key: 'publicationType', header: 'PublicaÃ§Ã£o', render: (row: Vacancy) => row.publicationType ?? '-' },
            { key: 'ready', header: 'Pronta?', render: (row: Vacancy) => row.publicationReady ? 'Sim' : `NÃ£o (${row.publicationMissingFields?.join(', ') ?? '-'})` },
          ]}
          data={vacancies}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma vaga cadastrada"
        />
      )}
    </PageContent>
  );
}
