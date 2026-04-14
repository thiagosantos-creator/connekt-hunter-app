import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { listManagedCandidates, requestCandidatePasswordReset, updateManagedCandidate } from '../services/account.js';
import { hasPermission } from '../services/rbac.js';
import type { Application, Candidate, CandidateInvite, CandidatePasswordResetResult, CandidateRecommendation, ManagedCandidate, Organization, Vacancy } from '../services/types.js';
import {
  AiTag,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  SectionTitle,
  Select,
  Skeleton,
  StatBox,
  colors,
  fontSize,
  radius,
  spacing,
} from '@connekt/ui';

const candidateWebBase = import.meta.env.VITE_CANDIDATE_WEB_URL ?? 'http://localhost:5174';

export function CandidatesView() {
  const { user } = useAuth();
  const [channel, setChannel] = useState<'email' | 'phone' | 'link'>('link');
  const [destination, setDestination] = useState('');
  const [consent, setConsent] = useState(false);
  const [vacancyId, setVacancyId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
  const [managedCandidates, setManagedCandidates] = useState<ManagedCandidate[]>([]);
  const [selectedManagedCandidateId, setSelectedManagedCandidateId] = useState('');
  const [managedCandidateEmail, setManagedCandidateEmail] = useState('');
  const [managedCandidateFeedback, setManagedCandidateFeedback] = useState<CandidatePasswordResetResult | null>(null);
  const [loadingManagedCandidates, setLoadingManagedCandidates] = useState(false);
  const [savingManagedCandidate, setSavingManagedCandidate] = useState(false);
  const [resettingCandidate, setResettingCandidate] = useState(false);
  const canManageCandidateAccounts = hasPermission(user, 'users:manage');

  const orgOptions = useMemo(() => {
    if (organizations.length > 0) {
      return organizations.map((item) => ({
        value: item.id,
        label: item.tenantSettings?.publicName || item.name,
      }));
    }
    return (user?.organizationIds ?? []).map((id: string) => ({ value: id, label: id }));
  }, [organizations, user?.organizationIds]);

  useEffect(() => {
    void Promise.all([
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
      apiGet<Application[]>('/applications').then(setApplications).catch(() => setApplications([])),
      apiGet<Organization[]>('/organizations').then(setOrganizations).catch(() => setOrganizations([])),
    ]);
  }, []);

  useEffect(() => {
    if (!orgId && orgOptions.length > 0) {
      setOrgId(orgOptions[0].value);
    }
  }, [orgId, orgOptions]);

  useEffect(() => {
    if (!orgId) return;
    void apiGet<CandidateInvite[]>(`/candidates/invites?organizationId=${encodeURIComponent(orgId)}`)
      .then(setInviteHistory)
      .catch(() => setInviteHistory([]));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !canManageCandidateAccounts) {
      setManagedCandidates([]);
      setSelectedManagedCandidateId('');
      return;
    }
    setLoadingManagedCandidates(true);
    void listManagedCandidates(orgId)
      .then((rows) => {
        setManagedCandidates(rows);
        setSelectedManagedCandidateId((current) => (
          rows.some((candidate) => candidate.id === current) ? current : (rows[0]?.id ?? '')
        ));
      })
      .catch((err) => {
        setMsg(String(err));
        setMsgVariant('error');
        setManagedCandidates([]);
      })
      .finally(() => setLoadingManagedCandidates(false));
  }, [canManageCandidateAccounts, orgId]);

  const selectedManagedCandidate = useMemo(
    () => managedCandidates.find((candidate) => candidate.id === selectedManagedCandidateId) ?? null,
    [managedCandidates, selectedManagedCandidateId],
  );

  useEffect(() => {
    setManagedCandidateEmail(selectedManagedCandidate?.email ?? '');
    setManagedCandidateFeedback(null);
  }, [selectedManagedCandidate]);

  const vacancyOptions = useMemo(
    () => vacancies
      .filter((item) => item.organizationId === orgId)
      .map((item) => ({
        value: item.id,
        label: item.title,
      })),
    [vacancies, orgId],
  );

  const applicationOptions = useMemo(
    () => applications.map((item) => ({
      value: item.id,
      label: `${item.candidate.email} - ${item.vacancy.title}`,
    })),
    [applications],
  );

  const inviteUrl = result ? `${candidateWebBase}/?token=${encodeURIComponent(result.token)}` : '';
  const activeManagedCandidates = managedCandidates.filter((candidate) => candidate.hasLoginAccount).length;
  const resettableManagedCandidates = managedCandidates.filter((candidate) => candidate.canRequestPasswordReset).length;
  const normalizedManagedCandidateEmail = managedCandidateEmail.trim().toLowerCase();

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
      const invited = await apiPost<Candidate>('/candidates/invite', {
        organizationId: orgId,
        channel,
        destination: channel === 'link' ? undefined : destination,
        consent,
        vacancyId,
      });
      setResult(invited);
      setMsg('Candidato convidado com sucesso.');
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
      setMsg('Recomendações carregadas para o candidato.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const confidenceVariant = (value: number): 'success' | 'warning' | 'danger' => {
    if (value >= 0.7) return 'success';
    if (value >= 0.4) return 'warning';
    return 'danger';
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMsg('Link copiado.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const saveManagedCandidateEmail = async () => {
    if (!selectedManagedCandidate) return;
    setSavingManagedCandidate(true);
    try {
      const updated = await updateManagedCandidate({
        candidateId: selectedManagedCandidate.id,
        email: managedCandidateEmail,
      });
      setManagedCandidates((current) => current.map((candidate) => (
        candidate.id === updated.id ? updated : candidate
      )));
      setManagedCandidateEmail(updated.email);
      setManagedCandidateFeedback(null);
      setMsg('E-mail do candidato atualizado com sucesso.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setSavingManagedCandidate(false);
    }
  };

  const requestReset = async () => {
    if (!selectedManagedCandidate) return;
    setResettingCandidate(true);
    try {
      const response = await requestCandidatePasswordReset(selectedManagedCandidate.id);
      setManagedCandidateFeedback(response);
      setMsg(response.message);
      setMsgVariant(response.status === 'sent' ? 'success' : 'error');
    } catch (err) {
      setManagedCandidateFeedback(null);
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setResettingCandidate(false);
    }
  };

  return (
    <PageContent>
      <PageHeader title="Candidatos" description="Convide por e-mail ou telefone e compartilhe um link direto para o candidato entrar na vaga." />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <form onSubmit={(e) => { void invite(e); }}>
          <CardHeader>
            <CardTitle>Convidar candidato</CardTitle>
            <CardDescription>Selecione a empresa, a vaga e o canal. O link direto fica disponível logo após o envio.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Empresa"
              value={orgId}
              onChange={(e) => {
                setOrgId(e.target.value);
                setVacancyId('');
              }}
              options={orgOptions}
              placeholder="Selecione a empresa"
              required
            />
            <Select
              label="Canal"
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'email' | 'phone' | 'link')}
              options={[{ value: 'link', label: 'Apenas link (entrega manual)' }, { value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Telefone (SMS/WhatsApp)' }]}
            />
            {channel !== 'link' && (
              <Input
                label={channel === 'email' ? 'E-mail do candidato' : 'Telefone do candidato'}
                type={channel === 'email' ? 'email' : 'tel'}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            )}
            <Select
              label="Vaga"
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
              options={[
                { value: '', label: vacancyOptions.length > 0 ? 'Selecione uma vaga' : 'Nenhuma vaga disponível para esta empresa' },
                ...vacancyOptions,
              ]}
              required
            />
            <label style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Consentimento de contato / compliance confirmado
            </label>
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={loading} disabled={!orgId || !vacancyId}>
              {loading ? 'Convidando...' : 'Convidar'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {result && (
        <Card variant="outlined" style={{ marginBottom: spacing.lg }}>
          <CardHeader>
            <CardTitle>Convite emitido</CardTitle>
            <CardDescription>Use o link abaixo para o candidato entrar diretamente no fluxo da vaga.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <p><strong>Canal:</strong> {result.inviteChannel}</p>
            <p><strong>Destino:</strong> {result.inviteDestination}</p>
            <p><strong>Status:</strong> {result.inviteStatus}</p>
            <code
              style={{
                display: 'block',
                background: colors.primary,
                color: colors.textInverse,
                padding: spacing.md,
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                wordBreak: 'break-all',
              }}
            >
              {inviteUrl}
            </code>
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
               <Button type="button" variant="secondary" onClick={() => { void copyToClipboard(inviteUrl); }}>Copiar link</Button>
              <a href={inviteUrl} target="_blank" rel="noreferrer">Abrir portal do candidato</a>
            </div>
          </CardContent>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader>
          <CardTitle>Histórico de convites</CardTitle>
          <CardDescription>Envios registrados por canal, com link reaproveitável para o candidato.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'candidate', header: 'Candidato', render: (row: CandidateInvite) => row.candidate.email || row.candidate.phone || row.destination },
              { key: 'vacancy', header: 'Vaga', render: (row: CandidateInvite) => row.vacancy.title },
              { key: 'channel', header: 'Canal', render: (row: CandidateInvite) => row.channel },
              { key: 'status', header: 'Status', render: (row: CandidateInvite) => row.status },
              {
                key: 'link',
                header: 'Link',
                render: (row: CandidateInvite) => {
                  const historyInviteUrl = `${candidateWebBase}/?token=${encodeURIComponent(row.candidate.token)}`;
                  return (
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      <a href={historyInviteUrl} target="_blank" rel="noreferrer">Abrir</a>
                       <Button size="sm" variant="ghost" onClick={() => { void copyToClipboard(historyInviteUrl); }}>Copiar</Button>
                    </div>
                  );
                },
              },
            ]}
            data={inviteHistory}
            rowKey={(row) => row.id}
            pageSize={6}
            emptyMessage="Nenhum convite emitido"
          />
        </CardContent>
      </Card>

      {canManageCandidateAccounts && (
        <Card style={{ marginBottom: spacing.lg }}>
          <CardHeader>
            <CardTitle>Gestão administrativa do candidato</CardTitle>
            <CardDescription>Atualize o e-mail cadastrado e solicite redefinição de acesso para candidatos com conta criada.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md }}>
              <StatBox label="Candidatos no tenant" value={managedCandidates.length} />
              <StatBox label="Com conta criada" value={activeManagedCandidates} />
              <StatBox label="Reset disponível" value={resettableManagedCandidates} />
            </div>

            {loadingManagedCandidates ? (
              <Skeleton style={{ height: 240, borderRadius: 8 }} />
            ) : (
              <>
                <DataTable
                  columns={[
                    {
                      key: 'candidate',
                      header: 'Candidato',
                      render: (row: ManagedCandidate) => row.fullName || row.email,
                      searchValue: (row: ManagedCandidate) => `${row.fullName ?? ''} ${row.email}`.trim(),
                      sortValue: (row: ManagedCandidate) => row.fullName || row.email,
                    },
                    {
                      key: 'email',
                      header: 'E-mail',
                      render: (row: ManagedCandidate) => row.email,
                      searchValue: (row: ManagedCandidate) => row.email,
                    },
                    {
                      key: 'account',
                      header: 'Conta',
                      render: (row: ManagedCandidate) => (
                        <Badge variant={row.hasLoginAccount ? 'success' : 'warning'} size="sm">
                          {row.hasLoginAccount ? 'Criada' : 'Pendente'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'reset',
                      header: 'Reset',
                      render: (row: ManagedCandidate) => (
                        <Badge variant={row.canRequestPasswordReset ? 'info' : 'neutral'} size="sm">
                          {row.canRequestPasswordReset ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      ),
                    },
                    {
                      key: 'lastInvite',
                      header: 'Último convite',
                      render: (row: ManagedCandidate) => row.lastInvite
                        ? `${row.lastInvite.channel} • ${row.lastInvite.status}`
                        : 'Sem convite',
                    },
                  ]}
                  data={managedCandidates}
                  rowKey={(row) => row.id}
                  searchable
                  searchPlaceholder="Buscar candidato por nome ou e-mail"
                  pageSize={6}
                  emptyMessage="Nenhum candidato encontrado para este tenant."
                  onRowClick={(row) => setSelectedManagedCandidateId(row.id)}
                />

                {selectedManagedCandidate && (
                  <Card variant="outlined">
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md }}>
                        <StatBox label="Selecionado" value={selectedManagedCandidate.fullName || selectedManagedCandidate.email} />
                        <StatBox label="Aplicações" value={selectedManagedCandidate.applicationsCount} />
                        <StatBox label="Convites" value={selectedManagedCandidate.invitesCount} />
                        <StatBox label="Provedores" value={selectedManagedCandidate.authProviders.join(', ') || 'Sem conta'} />
                      </div>

                      <Input
                        label="E-mail do candidato"
                        type="email"
                        value={managedCandidateEmail}
                        onChange={(e) => setManagedCandidateEmail(e.target.value)}
                        placeholder="candidato@email.com"
                      />

                      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          onClick={() => { void saveManagedCandidateEmail(); }}
                          loading={savingManagedCandidate}
                          disabled={!normalizedManagedCandidateEmail || normalizedManagedCandidateEmail === selectedManagedCandidate.email.toLowerCase()}
                        >
                          Salvar e-mail
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { void requestReset(); }}
                          loading={resettingCandidate}
                          disabled={!selectedManagedCandidate.canRequestPasswordReset}
                        >
                          Solicitar nova senha
                        </Button>
                      </div>

                      {!selectedManagedCandidate.canRequestPasswordReset && (
                        <InlineMessage variant="warning">
                          O reset só fica disponível quando o candidato já possui conta vinculada e e-mail real configurado.
                        </InlineMessage>
                      )}

                      {managedCandidateFeedback?.resetUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                          <strong>Link de redefinição</strong>
                          <code
                            style={{
                              display: 'block',
                              background: colors.primary,
                              color: colors.textInverse,
                              padding: spacing.md,
                              borderRadius: radius.md,
                              fontSize: fontSize.sm,
                              wordBreak: 'break-all',
                            }}
                          >
                            {managedCandidateFeedback.resetUrl}
                          </code>
                          <div>
                            <Button type="button" variant="ghost" onClick={() => { void copyToClipboard(managedCandidateFeedback.resetUrl ?? ''); }}>
                              Copiar link
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recomendações por candidato</CardTitle>
          <CardDescription>Carregue recomendações da IA para um candidato específico.</CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Select
            label="Aplicação"
            value={applications.find((item) => item.candidate.id === recommendationCandidateId && item.vacancy.id === recommendationVacancyId)?.id ?? ''}
            onChange={(e) => handleRecommendationSelection(e.target.value)}
            options={applicationOptions}
            placeholder="Selecione candidato e vaga"
          />
          <div>
            <Button variant="secondary" onClick={() => { void loadRecommendations(); }} disabled={!recommendationCandidateId || !recommendationVacancyId}>
              Carregar recomendações
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
