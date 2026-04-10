import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Vacancy } from '../services/types.js';
import {
  Button,
  Input,
  Textarea,
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orgId, setOrgId] = useState('org_demo');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

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
      await apiPost('/vacancies', { organizationId: orgId, title, description });
      setTitle('');
      setDescription('');
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
    {
      key: 'id',
      header: 'ID da Vaga',
      render: (row: Vacancy) => row.id,
    },
    {
      key: 'title',
      header: 'Título',
      render: (row: Vacancy) => row.title,
    },
    {
      key: 'organizationId',
      header: 'Organização',
      render: (row: Vacancy) => row.organizationId,
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Vagas" />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <form onSubmit={(e) => { void create(e); }}>
          <CardHeader>
            <CardTitle>Criar Vaga</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Organização"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            />
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={loading}>
              {loading ? 'Criando…' : 'Criar'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {vacancies.length === 0 ? (
        <EmptyState title="Nenhuma vaga cadastrada" description="Crie a primeira vaga acima." />
      ) : (
        <DataTable<Vacancy>
          columns={columns}
          data={vacancies}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma vaga cadastrada"
        />
      )}
    </PageContent>
  );
}
