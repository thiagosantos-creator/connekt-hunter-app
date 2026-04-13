import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { hasPermission } from '../services/rbac.js';
import type { Vacancy } from '../services/types.js';
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
  spacing,
} from '@connekt/ui';

export function VacanciesView() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
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
      setVacancies(await apiGet<Vacancy[]>('/vacancies'));
    } catch {
      /* ignored */
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await apiPost('/vacancies', {
        organizationId: orgId,
        ...form,
        requiredSkills: form.requiredSkills.split(',').map((v) => v.trim()).filter(Boolean),
        desiredSkills: form.desiredSkills.split(',').map((v) => v.trim()).filter(Boolean),
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      });
      setForm({ ...form, title: '', description: '', location: '', department: '', requiredSkills: '', desiredSkills: '', salaryMin: '', salaryMax: '' });
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

  const columns = [
    { key: 'title', header: 'Título', render: (row: Vacancy) => row.title },
    { key: 'organizationId', header: 'Organização', render: (row: Vacancy) => row.organization?.name ?? row.organizationId },
    { key: 'workModel', header: 'Modalidade', render: (row: Vacancy) => row.workModel ?? '-' },
    { key: 'publicationType', header: 'Publicação', render: (row: Vacancy) => row.publicationType ?? '-' },
    { key: 'status', header: 'Status', render: (row: Vacancy) => row.status ?? '-' },
  ];

  return (
    <PageContent>
      <PageHeader title="Vagas" />

      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {canWrite && (
        <Card style={{ marginBottom: spacing.lg }}>
          <form onSubmit={(e) => { void create(e); }}>
            <CardHeader><CardTitle>Criar Vaga Publicável</CardTitle></CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {orgOptions.length > 1 ? <Select label="Organização" value={orgId} onChange={(e) => setOrgId(e.target.value)} options={orgOptions} required /> : <Input label="ID da Organização" value={orgId} onChange={(e) => setOrgId(e.target.value)} />}
              <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Textarea label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <Input label="Localização" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Select label="Modalidade" value={form.workModel} onChange={(e) => setForm({ ...form, workModel: e.target.value })} options={[{ value: 'onsite', label: 'Presencial' }, { value: 'hybrid', label: 'Híbrido' }, { value: 'remote', label: 'Remoto' }]} />
              <Select label="Senioridade" value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })} options={[{ value: 'junior', label: 'Júnior' }, { value: 'pleno', label: 'Pleno' }, { value: 'senior', label: 'Sênior' }]} />
              <Select label="Tipo de contratação" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} options={[{ value: 'clt', label: 'CLT' }, { value: 'pj', label: 'PJ' }, { value: 'contract', label: 'Contrato' }, { value: 'intern', label: 'Estágio' }]} />
              <Select label="Tipo de publicação" value={form.publicationType} onChange={(e) => setForm({ ...form, publicationType: e.target.value })} options={[{ value: 'restricted', label: 'Restrita' }, { value: 'public', label: 'Pública' }, { value: 'draft', label: 'Rascunho' }, { value: 'confidential', label: 'Confidencial' }]} />
              <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Ativo' }, { value: 'expired', label: 'Expirado' }, { value: 'frozen', label: 'Congelado' }, { value: 'disabled', label: 'Desativada' }]} />
              <Input label="Setor/Área" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <Input label="Skills obrigatórias (csv)" value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} />
              <Input label="Skills desejáveis (csv)" value={form.desiredSkills} onChange={(e) => setForm({ ...form, desiredSkills: e.target.value })} />
              <Input label="Faixa salarial mínima" type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
              <Input label="Faixa salarial máxima" type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </CardContent>
            <CardFooter><Button type="submit" loading={loading}>{loading ? 'Criando…' : 'Criar'}</Button></CardFooter>
          </form>
        </Card>
      )}

      {vacancies.length === 0 ? <EmptyState title="Nenhuma vaga cadastrada" description={canWrite ? 'Crie a primeira vaga acima.' : 'Nenhuma vaga disponível.'} /> : <DataTable<Vacancy> columns={columns} data={vacancies} rowKey={(row) => row.id} emptyMessage="Nenhuma vaga cadastrada" />}
    </PageContent>
  );
}
