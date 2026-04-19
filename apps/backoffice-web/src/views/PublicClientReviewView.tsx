import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  spacing,
  zIndex,
  TenantBrandingProvider,
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
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* Dossier state */
  const [dossierDetail, setDossierDetail] = useState<any>(null);
  const [dossierIntelligence, setDossierIntelligence] = useState<any>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  /* decision dialog */
  const [confirmDialog, setConfirmDialog] = useState<{ itemId: string; kind: DecisionKind; candidateName: string } | null>(null);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    apiPublicGet<PublicReviewShortlistItem[]>(`/shortlist/public/${token}`)
      .then((data) => {
        setItems(data);
        if (data.length > 0) setSelectedAppId(data[0].applicationId);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedAppId) return;

    setDossierLoading(true);
    Promise.all([
      apiPublicGet<any>(`/shortlist/public/${token}/application/${selectedAppId}`),
      apiPublicGet<any>(`/shortlist/public/${token}/application/${selectedAppId}/intelligence`),
    ])
    .then(([detail, intelligence]) => {
      setDossierDetail(detail);
      setDossierIntelligence({
        matching: intelligence?.matching || {},
        risk: intelligence?.risk || intelligence?.risks || null,
        insights: intelligence || {},
        recommendations: intelligence?.recommendations || [],
        workflowSuggestions: [],
      });
    })
    .catch((err) => {
      console.error('Failed to fetch dossier:', err);
      setDossierDetail(null);
    })
    .finally(() => setDossierLoading(false));
  }, [token, selectedAppId]);

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

  /* Derive tenant branding */
  const tenantSettings = items[0]?.vacancy.organization.tenantSettings;
  const brandPrimary = tenantSettings?.primaryColor ?? colors.primary;
  const brandPublicName = tenantSettings?.publicName ?? items[0]?.vacancy.organization.name ?? 'Connekt Hunter';
  const vacancyTitle = items[0]?.vacancy.title ?? '';

  const pendingCount = items.filter((i) => !i.currentDecision).length;

  const selectedItem = useMemo(() => items.find(i => i.applicationId === selectedAppId), [items, selectedAppId]);

  if (loading) return <div style={{ padding: spacing.xl }}><TableSkeleton rows={8} columns={1} /></div>;

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.surfaceAlt }}>
        <div style={{ padding: spacing.xl, textAlign: 'center', background: colors.surface, borderRadius: radius.xl, boxShadow: shadows.lg, maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: spacing.md }}>🔒</div>
          <h2 style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.dangerDark }}>Acesso restrito</h2>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

    );
  }

  const currentIndex = items.findIndex(i => i.applicationId === selectedAppId);
  const nextItem = items[currentIndex + 1];
  const prevItem = items[currentIndex - 1];

  return (
    <TenantBrandingProvider
      primaryColor={tenantSettings?.primaryColor}
      secondaryColor={tenantSettings?.secondaryColor}
      logoUrl={tenantSettings?.logoUrl}
    >
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Brand header */}
      <header style={{
        background: 'var(--brand-primary, ' + brandPrimary + ')',
        color: colors.textInverse,
        padding: `${spacing.sm}px ${spacing.xl}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: shadows.md,
        zIndex: zIndex.header,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {tenantSettings?.logoUrl && (
            <img src={tenantSettings.logoUrl} alt={brandPublicName} style={{ height: 28, borderRadius: radius.sm }} referrerPolicy="no-referrer" />
          )}
          <div>
            <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{brandPublicName}</div>
            <div style={{ fontSize: fontSize.xs, opacity: 0.8 }}>Review Dashboard • {vacancyTitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          {pendingCount > 0 ? (
            <Badge variant="warning">⏳ {pendingCount} pendentes</Badge>
          ) : (
            <Badge variant="success">✅ Finalizado</Badge>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: 380,
          background: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{ padding: spacing.lg, borderBottom: `1px solid ${colors.border}` }}>
            <h2 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, margin: 0 }}>Candidatos</h2>
            <p style={{ fontSize: fontSize.xs, color: colors.textSecondary, margin: `${spacing.xs}px 0 0` }}>
              {items.length} pessoas pré-selecionadas para sua análise
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: spacing.sm }}>
            {items.map((item) => {
              const isActive = selectedAppId === item.applicationId;
              const name = item.candidate.fullName ?? 'Candidato';
              const currentDecision = item.currentDecision as DecisionKind | null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAppId(item.applicationId)}
                  style={{
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    cursor: 'pointer',
                    background: isActive ? 'var(--brand-primary-faint, ' + colors.primaryLight + ')' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--brand-primary, ' + brandPrimary + ')' : 'transparent'}`,
                    marginBottom: spacing.xs,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: radius.full,
                      background: colors.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: fontSize.sm, fontWeight: fontWeight.bold, overflow: 'hidden', flexShrink: 0
                    }}>
                      {item.candidate.photoUrl ? (
                         <img src={item.candidate.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                      ) : initials(name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: isActive ? colors.textInverse : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div style={{ fontSize: fontSize.xs, color: isActive ? colors.textInverse : colors.textSecondary, opacity: 0.8 }}>
                        {currentDecision ? decisionMeta[currentDecision].label : 'Aguardando decisão'}
                      </div>
                    </div>
                    {currentDecision && (
                      <div style={{ fontSize: 18 }}>{decisionMeta[currentDecision].icon}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Dossier Area */}
        <section style={{ flex: 1, overflowY: 'auto', background: colors.surfaceAlt, paddingBottom: 100 }}>
          {selectedAppId ? (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: spacing.xl }}>
              {msg && <div style={{ marginBottom: spacing.lg }}><InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage></div>}
              
              {dossierLoading ? (
                <TableSkeleton rows={10} columns={1} />
              ) : dossierDetail ? (
                <>
                  <CandidateDossier
                    detail={dossierDetail}
                    intelligence={dossierIntelligence}
                    viewerRole="client"
                  />
                  
                  {/* Floating Action Bar */}
                  <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 380,
                    right: 0,
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(12px)',
                    borderTop: `1px solid ${colors.border}`,
                    padding: `${spacing.md}px ${spacing.xl}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: zIndex.header,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                       <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary }}>
                        Decisão para {selectedItem?.candidate.fullName}:
                       </div>
                       {selectedItem?.currentDecision && (
                         <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                           <Badge variant={decisionMeta[selectedItem.currentDecision as DecisionKind].badge}>
                             {decisionMeta[selectedItem.currentDecision as DecisionKind].icon} {decisionMeta[selectedItem.currentDecision as DecisionKind].label}
                           </Badge>
                           <span style={{ fontSize: 12, color: colors.success }}>✓ Decidido</span>
                         </div>
                       )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center' }}>
                      {/* Carousel Controls */}
                      <div style={{ display: 'flex', gap: 2, background: colors.surfaceAlt, padding: 2, borderRadius: radius.md, border: `1px solid ${colors.borderLight}` }}>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          disabled={!prevItem} 
                          onClick={() => prevItem && setSelectedAppId(prevItem.applicationId)}
                          style={{ padding: '4px 8px' }}
                        >
                          ←
                        </Button>
                        <div style={{ width: 1, background: colors.borderLight }} />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          disabled={!nextItem} 
                          onClick={() => nextItem && setSelectedAppId(nextItem.applicationId)}
                          style={{ padding: '4px 8px' }}
                        >
                          →
                        </Button>
                      </div>

                      <div style={{ display: 'flex', gap: spacing.sm }}>
                      {decisionOrder.map((kind) => {
                        const meta = decisionMeta[kind];
                        const isCurrent = selectedItem?.currentDecision === kind;
                        return (
                          <Button
                            key={kind}
                            variant={meta.button}
                            onClick={() => openDecisionConfirm(selectedItem!.id, kind, selectedItem!.candidate.fullName || 'Candidato')}
                            style={{ opacity: isCurrent ? 1 : 0.8, border: isCurrent ? `2px solid rgba(0,0,0,0.2)` : 'none' }}
                          >
                            {meta.icon} {meta.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState title="Erro ao carregar dossiê" description="Não conseguimos recuperar os dados detalhados deste candidato." />
              )}
            </div>
          ) : (
           <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <EmptyState title="Selecione um candidato" description="Escolha um perfil na lista lateral para iniciar a revisão premium." icon="👈" />
           </div>
          )}
        </section>
      </main>

       {/* Decision confirmation dialog */}
       {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !deciding && setConfirmDialog(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: zIndex.modal }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.surface, padding: spacing.xl, borderRadius: radius.xl, width: '100%', maxWidth: 460, boxShadow: shadows.lg, display: 'grid', gap: spacing.md }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>Confirmar decisão</h3>
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
              {decisionMeta[confirmDialog.kind].description}
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setConfirmDialog(null)} disabled={deciding}>Cancelar</Button>
              <Button variant={decisionMeta[confirmDialog.kind].button} onClick={() => { void decide(confirmDialog.itemId, confirmDialog.kind); }} loading={deciding}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </TenantBrandingProvider>
  );
}
