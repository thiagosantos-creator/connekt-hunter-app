import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../services/api.js';
import { extractErrorMessage } from '../services/error-messages.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, CandidateRecommendation, RankingItem, Vacancy, WorkflowSuggestion } from '../services/types.js';
import {
  Button,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  RiskBadge,
  ScoreCard,
  DataTable,
  PageHeader,
  PageContent,
  InlineMessage,
  SectionTitle,
  AiTag,
  spacing,
  colors,
  fontSize,
  fontWeight,
  radius,
} from '@connekt/ui';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface MatchResult {
  overallScore?: number;
  dimensions?: Array<{ label: string; value: number; color?: string }>;
  aiSummary?: string;
  [key: string]: unknown;
}

interface RiskResult {
  level?: string;
  riskLevel?: string;
  overallRisk?: string;
  score?: number;
  riskScore?: number;
  explanation?: string;
  factors?: Array<{ name: string; level: string; detail?: string }>;
  [key: string]: unknown;
}

function extractRiskLevel(risk: RiskResult): RiskLevel | null {
  const raw = (risk.level ?? risk.riskLevel ?? risk.overallRisk ?? '').toString().toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(raw)) return raw as RiskLevel;
  return null;
}

function ResultCard({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && typeof v !== 'object',
  );
  const nested = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && typeof v === 'object',
  );

  return (
    <Card variant="outlined" style={{ marginTop: spacing.md }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: `${spacing.xs}px ${spacing.md}px` }}>
            {entries.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: colors.textSecondary }}>{k}</span>
                <span style={{ fontSize: fontSize.sm }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {nested.map(([k, v]) => (
          <details key={k} style={{ marginTop: spacing.sm }}>
            <summary style={{ cursor: 'pointer', fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>{k}</summary>
            <pre
              style={{
                background: colors.surfaceAlt,
                padding: spacing.sm,
                borderRadius: radius.sm,
                fontSize: fontSize.xs,
                overflowX: 'auto',
                marginTop: spacing.xs,
              }}
            >
              {JSON.stringify(v, null, 2)}
            </pre>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}

export function ProductIntelligenceView() {
  useAuth();
  const [applicationId, setApplicationId] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [otherCandidateId, setOtherCandidateId] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [suggestions, setSuggestions] = useState<WorkflowSuggestion[]>([]);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [applications, setApplications] = useState<Application[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);

  useEffect(() => {
    void Promise.all([
      apiGet<Application[]>('/applications').then(setApplications).catch(() => setApplications([])),
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
    ]);
  }, []);

  const scopedApplicationOptions = useMemo(
    () => applications.map((item) => ({
      value: item.id,
      label: `${item.candidate.email} — ${item.vacancy.title}`,
    })),
    [applications],
  );

  const scopedVacancyOptions = useMemo(
    () => vacancies.map((item) => ({ value: item.id, label: item.title })),
    [vacancies],
  );

  const scopedCandidateOptions = useMemo(() => {
    const scopedApplications = vacancyId
      ? applications.filter((item) => item.vacancy.id === vacancyId)
      : applications;
    const unique = new Map<string, string>();
    scopedApplications.forEach((item) => {
      if (!unique.has(item.candidate.id)) {
        unique.set(item.candidate.id, item.candidate.email);
      }
    });
    return [...unique.entries()].map(([value, label]) => ({ value, label }));
  }, [applications, vacancyId]);

  const otherCandidateOptions = useMemo(
    () => scopedCandidateOptions.filter((item) => item.value !== candidateId),
    [candidateId, scopedCandidateOptions],
  );

  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === applicationId) ?? null,
    [applicationId, applications],
  );

  const selectedCandidateApplication = useMemo(
    () => applications.find((item) => item.vacancy.id === vacancyId && item.candidate.id === candidateId) ?? null,
    [applications, candidateId, vacancyId],
  );

  const selectedComparisonApplication = useMemo(
    () => applications.find((item) => item.vacancy.id === vacancyId && item.candidate.id === otherCandidateId) ?? null,
    [applications, otherCandidateId, vacancyId],
  );

  useEffect(() => {
    if (!selectedApplication) return;
    setVacancyId(selectedApplication.vacancy.id);
    setCandidateId(selectedApplication.candidate.id);
  }, [selectedApplication]);

  useEffect(() => {
    if (!candidateId) return;
    if (!scopedCandidateOptions.some((item) => item.value === candidateId)) {
      setCandidateId(scopedCandidateOptions[0]?.value ?? '');
    }
  }, [candidateId, scopedCandidateOptions]);

  useEffect(() => {
    if (!otherCandidateId) return;
    if (!otherCandidateOptions.some((item) => item.value === otherCandidateId)) {
      setOtherCandidateId('');
    }
  }, [otherCandidateId, otherCandidateOptions]);

  const feedback = (text: string, variant: 'success' | 'error') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const compute = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-matching/compute', { applicationId });
      setResult(data);
      feedback('Matching calculado com breakdown, evidências e explicação.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const generateInsights = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-insights/generate', { candidateId, vacancyId });
      setResult(data);
      feedback('Insights gerados.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const compare = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-matching/compare', {
        vacancyId,
        leftCandidateId: candidateId,
        rightCandidateId: otherCandidateId,
      });
      setResult(data);
      feedback('Comparativo assistido gerado.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const generateRanking = async () => {
    try {
      const data = await apiPost<RankingItem[]>('/candidate-ranking/generate', { vacancyId });
      setRanking(data);
      feedback('Ranking assistido gerado.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const generateRecommendations = async () => {
    try {
      const data = await apiPost<CandidateRecommendation[]>('/recommendation-engine/generate', { candidateId, vacancyId });
      setRecommendations(data);
      feedback('Recomendações geradas com explicações.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const analyzeRisk = async () => {
    try {
      const data = await apiPost<RiskResult>('/risk-analysis/analyze', { candidateId, vacancyId });
      setRisk(data);
      feedback('Risco identificado com explicação assistiva.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const suggestWorkflow = async () => {
    try {
      const data = await apiPost<WorkflowSuggestion[]>('/workflow-automation/suggest', { candidateId, vacancyId });
      setSuggestions(data);
      feedback('Ações sugeridas carregadas.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const executeSuggestion = async (suggestionId: string) => {
    try {
      const data = await apiPost<Record<string, unknown>>('/workflow-automation/execute', { suggestionId });
      setResult(data);
      feedback('Automação assistida executada com override humano.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const moveUp = async (candidateIdToPromote: string) => {
    const ordered = [...ranking]
      .sort((a, b) => a.rank - b.rank)
      .map((item) => item.candidateId);
    const idx = ordered.indexOf(candidateIdToPromote);
    if (idx <= 0) return;
    [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
    try {
      const data = await apiPost<RankingItem[]>('/candidate-ranking/override', {
        vacancyId,
        orderedCandidateIds: ordered,
      });
      setRanking(data);
      feedback('Ordem atualizada com override humano.', 'success');
    } catch (err) {
      feedback(extractErrorMessage(err), 'error');
    }
  };

  const matchResult = result as MatchResult | null;
  const hasScoreCard =
    matchResult?.overallScore !== undefined && Array.isArray(matchResult?.dimensions);

  const confidenceVariant = (c: number): 'success' | 'warning' | 'danger' => {
    if (c >= 0.7) return 'success';
    if (c >= 0.4) return 'warning';
    return 'danger';
  };

  const applicationOptions = useMemo(
    () => applications.map((item) => ({
      value: item.id,
      label: `${item.candidate.email} — ${item.vacancy.title}`,
    })),
    [applications],
  );
  const vacancyOptions = useMemo(
    () => vacancies.map((item) => ({ value: item.id, label: item.title })),
    [vacancies],
  );
  const candidateOptions = useMemo(() => {
    const unique = new Map<string, string>();
    applications.forEach((item) => {
      if (!unique.has(item.candidate.id)) {
        unique.set(item.candidate.id, item.candidate.email);
      }
    });
    return [...unique.entries()].map(([value, label]) => ({ value, label }));
  }, [applications]);

  const handleApplicationSelection = (selectedApplicationId: string) => {
    setApplicationId(selectedApplicationId);
    const selected = applications.find((item) => item.id === selectedApplicationId);
    if (!selected) return;
    setVacancyId(selected.vacancy.id);
    setCandidateId(selected.candidate.id);
  };

  const rankingColumns = [
    {
      key: 'rank',
      header: 'Posição',
      render: (row: RankingItem) => <strong>#{row.rank}</strong>,
      width: '80px',
    },
    {
      key: 'candidateId',
      header: 'Candidato',
      render: (row: RankingItem) => (
        <span style={{ fontSize: fontSize.sm }}>{row.candidateId}</span>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (row: RankingItem) => String(row.score),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row: RankingItem) => (
        <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
          <Badge variant={row.manualOverride ? 'warning' : 'info'} size="sm">
            {row.manualOverride ? 'Manual' : 'Assistivo'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => { void moveUp(row.candidateId); }}>
            ↑
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Inteligência do Produto"
        description="Plataforma de IA para tomada de decisão assistida — matching, insights, ranking e análise de risco."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      {/* Context selector */}
      <Card style={{ marginBottom: spacing.lg, borderLeft: `3px solid ${colors.accent}` }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <span style={{ fontSize: fontSize.lg }}>🎯</span>
            <div>
              <CardTitle>Contexto de análise</CardTitle>
              <CardDescription>Selecione a aplicação. O candidato e a vaga serão preenchidos automaticamente.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.md }}>
          <Select
            label="Aplicação (candidato + vaga)"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            options={scopedApplicationOptions}
            placeholder="Selecione uma aplicação"
          />
          <Select
            label="Vaga"
            value={vacancyId}
            onChange={(e) => setVacancyId(e.target.value)}
            options={scopedVacancyOptions}
            placeholder="Selecione uma vaga"
          />
          <Select
            label="Candidato"
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
            options={scopedCandidateOptions}
            placeholder="Selecione um candidato"
          />
        </CardContent>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>

        {/* ── Matching ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <AiTag />
              <div>
                <CardTitle>Matching Candidato-Vaga</CardTitle>
                <CardDescription>Score de compatibilidade multidimensional com breakdown e evidências.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => { void compute(); }} disabled={!applicationId}>
              Calcular Matching
            </Button>
          </CardFooter>
          {hasScoreCard && (
            <CardContent>
              <ScoreCard
                overallScore={matchResult!.overallScore!}
                dimensions={matchResult!.dimensions!}
                title="Resultado do Matching"
                aiSummary={typeof matchResult!.aiSummary === 'string' ? matchResult!.aiSummary : undefined}
              />
            </CardContent>
          )}
          {result && !hasScoreCard && <ResultCard title="Resultado do Matching" data={result} />}
        </Card>

        {/* ── Insights & Compare ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <AiTag />
              <div>
                <CardTitle>Insights &amp; Comparação</CardTitle>
                <CardDescription>Gere insights individuais ou compare dois candidatos lado a lado.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Outro candidato (comparação)"
              value={otherCandidateId}
              onChange={(e) => setOtherCandidateId(e.target.value)}
              options={otherCandidateOptions}
              placeholder="Selecione outro candidato para comparar"
            />
          </CardContent>
          <CardFooter style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => { void generateInsights(); }}
              disabled={!selectedCandidateApplication}
            >
              💡 Gerar Insights
            </Button>
            <Button
              variant="outline"
              onClick={() => { void compare(); }}
              disabled={!selectedCandidateApplication || !selectedComparisonApplication}
            >
              ⚖️ Comparar Candidatos
            </Button>
          </CardFooter>
        </Card>

        {/* ── Ranking ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <AiTag />
              <div>
                <CardTitle>Ranking Assistido</CardTitle>
                <CardDescription>Gere o ranking de candidatos por vaga e ajuste a ordem manualmente.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => { void generateRanking(); }}
              disabled={!vacancyId}
            >
              📊 Gerar Ranking
            </Button>
          </CardFooter>
          {ranking.length > 0 && (
            <CardContent>
              <DataTable<RankingItem>
                columns={rankingColumns}
                data={[...ranking].sort((a, b) => a.rank - b.rank)}
                rowKey={(row) => row.candidateId}
                emptyMessage="Sem dados de ranking"
              />
            </CardContent>
          )}
        </Card>

        {/* ── Recommendations ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <AiTag />
              <div>
                <CardTitle>Recomendações IA</CardTitle>
                <CardDescription>Recomendações personalizadas com explicações detalhadas.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => { void generateRecommendations(); }}
              disabled={!selectedCandidateApplication}
            >
              🎯 Gerar Recomendações
            </Button>
          </CardFooter>
          {recommendations.length > 0 && (
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {recommendations.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
                  <AiTag />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <strong style={{ fontSize: fontSize.md }}>{item.title}</strong>
                      <Badge variant={confidenceVariant(item.confidence)} size="sm">
                        {Math.round(item.confidence * 100)}% confiança
                      </Badge>
                    </div>
                    <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 1.6 }}>
                      {item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* ── Risk ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ fontSize: fontSize.lg }}>⚠️</span>
              <div>
                <CardTitle>Análise de Risco</CardTitle>
                <CardDescription>Identifique riscos potenciais com explicações detalhadas e fatores ponderados.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              variant="danger"
              onClick={() => { void analyzeRisk(); }}
              disabled={!selectedCandidateApplication}
            >
              🔍 Analisar Risco
            </Button>
          </CardFooter>
          {risk && (
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                  {extractRiskLevel(risk) && (
                    <RiskBadge level={extractRiskLevel(risk)!} />
                  )}
                  {(risk.score ?? risk.riskScore) !== undefined && (
                    <Badge variant="neutral" size="sm">
                      Score: {String(risk.score ?? risk.riskScore)}
                    </Badge>
                  )}
                </div>
                {risk.explanation && (
                  <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, margin: 0, lineHeight: 1.6 }}>
                    {risk.explanation}
                  </p>
                )}
                {Array.isArray(risk.factors) && risk.factors.length > 0 && (
                  <div>
                    <SectionTitle>Fatores de Risco</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                      {risk.factors.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing.sm,
                            padding: `${spacing.sm}px ${spacing.md}px`,
                            background: colors.surfaceAlt,
                            borderRadius: radius.md,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <Badge
                            variant={
                              f.level === 'high' || f.level === 'critical'
                                ? 'danger'
                                : f.level === 'medium'
                                  ? 'warning'
                                  : 'success'
                            }
                            size="sm"
                          >
                            {f.level}
                          </Badge>
                          <strong style={{ fontSize: fontSize.sm }}>{f.name}</strong>
                          {f.detail && (
                            <span style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                              — {f.detail}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Fallback for unknown risk shape */}
                {!risk.explanation && !Array.isArray(risk.factors) && !extractRiskLevel(risk) && (
                  <ResultCard title="Dados de Risco" data={risk} />
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── Workflow Automation ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ fontSize: fontSize.lg }}>⚡</span>
              <div>
                <CardTitle>Automação de Workflow</CardTitle>
                <CardDescription>Sugestões de ações automatizadas com supervisão humana obrigatória.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => { void suggestWorkflow(); }}
              disabled={!selectedCandidateApplication}
            >
              Sugerir Ações
            </Button>
          </CardFooter>
          {suggestions.length > 0 && (
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {suggestions.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap', padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                      <Badge variant="info" size="sm">{item.suggestionType}</Badge>
                      <Badge variant="neutral" size="sm">{item.status}</Badge>
                    </div>
                    <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 1.5 }}>
                      {item.explanation}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { void executeSuggestion(item.id); }}
                  >
                    ▶ Executar
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Generic result display */}
        {result && !hasScoreCard && (
          <ResultCard title="Último Resultado" data={result} />
        )}
      </div>
    </PageContent>
  );
}
