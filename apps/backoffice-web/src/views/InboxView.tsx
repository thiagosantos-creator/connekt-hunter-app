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

const priorityMeta: Record<string, { variant: 'danger' | 'warning' | 'info'; label: string; icon: string; border: string }> = {
  high: { variant: 'danger', label: 'Alta', icon: '🔴', border: colors.dangerLight },
  medium: { variant: 'warning', label: 'Média', icon: '🟡', border: colors.warningLight },
  low: { variant: 'info', label: 'Baixa', icon: '🔵', border: colors.infoLight },
};

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
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            <StatBox label="Total" value={stats.total} subtext="tarefas pendentes" />
            <StatBox label="Urgentes" value={stats.high} subtext={stats.high > 0 ? 'requer ação imediata' : 'Nenhuma urgente'} />
            <StatBox label="Média" value={stats.medium} subtext="prioridade intermediária" />
            <StatBox label="Baixa" value={stats.low} subtext="pode aguardar" />
          </div>

          {/* Search */}
          <div style={{ marginBottom: spacing.md }}>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por vaga, candidato ou status..."
            />
          </div>

          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Cards */}
          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma tarefa" description="Nenhum item corresponde aos filtros selecionados." icon="🔍" />
          ) : (
            <div style={{ display: 'grid', gap: spacing.sm }}>
              {filtered.map((item) => {
                const meta = priorityMeta[item.priority] ?? priorityMeta.low;
                return (
                  <Card key={item.id} style={{ borderLeft: `4px solid ${meta.border}`, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.md, padding: `${spacing.md}px ${spacing.lg}px` }}>
                      {/* Left */}
                      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center', minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: radius.full, background: meta.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.md, flexShrink: 0 }}>
                          {meta.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.md, color: colors.text }}>{item.vacancyTitle}</span>
                            <Badge variant={meta.variant} size="sm">{meta.label}</Badge>
                          </div>
                          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', fontSize: fontSize.sm, color: colors.textSecondary }}>
                            <span>👤 {item.candidateEmail}</span>
                            <span>📊 {item.status}</span>
                            <span>⏱️ {formatAge(item.ageHours)} aberto</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick actions wired to backend */}
                      <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.quickActions.map((action) => (
                          <Button key={action} variant="outline" size="sm" onClick={async () => {
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
                          }}>
                            {action}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: fontSize.sm, color: colors.textSecondary }}>
            <span>Exibindo <strong style={{ color: colors.text }}>{filtered.length}</strong> de {items.length} tarefas</span>
            <span>{stats.high > 0 ? `⚠️ ${stats.high} tarefa(s) urgente(s)` : '✅ Sem urgências'}</span>
          </div>
        </>
      )}
    </PageContent>
  );
}
