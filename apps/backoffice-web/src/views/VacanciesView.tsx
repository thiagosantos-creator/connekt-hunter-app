import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { hasPermission } from '../services/rbac.js';
import type { Organization, Vacancy, VacancyAssistSuggestion, VacancyTemplate } from '../services/types.js';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  Select,
  StatBox,
  Textarea,
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
  zIndex,
} from '@connekt/ui';

type VacancyForm = {
  title: string;
  description: string;
  location: string;
  workModel: string;
  seniority: string;
  sector: string;
  experienceYearsMin: string;
  experienceYearsMax: string;
  employmentType: string;
  publicationType: string;
  status: string;
  department: string;
  requiredSkills: string[];
  desiredSkills: string[];
  salaryMin: string;
  salaryMax: string;
};

type TemplateForm = {
  name: string;
  role: string;
  sector: string;
  status: 'draft' | 'active' | 'archived';
  isFavorite: boolean;
};

const candidateWebBase = import.meta.env.VITE_CANDIDATE_WEB_URL ?? 'http://localhost:5174';
const MS_PER_DAY = 86_400_000;

const emptyVacancyForm = (): VacancyForm => ({
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
  requiredSkills: [],
  desiredSkills: [],
  salaryMin: '',
  salaryMax: '',
});

const emptyTemplateForm = (): TemplateForm => ({
  name: '',
  role: '',
  sector: '',
  status: 'draft',
  isFavorite: false,
});

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSkills(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function missingFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Título',
    description: 'Descrição',
    location: 'Localização',
    workModel: 'Modalidade',
    seniority: 'Senioridade',
    sector: 'Setor',
    employmentType: 'Tipo de contratação',
    requiredSkills: 'Skills obrigatórias',
    experienceRange: 'Faixa de experiência',
  };
  return labels[field] ?? field;
}

function buildVacancyPayload(orgId: string, form: VacancyForm) {
  return {
    organizationId: orgId,
    title: form.title,
    description: form.description,
    location: form.location,
    workModel: form.workModel,
    seniority: form.seniority,
    sector: form.sector,
    experienceYearsMin: toNumber(form.experienceYearsMin),
    experienceYearsMax: toNumber(form.experienceYearsMax),
    employmentType: form.employmentType,
    publicationType: form.publicationType,
    status: form.status,
    department: form.department,
    requiredSkills: normalizeSkills(form.requiredSkills),
    desiredSkills: normalizeSkills(form.desiredSkills),
    salaryMin: toNumber(form.salaryMin),
    salaryMax: toNumber(form.salaryMax),
  };
}

function SkillField({
  label,
  values,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
}: {
  label: string;
  values: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      <label style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{label}</label>
      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input
            label=""
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Digite uma skill e clique em adicionar"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={onAdd}>Adicionar skill</Button>
      </div>
      {values.length > 0 && (
        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
          {values.map((skill) => (
            <span
              key={skill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing.xs,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                borderRadius: radius.full,
                background: colors.surfaceAlt,
                border: `1px solid ${colors.border}`,
                fontSize: fontSize.sm,
              }}
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemove(skill)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  padding: 0,
                  lineHeight: 1,
                }}
                aria-label={`Remover ${skill}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VacanciesView() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, 'vacancies:write');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [templates, setTemplates] = useState<VacancyTemplate[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [suggestion, setSuggestion] = useState<VacancyAssistSuggestion | null>(null);
  const [orgId, setOrgId] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<VacancyForm>(emptyVacancyForm);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [requiredSkillInput, setRequiredSkillInput] = useState('');
  const [desiredSkillInput, setDesiredSkillInput] = useState('');
  const [editingVacancyId, setEditingVacancyId] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ vacancyId: string; action: string; label: string } | null>(null);

  // Auto-trigger AI suggestion when title + seniority are filled (debounce 2s)
  const autoSuggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSuggestRef = useRef('');

  const triggerAutoSuggest = useCallback(async () => {
    const key = `${form.title}|${form.seniority}|${form.sector || form.department}`;
    if (key === lastAutoSuggestRef.current) return;
    lastAutoSuggestRef.current = key;
    try {
      const ai = await apiPost<VacancyAssistSuggestion>('/vacancies/assist-content', {
        title: form.title,
        seniority: form.seniority,
        sector: form.sector || form.department || 'geral',
        workModel: form.workModel,
        location: form.location,
      });
      setSuggestion(ai);
    } catch {
      // Silent failure for auto-suggest
    }
  }, [form.title, form.seniority, form.sector, form.department, form.workModel, form.location]);

  useEffect(() => {
    if (!showCreateForm || editingVacancyId) return;
    if (!form.title.trim() || !form.seniority.trim()) return;
    if (suggestion) return; // Don't re-trigger if suggestion already exists

    if (autoSuggestTimerRef.current) clearTimeout(autoSuggestTimerRef.current);
    autoSuggestTimerRef.current = setTimeout(() => {
      void triggerAutoSuggest();
    }, 2000);

    return () => {
      if (autoSuggestTimerRef.current) clearTimeout(autoSuggestTimerRef.current);
    };
  }, [form.title, form.seniority, showCreateForm, editingVacancyId, suggestion, triggerAutoSuggest]);

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((item) => ({
        value: item.id,
        label: item.tenantSettings?.publicName || item.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id: string) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  const filteredTemplates = useMemo(
    () => templates.filter((item) => item.organizationId === orgId),
    [templates, orgId],
  );

  const publishedVacancies = useMemo(
    () => vacancies.filter((item) => item.publicationType === 'public' && item.status === 'active'),
    [vacancies],
  );

  const draftVacancies = useMemo(
    () => vacancies.filter((item) => item.publicationType === 'draft'),
    [vacancies],
  );

  const closedVacancies = useMemo(
    () => vacancies.filter((item) => item.status === 'disabled' || item.status === 'expired'),
    [vacancies],
  );

  const guaranteeVacancies = useMemo(
    () => vacancies.filter((item) => item.guaranteeEndDate && new Date(item.guaranteeEndDate) > new Date()),
    [vacancies],
  );

  const avgClosingDays = useMemo(() => {
    const closed = vacancies.filter((v) => v.closedAt && v.publishedAt);
    if (closed.length === 0) return 0;
    const totalDays = closed.reduce((sum, v) => {
      const diff = new Date(v.closedAt!).getTime() - new Date(v.publishedAt!).getTime();
      return sum + diff / MS_PER_DAY;
    }, 0);
    return Math.round(totalDays / closed.length);
  }, [vacancies]);

  const load = async () => {
    try {
      const [vacanciesData, templatesData, organizationsData] = await Promise.all([
        apiGet<Vacancy[]>('/vacancies'),
        apiGet<VacancyTemplate[]>('/vacancy-templates'),
        apiGet<Organization[]>('/organizations').catch(() => []),
      ]);
      setVacancies(vacanciesData);
      setTemplates(templatesData);
      setOrganizations(organizationsData);
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!orgId && orgOptions.length > 0) {
      setOrgId(orgOptions[0].value);
    }
  }, [orgId, orgOptions]);

  const addSkill = (type: 'requiredSkills' | 'desiredSkills') => {
    const currentInput = type === 'requiredSkills' ? requiredSkillInput : desiredSkillInput;
    const normalized = currentInput.trim();
    if (!normalized) return;
    setForm((current) => ({
      ...current,
      [type]: normalizeSkills([...(current[type] ?? []), normalized]),
    }));
    if (type === 'requiredSkills') setRequiredSkillInput('');
    if (type === 'desiredSkills') setDesiredSkillInput('');
  };

  const removeSkill = (type: 'requiredSkills' | 'desiredSkills', value: string) => {
    setForm((current) => ({
      ...current,
      [type]: current[type].filter((item) => item !== value),
    }));
  };

  const applyVacancyDefaults = (defaults: Partial<Vacancy>) => {
    setForm((current) => ({
      ...current,
      title: String(defaults.title ?? current.title),
      description: String(defaults.description ?? current.description),
      location: String(defaults.location ?? current.location),
      workModel: String(defaults.workModel ?? current.workModel),
      seniority: String(defaults.seniority ?? current.seniority),
      sector: String(defaults.sector ?? current.sector),
      experienceYearsMin: defaults.experienceYearsMin != null ? String(defaults.experienceYearsMin) : current.experienceYearsMin,
      experienceYearsMax: defaults.experienceYearsMax != null ? String(defaults.experienceYearsMax) : current.experienceYearsMax,
      employmentType: String(defaults.employmentType ?? current.employmentType),
      publicationType: String(defaults.publicationType ?? current.publicationType),
      status: String(defaults.status ?? current.status),
      department: String(defaults.department ?? current.department),
      requiredSkills: Array.isArray(defaults.requiredSkills) ? normalizeSkills(defaults.requiredSkills) : current.requiredSkills,
      desiredSkills: Array.isArray(defaults.desiredSkills) ? normalizeSkills(defaults.desiredSkills) : current.desiredSkills,
      salaryMin: defaults.salaryMin != null ? String(defaults.salaryMin) : current.salaryMin,
      salaryMax: defaults.salaryMax != null ? String(defaults.salaryMax) : current.salaryMax,
    }));
  };

  const createVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setMsg('Selecione uma empresa antes de criar a vaga.');
      setMsgVariant('error');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/vacancies', buildVacancyPayload(orgId, form));
      setForm(emptyVacancyForm());
      setRequiredSkillInput('');
      setDesiredSkillInput('');
      setSuggestion(null);
      setMsg('Vaga criada com sucesso.');
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
      applyVacancyDefaults(defaults);
      setMsg('Template aplicado. Você pode ajustar os campos antes de salvar a vaga.');
      setMsgVariant('success');
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const editTemplate = () => {
    const template = filteredTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      role: template.role,
      sector: template.sector,
      status: template.status,
      isFavorite: template.isFavorite,
    });
    applyVacancyDefaults(template.defaultFields);
    setMsg('Template carregado para edição.');
    setMsgVariant('success');
  };

  const resetTemplateEditor = () => {
    setEditingTemplateId('');
    setSelectedTemplateId('');
    setTemplateForm(emptyTemplateForm());
  };

  const saveTemplate = async () => {
    if (!orgId) {
      setMsg('Selecione uma empresa antes de salvar o template.');
      setMsgVariant('error');
      return;
    }
    if (!templateForm.name.trim() || !(templateForm.sector.trim() || form.sector.trim()) || !templateForm.role.trim()) {
      setMsg('Preencha nome, setor e função do template.');
      setMsgVariant('error');
      return;
    }

    setTemplateSaving(true);
    try {
      const payload = {
        organizationId: orgId,
        name: templateForm.name.trim(),
        sector: templateForm.sector.trim() || form.sector.trim(),
        role: templateForm.role.trim(),
        status: templateForm.status,
        isFavorite: templateForm.isFavorite,
        defaultFields: buildVacancyPayload(orgId, form),
      };

      if (editingTemplateId) {
        await apiPatch(`/vacancy-templates/${editingTemplateId}`, payload);
        setMsg('Template atualizado com sucesso.');
      } else {
        await apiPost('/vacancy-templates', payload);
        setMsg('Template criado com sucesso.');
      }

      setMsgVariant('success');
      resetTemplateEditor();
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setTemplateSaving(false);
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
    if (section === 'summary') {
      setForm((current) => ({ ...current, description: suggestion.summary }));
      return;
    }
    if (section === 'requiredSkills') {
      setForm((current) => ({ ...current, requiredSkills: normalizeSkills(suggestion.requiredSkills) }));
      return;
    }
    setForm((current) => ({ ...current, desiredSkills: normalizeSkills(suggestion.desiredSkills) }));
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(successMessage);
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const startEditVacancy = (vacancy: Vacancy) => {
    setEditingVacancyId(vacancy.id);
    setForm({
      title: vacancy.title ?? '',
      description: vacancy.description ?? '',
      location: vacancy.location ?? '',
      workModel: vacancy.workModel ?? 'remote',
      seniority: vacancy.seniority ?? 'pleno',
      sector: vacancy.sector ?? '',
      experienceYearsMin: vacancy.experienceYearsMin != null ? String(vacancy.experienceYearsMin) : '',
      experienceYearsMax: vacancy.experienceYearsMax != null ? String(vacancy.experienceYearsMax) : '',
      employmentType: vacancy.employmentType ?? 'clt',
      publicationType: vacancy.publicationType ?? 'draft',
      status: vacancy.status ?? 'active',
      department: vacancy.department ?? '',
      requiredSkills: Array.isArray(vacancy.requiredSkills) ? vacancy.requiredSkills : [],
      desiredSkills: Array.isArray(vacancy.desiredSkills) ? vacancy.desiredSkills : [],
      salaryMin: vacancy.salaryMin != null ? String(vacancy.salaryMin) : '',
      salaryMax: vacancy.salaryMax != null ? String(vacancy.salaryMax) : '',
    });
    if (vacancy.organizationId) setOrgId(vacancy.organizationId);
    setShowCreateForm(true);
    setRequiredSkillInput('');
    setDesiredSkillInput('');
    setSuggestion(null);
  };

  const cancelEdit = () => {
    setEditingVacancyId('');
    setForm(emptyVacancyForm());
    setRequiredSkillInput('');
    setDesiredSkillInput('');
    setSuggestion(null);
  };

  const saveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVacancyId) {
      setLoading(true);
      try {
        await apiPatch(`/vacancies/${editingVacancyId}`, buildVacancyPayload(orgId, form));
        cancelEdit();
        setMsg('Vaga atualizada com sucesso.');
        setMsgVariant('success');
        await load();
      } catch (err) {
        setMsg(String(err));
        setMsgVariant('error');
      } finally {
        setLoading(false);
      }
    } else {
      await createVacancy(e);
    }
  };

  const executeStatusAction = async (vacancyId: string, action: string) => {
    try {
      const patchData: Record<string, unknown> = {};
      if (action === 'unpublish') {
        patchData.publicationType = 'draft';
      } else if (action === 'close') {
        patchData.status = 'disabled';
      } else if (action === 'freeze') {
        patchData.status = 'frozen';
      } else if (action === 'reopen') {
        patchData.status = 'active';
      }
      await apiPatch(`/vacancies/${vacancyId}`, patchData);
      const labels: Record<string, string> = {
        unpublish: 'Vaga despublicada.',
        close: 'Vaga fechada com sucesso.',
        freeze: 'Vaga congelada.',
        reopen: 'Vaga reaberta com sucesso.',
      };
      setMsg(labels[action] ?? 'Status atualizado.');
      setMsgVariant('success');
      setConfirmAction(null);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao atualizar status.');
      setMsgVariant('error');
      setConfirmAction(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const guaranteeDaysLeft = (iso?: string) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / MS_PER_DAY);
  };

  const closingTimeDays = (publishedAt?: string, closedAt?: string) => {
    if (!publishedAt || !closedAt) return null;
    const diff = new Date(closedAt).getTime() - new Date(publishedAt).getTime();
    return Math.round(diff / MS_PER_DAY);
  };

  return (
    <PageContent>
      <PageHeader title="Vagas" description="Gerencie e publique vagas. Use o formulário abaixo para criar novas vagas com apoio de IA." />

      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {/* ── Stats summary ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: spacing.lg }}>
        <StatBox label="Total de vagas" value={vacancies.length} />
        <StatBox label="Publicadas" value={publishedVacancies.length} subtext="Ativas e prontas" />
        <StatBox label="Rascunhos" value={draftVacancies.length} subtext="Pendentes de revisão" />
        <StatBox label="Fechadas" value={closedVacancies.length} subtext="Desativadas ou expiradas" />
        <StatBox label="Em Garantia" value={guaranteeVacancies.length} subtext="Dentro dos 90 dias" />
        <StatBox label="Tempo médio" value={`${avgClosingDays}d`} subtext="Dias para fechamento" />
      </div>

      {/* ── All vacancies table (primary view) ────────────────────── */}
      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader>
          <CardTitle>Todas as vagas</CardTitle>
          <CardDescription>Visualize, pesquise e publique vagas cadastradas para a sua empresa.</CardDescription>
        </CardHeader>
        <CardContent style={{ paddingTop: 0 }}>
          {vacancies.length === 0 ? (
            <EmptyState
              title="Nenhuma vaga cadastrada"
              description={canWrite ? 'Clique em "Nova vaga" abaixo para criar a primeira.' : 'Nenhuma vaga disponível no momento.'}
            />
          ) : (
            <DataTable<Vacancy>
              columns={[
                { key: 'title', header: 'Título', render: (row) => row.title },
                { key: 'organizationId', header: 'Empresa', render: (row) => row.organization?.name ?? row.organizationId },
                { key: 'sector', header: 'Setor', render: (row) => row.sector ?? row.department ?? '-' },
                { key: 'status', header: 'Status', render: (row) => {
                  const statusLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
                    active: { label: 'Ativa', variant: 'success' },
                    frozen: { label: 'Congelada', variant: 'warning' },
                    disabled: { label: 'Fechada', variant: 'danger' },
                    expired: { label: 'Expirada', variant: 'danger' },
                  };
                  const statusConfig = statusLabels[row.status ?? 'active'] ?? { label: row.status ?? '-', variant: 'info' as const };
                  return <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>;
                }},
                { key: 'publicationType', header: 'Publicação', render: (row) => row.publicationType ?? '-' },
                { key: 'publishedAt', header: 'Aberta em', render: (row) => formatDate(row.publishedAt) },
                { key: 'closedAt', header: 'Fechada em', render: (row) => formatDate(row.closedAt) },
                { key: 'guarantee', header: 'Garantia', render: (row) => {
                  const days = guaranteeDaysLeft(row.guaranteeEndDate);
                  if (days === null) return '-';
                  if (days <= 0) return <Badge variant="danger" size="sm">Expirada</Badge>;
                  return <Badge variant={days <= 15 ? 'warning' : 'success'} size="sm">{days}d restantes</Badge>;
                }},
                { key: 'closingTime', header: 'Tempo fech.', render: (row) => {
                  const days = closingTimeDays(row.publishedAt, row.closedAt);
                  if (days === null) return '-';
                  return `${days}d`;
                }},
                {
                  key: 'publicUrl',
                  header: 'Link',
                  render: (row) => {
                    const publicUrl = `${candidateWebBase}/vacancies/${row.id}`;
                    const canShare = row.publicationType === 'public' && row.publicationReady;
                    if (!canShare) return <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Indisponível</span>;
                    return (
                      <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                        <a href={publicUrl} target="_blank" rel="noreferrer">Abrir</a>
                        <Button size="sm" variant="ghost" onClick={() => { void copyText(publicUrl, 'Link da vaga copiado.'); }}>
                          Copiar
                        </Button>
                      </div>
                    );
                  },
                },
                ...(canWrite ? [{
                  key: 'actions',
                  header: 'Ações',
                  render: (row: Vacancy) => {
                    const isDraft = row.publicationType === 'draft';
                    const isReady = row.publicationReady;
                    const isActive = row.status === 'active';
                    const isPublished = !isDraft && isActive;
                    const isClosed = row.status === 'disabled' || row.status === 'expired';
                    const isFrozen = row.status === 'frozen';
                    return (
                      <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                        <Button size="sm" variant="outline" onClick={() => startEditVacancy(row)}>
                          ✏️ Editar
                        </Button>
                        {isDraft && isReady && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => {
                              void apiPatch(`/vacancies/${row.id}`, { publicationType: 'public' })
                                .then(() => { setMsg('Vaga publicada com sucesso!'); setMsgVariant('success'); return load(); })
                                .catch((err) => { setMsg(err instanceof Error ? err.message : 'Erro ao publicar vaga.'); setMsgVariant('error'); });
                            }}
                          >
                            Publicar
                          </Button>
                        )}
                        {isDraft && !isReady && (
                          <Badge variant="warning" size="sm">Campos faltando</Badge>
                        )}
                        {isPublished && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ vacancyId: row.id, action: 'unpublish', label: `Despublicar "${row.title}"` })}>
                              Despublicar
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setConfirmAction({ vacancyId: row.id, action: 'close', label: `Fechar "${row.title}"` })}>
                              Fechar
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmAction({ vacancyId: row.id, action: 'freeze', label: `Congelar "${row.title}"` })}>
                              Congelar
                            </Button>
                          </>
                        )}
                        {(isClosed || isFrozen) && (
                          <Button size="sm" variant="success" onClick={() => setConfirmAction({ vacancyId: row.id, action: 'reopen', label: `Reabrir "${row.title}"` })}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    );
                  },
                }] : []),
              ]}
              data={vacancies}
              rowKey={(row) => row.id}
              emptyMessage="Nenhuma vaga cadastrada"
              searchable
              searchPlaceholder="Buscar vaga por título, empresa ou setor"
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Create/Edit vacancy (collapsible) ─────────────────────── */}
      {canWrite && (
        <Card style={{ marginBottom: spacing.lg }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
              <div>
                <CardTitle>{editingVacancyId ? '✏️ Editar vaga' : 'Nova vaga'}</CardTitle>
                <CardDescription>{editingVacancyId ? 'Altere os dados da vaga e salve as mudanças.' : 'Crie uma nova vaga com preenchimento manual ou assistido por IA.'}</CardDescription>
              </div>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                {editingVacancyId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancelar edição
                  </Button>
                )}
                <Button
                  type="button"
                  variant={showCreateForm ? 'outline' : 'secondary'}
                  onClick={() => { if (editingVacancyId) cancelEdit(); setShowCreateForm((v) => !v); }}
                >
                  {showCreateForm ? '▲ Fechar formulário' : '✚ Criar nova vaga'}
                </Button>
              </div>
            </div>
          </CardHeader>
          {showCreateForm && (
            <form onSubmit={(e) => { void saveVacancy(e); }}>
              <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {orgOptions.length > 0 ? (
                  <Select
                    label="Empresa"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    options={orgOptions}
                    placeholder="Selecione a empresa"
                    required
                  />
                ) : (
                  <InlineMessage variant="warning">Nenhuma empresa disponível para este usuário.</InlineMessage>
                )}

                {/* ── AI assist — shown early so it's visible ─── */}
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <strong>✨ Preencher com IA</strong>
                    <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
                      Informe título, senioridade e setor e deixe a IA sugerir descrição e skills. Você revisa antes de salvar.
                    </div>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => { void generateSuggestion(); }} disabled={!form.title.trim() || !form.seniority.trim() || !(form.sector.trim() || form.department.trim())}>
                    Sugerir conteúdo com IA
                  </Button>
                </div>

                <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <Select
                    label="Template de vaga"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    options={[
                      { value: '', label: filteredTemplates.length > 0 ? 'Selecione um template' : 'Nenhum template disponível' },
                      ...filteredTemplates.map((item) => ({ value: item.id, label: `${item.name} (${item.role})` })),
                    ]}
                  />
                  <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Button type="button" variant="secondary" onClick={() => { void applyTemplate(); }} disabled={!selectedTemplateId}>Aplicar template</Button>
                    <Button type="button" variant="outline" onClick={editTemplate} disabled={!selectedTemplateId}>Editar template</Button>
                    <Button type="button" variant="ghost" onClick={resetTemplateEditor}>Novo template</Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  <Input label="Título" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required />
                  <Input label="Localização" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
                  <Select label="Modalidade" value={form.workModel} onChange={(e) => setForm((current) => ({ ...current, workModel: e.target.value }))} options={[{ value: 'onsite', label: 'Presencial' }, { value: 'hybrid', label: 'Híbrido' }, { value: 'remote', label: 'Remoto' }]} />
                  <Select label="Senioridade" value={form.seniority} onChange={(e) => setForm((current) => ({ ...current, seniority: e.target.value }))} options={[{ value: 'junior', label: 'Júnior' }, { value: 'pleno', label: 'Pleno' }, { value: 'senior', label: 'Sênior' }]} />
                  <Input label="Setor" value={form.sector} onChange={(e) => setForm((current) => ({ ...current, sector: e.target.value }))} />
                  <Input label="Departamento / área interna" value={form.department} onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))} />
                  <Input label="Experiência mínima (anos)" type="number" value={form.experienceYearsMin} onChange={(e) => setForm((current) => ({ ...current, experienceYearsMin: e.target.value }))} />
                  <Input label="Experiência máxima (anos)" type="number" value={form.experienceYearsMax} onChange={(e) => setForm((current) => ({ ...current, experienceYearsMax: e.target.value }))} />
                  <Select label="Tipo de contratação" value={form.employmentType} onChange={(e) => setForm((current) => ({ ...current, employmentType: e.target.value }))} options={[{ value: 'clt', label: 'CLT' }, { value: 'pj', label: 'PJ' }, { value: 'contract', label: 'Contrato' }, { value: 'intern', label: 'Estágio' }]} />
                  <Select label="Publicação" value={form.publicationType} onChange={(e) => setForm((current) => ({ ...current, publicationType: e.target.value }))} options={[{ value: 'draft', label: 'Rascunho' }, { value: 'restricted', label: 'Restrita' }, { value: 'public', label: 'Pública' }, { value: 'confidential', label: 'Confidencial' }]} />
                  <Select label="Status" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'expired', label: 'Expirada' }, { value: 'frozen', label: 'Congelada' }, { value: 'disabled', label: 'Desativada' }]} />
                  <Input label="Faixa salarial mínima" type="number" value={form.salaryMin} onChange={(e) => setForm((current) => ({ ...current, salaryMin: e.target.value }))} />
                  <Input label="Faixa salarial máxima" type="number" value={form.salaryMax} onChange={(e) => setForm((current) => ({ ...current, salaryMax: e.target.value }))} />
                </div>

                {suggestion && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview da IA</CardTitle>
                      <Badge variant="warning">Revisão humana obrigatória</Badge>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                      <p><strong>Resumo:</strong> {suggestion.summary}</p>
                      <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('summary')}>Usar resumo</Button>
                      <p><strong>Skills obrigatórias:</strong> {suggestion.requiredSkills.join(', ')}</p>
                      <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('requiredSkills')}>Usar skills obrigatórias</Button>
                      <p><strong>Skills desejáveis:</strong> {suggestion.desiredSkills.join(', ')}</p>
                      <Button type="button" variant="ghost" onClick={() => acceptSuggestionSection('desiredSkills')}>Usar skills desejáveis</Button>
                    </CardContent>
                  </Card>
                )}

                <Textarea label="Descrição" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={4} />

                <SkillField
                  label="Skills obrigatórias"
                  values={form.requiredSkills}
                  inputValue={requiredSkillInput}
                  onInputChange={setRequiredSkillInput}
                  onAdd={() => addSkill('requiredSkills')}
                  onRemove={(value) => removeSkill('requiredSkills', value)}
                />

                <SkillField
                  label="Skills desejáveis"
                  values={form.desiredSkills}
                  inputValue={desiredSkillInput}
                  onInputChange={setDesiredSkillInput}
                  onAdd={() => addSkill('desiredSkills')}
                  onRemove={(value) => removeSkill('desiredSkills', value)}
                />

                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button type="button" variant="outline" onClick={() => { void saveTemplate(); }} disabled={!orgId || templateSaving}>
                    {templateSaving ? 'Salvando template...' : editingTemplateId ? 'Atualizar template' : 'Salvar como template'}
                  </Button>
                </div>

                <div style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <Input label="Nome do template" value={templateForm.name} onChange={(e) => setTemplateForm((current) => ({ ...current, name: e.target.value }))} placeholder="Ex.: Engenheiro Backend Pleno" />
                  <Input label="Função do template" value={templateForm.role} onChange={(e) => setTemplateForm((current) => ({ ...current, role: e.target.value }))} placeholder="Ex.: Backend Engineer" />
                  <Input label="Setor do template" value={templateForm.sector} onChange={(e) => setTemplateForm((current) => ({ ...current, sector: e.target.value }))} placeholder="Ex.: Tecnologia" />
                  <Select label="Status do template" value={templateForm.status} onChange={(e) => setTemplateForm((current) => ({ ...current, status: e.target.value as TemplateForm['status'] }))} options={[{ value: 'draft', label: 'Rascunho' }, { value: 'active', label: 'Ativo' }, { value: 'archived', label: 'Arquivado' }]} />
                  <label style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', fontSize: fontSize.sm }}>
                    <input type="checkbox" checked={templateForm.isFavorite} onChange={(e) => setTemplateForm((current) => ({ ...current, isFavorite: e.target.checked }))} />
                    Marcar como favorito
                  </label>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" loading={loading} disabled={!orgId}>
                  {loading ? (editingVacancyId ? 'Salvando...' : 'Criando vaga...') : (editingVacancyId ? 'Salvar alterações' : 'Criar vaga')}
                </Button>
                {editingVacancyId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit} style={{ marginLeft: spacing.sm }}>
                    Cancelar
                  </Button>
                )}
              </CardFooter>
            </form>
          )}
        </Card>
      )}

      {/* ── Templates section ─────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader>
          <CardTitle>Templates disponíveis</CardTitle>
          <CardDescription>Templates salvos para a empresa selecionada, com aplicação e edição rápida.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <EmptyState title="Nenhum template disponível" description="Crie o primeiro template a partir do formulário de nova vaga." />
          ) : (
            <DataTable<VacancyTemplate>
              columns={[
                { key: 'name', header: 'Nome', render: (row) => row.name },
                { key: 'role', header: 'Função', render: (row) => row.role },
                { key: 'sector', header: 'Setor', render: (row) => row.sector },
                { key: 'status', header: 'Status', render: (row) => row.status },
                { key: 'usageCount', header: 'Uso', render: (row) => String(row.usageCount) },
                {
                  key: 'actions',
                  header: 'Ações',
                  render: (row) => (
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedTemplateId(row.id); void apiPost<Partial<Vacancy>>(`/vacancy-templates/${row.id}/apply`, {}).then((defaults) => { applyVacancyDefaults(defaults); setMsg('Template aplicado.'); setMsgVariant('success'); return load(); }).catch((err) => { setMsg(String(err)); setMsgVariant('error'); }); }}>
                        Aplicar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedTemplateId(row.id); setEditingTemplateId(row.id); setTemplateForm({ name: row.name, role: row.role, sector: row.sector, status: row.status, isFavorite: row.isFavorite }); applyVacancyDefaults(row.defaultFields); }}>
                        Editar
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={filteredTemplates}
              rowKey={(row) => row.id}
              pageSize={6}
              emptyMessage="Nenhum template disponível"
            />
          )}
        </CardContent>
      </Card>

      {/* ── Status action confirmation dialog ─────────────────────── */}
      {confirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmAction(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirmAction(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: zIndex.modal,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              padding: spacing.xl,
              borderRadius: radius.xl,
              width: '100%',
              maxWidth: 440,
              boxShadow: shadows.lg,
              display: 'grid',
              gap: spacing.md,
            }}
          >
            <h3 style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>
              Confirmar ação
            </h3>
            <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
              {confirmAction.label}?
              {confirmAction.action === 'close' && ' A garantia de 90 dias será calculada automaticamente.'}
              {confirmAction.action === 'reopen' && ' Os dados de fechamento e garantia serão limpos.'}
            </p>
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancelar</Button>
              <Button
                variant={confirmAction.action === 'close' ? 'danger' : confirmAction.action === 'reopen' ? 'success' : 'secondary'}
                onClick={() => { void executeStatusAction(confirmAction.vacancyId, confirmAction.action); }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
