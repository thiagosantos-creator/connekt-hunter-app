import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type {
  Application,
  ShortlistItem,
  EvalRecord,
  PriorityScore,
  Vacancy,
} from '../services/types.js';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  DataTable,
  PageHeader,
  PageContent,
  InlineMessage,
  SectionTitle,
  spacing,
  colors,
  fontSize,
} from '@connekt/ui';

export function ShortlistView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [evalComment, setEvalComment] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [evals, setEvals] = useState<EvalRecord[]>([]);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [vacancyIdForPriority, setVacancyIdForPriority] = useState('');
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);

  useEffect(() => {
    void Promise.all([
      apiGet<Application[]>('/applications').then(setApps),
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
    ]);
  }, []);

  const addToShortlist = async (appId: string) => {
    try {
      await apiPost<ShortlistItem>('/shortlist', { applicationId: appId });
      setShortlistedIds((prev) => new Set([...prev, appId]));
      setMsg('Adicionado à shortlist!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const calculatePriority = async () => {
    try {
      const data = await apiPost<PriorityScore[]>(
        '/decision-engine/priority/calculate',
        { vacancyId: vacancyIdForPriority },
      );
      setPriorities(data);
      setMsg('Priorização dinâmica calculada.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const submitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedApp) return;
    try {
      const r = await apiPost<EvalRecord>('/evaluations', {
        applicationId: selectedApp,
        evaluatorId: user.id,
        comment: evalComment,
      });
      setEvals((prev) => [...prev, r]);
      setEvalComment('');
      setMsg('Avaliação salva!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const bandVariant = (band: string): 'success' | 'warning' | 'danger' | 'info' => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      high: 'success',
      medium: 'warning',
      low: 'danger',
    };
    return map[band.toLowerCase()] ?? 'info';
  };

  const appColumns = [
    {
      key: 'candidate',
      header: 'Candidato',
      render: (row: Application) => row.candidate.email,
    },
    {
      key: 'vacancy',
      header: 'Vaga',
      render: (row: Application) => row.vacancy.title,
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row: Application) => (
        <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
          {shortlistedIds.has(row.id) ? (
            <Badge variant="success" size="sm">✓ Shortlisted</Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void addToShortlist(row.id); }}
            >
              Adicionar
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedApp(row.id)}
          >
            Avaliar
          </Button>
        </div>
      ),
    },
  ];

  const priorityColumns = [
    {
      key: 'candidateId',
      header: 'Candidato',
      render: (row: PriorityScore) => (
        <span style={{ fontSize: fontSize.sm }}>{row.candidateId}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (row: PriorityScore) => row.score.toFixed(1),
    },
    {
      key: 'priorityBand',
      header: 'Banda',
      render: (row: PriorityScore) => (
        <Badge variant={bandVariant(row.priorityBand)} size="sm">
          {row.priorityBand}
        </Badge>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Shortlist" />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <SectionTitle>Aplicações</SectionTitle>
      <DataTable<Application>
        columns={appColumns}
        data={apps}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma aplicação encontrada"
      />

      {selectedApp && (
        <Card style={{ marginTop: spacing.lg }}>
          <form onSubmit={(e) => { void submitEval(e); }}>
            <CardHeader>
              <CardTitle>
                Avaliação — <span style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{selectedApp}</span>
              </CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <Textarea
                label="Comentário de avaliação"
                value={evalComment}
                onChange={(e) => setEvalComment(e.target.value)}
                rows={4}
                placeholder="Adicione sua avaliação profissional..."
                required
              />
              {evals.length > 0 && (
                <Badge variant="info" size="sm">
                  {evals.length} avaliação(ões) salva(s)
                </Badge>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit">Salvar Avaliação</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <div style={{ marginTop: spacing.xl }}>
        <SectionTitle>Priorização Dinâmica</SectionTitle>
        <Card>
          <CardContent style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Select
              label="Vaga"
              value={vacancyIdForPriority}
              onChange={(e) => setVacancyIdForPriority(e.target.value)}
              options={vacancies.map((item) => ({ value: item.id, label: item.title }))}
              placeholder="Selecione uma vaga"
              style={{ flex: 1, minWidth: 200 }}
            />
            <Button
              variant="secondary"
              onClick={() => { void calculatePriority(); }}
              disabled={!vacancyIdForPriority}
            >
              Calcular Prioridade
            </Button>
          </CardContent>
        </Card>

        {priorities.length > 0 && (
          <div style={{ marginTop: spacing.md }}>
            <DataTable<PriorityScore>
              columns={priorityColumns}
              data={priorities}
              rowKey={(row) => row.id}
              emptyMessage="Nenhum resultado"
            />
          </div>
        )}
      </div>
    </PageContent>
  );
}
