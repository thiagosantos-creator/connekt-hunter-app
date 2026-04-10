import { useEffect, useMemo, useState } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, Candidate, CandidateRecommendation, Vacancy } from '../services/types.js';
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  PageHeader,
  PageContent,
  InlineMessage,
  SectionTitle,
  AiTag,
  spacing,
  colors,
  radius,
  fontSize,
} from '@connekt/ui';

export function CandidatesView() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [orgId, setOrgId] = useState(() => user?.organizationIds?.[0] ?? '');
  const orgOptions = user?.organizationIds?.map((id: string) => ({ value: id, label: id })) ?? [];
  const [result, setResult] = useState<Candidate | null>(null);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [recommendationCandidateId, setRecommendationCandidateId] = useState('');
  const [recommendationVacancyId, setRecommendationVacancyId] = useState('');
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!orgId && user?.organizationIds?.[0]) {
      setOrgId(user.organizationIds[0]);
    }
  }, [user, orgId]);

  useEffect(() => {
    void Promise.all([
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
      apiGet<Application[]>('/applications').then(setApplications).catch(() => setApplications([])),
    ]);
  }, []);

  const vacancyOptions = useMemo(
    () => vacancies.map((item) => ({ value: item.id, label: item.title })),
    [vacancies],
  );
  const applicationOptions = useMemo(
    () => applications.map((item) => ({
      value: item.id,
      label: `${item.candidate.email} — ${item.vacancy.title}`,
    })),
    [applications],
  );

  const handleRecommendationSelection = (applicationId: string) => {
    const selected = applications.find((item) => item.id === applicationId);
    if (!selected) return;
    setRecommendationCandidateId(selected.candidate.id);
    setRecommendationVacancyId(selected.vacancy.id);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const c = await apiPost<Candidate>('/candidates/invite', {
        organizationId: orgId,
        email,
        vacancyId,
      });
      setResult(c);
      setMsg('Candidato convidado com sucesso!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await apiGet<CandidateRecommendation[]>(
        `/recommendation-engine/${recommendationVacancyId}`,
      );
      setRecommendations(
        data.filter((item) => item.candidateId === recommendationCandidateId),
      );
      setMsg('Recomendações carregadas para o candidato.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const confidenceVariant = (c: number): 'success' | 'warning' | 'danger' => {
    if (c >= 0.7) return 'success';
    if (c >= 0.4) return 'warning';
    return 'danger';
  };

  return (
    <PageContent>
      <PageHeader title="Candidatos" />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <form onSubmit={(e) => { void invite(e); }}>
          <CardHeader>
            <CardTitle>Convidar Candidato</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {orgOptions.length > 1 ? (
              <Select
                label="Organização"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                options={orgOptions}
                placeholder="Selecione a organização"
                required
              />
            ) : (
              <Input
                label="ID da Organização"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
            )}
            <Input
              label="E-mail do Candidato"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select
              label="Vaga"
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
              options={vacancyOptions}
              placeholder="Selecione uma vaga"
              required
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={loading}>
              {loading ? 'Convidando…' : 'Convidar'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {result && (
        <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
          <CardHeader>
            <CardTitle>Token de Convite</CardTitle>
            <CardDescription>Compartilhe com o candidato para acesso ao candidate-web.</CardDescription>
          </CardHeader>
          <CardContent>
            <code
              style={{
                display: 'block',
                background: colors.primary,
                color: '#fff',
                padding: spacing.md,
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                wordBreak: 'break-all',
              }}
            >
              {result.token}
            </code>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recomendações por Candidato</CardTitle>
          <CardDescription>
            Carregue recomendações da IA para um candidato específico.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Aplicação"
              value={
                applications.find((item) =>
                  item.candidate.id === recommendationCandidateId && item.vacancy.id === recommendationVacancyId,
                )?.id ?? ''
              }
              onChange={(e) => handleRecommendationSelection(e.target.value)}
              options={applicationOptions}
              placeholder="Selecione candidato e vaga"
            />
          <div>
            <Button
              variant="secondary"
              onClick={() => { void loadRecommendations(); }}
              disabled={!recommendationCandidateId || !recommendationVacancyId}
            >
              Carregar Recomendações
            </Button>
          </div>

          {recommendations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <SectionTitle>Resultados</SectionTitle>
              {recommendations.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: spacing.sm,
                      flexWrap: 'wrap',
                    }}
                  >
                    <AiTag />
                    <div style={{ flex: 1 }}>
                      <strong>{item.title}</strong>
                      <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSecondary, fontSize: fontSize.sm }}>
                        {item.explanation}
                      </p>
                    </div>
                    <Badge variant={confidenceVariant(item.confidence)} size="sm">
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
