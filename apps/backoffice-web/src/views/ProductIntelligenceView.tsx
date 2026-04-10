import { useState } from 'react';
import { apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { CandidateRecommendation, RankingItem, WorkflowSuggestion } from '../services/types.js';
import {
  Button,
  Input,
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
                <span style={{ fontWeight: 600, fontSize: fontSize.sm, color: colors.textSecondary }}>{k}</span>
                <span style={{ fontSize: fontSize.sm }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {nested.map(([k, v]) => (
          <details key={k} style={{ marginTop: spacing.sm }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: fontSize.sm }}>{k}</summary>
            <pre
              style={{
                background: '#f8f9fa',
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
      feedback(String(err), 'error');
    }
  };

  const generateInsights = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-insights/generate', { candidateId, vacancyId });
      setResult(data);
      feedback('Insights gerados.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
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
      feedback(String(err), 'error');
    }
  };

  const generateRanking = async () => {
    try {
      const data = await apiPost<RankingItem[]>('/candidate-ranking/generate', { vacancyId });
      setRanking(data);
      feedback('Ranking assistido gerado.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const generateRecommendations = async () => {
    try {
      const data = await apiPost<CandidateRecommendation[]>('/recommendation-engine/generate', { candidateId, vacancyId });
      setRecommendations(data);
      feedback('Recomendações geradas com explicações.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const analyzeRisk = async () => {
    try {
      const data = await apiPost<RiskResult>('/risk-analysis/analyze', { candidateId, vacancyId });
      setRisk(data);
      feedback('Risco identificado com explicação assistiva.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const suggestWorkflow = async () => {
    try {
      const data = await apiPost<WorkflowSuggestion[]>('/workflow-automation/suggest', { candidateId, vacancyId });
      setSuggestions(data);
      feedback('Ações sugeridas carregadas.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const executeSuggestion = async (suggestionId: string) => {
    try {
      const data = await apiPost<Record<string, unknown>>('/workflow-automation/execute', { suggestionId });
      setResult(data);
      feedback('Automação assistida executada com override humano.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
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
      feedback(String(err), 'error');
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
        description="Matching, insights, comparador e ranking assistido — a decisão final é sempre humana."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Matching */}
        <Card>
          <CardHeader>
            <CardTitle>Matching</CardTitle>
            <CardDescription>Calcule o score de compatibilidade candidato-vaga.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Aplicação"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void compute(); }} disabled={!applicationId}>
              Calcular
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

        {/* Insights & Compare */}
        <Card>
          <CardHeader>
            <CardTitle>Insights &amp; Comparação</CardTitle>
            <CardDescription>Gere insights individuais ou compare dois candidatos.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Vaga"
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
            />
            <Input
              label="ID do Candidato"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
            />
            <Input
              label="ID do Outro Candidato (para comparação)"
              value={otherCandidateId}
              onChange={(e) => setOtherCandidateId(e.target.value)}
            />
          </CardContent>
          <CardFooter style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => { void generateInsights(); }}
              disabled={!vacancyId || !candidateId}
            >
              Gerar Insights
            </Button>
            <Button
              variant="outline"
              onClick={() => { void compare(); }}
              disabled={!vacancyId || !candidateId || !otherCandidateId}
            >
              Comparar Candidatos
            </Button>
          </CardFooter>
        </Card>

        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Assistido</CardTitle>
            <CardDescription>Gere e ajuste o ranking de candidatos para a vaga.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => { void generateRanking(); }}
              disabled={!vacancyId}
            >
              Gerar Ranking
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

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recomendações IA</CardTitle>
            <CardDescription>Recomendações personalizadas com explicações da IA.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => { void generateRecommendations(); }}
              disabled={!vacancyId || !candidateId}
            >
              Gerar Recomendações
            </Button>
          </CardFooter>
          {recommendations.length > 0 && (
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
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
                      <p
                        style={{
                          margin: `${spacing.xs}px 0 0`,
                          color: colors.textSecondary,
                          fontSize: fontSize.sm,
                        }}
                      >
                        {item.explanation}
                      </p>
                    </div>
                    <Badge variant={confidenceVariant(item.confidence)} size="sm">
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Risk */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Risco</CardTitle>
            <CardDescription>Identifique riscos potenciais com explicação assistiva.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="danger"
              onClick={() => { void analyzeRisk(); }}
              disabled={!vacancyId || !candidateId}
            >
              Analisar Risco
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
                  <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, margin: 0 }}>
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
                            padding: spacing.sm,
                            background: '#f8f9fa',
                            borderRadius: radius.sm,
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

        {/* Workflow Automation */}
        <Card>
          <CardHeader>
            <CardTitle>Automação</CardTitle>
            <CardDescription>Sugestões de ações automatizadas com controle humano.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => { void suggestWorkflow(); }}
              disabled={!vacancyId || !candidateId}
            >
              Sugerir Ações
            </Button>
          </CardFooter>
          {suggestions.length > 0 && (
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {suggestions.map((item) => (
                <Card key={item.id} variant="outlined">
                  <CardContent>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                          <Badge variant="info" size="sm">{item.suggestionType}</Badge>
                          <Badge variant="neutral" size="sm">{item.status}</Badge>
                        </div>
                        <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm }}>
                          {item.explanation}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { void executeSuggestion(item.id); }}
                      >
                        Executar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
