import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  InlineMessage,
  PageContent,
  TableSkeleton,
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
  zIndex,
} from '@connekt/ui';
import { apiPublicGet, apiPublicPost } from '../services/api.js';
import type { PublicReviewShortlistItem } from '../services/types.js';

type DecisionKind = 'approve' | 'reject' | 'interview' | 'hold';

const decisionMeta: Record<DecisionKind, { label: string; icon: string; button: 'primary' | 'danger' | 'secondary' | 'success'; badge: 'success' | 'danger' | 'info' | 'warning'; description: string }> = {
  approve: { label: 'Aprovar', icon: '✅', button: 'success', badge: 'success', description: 'Candidato aprovado para a próxima fase do processo.' },
  reject: { label: 'Reprovar', icon: '❌', button: 'danger', badge: 'danger', description: 'Candidato não avança nesta vaga.' },
  interview: { label: 'Entrevista', icon: '🎙️', button: 'primary', badge: 'info', description: 'Candidato indicado para entrevista.' },
  hold: { label: 'Em espera', icon: '⏸️', button: 'secondary', badge: 'warning', description: 'Manter candidato em espera para decisão futura.' },
};

const decisionOrder: DecisionKind[] = ['approve', 'interview', 'hold', 'reject'];

const initials = (name: string | null) =>
  (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export function PublicClientReviewView() {
  const { token } = useParams<{ token: string }>();

  const [items, setItems] = useState<PublicReviewShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* decision dialog */
  const [confirmDialog, setConfirmDialog] = useState<{ itemId: string; kind: DecisionKind; candidateName: string } | null>(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    apiPublicGet<PublicReviewShortlistItem[]>(`/shortlist/public/${token}`)
      .then(setItems)
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const decide = useCallback(async (itemId: string, kind: DecisionKind) => {
    if (!token) return;
    setDeciding(true);
    try {
      await apiPublicPost('/client-decisions/public', { shortlistItemId: itemId, decision: kind, token });
      setItems((prev) => prev.map((item) => item.id === itemId ? { ...item, currentDecision: kind } : item));
      setMsg(`Decisão "${decisionMeta[kind].label}" registrada com sucesso.`);
      setMsgVariant('success');
      setConfirmDialog(null);
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setDeciding(false);
    }
  }, [token]);

  const openDecisionConfirm = (itemId: string, kind: DecisionKind, candidateName: string) => {
    setConfirmDialog({ itemId, kind, candidateName });
  };

  /* Derive tenant branding from first item */
  const tenantSettings = items[0]?.vacancy.organization.tenantSettings;
  const brandPrimary = tenantSettings?.primaryColor ?? colors.primary;
  const brandPublicName = tenantSettings?.publicName ?? items[0]?.vacancy.organization.name ?? 'Connekt Hunter';
  const vacancyTitle = items[0]?.vacancy.title ?? '';

  const pendingCount = items.filter((i) => !i.currentDecision).length;

  return (
    <div style={{ minHeight: '100vh', background: colors.surfaceAlt }}>
      {/* Brand header */}
      <header style={{
        background: brandPrimary,
        color: colors.textInverse,
        padding: `${spacing.md}px ${spacing.xl}px`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        boxShadow: shadows.lg,
      }}>
        {tenantSettings?.logoUrl && (
          <img src={tenantSettings.logoUrl} alt={brandPublicName} style={{ height: 36, borderRadius: radius.sm }} referrerPolicy="no-referrer" />
        )}
        <div>
          <div style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{brandPublicName}</div>
          {vacancyTitle && (
            <div style={{ fontSize: fontSize.sm, opacity: 0.8 }}>Revisão de candidatos — {vacancyTitle}</div>
          )}
        </div>
      </header>

      <PageContent>
        <div style={{ marginBottom: spacing.lg, marginTop: spacing.lg }}>
          <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>
            Avaliação de Candidatos
          </h2>
          <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.md, color: colors.textSecondary }}>
            Revise os candidatos pré-selecionados e registre sua decisão para cada um.
          </p>
        </div>

        {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

        {loading ? (
          <TableSkeleton rows={4} columns={3} />
        ) : error ? (
          <div style={{ padding: spacing.xl, textAlign: 'center', background: colors.dangerLight, borderRadius: radius.xl, color: colors.dangerDark, fontSize: fontSize.md }}>
            <div style={{ fontSize: 40, marginBottom: spacing.md }}>🔒</div>
            <div style={{ fontWeight: fontWeight.semibold, marginBottom: spacing.sm }}>Link inválido ou expirado</div>
            <div style={{ fontSize: fontSize.sm }}>{error}</div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Nenhum candidato na lista" description="Aguarde o recrutador adicionar candidatos à shortlist." icon="📋" />
        ) : (
          <>
            {/* Summary bar */}
            <div style={{
              display: 'flex',
              gap: spacing.md,
              flexWrap: 'wrap',
              marginBottom: spacing.lg,
              padding: spacing.md,
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              fontSize: fontSize.sm,
              color: colors.textSecondary,
              alignItems: 'center',
            }}>
              <span><strong style={{ color: colors.text }}>{items.length}</strong> candidato(s) para avaliar</span>
              <span>·</span>
              {pendingCount > 0
                ? <span style={{ color: colors.warningDark }}>⏳ {pendingCount} decisão(ões) pendente(s)</span>
                : <span style={{ color: colors.successDark }}>✅ Todas as decisões registradas</span>}
            </div>

            <div style={{ display: 'grid', gap: spacing.md }}>
              {items.map((item) => {
                const name = item.candidate.fullName ?? `Candidato ${item.candidate.id.slice(0, 6)}`;
                const currentDecision = item.currentDecision as DecisionKind | null;
                const decidedMeta = currentDecision ? decisionMeta[currentDecision] : null;

                return (
                  <Card key={item.id} style={{ overflow: 'hidden', borderLeft: currentDecision ? `4px solid ${currentDecision === 'approve' ? colors.success : currentDecision === 'reject' ? colors.danger : currentDecision === 'interview' ? colors.accent : colors.warning}` : undefined }}>
                    <div style={{ padding: spacing.lg, display: 'grid', gap: spacing.md }}>
                      {/* Candidate header */}
                      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: radius.full,
                          background: colors.primaryLight, color: colors.textInverse,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: fontSize.md, fontWeight: fontWeight.bold,
                          overflow: 'hidden', flexShrink: 0,
                        }}>
                          {item.candidate.photoUrl ? (
                            <img src={item.candidate.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          ) : initials(item.candidate.fullName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs }}>
                            <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text }}>{name}</span>
                            {decidedMeta && (
                              <Badge variant={decidedMeta.badge}>{decidedMeta.icon} {decidedMeta.label}</Badge>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', fontSize: fontSize.sm, color: colors.textSecondary }}>
                            {item.vacancy.seniority && <span>🎯 {item.vacancy.seniority}</span>}
                            {item.vacancy.location && <span>📍 {item.vacancy.location}</span>}
                          </div>
                          {item.vacancy.requiredSkills.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                              {item.vacancy.requiredSkills.slice(0, 6).map((skill) => (
                                <span key={skill} style={{
                                  display: 'inline-flex', padding: '3px 8px', borderRadius: radius.full,
                                  background: colors.infoLight, color: colors.infoDark,
                                  fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                                }}>
                                  {skill}
                                </span>
                              ))}
                              {item.vacancy.requiredSkills.length > 6 && (
                                <span style={{ fontSize: fontSize.xs, color: colors.textMuted, alignSelf: 'center' }}>
                                  +{item.vacancy.requiredSkills.length - 6}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: spacing.md, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
                        {decisionOrder.map((kind) => (
                            <Button
                              key={kind}
                              variant={decisionMeta[kind].button}
                              size="sm"
                              onClick={() => openDecisionConfirm(item.id, kind, name)}
                              style={{ opacity: currentDecision === kind ? 1 : currentDecision ? 0.6 : 1 }}
                            >
                              {decisionMeta[kind].icon} {decisionMeta[kind].label}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </PageContent>

      {/* Decision confirmation dialog */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onClick={() => !deciding && setConfirmDialog(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !deciding) setConfirmDialog(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: zIndex.modal }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.surface, padding: spacing.xl, borderRadius: radius.xl, width: '100%', maxWidth: 460, boxShadow: shadows.lg, display: 'grid', gap: spacing.md }}
          >
            <div>
              <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>Confirmar decisão</h3>
              <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
                Você está prestes a registrar a decisão <Badge variant={decisionMeta[confirmDialog.kind].badge}>{decisionMeta[confirmDialog.kind].icon} {decisionMeta[confirmDialog.kind].label}</Badge> para <strong>{confirmDialog.candidateName}</strong>.
              </p>
            </div>
            <div style={{
              padding: spacing.md, borderRadius: radius.lg,
              background: confirmDialog.kind === 'reject' ? colors.dangerLight : colors.surfaceAlt,
              border: `2px solid ${confirmDialog.kind === 'reject' ? colors.danger : confirmDialog.kind === 'approve' ? colors.success : colors.borderLight}`,
              fontSize: fontSize.sm,
              color: confirmDialog.kind === 'reject' ? colors.dangerDark : colors.textSecondary,
              lineHeight: 1.6,
            }}>
              {confirmDialog.kind === 'reject' && <div style={{ fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>⚠️ Esta ação ficará registrada.</div>}
              {decisionMeta[confirmDialog.kind].description}
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmDialog(null)} disabled={deciding}>Cancelar</Button>
              <Button variant={decisionMeta[confirmDialog.kind].button} onClick={() => { void decide(confirmDialog.itemId, confirmDialog.kind); }} loading={deciding}>
                {decisionMeta[confirmDialog.kind].icon} Confirmar: {decisionMeta[confirmDialog.kind].label}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
