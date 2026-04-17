import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type {
  Application,
  ApplicationDetail,
  ShortlistItem,
  EvalRecord,
  CandidateMatchingRecord,
  CandidateRiskRecord,
  CandidateInsightRecord,
  CandidateRecommendation,
  WorkflowSuggestion,
  PriorityScore,
  ReviewLinkResult,
  Vacancy,
} from '../services/types.js';
import {
  Badge,
  Button,
  CandidateDossier,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  InlineMessage,
  Input,
  PageContent,
  Select,
  Spinner,
  Tabs,
  Textarea,
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
  zIndex,
} from '@connekt/ui';

const candidateWebBase = import.meta.env.VITE_CANDIDATE_WEB_URL ?? 'http://localhost:5174';

/* ── Helpers ──────────────────────────────────────────────────────────── */

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

async function getOrCompute<T>(getUrl: string, postUrl: string, body: Record<string, string>): Promise<T> {
  return apiGet<T>(getUrl).catch(() => apiPost<T>(postUrl, body));
}

const bandMeta: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  high: { variant: 'danger', label: 'Alta prioridade' },
  medium: { variant: 'warning', label: 'Média prioridade' },
  low: { variant: 'info', label: 'Baixa prioridade' },
};

/* ── StarRating inline component ──────────────────────────────────────── */

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function StarRating({ label, value, onChange, disabled }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <span style={{ fontSize: fontSize.sm, color: colors.textSecondary, minWidth: 160 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              fontSize: 22,
              lineHeight: 1,
              padding: '0 2px',
              color: star <= (hovered || value) ? colors.warning : colors.border,
              transition: 'color 0.1s',
            }}
          >
            ★
          </button>
        ))}
      </div>
      {value > 0 && <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{value}/5</span>}
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────────── */

export function ShortlistView() {
  const { user } = useAuth();

  /* data */
  const [apps, setApps] = useState<Application[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [loading, setLoading] = useState(true);

  /* Workspace selection */
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetail | null>(null);
  const [selectedIntelligence, setSelectedIntelligence] = useState<any>({ recommendations: [], workflowSuggestions: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* UI state */
  const [activeTab, setActiveTab] = useState('pending');
  const [vacancyFilter, setVacancyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* Eval state */
  const [evalComment, setEvalComment] = useState('');
  const [evalRatings, setEvalRatings] = useState({ technical: 0, behavioral: 0, interviewer: 0, ai: 0 });
  const [evalSaving, setEvalSaving] = useState(false);

  /* Sharing */
  const [reviewLinkLoading, setReviewLinkLoading] = useState(false);

  /* ── Initial Load ─────────────────────────────────────────────────── */

  useEffect(() => {
    void Promise.all([
      apiGet<Application[]>('/applications').then(data => {
        setApps(data);
        const pending = data.filter(a => !shortlistedIds.has(a.id));
        if (pending.length > 0 && !selectedAppId) {
          setSelectedAppId(pending[0].id);
        }
      }),
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
    ]).finally(() => setLoading(false));
  }, []);

  /* ── Selection Synch ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!selectedAppId) {
      setSelectedDetail(null);
      setSelectedIntelligence({ recommendations: [], workflowSuggestions: [] });
      setEvalComment('');
      setEvalRatings({ technical: 0, behavioral: 0, interviewer: 0, ai: 0 });
      return;
    }

    let cancelled = false;
    const loadSelection = async () => {
      setLoadingDetail(true);
      try {
        const detail = await apiGet<ApplicationDetail>(`/applications/${selectedAppId}`);
        if (cancelled) return;
        setSelectedDetail(detail);

        const candidateId = detail.candidate.id;
        const vacancyId = detail.vacancy.id;
        const [matching, risk, insights, recommendations, workflowSuggestions] = await Promise.all([
          getOrCompute<CandidateMatchingRecord>(`/candidate-matching/${vacancyId}/${candidateId}`, '/candidate-matching/compute', { applicationId: selectedAppId }),
          getOrCompute<CandidateRiskRecord>(`/risk-analysis?candidateId=${encodeURIComponent(candidateId)}&vacancyId=${encodeURIComponent(vacancyId)}`, '/risk-analysis/analyze', { candidateId, vacancyId }),
          getOrCompute<CandidateInsightRecord>(`/candidate-insights/${vacancyId}/${candidateId}`, '/candidate-insights/generate', { candidateId, vacancyId }),
          apiGet<CandidateRecommendation[]>(`/recommendation-engine/${vacancyId}`)
            .then((items) => items.filter((item) => item.candidateId === candidateId))
            .then(async (items) => items.length > 0 ? items : apiPost<CandidateRecommendation[]>('/recommendation-engine/generate', { candidateId, vacancyId })).catch(() => []),
          Promise.resolve([]),
        ]);

        if (cancelled) return;
        setSelectedIntelligence({ matching, risk, insights, recommendations, workflowSuggestions });
        setEvalComment('');
        setEvalRatings({ technical: 0, behavioral: 0, interviewer: 0, ai: 0 });
      } catch (err) {
        console.error('Error loading dossier for workspace:', err);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };

    void loadSelection();
    return () => { cancelled = true; };
  }, [selectedAppId]);

  /* ── Computed ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => !shortlistedIds.has(a.id)).length;
    const shortlisted = shortlistedIds.size;
    const progress = total > 0 ? Math.round((shortlisted / total) * 100) : 0;
    return { total, pending, shortlisted, progress };
  }, [apps, shortlistedIds]);

  const vacancyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    apps.forEach((a) => seen.set(a.vacancy.id, a.vacancy.title));
    return Array.from(seen, ([id, title]) => ({ value: id, label: title }));
  }, [apps]);

  const filteredApps = useMemo(() => {
    let result = apps;
    if (activeTab === 'pending') result = result.filter((a) => !shortlistedIds.has(a.id));
    else if (activeTab === 'shortlisted') result = result.filter((a) => shortlistedIds.has(a.id));
    if (vacancyFilter) result = result.filter((a) => a.vacancy.id === vacancyFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((a) => {
        const name = (a.candidate.profile?.fullName ?? '').toLowerCase();
        const email = a.candidate.email.toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return result;
  }, [apps, shortlistedIds, activeTab, vacancyFilter, searchTerm]);

  /* ── Actions ──────────────────────────────────────────────────────── */

  const addToShortlist = useCallback(async () => {
    if (!selectedAppId) return;
    try {
      await apiPost<ShortlistItem>('/shortlist', { applicationId: selectedAppId });
      setShortlistedIds((prev) => new Set([...prev, selectedAppId]));
      setMsg('Adicionado à shortlist!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  }, [selectedAppId]);

  const submitEval = useCallback(async () => {
    if (!user || !selectedAppId || !evalComment.trim()) return;
    setEvalSaving(true);
    try {
      await apiPost<EvalRecord>('/evaluations', {
        applicationId: selectedAppId,
        evaluatorId: user.id,
        comment: evalComment,
        ratingTechnical: evalRatings.technical || undefined,
        ratingBehavioral: evalRatings.behavioral || undefined,
        ratingInterviewer: evalRatings.interviewer || undefined,
        ratingAi: evalRatings.ai || undefined,
      });
      setMsg('Avaliação registrada com sucesso!');
      setMsgVariant('success');
      // Refresh selected detail to show new review
      const detail = await apiGet<ApplicationDetail>(`/applications/${selectedAppId}`);
      setSelectedDetail(detail);
      setEvalComment('');
      setEvalRatings({ technical: 0, behavioral: 0, interviewer: 0, ai: 0 });
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setEvalSaving(false);
    }
  }, [user, selectedAppId, evalComment, evalRatings]);

  const generateReviewLink = useCallback(async () => {
    const vId = selectedDetail?.vacancy.id || vacancyFilter || vacancyOptions[0]?.value;
    if (!vId) return;
    setReviewLinkLoading(true);
    try {
      const result = await apiPost<ReviewLinkResult>('/shortlist/review-link', { vacancyId: vId });
      await navigator.clipboard.writeText(result.url).catch(() => undefined);
      setMsg(`Link gerado e copiado! Válido até ${new Date(result.expiresAt).toLocaleString('pt-BR')}.`);
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setReviewLinkLoading(false);
    }
  }, [selectedDetail, vacancyFilter, vacancyOptions]);

  /* ── Render ────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <PageContent>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: spacing.md }}>
          <Spinner size={40} />
          <div style={{ color: colors.textSecondary }}>Carregando dados da shortlist...</div>
        </div>
      </PageContent>
    );
  }

  const isCurrentShortlisted = selectedAppId ? shortlistedIds.has(selectedAppId) : false;

  return (
    <PageContent style={{ padding: 0, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: '100%', background: colors.surface }}>
        
        {/* Sidebar */}
        <aside style={{ borderRight: `1px solid ${colors.borderLight}`, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          <div style={{ padding: spacing.lg, borderBottom: `1px solid ${colors.borderLight}`, background: colors.surface }}>
            <h1 style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, margin: 0, color: colors.primary }}>
              Triagem Ativa
            </h1>
            <p style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 }}>
               {stats.total} total • {stats.pending} pendentes
            </p>
            
            <div style={{ marginTop: spacing.md, display: 'grid', gap: spacing.xs }}>
              <Input 
                placeholder="Filtrar por nome ou email..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                size="sm"
              />
              <Select 
                value={vacancyFilter} 
                onChange={e => setVacancyFilter(e.target.value)}
                options={[{ value: '', label: 'Todas as vagas' }, ...vacancyOptions]}
                size="sm"
              />
            </div>
          </div>

          <div style={{ padding: `${spacing.sm}px ${spacing.lg}px`, background: colors.surface, borderBottom: `1px solid ${colors.borderLight}` }}>
             <Tabs 
                tabs={[
                  { key: 'pending', label: 'Pendentes', badge: stats.pending },
                  { key: 'shortlisted', label: 'Shortlist', badge: stats.shortlisted },
                ]} 
                active={activeTab} 
                onChange={setActiveTab} 
                size="sm"
             />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: spacing.sm }}>
            {filteredApps.length === 0 ? (
              <EmptyState title="Nenhum perfil" description="Ajuste os filtros" size="sm" />
            ) : (
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {filteredApps.map(app => {
                  const isActive = selectedAppId === app.id;
                  const isShortlisted = shortlistedIds.has(app.id);
                  const candidateName = app.candidate.profile?.fullName || app.candidate.email;
                  
                  return (
                    <div 
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      style={{
                        padding: spacing.md,
                        borderRadius: radius.lg,
                        background: isActive ? colors.primaryLight : colors.surface,
                        border: `1px solid ${isActive ? colors.primary : colors.borderLight}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? shadows.sm : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                        <div style={{ 
                          width: 36, height: 36, borderRadius: radius.full, 
                          background: isActive ? colors.surface : (isShortlisted ? colors.successLight : colors.primaryLight),
                          color: isActive ? colors.primary : (isShortlisted ? colors.successDark : colors.textInverse),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: fontSize.sm, fontWeight: fontWeight.bold, flexShrink: 0
                        }}>
                          {app.candidate.profile?.photoUrl ? (
                            <img src={app.candidate.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : isShortlisted ? '✓' : initials(candidateName)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: isActive ? colors.textInverse : colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {candidateName}
                          </div>
                          <div style={{ fontSize: fontSize.xs, color: isActive ? 'rgba(255,255,255,0.8)' : colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {app.vacancy.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: spacing.md, borderTop: `1px solid ${colors.borderLight}`, background: colors.surface }}>
             <Button variant="outline" size="sm" style={{ width: '100%' }} onClick={generateReviewLink} loading={reviewLinkLoading}>
                🔗 Copiar Link para Gestor
             </Button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative' }}>
          {!selectedAppId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState 
                title="Selecione um candidato" 
                description="Clique em um perfil na lista ao lado para iniciar a avaliação premium."
                icon="👆"
              />
            </div>
          ) : (
            <>
              {/* Sticky Action Header */}
              <div style={{ 
                height: 72, padding: `0 ${spacing.xl}px`, borderBottom: `1px solid ${colors.borderLight}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: colors.surface, zIndex: 10, position: 'sticky', top: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold }}>Ações de Headhunter</div>
                  <div style={{ width: 1, height: 24, background: colors.borderLight }} />
                  {msg ? (
                    <Badge variant={msgVariant === 'success' ? 'success' : 'danger'}>{msg}</Badge>
                  ) : (
                    <div style={{ fontSize: fontSize.sm, color: colors.textMuted }}>Valide os dados do dossiê</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                    {isCurrentShortlisted ? (
                      <Badge variant="success" size="lg">✅ Na Shortlist</Badge>
                    ) : (
                      <Button variant="success" size="md" onClick={addToShortlist} style={{ boxShadow: shadows.glow }}>
                         Adicionar à Shortlist
                      </Button>
                    )}
                </div>
              </div>

              {/* Dossier Area */}
              <div style={{ flex: 1, overflowY: 'auto', background: '#fcfcfd' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', padding: spacing.xl }}>
                  {loadingDetail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: spacing.md }}>
                      <Spinner size={32} />
                      <div style={{ color: colors.textSecondary }}>Montando Dossiê e IA...</div>
                    </div>
                  ) : selectedDetail ? (
                    <>
                      <CandidateDossier 
                        detail={selectedDetail} 
                        intelligence={selectedIntelligence} 
                        viewerRole="headhunter" 
                         candidateWebBase={candidateWebBase}
                      />
                      
                      {/* Inline Evaluation Form */}
                      <Card style={{ marginTop: spacing.lg, borderColor: colors.primaryLight }}>
                        <CardHeader><CardTitle>Avaliação do Headhunter</CardTitle></CardHeader>
                        <CardContent>
                           <div style={{ display: 'grid', gap: spacing.md }}>
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spacing.md }}>
                               <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                                  <div style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: spacing.xs }}>
                                     Ranking
                                  </div>
                                  <StarRating label="🔧 Técnica" value={evalRatings.technical} onChange={(v) => setEvalRatings(r => ({ ...r, technical: v }))} disabled={evalSaving} />
                                  <StarRating label="🤝 Comportamental" value={evalRatings.behavioral} onChange={(v) => setEvalRatings(r => ({ ...r, behavioral: v }))} disabled={evalSaving} />
                                  <StarRating label="🎙️ Entrevistador" value={evalRatings.interviewer} onChange={(v) => setEvalRatings(r => ({ ...r, interviewer: v }))} disabled={evalSaving} />
                                  <StarRating label="🤖 IA" value={evalRatings.ai} onChange={(v) => setEvalRatings(r => ({ ...r, ai: v }))} disabled={evalSaving} />
                               </div>
                               <div>
                                  <Textarea
                                     label="Seu parecer profissional"
                                     value={evalComment}
                                     onChange={(e) => setEvalComment(e.target.value)}
                                     placeholder="Este parecer será lido pelo Gestor/Cliente quando aprovarem o perfil..."
                                     rows={8}
                                  />
                               </div>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.xs }}>
                                <Button onClick={submitEval} loading={evalSaving} disabled={!evalComment.trim()}>
                                   Registrar Parecer
                                </Button>
                             </div>
                           </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </PageContent>
  );
}
