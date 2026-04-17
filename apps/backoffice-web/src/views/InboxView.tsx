import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  StatBox,
  Tabs,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '@connekt/ui';
import { apiGet, apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { HeadhunterInboxItem } from '../services/types.js';

const priorityMeta: Record<string, { variant: 'danger' | 'warning' | 'info'; label: string; icon: string; border: string; glow: string }> = {
  high: { variant: 'danger', label: 'Alta Prioridade', icon: '🔴', border: colors.danger, glow: `rgba(239, 68, 68, 0.15)` },
  medium: { variant: 'warning', label: 'Atenção', icon: '🟡', border: colors.warning, glow: `rgba(245, 158, 11, 0.1)` },
  low: { variant: 'info', label: 'Normal', icon: '🔵', border: colors.info, glow: `rgba(59, 130, 246, 0.05)` },
};

const premiumStyles = `
@keyframes fadeInSlide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.inbox-card-premium {
  animation: fadeInSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  background: ${colors.surface};
  border-radius: ${radius.xl}px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.04);
}
.inbox-card-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.06);
}
`;

const formatAge = (hours: number) => {
  if (hours < 1) return '< 1h';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

export function InboxView() {
  const { user } = useAuth();
  const [items, setItems] = useState<HeadhunterInboxItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error' | 'info'>('info');
  const orgId = user?.organizationIds?.[0] ?? '';

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      setItems(await apiGet<HeadhunterInboxItem[]>(`/headhunter-inbox?${new URLSearchParams({ organizationId: orgId }).toString()}`));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [orgId]);

  const stats = useMemo(() => {
    const total = items.length;
    const high = items.filter((i) => i.priority === 'high').length;
    const medium = items.filter((i) => i.priority === 'medium').length;
    const low = items.filter((i) => i.priority === 'low').length;
    return { total, high, medium, low };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeTab === 'high') result = result.filter((i) => i.priority === 'high');
    else if (activeTab === 'medium') result = result.filter((i) => i.priority === 'medium');
    else if (activeTab === 'low') result = result.filter((i) => i.priority === 'low');

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((i) =>
        i.vacancyTitle.toLowerCase().includes(q) ||
        i.candidateEmail.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeTab, searchTerm]);

  const tabs = [
    { key: 'all', label: 'Todas', badge: stats.total },
    { key: 'high', label: '🔴 Urgente', badge: stats.high },
    { key: 'medium', label: '🟡 Média', badge: stats.medium },
    { key: 'low', label: '🔵 Baixa', badge: stats.low },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Inbox Operacional"
        description="Tarefas pendentes priorizadas por urgência. Resolva as de alta prioridade primeiro."
        actions={<Button variant="outline" size="sm" onClick={() => { void load(); }}>↻ Atualizar</Button>}
      />

      {error && <InlineMessage variant="error" onDismiss={() => setError('')}>{error}</InlineMessage>}
      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {loading ? (
        <div style={{ display: 'grid', gap: spacing.lg }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: spacing.md }}>
            {[1, 2, 3, 4].map((i) => <div key={i} style={{ height: 80, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />)}
          </div>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 80, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Inbox vazia"
          description="Sem pendências críticas no momento. Parabéns! 🎉 Revise vagas ativas e convites pendentes."
          icon="✅"
        />
      ) : (
        <>
      {/* Stats Premium */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: spacing.md, marginBottom: spacing.xl 
          }}>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, ${colors.surface}, #f8fafc)`, border: `1px solid ${colors.borderLight}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Pendências Totais</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.total}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #fef2f2, #fff)`, border: `1px solid ${colors.dangerLight}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, background: priorityMeta.high.glow, width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Requer Ação Imediata (Urgente)</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.dangerDark }}>{stats.high}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #fffbeb, #fff)`, border: `1px solid ${colors.warningLight}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, background: priorityMeta.medium.glow, width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Intermediárias</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.medium}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #eff6ff, #fff)`, border: `1px solid ${colors.infoLight}`, position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'absolute', top: -20, right: -20, background: priorityMeta.low.glow, width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Leves (Baixa prioridade)</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.low}</div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', flexWrap: 'wrap', gap: spacing.md, 
            alignItems: 'center', justifyContent: 'space-between',
            marginBottom: spacing.xl,
            padding: spacing.sm,
            background: colors.surface,
            borderRadius: radius.full,
            border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
             <div style={{ flex: 1, minWidth: 260, paddingLeft: spacing.sm }}>
               <input
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar por vaga, candidato ou status..."
                 style={{
                   width: '100%', border: 'none', background: 'transparent',
                   fontSize: fontSize.sm, color: colors.text, outline: 'none'
                 }}
               />
             </div>
             <div style={{ flexShrink: 0 }}>
               <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} size="sm" />
             </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma tarefa" description="Nenhum item corresponde aos filtros selecionados." icon="🔍" />
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              <style>{premiumStyles}</style>
              {filtered.map((item, index) => {
                const meta = priorityMeta[item.priority] ?? priorityMeta.low;
                return (
                  <div key={item.id} className="inbox-card-premium" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div style={{ 
                      display: 'flex', alignItems: 'stretch',
                      background: `linear-gradient(90deg, ${meta.glow} 0%, transparent 400px)`,
                    }}>
                      <div style={{ width: 4, background: meta.border, flexShrink: 0 }} />
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.xl, padding: spacing.xl, flex: 1, alignItems: 'center' }}>
                        {/* Left Info */}
                        <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center', minWidth: 0 }}>
                          <div style={{ 
                            width: 52, height: 52, borderRadius: radius.full, 
                            background: '#fff', border: `1px solid ${colors.borderLight}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '24px', flexShrink: 0 
                          }}>
                            {meta.icon}
                          </div>
                          
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs }}>
                              <span style={{ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.text }}>{item.vacancyTitle}</span>
                              <Badge variant={meta.variant} size="lg" style={{ letterSpacing: '0.02em', boxShadow: `0 0 10px ${meta.glow}` }}>{meta.label}</Badge>
                            </div>
                            <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', fontSize: fontSize.sm }}>
                              <span style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                                👤 <strong>{item.candidateEmail}</strong>
                              </span>
                              <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📊 {item.status}
                              </span>
                              <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
                                ⏱️ Aguardando há {formatAge(item.ageHours)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                          {item.quickActions.map((action, aIdx) => (
                            <Button 
                              key={action} 
                              variant={aIdx === 0 ? 'primary' : 'outline'} 
                              size="md" 
                              style={aIdx === 0 ? { boxShadow: `0 4px 12px ${meta.glow}` } : undefined}
                              onClick={async () => {
                                try {
                                  if (action === 'Avaliar') {
                                    window.location.href = `/applications/${item.applicationId}/dossier`;
                                    return;
                                  }
                                  if (action === 'Shortlist') {
                                    await apiPost('/shortlist', { applicationId: item.applicationId });
                                    setMsg(`Candidato ${item.candidateEmail} adicionado à shortlist.`);
                                    setMsgVariant('success');
                                    load();
                                    return;
                                  }
                                  if (action === 'Agendar entrevista') {
                                    await apiPost('/workflow-automation/suggest', { candidateId: item.candidateId, vacancyId: item.vacancyId });
                                    setMsg(`Sugestão de entrevista criada para ${item.candidateEmail}.`);
                                    setMsgVariant('success');
                                    return;
                                  }
                                  setMsg(`Ação "${action}" para ${item.candidateEmail} executada.`);
                                  setMsgVariant('info');
                                } catch (err) {
                                  setMsg(String(err));
                                  setMsgVariant('error');
                                }
                              }}
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Premium */}
          <div style={{ 
            marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.full, 
            background: 'rgba(255,255,255,0.6)', border: `1px solid ${colors.borderLight}`, 
            backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            fontSize: fontSize.sm, color: colors.textSecondary 
          }}>
            <span style={{ paddingLeft: spacing.sm }}>Exibindo <strong style={{ color: colors.text }}>{filtered.length}</strong> de {items.length} tarefas pendentes</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm }}>
              {stats.high > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.danger, boxShadow: `0 0 8px ${colors.danger}` }} />}
              <span>{stats.high > 0 ? `${stats.high} ação(ões) prioritária(s)` : 'Tudo em dia 🎉'}</span>
            </div>
          </div>
        </>
      )}
    </PageContent>
  );
}
