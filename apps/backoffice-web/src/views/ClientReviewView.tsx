import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, Decision } from '../services/types.js';
import {
  Button,
  Badge,
  StatusPill,
  RiskBadge,
  ScoreGauge,
  AiTag,
  DataTable,
  PageHeader,
  PageContent,
  InlineMessage,
  EmptyState,
  TableSkeleton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  SectionTitle,
  spacing,
  colors,
  fontSize,
  radius,
} from '@connekt/ui';

type DecisionKind = 'approve' | 'reject' | 'interview' | 'hold';

const decisionLabel: Record<DecisionKind, string> = {
  approve: 'Aprovar',
  reject: 'Rejeitar',
  interview: 'Entrevistar',
  hold: 'Aguardar',
};

const decisionBadgeVariant: Record<DecisionKind, 'success' | 'danger' | 'info' | 'warning'> = {
  approve: 'success',
  reject: 'danger',
  interview: 'info',
  hold: 'warning',
};

const decisionButtonVariant: Record<DecisionKind, 'success' | 'danger' | 'outline' | 'secondary'> = {
  approve: 'success',
  interview: 'outline',
  hold: 'secondary',
  reject: 'danger',
};

interface CandidateContext {
  matching?: { overallScore?: number; aiSummary?: string };
  risk?: { riskLevel?: string; score?: number; explanation?: string };
  insights?: { summary?: string; strengths?: string[]; weaknesses?: string[] };
}

export function ClientReviewView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, CandidateContext>>({});
  const [contextLoading, setContextLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void apiGet<Application[]>('/applications')
      .then(setApps)
      .finally(() => setLoading(false));
  }, []);

  const loadContext = async (app: Application) => {
    if (context[app.id] || contextLoading[app.id]) return;
    setContextLoading((prev) => ({ ...prev, [app.id]: true }));
    const [matching, risk, insights] = await Promise.all([
      apiGet<CandidateContext['matching']>(`/candidate-matching/${app.vacancy.id}/${app.candidate.id}`).catch(() => undefined),
      apiGet<CandidateContext['risk']>(`/risk-analysis?candidateId=${app.candidate.id}&vacancyId=${app.vacancy.id}`).catch(() => undefined),
      apiGet<CandidateContext['insights']>(`/candidate-insights/${app.vacancy.id}/${app.candidate.id}`).catch(() => undefined),
    ]);
    setContext((prev) => ({ ...prev, [app.id]: { matching, risk, insights } }));
    setContextLoading((prev) => ({ ...prev, [app.id]: false }));
  };

  const toggleExpand = (app: Application) => {
    if (expandedId === app.id) {
      setExpandedId(null);
    } else {
      setExpandedId(app.id);
      void loadContext(app);
    }
  };

  const decide = async (appId: string, decision: string) => {
    if (!user) return;
    try {
      await apiPost<Decision>('/client-decisions', {
        shortlistItemId: appId,
        reviewerId: user.id,
        decision,
      });
      setDecisions((prev) => ({ ...prev, [appId]: decision }));
      setMsg(`Decisão "${decisionLabel[decision as DecisionKind] ?? decision}" registrada.`);
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  };

  const columns = [
    {
      key: 'candidate',
      header: 'Candidato',
      render: (row: Application) => row.candidate.email,
      searchValue: (row: Application) => row.candidate.email,
    },
    {
      key: 'vacancy',
      header: 'Vaga',
      render: (row: Application) => row.vacancy.title,
      searchValue: (row: Application) => row.vacancy.title,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Application) => <StatusPill status={row.status} />,
    },
    {
      key: 'context',
      header: 'Contexto',
      render: (row: Application) => {
        const ctx = context[row.id];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            {ctx?.matching?.overallScore !== undefined && (
              <Badge variant={ctx.matching.overallScore >= 70 ? 'success' : ctx.matching.overallScore >= 50 ? 'warning' : 'danger'} size="sm">
                {ctx.matching.overallScore}%
              </Badge>
            )}
            {ctx?.risk?.riskLevel && (
              <RiskBadge level={ctx.risk.riskLevel as 'low' | 'medium' | 'high' | 'critical'} />
            )}
            <Button variant="outline" size="sm" onClick={() => toggleExpand(row)}>
              {expandedId === row.id ? 'Fechar' : 'Detalhes'}
            </Button>
          </div>
        );
      },
    },
    {
      key: 'decision',
      header: 'Decisão',
      render: (row: Application) => {
        const d = decisions[row.id];
        if (d) {
          return (
            <Badge variant={decisionBadgeVariant[d as DecisionKind] ?? 'neutral'}>
              {decisionLabel[d as DecisionKind] ?? d}
            </Badge>
          );
        }
        return (
          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
            {(['approve', 'interview', 'hold', 'reject'] as DecisionKind[]).map((kind) => (
              <Button
                key={kind}
                variant={decisionButtonVariant[kind]}
                size="sm"
                onClick={() => { void decide(row.id, kind); }}
              >
                {decisionLabel[kind]}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  const renderExpandedPanel = (app: Application) => {
    const ctx = context[app.id];
    const isLoading = contextLoading[app.id];

    if (isLoading) {
      return (
        <Card style={{ marginBottom: spacing.md, borderLeft: `3px solid ${colors.accent}` }}>
          <CardContent>
            <TableSkeleton rows={3} columns={2} />
          </CardContent>
        </Card>
      );
    }

    if (!ctx) return null;

    return (
      <Card style={{ marginBottom: spacing.md, borderLeft: `3px solid ${colors.accent}` }}>
        <CardContent>
          <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
            {/* Score */}
            {ctx.matching?.overallScore !== undefined && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
                <ScoreGauge value={ctx.matching.overallScore} size={72} label="Matching" />
              </div>
            )}

            {/* Risk */}
            {ctx.risk && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <SectionTitle>Análise de Risco</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  {ctx.risk.riskLevel && <RiskBadge level={ctx.risk.riskLevel as 'low' | 'medium' | 'high' | 'critical'} />}
                  {ctx.risk.score !== undefined && (
                    <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Score: {ctx.risk.score}</span>
                  )}
                </div>
                {ctx.risk.explanation && (
                  <p style={{ fontSize: fontSize.sm, color: colors.textSecondary, margin: 0 }}>{ctx.risk.explanation}</p>
                )}
              </div>
            )}

            {/* Insights */}
            {ctx.insights && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <SectionTitle>Insights IA</SectionTitle>
                <AiTag />
                {ctx.insights.summary && (
                  <p style={{ fontSize: fontSize.sm, color: colors.textSecondary, margin: `${spacing.xs}px 0` }}>{ctx.insights.summary}</p>
                )}
                {ctx.insights.strengths && ctx.insights.strengths.length > 0 && (
                  <div style={{ marginBottom: spacing.xs }}>
                    <strong style={{ fontSize: fontSize.xs, color: colors.success }}>Pontos fortes:</strong>
                    <ul style={{ margin: `${spacing.xs}px 0 0`, paddingLeft: spacing.md }}>
                      {ctx.insights.strengths.map((s, i) => (
                        <li key={i} style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {ctx.insights.weaknesses && ctx.insights.weaknesses.length > 0 && (
                  <div>
                    <strong style={{ fontSize: fontSize.xs, color: colors.danger }}>Áreas de atenção:</strong>
                    <ul style={{ margin: `${spacing.xs}px 0 0`, paddingLeft: spacing.md }}>
                      {ctx.insights.weaknesses.map((w, i) => (
                        <li key={i} style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* AI Summary */}
            {ctx.matching?.aiSummary && (
              <div style={{ width: '100%', padding: spacing.sm, background: colors.infoLight, borderRadius: radius.md, fontSize: fontSize.sm, color: colors.info }}>
                <AiTag /> <em>{ctx.matching.aiSummary}</em>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageContent>
      <PageHeader
        title="Revisão do Cliente"
        description="Revise candidatos com score, risco e insights antes de decidir."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : apps.length === 0 ? (
        <EmptyState
          title="Nenhuma aplicação encontrada"
          description="Aplicações aparecerão aqui quando disponíveis para revisão."
        />
      ) : (
        <>
          <DataTable<Application>
            columns={columns}
            data={apps}
            rowKey={(row) => row.id}
            emptyMessage="Nenhuma aplicação encontrada"
            searchable
            searchPlaceholder="Buscar candidato ou vaga…"
          />

          {expandedId && (
            <div style={{ marginTop: spacing.md }}>
              {renderExpandedPanel(apps.find((a) => a.id === expandedId)!)}
            </div>
          )}
        </>
      )}
    </PageContent>
  );
}
