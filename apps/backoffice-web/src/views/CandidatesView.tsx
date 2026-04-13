import { useEffect, useMemo, useState } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, Candidate, CandidateInvite, CandidateRecommendation, Vacancy } from '../services/types.js';
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
  DataTable,
  spacing,
  colors,
  radius,
  fontSize,
} from '@connekt/ui';

export function CandidatesView() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [destination, setDestination] = useState('');
  const [consent, setConsent] = useState(false);
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
  const [inviteHistory, setInviteHistory] = useState<CandidateInvite[]>([]);

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

  useEffect(() => {
    if (!orgId) return;
    void apiGet<CandidateInvite[]>(`/candidates/invites?organizationId=${encodeURIComponent(orgId)}`).then(setInviteHistory).catch(() => setInviteHistory([]));
  }, [orgId]);

  const vacancyOptions = useMemo(
    () => vacancies.map((item) => ({ value: item.id, label: item.title })),
    [vacancies],
  );
  const applicationOptions = useMemo(
    () => applications.map((item) => ({
      value: item.id,
      label: `${item.candidate.email} - ${item.vacancy.title}`,
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
        channel,
        destination,
        consent,
        vacancyId,
      });
      setResult(c);
      setMsg('Candidato convidado com sucesso!');
      setMsgVariant('success');
      setInviteHistory(await apiGet<CandidateInvite[]>(`/candidates/invites?organizationId=${encodeURIComponent(orgId)}`));
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await apiGet<CandidateRecommendation[]>(`/recommendation-engine/${recommendationVacancyId}`);
      setRecommendations(data.filter((item) => item.candidateId === recommendationCandidateId));
      setMsg('RecomendaÃ§Ãµes carregadas para o candidato.');
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
              <Select label="OrganizaÃ§Ã£o" value={orgId} onChange={(e) => setOrgId(e.target.value)} options={orgOptions} placeholder="Selecione a organizaÃ§Ã£o" required />
            ) : (
              <Input label="ID da OrganizaÃ§Ã£o" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
            )}
            <Select
              label="Canal"
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'email' | 'phone')}
              options={[{ value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Telefone (SMS/WhatsApp)' }]}
            />
            <Input label={channel === 'email' ? 'E-mail do Candidato' : 'Telefone do Candidato'} type={channel === 'email' ? 'email' : 'tel'} value={destination} onChange={(e) => setDestination(e.target.value)} required />
            <label style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Consentimento de contato/compliance confirmado
            </label>
            <Select label="Vaga" value={vacancyId} onChange={(e) => setVacancyId(e.target.value)} options={vacancyOptions} placeholder="Selecione uma vaga" required />
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
            <CardTitle>Convite Emitido</CardTitle>
            <CardDescription>Token e status do convite multicanal.</CardDescription>
          </CardHeader>
          <CardContent>
            <p><strong>Canal:</strong> {result.inviteChannel}</p>
            <p><strong>Destino:</strong> {result.inviteDestination}</p>
            <p><strong>Status:</strong> {result.inviteStatus}</p>
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

      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader>
          <CardTitle>HistÃ³rico de Convites</CardTitle>
          <CardDescription>Envios registrados e auditÃ¡veis por canal.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'candidate', header: 'Candidato', render: (row: CandidateInvite) => row.candidate.email || row.candidate.phone || row.destination },
              { key: 'vacancy', header: 'Vaga', render: (row: CandidateInvite) => row.vacancy.title },
              { key: 'channel', header: 'Canal', render: (row: CandidateInvite) => row.channel },
              { key: 'status', header: 'Status', render: (row: CandidateInvite) => row.status },
            ]}
            data={inviteHistory}
            rowKey={(row) => row.id}
            pageSize={6}
            emptyMessage="Nenhum convite emitido"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RecomendaÃ§Ãµes por Candidato</CardTitle>
          <CardDescription>Carregue recomendaÃ§Ãµes da IA para um candidato especÃ­fico.</CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Select
            label="AplicaÃ§Ã£o"
            value={applications.find((item) => item.candidate.id === recommendationCandidateId && item.vacancy.id === recommendationVacancyId)?.id ?? ''}
            onChange={(e) => handleRecommendationSelection(e.target.value)}
            options={applicationOptions}
            placeholder="Selecione candidato e vaga"
          />
          <div>
            <Button variant="secondary" onClick={() => { void loadRecommendations(); }} disabled={!recommendationCandidateId || !recommendationVacancyId}>
              Carregar RecomendaÃ§Ãµes
            </Button>
          </div>

          {recommendations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <SectionTitle>Resultados</SectionTitle>
              {recommendations.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' }}>
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
