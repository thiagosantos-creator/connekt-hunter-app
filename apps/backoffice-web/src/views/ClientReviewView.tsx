import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  PageHeader,
  ScoreGauge,
  Select,
  Spinner,
  StatBox,
  StatusPill,
  TableSkeleton,
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
import { useAuth } from '../hooks/useAuth.js';
import { apiGet, apiPost } from '../services/api.js';
import type { 
  ApplicationDetail, 
  Decision, 
  ShortlistItemWithApplication, 
  Vacancy,
  CandidateInsightRecord,
  CandidateMatchingRecord,
  CandidateRecommendation,
  CandidateRiskRecord,
  WorkflowSuggestion,
} from '../services/types.js';

/* ── Types & Helpers ────────────────────────────────────────────────── */

const candidateWebBase = import.meta.env.VITE_CANDIDATE_WEB_URL ?? 'http://localhost:5174';

type DecisionKind = 'approve' | 'reject' | 'interview' | 'hold';

interface IntelligenceBundle {
  matching?: CandidateMatchingRecord;
  risk?: CandidateRiskRecord;
  insights?: CandidateInsightRecord;
  recommendations: CandidateRecommendation[];
  workflowSuggestions: WorkflowSuggestion[];
}

interface DecisionMetaEntry {
  label: string;
  icon: string;
  badge: 'success' | 'danger' | 'info' | 'warning';
  button: 'success' | 'danger' | 'outline' | 'secondary';
  description: string;
  cardBorder: string;
}

const decisionMeta: Record<DecisionKind, DecisionMetaEntry> = {
  approve:   { label: 'Aprovar',      icon: '✓', badge: 'success', button: 'success',   description: 'O candidato será aprovado e seguirá para o próximo passo do processo.', cardBorder: colors.successLight },
  interview: { label: 'Entrevistar',  icon: '📅', badge: 'info',    button: 'outline',   description: 'O candidato será agendado para uma entrevista presencial ou remota.', cardBorder: colors.infoLight },
  hold:      { label: 'Aguardar',     icon: '⏸', badge: 'warning', button: 'secondary', description: 'O candidato ficará em espera até uma decisão posterior.', cardBorder: colors.warningLight },
  reject:    { label: 'Rejeitar',     icon: '✕', badge: 'danger',  button: 'danger',    description: 'O candidato será recusado e notificado conforme a política definida.', cardBorder: colors.dangerLight },
};

const decisionOrder: DecisionKind[] = ['approve', 'interview', 'hold', 'reject'];

async function getOrCompute<T>(getUrl: string, postUrl: string, body: Record<string, string>): Promise<T> {
  return apiGet<T>(getUrl).catch(() => apiPost<T>(postUrl, body));
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

/* ── Main view ───────────────────────────────────────────────────────── */

export function ClientReviewView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────────────── */
  const [items, setItems] = useState<ShortlistItemWithApplication[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [vacancyList, setVacancyList] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);

  /* Workspace selection */
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetail | null>(null);
  const [selectedIntelligence, setSelectedIntelligence] = useState<IntelligenceBundle>({ recommendations: [], workflowSuggestions: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* UI state */
  const [activeTab, setActiveTab] = useState('pending');
  const [vacancyFilter, setVacancyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  /* Feedback */
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* Decision & Comments */
  const [confirmDialog, setConfirmDialog] = useState<{ itemId: string; kind: DecisionKind; candidateName: string; shortlistItemId: string } | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [commentDialog, setCommentDialog] = useState<{ appId: string; candidateName: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  /* ── Initial Load ─────────────────────────────────────────────────── */

  useEffect(() => {
    void Promise.all([
      apiGet<ShortlistItemWithApplication[]>('/shortlist/items').then((data) => {
          setItems(data);
          const pending = data.filter(i => !decisions[i.id]);
          if (pending.length > 0 && !selectedAppId) {
            setSelectedAppId(pending[0].applicationId);
          }
      }),
      apiGet<Array<{ id: string; shortlistItemId: string; decision: string }>>('/client-decisions')
        .then((list) => {
          const map: Record<string, string> = {};
          list.forEach((d) => { map[d.shortlistItemId] = d.decision; });
          setDecisions(map);
        }),
      apiGet<Vacancy[]>('/vacancies').then(setVacancyList),
    ]).finally(() => setLoading(false));
  }, []);

  /* ── Selection Synch ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!selectedAppId) {
      setSelectedDetail(null);
      setSelectedIntelligence({ recommendations: [], workflowSuggestions: [] });
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
          getOrCompute<CandidateMatchingRecord>(
            `/candidate-matching/${vacancyId}/${candidateId}`,
            '/candidate-matching/compute',
            { applicationId: selectedAppId },
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
          Promise.resolve([]),
        ]);

        if (cancelled) return;
        setSelectedIntelligence({ matching, risk, insights, recommendations, workflowSuggestions });
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
    const total = items.length;
    const pending = items.filter((i) => !decisions[i.id]).length;
    const progress = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    return { total, pending, progress };
  }, [items, decisions]);

  const vacancies = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => seen.set(i.application.vacancy.id, i.application.vacancy.title));
    return Array.from(seen, ([id, title]) => ({ value: id, label: title }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab === 'pending') result = result.filter((i) => !decisions[i.id]);
    else if (activeTab === 'decided') result = result.filter((i) => Boolean(decisions[i.id]));
    if (vacancyFilter) result = result.filter((i) => i.application.vacancy.id === vacancyFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((i) => {
        const name = (i.application.candidate.profile?.fullName ?? '').toLowerCase();
        const vacancy = i.application.vacancy.title.toLowerCase();
        return name.includes(q) || vacancy.includes(q);
      });
    }
    return result;
  }, [items, decisions, activeTab, vacancyFilter, searchTerm]);

  /* ── Actions ──────────────────────────────────────────────────────── */

  const decide = useCallback(async (shortlistItemId: string, decision: DecisionKind) => {
    if (!user) return;
    setDeciding(true);
    try {
      await apiPost<Decision>('/client-decisions', { shortlistItemId, reviewerId: user.id, decision });
      setDecisions((prev) => ({ ...prev, [shortlistItemId]: decision }));
      setMsg(`Candidato ${decision === 'approve' ? 'aprovado' : decision === 'reject' ? 'recusado' : 'atualizado'} com sucesso.`);
      setMsgVariant('success');
      setConfirmDialog(null);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Falha ao registrar decisão.');
      setMsgVariant('error');
    } finally {
      setDeciding(false);
    }
  }, [user]);

  const sendComment = useCallback(async () => {
    if (!commentDialog || !commentText.trim()) return;
    setCommenting(true);
    try {
      await apiPost('/client-comments', { applicationId: commentDialog.appId, comment: commentText });
      setMsg('Feedback enviado para o recrutador.');
      setMsgVariant('success');
      setCommentDialog(null);
      setCommentText('');
    } catch (error) {
      setMsg('Falha ao enviar comentário.');
      setMsgVariant('error');
    } finally {
      setCommenting(false);
    }
  }, [commentDialog, commentText]);

  /* ── Render ────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <PageContent>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: spacing.md }}>
          <Spinner size={40} />
          <div style={{ color: colors.textSecondary }}>Carregando painel de decisões...</div>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent style={{ padding: 0, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: '100%', background: colors.surface }}>
        
        <aside style={{ borderRight: `1px solid ${colors.borderLight}`, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          <div style={{ padding: spacing.lg, borderBottom: `1px solid ${colors.borderLight}`, background: colors.surface }}>
            <h1 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, margin: 0, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              Shortlist <Badge variant="info">{stats.total}</Badge>
            </h1>
            <p style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 }}>Selecione um perfil para analisar e decidir.</p>
            
            <div style={{ marginTop: spacing.md, display: 'grid', gap: spacing.xs }}>
              <Input 
                placeholder="Filtrar por nome..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                size="sm"
              />
              <Select 
                value={vacancyFilter} 
                onChange={e => setVacancyFilter(e.target.value)}
                options={[{ value: '', label: 'Todas as vagas' }, ...vacancies]}
                size="sm"
              />
            </div>
          </div>

          <div style={{ padding: `${spacing.sm}px ${spacing.lg}px`, background: colors.surface, borderBottom: `1px solid ${colors.borderLight}` }}>
             <Tabs 
                tabs={[
                  { key: 'pending', label: 'Pendentes', badge: stats.pending },
                  { key: 'decided', label: 'Decididos', badge: stats.total - stats.pending },
                ]} 
                active={activeTab} 
                onChange={setActiveTab} 
                size="sm"
             />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: spacing.sm }}>
            {filteredItems.length === 0 ? (
              <EmptyState title="Nenhum perfil" description="Ajuste os filtros" size="sm" />
            ) : (
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {filteredItems.map(item => {
                  const isActive = selectedAppId === item.applicationId;
                  const decision = decisions[item.id] as DecisionKind;
                  const candidateName = item.application.candidate.profile?.fullName || item.application.candidate.email;
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedAppId(item.applicationId)}
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
                          background: isActive ? colors.surface : colors.primaryLight,
                          color: isActive ? colors.primary : colors.textInverse,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: fontSize.sm, fontWeight: fontWeight.bold, flexShrink: 0
                        }}>
                          {item.application.candidate.profile?.photoUrl ? (
                            <img src={item.application.candidate.profile.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : initials(candidateName)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: isActive ? colors.textInverse : colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {candidateName}
                          </div>
                          <div style={{ fontSize: fontSize.xs, color: isActive ? 'rgba(255,255,255,0.8)' : colors.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.application.vacancy.title}
                          </div>
                        </div>
                      </div>
                      
                      {decision && (
                        <div style={{ marginTop: spacing.xs }}>
                          <Badge variant={decisionMeta[decision].badge} size="xs">
                            {decisionMeta[decision].icon} {decisionMeta[decision].label}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: spacing.md, borderTop: `1px solid ${colors.borderLight}`, background: colors.surface }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
              <span style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Progresso da revisão</span>
              <span style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{stats.progress}%</span>
            </div>
            <div style={{ height: 6, width: '100%', background: colors.borderLight, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.progress}%`, background: colors.success, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative' }}>
          {!selectedAppId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState 
                title="Selecione um candidato" 
                description="Clique em um perfil na lista ao lado para iniciar a avaliação premium."
                icon="👈"
              />
            </div>
          ) : (
            <>
              <div style={{ 
                minHeight: 80, padding: `${spacing.sm}px ${spacing.xl}px`, borderBottom: `1px solid ${colors.borderLight}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md,
                background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)',
                zIndex: 10, position: 'sticky', top: 0, boxShadow: '0 4px 32px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                  <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primaryDark }}>Ações de Decisão</div>
                  <div style={{ width: 1, height: 28, background: colors.border }} />
                  {msg ? (
                    <Badge variant={msgVariant === 'success' ? 'success' : 'danger'}>{msg}</Badge>
                  ) : (
                    <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Avalie os dados e a IA abaixo antes de finalizar</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                  {decisions[items.find(i => i.applicationId === selectedAppId)?.id || ''] ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                       <Badge variant={decisionMeta[decisions[items.find(i => i.applicationId === selectedAppId)?.id || ''] as DecisionKind].badge} size="lg">
                         Decisão: {decisionMeta[decisions[items.find(i => i.applicationId === selectedAppId)?.id || ''] as DecisionKind].label}
                       </Badge>
                       <Button variant="outline" size="sm" onClick={() => {
                          const itemId = items.find(i => i.applicationId === selectedAppId)?.id;
                          if (itemId) setDecisions(prev => {
                            const next = {...prev};
                            delete next[itemId];
                            return next;
                          });
                       }}>Alterar</Button>
                     </div>
                  ) : (
                    <div style={{ display: 'flex', gap: spacing.sm }}>
                      <Button variant="ghost" size="sm" onClick={() => setCommentDialog({ appId: selectedAppId, candidateName: selectedDetail?.candidate.profile?.fullName || '' })}>
                        💬 Feedback p/ Recrutador
                      </Button>
                      {decisionOrder.map(kind => (
                        <Button 
                          key={kind} 
                          variant={decisionMeta[kind].button} 
                          size="sm"
                          onClick={() => {
                            const item = items.find(i => i.applicationId === selectedAppId);
                            if (item) setConfirmDialog({ 
                              itemId: item.id, 
                              shortlistItemId: item.id,
                              kind, 
                              candidateName: item.application.candidate.profile?.fullName || item.application.candidate.email 
                            });
                          }}
                        >
                          {decisionMeta[kind].icon} {decisionMeta[kind].label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', background: '#fcfcfd' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', padding: spacing.xl }}>
                  {loadingDetail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: spacing.md }}>
                      <Spinner size={32} />
                      <div style={{ color: colors.textSecondary }}>Consolidando dossiê premium...</div>
                    </div>
                  ) : selectedDetail && (
                    <CandidateDossier 
                      detail={selectedDetail} 
                      intelligence={selectedIntelligence} 
                      viewerRole="client" 
                      candidateWebBase={candidateWebBase}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {confirmDialog && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setConfirmDialog(null)}>
            <div style={{ background: '#fff', padding: spacing.xl, borderRadius: radius.xl, maxWidth: 450, width: '90%', display: 'grid', gap: spacing.md }} onClick={e => e.stopPropagation()}>
               <h3 style={{ margin: 0, fontSize: fontSize.xl }}>Confirmar Decisão</h3>
               <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textSecondary }}>
                 Registrar <strong>{decisionMeta[confirmDialog.kind].label}</strong> para {confirmDialog.candidateName}?
               </p>
               <div style={{ padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.md, fontSize: fontSize.sm, color: colors.textMuted }}>
                 {decisionMeta[confirmDialog.kind].description}
               </div>
               <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.md }}>
                 <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
                 <Button variant={decisionMeta[confirmDialog.kind].button} loading={deciding} onClick={() => decide(confirmDialog.shortlistItemId, confirmDialog.kind)}>
                   {confirmDialog.kind === 'approve' ? 'Sim, Aprovar' : 'Confirmar'}
                 </Button>
               </div>
            </div>
         </div>
      )}

      {commentDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCommentDialog(null)}>
          <div style={{ background: '#fff', padding: spacing.xl, borderRadius: radius.xl, maxWidth: 500, width: '90%', display: 'grid', gap: spacing.md }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: fontSize.xl }}>Adicionar Comentário</h3>
            <Textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Descreva o motivo da decisão ou envie uma observação para o recrutador..."
              rows={4}
              autoFocus
            />
            <div style={{
              padding: spacing.md,
              borderRadius: radius.md,
              background: colors.infoLight,
              fontSize: fontSize.xs,
              color: colors.infoDark,
              lineHeight: 1.6,
            }}>
              💡 Seu comentário será visível para o recrutador responsável e ficará registrado no histórico do candidato.
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setCommentDialog(null)} disabled={commenting}>
                Cancelar
              </Button>
              <Button
                onClick={() => { void sendComment(); }}
                loading={commenting}
                disabled={!commentText.trim()}
              >
                Enviar comentário
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
