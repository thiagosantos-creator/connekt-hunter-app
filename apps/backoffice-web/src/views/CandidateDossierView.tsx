import { startTransition, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  CandidateDossier,
  InlineMessage,
  PageContent,
  Spinner,
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@connekt/ui';
import { apiGet, apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type {
  ApplicationDetail,
  CandidateInsightRecord,
  CandidateMatchingRecord,
  CandidateRecommendation,
  CandidateRiskRecord,
  WorkflowSuggestion,
} from '../services/types.js';

const candidateWebBase = import.meta.env.VITE_CANDIDATE_WEB_URL ?? 'http://localhost:5174';

interface IntelligenceBundle {
  matching?: CandidateMatchingRecord;
  risk?: CandidateRiskRecord;
  insights?: CandidateInsightRecord;
  recommendations: CandidateRecommendation[];
  workflowSuggestions: WorkflowSuggestion[];
}

/** Tries GET first; if it fails, falls back to POST to trigger computation. */
async function getOrCompute<T>(getUrl: string, postUrl: string, body: Record<string, string>): Promise<T> {
  return apiGet<T>(getUrl).catch(() => apiPost<T>(postUrl, body));
}

export function CandidateDossierView() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerRole = (user?.role as 'admin' | 'headhunter' | 'client') ?? 'client';

  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligenceBundle>({ recommendations: [], workflowSuggestions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;

    const load = async () => {
      try {
        startTransition(() => {
          setLoading(true);
          setError('');
          setIntelligence({ recommendations: [], workflowSuggestions: [] });
        });

        const dossier = await apiGet<ApplicationDetail>(`/applications/${applicationId}`);
        if (cancelled) return;
        setDetail(dossier);

        const candidateId = dossier.candidate.id;
        const vacancyId = dossier.vacancy.id;
        const [matching, risk, insights, recommendations, workflowSuggestions] = await Promise.all([
          getOrCompute<CandidateMatchingRecord>(
            `/candidate-matching/${vacancyId}/${candidateId}`,
            '/candidate-matching/compute',
            { applicationId },
          ),
          getOrCompute<CandidateRiskRecord>(
            `/risk-analysis?candidateId=${encodeURIComponent(candidateId)}&vacancyId=${encodeURIComponent(vacancyId)}`,
            '/risk-analysis/analyze',
            { candidateId, vacancyId },
          ),
          getOrCompute<CandidateInsightRecord>(
            `/candidate-insights/${vacancyId}/${candidateId}`,
            '/candidate-insights/generate',
            { candidateId, vacancyId },
          ),
          apiGet<CandidateRecommendation[]>(`/recommendation-engine/${vacancyId}`)
            .then((items) => items.filter((item) => item.candidateId === candidateId))
            .then(async (items) => items.length > 0 ? items : apiPost<CandidateRecommendation[]>('/recommendation-engine/generate', { candidateId, vacancyId }))
            .catch(() => []),
          viewerRole === 'client' ? Promise.resolve([]) : apiPost<WorkflowSuggestion[]>('/workflow-automation/suggest', { candidateId, vacancyId }).catch(() => []),
        ]);

        if (cancelled) return;
        setIntelligence({ matching, risk, insights, recommendations, workflowSuggestions });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [applicationId, viewerRole]);

  const backPath = viewerRole === 'client' ? '/client-review' : '/applications';
  const name = detail?.candidate.profile?.fullName || detail?.candidate.email || 'Candidato';

  return (
    <PageContent>
      {/* ── Top nav bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm }}>
        <div>
          <div style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: spacing.xs }}>
          Perfil do candidato
          </div>
          <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>
            {loading && !detail ? 'Carregando...' : name}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(backPath)}>
          ← Voltar
        </Button>
      </div>

      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}

      {loading && !detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingTop: spacing.xxl, paddingBottom: spacing.xxl }}>
          <Spinner size={32} />
          <div style={{ fontSize: fontSize.md, color: colors.textSecondary }}>Carregando perfil do candidato...</div>
          <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Consolidando dados de IA, matching e avaliações</div>
        </div>
      ) : (
        <CandidateDossier 
            detail={detail} 
            intelligence={intelligence} 
            viewerRole={viewerRole} 
            candidateWebBase={candidateWebBase}
        />
      )}
    </PageContent>
  );
}
