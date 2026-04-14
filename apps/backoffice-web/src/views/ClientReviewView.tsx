import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  InlineMessage,
  PageContent,
  PageHeader,
  ScoreGauge,
  Select,
  StatBox,
  StatusPill,
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
import { CandidateProfileModal } from '../components/candidate/CandidateProfileModal.js';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet, apiPost } from '../services/api.js';
import type { Decision, ShortlistItemWithApplication } from '../services/types.js';

/* ── Decision helpers ────────────────────────────────────────────────── */

type DecisionKind = 'approve' | 'reject' | 'interview' | 'hold';

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

/* ── Utility helpers ─────────────────────────────────────────────────── */

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

const formatRelativeDate = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days} dias atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
};

/* ── Main view ───────────────────────────────────────────────────────── */

export function ClientReviewView() {
  const { user } = useAuth();

  /* data state */
  const [items, setItems] = useState<ShortlistItemWithApplication[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  /* UI state */
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [vacancyFilter, setVacancyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  /* feedback */
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* decision confirm dialog */
  const [confirmDialog, setConfirmDialog] = useState<{ itemId: string; kind: DecisionKind; candidateName: string } | null>(null);
  const [deciding, setDeciding] = useState(false);

  /* comment dialog */
  const [commentDialog, setCommentDialog] = useState<{ appId: string; candidateName: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  /* ── Data loading ─────────────────────────────────────────────────── */

  useEffect(() => {
    void Promise.all([
      apiGet<ShortlistItemWithApplication[]>('/shortlist/items').then(setItems),
      apiGet<Array<{ id: string; shortlistItemId: string; decision: string }>>('/client-decisions')
        .then((list) => {
          const map: Record<string, string> = {};
          list.forEach((d) => { map[d.shortlistItemId] = d.decision; });
          setDecisions(map);
        })
        .catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  /* ── Computed data ────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => !decisions[i.id]).length;
    const approved = items.filter((i) => decisions[i.id] === 'approve').length;
    const rejected = items.filter((i) => decisions[i.id] === 'reject').length;
    const interview = items.filter((i) => decisions[i.id] === 'interview').length;
    const hold = items.filter((i) => decisions[i.id] === 'hold').length;
    const progress = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    return { total, pending, approved, rejected, interview, hold, progress };
  }, [items, decisions]);

  const vacancies = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((i) => seen.set(i.application.vacancy.id, i.application.vacancy.title));
    return Array.from(seen, ([id, title]) => ({ value: id, label: title }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    /* tab filter */
    if (activeTab === 'pending') result = result.filter((i) => !decisions[i.id]);
    else if (activeTab === 'decided') result = result.filter((i) => Boolean(decisions[i.id]));
    else if (activeTab === 'approved') result = result.filter((i) => decisions[i.id] === 'approve');
    else if (activeTab === 'rejected') result = result.filter((i) => decisions[i.id] === 'reject');

    /* vacancy filter */
    if (vacancyFilter) result = result.filter((i) => i.application.vacancy.id === vacancyFilter);

    /* search */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((i) => {
        const name = (i.application.candidate.profile?.fullName ?? '').toLowerCase();
        const email = i.application.candidate.email.toLowerCase();
        const vacancy = i.application.vacancy.title.toLowerCase();
        return name.includes(q) || email.includes(q) || vacancy.includes(q);
      });
    }

    return result;
  }, [items, decisions, activeTab, vacancyFilter, searchTerm]);

  /* ── Actions ──────────────────────────────────────────────────────── */

  const decide = useCallback(async (shortlistItemId: string, decision: DecisionKind) => {
    if (!user) return;
    setDeciding(true);
    try {
      await apiPost<Decision>('/client-decisions', {
        shortlistItemId,
        reviewerId: user.id,
        decision,
      });
      setDecisions((prev) => ({ ...prev, [shortlistItemId]: decision }));
      setMsg(`Decisão "${decisionMeta[decision].label}" registrada com sucesso.`);
      setMsgVariant('success');
      setConfirmDialog(null);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
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
      setMsg('Comentário enviado com sucesso.');
      setMsgVariant('success');
      setCommentDialog(null);
      setCommentText('');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
      setMsgVariant('error');
    } finally {
      setCommenting(false);
    }
  }, [commentDialog, commentText]);

  const openDecisionConfirm = (itemId: string, kind: DecisionKind, candidateName: string) => {
    setConfirmDialog({ itemId, kind, candidateName });
  };

  const changeDecision = (itemId: string, candidateName: string) => {
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setMsg(`Decisão anterior removida. Selecione uma nova decisão para ${candidateName}.`);
    setMsgVariant('success');
  };

  /* ── Tab configuration ────────────────────────────────────────────── */

  const tabs = [
    { key: 'all', label: 'Todos', badge: stats.total },
    { key: 'pending', label: 'Pendentes', badge: stats.pending },
    { key: 'approved', label: 'Aprovados', badge: stats.approved },
    { key: 'decided', label: 'Decididos', badge: stats.total - stats.pending },
    { key: 'rejected', label: 'Rejeitados', badge: stats.rejected },
  ];

  /* ── Render ────────────────────────────────────────────────────────── */

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title="Revisão de Candidatos"
        description="Analise o dossiê de cada candidato com inteligência assistiva e registre sua decisão."
      />

      {/* Feedback message */}
      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ display: 'grid', gap: spacing.lg }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: spacing.md }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 88, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}` }} />
            ))}
          </div>
          <div style={{ display: 'grid', gap: spacing.md }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 140, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}` }} />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum candidato na shortlist"
          description="Os candidatos pré-selecionados aparecerão aqui quando o recrutador enviar para sua revisão."
          icon="📋"
        />
      ) : (
        <>
          {/* Stats dashboard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            <StatBox label="Total na shortlist" value={stats.total} subtext="candidatos para revisão" />
            <StatBox label="Pendentes" value={stats.pending} subtext={stats.pending === 0 ? 'Tudo revisado!' : 'aguardando decisão'} />
            <StatBox label="Aprovados" value={stats.approved} subtext="candidatos aprovados" />
            <StatBox label="Entrevistas" value={stats.interview} subtext="agendamentos solicitados" />
            <div style={{ padding: spacing.md, background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: radius.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: shadows.sm, transition: 'all 0.2s ease', cursor: 'default' }} className="hover-card">
              <ScoreGauge value={stats.progress} size={56} strokeWidth={5} />
              <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }}>Progresso</div>
            </div>
          </div>

          {/* Filters bar */}
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: spacing.md }}>
            <div style={{ flex: '1 1 280px', minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buscar candidato</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, e-mail ou vaga..."
                style={{
                  width: '100%',
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  fontSize: fontSize.md,
                  outline: 'none',
                  background: colors.surface,
                  color: colors.text,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {vacancies.length > 1 && (
              <div style={{ flex: '0 1 260px', minWidth: 180 }}>
                <Select
                  label="Filtrar por vaga"
                  value={vacancyFilter}
                  onChange={(e) => setVacancyFilter(e.target.value)}
                  options={[{ value: '', label: 'Todas as vagas' }, ...vacancies]}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Candidate cards */}
          {filteredItems.length === 0 ? (
            <EmptyState
              title="Nenhum candidato encontrado"
              description="Ajuste os filtros ou a aba para ver outros candidatos."
              icon="🔍"
            />
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {filteredItems.map((item) => {
                const candidate = item.application.candidate;
                const vacancy = item.application.vacancy;
                const name = candidate.profile?.fullName || candidate.email;
                const current = decisions[item.id] as DecisionKind | undefined;
                const meta = current ? decisionMeta[current] : null;

                return (
                  <Card key={item.id} className="hover-card" style={{ overflow: 'hidden', border: current ? `1px solid ${meta!.cardBorder}` : undefined }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.md, padding: spacing.lg }}>
                      {/* Left: candidate info */}
                      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start', minWidth: 0 }}>
                        {/* Avatar */}
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: radius.full,
                          background: colors.primaryLight,
                          color: colors.textInverse,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: fontSize.lg,
                          fontWeight: fontWeight.bold,
                          flexShrink: 0,
                        }}>
                          {initials(name)}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          {/* Name + status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs }}>
                            <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text }}>{name}</span>
                            <StatusPill status={item.application.status} />
                            {current && <Badge variant={meta!.badge}>{meta!.icon} {meta!.label}</Badge>}
                          </div>

                          {/* Meta row */}
                          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm }}>
                            <span title="Vaga">📋 {vacancy.title}</span>
                            {vacancy.location && <span title="Localização">📍 {vacancy.location}</span>}
                            {vacancy.seniority && <span title="Senioridade">🎯 {vacancy.seniority}</span>}
                            <span title="Recebido em">📅 {formatRelativeDate(item.createdAt)}</span>
                          </div>

                          {/* Skills preview */}
                          {(vacancy.requiredSkills?.length ?? 0) > 0 && (
                            <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                              {vacancy.requiredSkills!.slice(0, 5).map((skill) => (
                                <span key={skill} style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: radius.full,
                                  background: colors.infoLight,
                                  color: colors.info,
                                  fontSize: fontSize.xs,
                                  fontWeight: fontWeight.medium,
                                }}>
                                  {skill}
                                </span>
                              ))}
                              {(vacancy.requiredSkills!.length > 5) && (
                                <span style={{ fontSize: fontSize.xs, color: colors.textMuted, alignSelf: 'center' }}>
                                  +{vacancy.requiredSkills!.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Button variant="outline" size="sm" onClick={() => setSelectedApplicationId(item.applicationId)}>
                            Ver dossiê
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setCommentDialog({ appId: item.applicationId, candidateName: name }); setCommentText(''); }}>
                            💬 Comentar
                          </Button>
                        </div>

                        {/* Decision area */}
                        {current ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => changeDecision(item.id, name)}
                              style={{ fontSize: fontSize.xs, color: colors.textMuted }}
                            >
                              Alterar decisão
                            </Button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {decisionOrder.map((kind) => (
                              <Button
                                key={kind}
                                variant={decisionMeta[kind].button}
                                size="sm"
                                onClick={() => openDecisionConfirm(item.id, kind, name)}
                              >
                                {decisionMeta[kind].icon} {decisionMeta[kind].label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Summary footer */}
          {filteredItems.length > 0 && (
            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.lg,
              background: colors.surfaceAlt,
              border: `1px solid ${colors.borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.sm,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
            }}>
              <span>
                Exibindo <strong style={{ color: colors.text }}>{filteredItems.length}</strong> de {items.length} candidatos
              </span>
              <span>
                {stats.pending > 0
                  ? `${stats.pending} decisão(ões) pendente(s)`
                  : '✅ Todas as decisões foram registradas'}
              </span>
            </div>
          )}
        </>
      )}

      {/* ── Candidate profile modal ───────────────────────────────── */}
      <CandidateProfileModal
        applicationId={selectedApplicationId}
        open={Boolean(selectedApplicationId)}
        onClose={() => setSelectedApplicationId(null)}
        viewerRole="client"
      />

      {/* ── Decision confirmation dialog ──────────────────────────── */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onClick={() => !deciding && setConfirmDialog(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !deciding) setConfirmDialog(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: zIndex.modal,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              padding: spacing.xl,
              borderRadius: radius.xl,
              width: '100%',
              maxWidth: 460,
              boxShadow: shadows.lg,
              display: 'grid',
              gap: spacing.md,
            }}
          >
            <div>
              <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>
                Confirmar decisão
              </h3>
              <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
                Você está prestes a registrar a decisão <Badge variant={decisionMeta[confirmDialog.kind].badge}>{decisionMeta[confirmDialog.kind].icon} {decisionMeta[confirmDialog.kind].label}</Badge> para <strong>{confirmDialog.candidateName}</strong>.
              </p>
            </div>

            <div style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              background: colors.surfaceAlt,
              border: `1px solid ${colors.borderLight}`,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              lineHeight: 1.6,
            }}>
              {decisionMeta[confirmDialog.kind].description}
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmDialog(null)} disabled={deciding}>
                Cancelar
              </Button>
              <Button
                variant={decisionMeta[confirmDialog.kind].button}
                onClick={() => { void decide(confirmDialog.itemId, confirmDialog.kind); }}
                loading={deciding}
              >
                {decisionMeta[confirmDialog.kind].icon} Confirmar: {decisionMeta[confirmDialog.kind].label}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comment dialog ────────────────────────────────────────── */}
      {commentDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comment-modal-title"
          onClick={() => !commenting && setCommentDialog(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !commenting) setCommentDialog(null); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: zIndex.modal,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              padding: spacing.xl,
              borderRadius: radius.xl,
              width: '100%',
              maxWidth: 520,
              boxShadow: shadows.lg,
              display: 'grid',
              gap: spacing.md,
            }}
          >
            <div>
              <h3 id="comment-modal-title" style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>
                Comentário para o recrutador
              </h3>
              <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary }}>
                Sobre <strong>{commentDialog.candidateName}</strong>
              </p>
            </div>

            <Textarea
              label="Seu comentário"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva seu feedback, observações ou dúvidas sobre o candidato..."
              rows={5}
            />

            <div style={{
              padding: spacing.sm,
              borderRadius: radius.md,
              background: colors.infoLight,
              fontSize: fontSize.xs,
              color: colors.info,
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
