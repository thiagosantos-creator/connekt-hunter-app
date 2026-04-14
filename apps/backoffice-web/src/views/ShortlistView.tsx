import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type {
  Application,
  ShortlistItem,
  EvalRecord,
  PriorityScore,
  Vacancy,
} from '../services/types.js';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  InlineMessage,
  PageContent,
  PageHeader,
  ScoreGauge,
  Select,
  StatBox,
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

/* ── Helpers ──────────────────────────────────────────────────────────── */

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

const formatRelative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
};

const bandMeta: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  high: { variant: 'danger', label: 'Alta prioridade' },
  medium: { variant: 'warning', label: 'Média prioridade' },
  low: { variant: 'info', label: 'Baixa prioridade' },
};

export function ShortlistView() {
  const { user } = useAuth();

  /* data */
  const [apps, setApps] = useState<Application[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [evals, setEvals] = useState<EvalRecord[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [loading, setLoading] = useState(true);

  /* UI */
  const [activeTab, setActiveTab] = useState('pending');
  const [vacancyFilter, setVacancyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  /* eval dialog */
  const [evalDialog, setEvalDialog] = useState<{ appId: string; name: string } | null>(null);
  const [evalComment, setEvalComment] = useState('');
  const [evalSaving, setEvalSaving] = useState(false);

  /* priority */
  const [priorityVacancyId, setPriorityVacancyId] = useState('');
  const [priorityLoading, setPriorityLoading] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiGet<Application[]>('/applications').then(setApps),
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
    ]).finally(() => setLoading(false));
  }, []);

  /* ── Computed ───────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => !shortlistedIds.has(a.id)).length;
    const shortlisted = shortlistedIds.size;
    return { total, pending, shortlisted };
  }, [apps, shortlistedIds]);

  const vacancyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    apps.forEach((a) => seen.set(a.vacancy.id, a.vacancy.title));
    return Array.from(seen, ([id, title]) => ({ value: id, label: title }));
  }, [apps]);

  const priorityMap = useMemo(() => {
    const map = new Map<string, PriorityScore>();
    priorities.forEach((p) => map.set(p.candidateId, p));
    return map;
  }, [priorities]);

  const filtered = useMemo(() => {
    let result = apps;
    if (activeTab === 'pending') result = result.filter((a) => !shortlistedIds.has(a.id));
    else if (activeTab === 'shortlisted') result = result.filter((a) => shortlistedIds.has(a.id));

    if (vacancyFilter) result = result.filter((a) => a.vacancy.id === vacancyFilter);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((a) => {
        const name = (a.candidate.profile?.fullName ?? '').toLowerCase();
        const email = a.candidate.email.toLowerCase();
        const vac = a.vacancy.title.toLowerCase();
        return name.includes(q) || email.includes(q) || vac.includes(q);
      });
    }
    return result;
  }, [apps, shortlistedIds, activeTab, vacancyFilter, searchTerm]);

  /* ── Actions ────────────────────────────────────────────────────────── */

  const addToShortlist = useCallback(async (appId: string) => {
    try {
      await apiPost<ShortlistItem>('/shortlist', { applicationId: appId });
      setShortlistedIds((prev) => new Set([...prev, appId]));
      setMsg('Adicionado à shortlist!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    }
  }, []);

  const submitEval = useCallback(async () => {
    if (!user || !evalDialog || !evalComment.trim()) return;
    setEvalSaving(true);
    try {
      const r = await apiPost<EvalRecord>('/evaluations', {
        applicationId: evalDialog.appId,
        evaluatorId: user.id,
        comment: evalComment,
      });
      setEvals((prev) => [...prev, r]);
      setEvalComment('');
      setEvalDialog(null);
      setMsg('Avaliação registrada com sucesso!');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setEvalSaving(false);
    }
  }, [user, evalDialog, evalComment]);

  const calculatePriority = useCallback(async () => {
    if (!priorityVacancyId) return;
    setPriorityLoading(true);
    try {
      const data = await apiPost<PriorityScore[]>('/decision-engine/priority/calculate', { vacancyId: priorityVacancyId });
      setPriorities(data);
      setMsg('Priorização calculada com IA.');
      setMsgVariant('success');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setPriorityLoading(false);
    }
  }, [priorityVacancyId]);

  const tabs = [
    { key: 'all', label: 'Todas', badge: stats.total },
    { key: 'pending', label: 'Pendentes', badge: stats.pending },
    { key: 'shortlisted', label: 'Shortlisted', badge: stats.shortlisted },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Shortlist & Avaliação"
        description="Selecione candidatos para a shortlist, avalie perfis e priorize com assistência de IA."
      />

      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      {loading ? (
        <div style={{ display: 'grid', gap: spacing.lg }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: spacing.md }}>
            {[1, 2, 3].map((i) => <div key={i} style={{ height: 80, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />)}
          </div>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 100, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: spacing.md, marginBottom: spacing.lg }}>
            <StatBox label="Total de aplicações" value={stats.total} subtext="candidatos no pipeline" />
            <StatBox label="Pendentes" value={stats.pending} subtext="aguardando triagem" />
            <StatBox label="Shortlisted" value={stats.shortlisted} subtext="selecionados" />
            <div style={{ padding: spacing.md, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ScoreGauge value={stats.total > 0 ? Math.round((stats.shortlisted / stats.total) * 100) : 0} size={52} strokeWidth={5} />
              <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }}>Taxa seleção</div>
            </div>
          </div>

          {/* Priority calculator & Sharing */}
          <Card style={{ marginBottom: spacing.lg }}>
            <CardContent style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ flex: '1 1 240px', minWidth: 200, maxWidth: 400 }}>
                  <Select
                    label="Vaga e Ações de IA"
                    value={priorityVacancyId}
                    onChange={(e) => setPriorityVacancyId(e.target.value)}
                    options={[{ value: '', label: 'Selecione uma vaga...' }, ...vacancies.map((v) => ({ value: v.id, label: v.title }))]}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => { void calculatePriority(); }}
                  disabled={!priorityVacancyId}
                  loading={priorityLoading}
                >
                  🤖 Calcular Prioridade
                </Button>
                {priorities.length > 0 && (
                  <Badge variant="info" size="sm" style={{ alignSelf: 'center', marginBottom: spacing.sm }}>
                    {priorities.length} ranqueados
                  </Badge>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  variant="outline"
                  onClick={() => { 
                    navigator.clipboard.writeText(`${window.location.origin}/client-review?vacancyId=${priorityVacancyId}`);
                    setMsg('Link de acesso seguro copiado para a área de transferência.');
                    setMsgVariant('success');
                  }}
                  disabled={!priorityVacancyId}
                >
                  🔗 Copiar Link para Gestor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: spacing.md }}>
            <div style={{ flex: '1 1 260px', minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, e-mail ou vaga..."
                style={{ width: '100%', padding: `${spacing.sm}px ${spacing.md}px`, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.md, outline: 'none', background: colors.surface, color: colors.text, boxSizing: 'border-box' }}
              />
            </div>
            {vacancyOptions.length > 1 && (
              <div style={{ flex: '0 1 240px', minWidth: 180 }}>
                <Select
                  label="Vaga"
                  value={vacancyFilter}
                  onChange={(e) => setVacancyFilter(e.target.value)}
                  options={[{ value: '', label: 'Todas' }, ...vacancyOptions]}
                />
              </div>
            )}
          </div>

          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Cards */}
          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma aplicação" description="Ajuste os filtros ou a aba." icon="🔍" />
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              {filtered.map((app) => {
                const name = app.candidate.profile?.fullName || app.candidate.email;
                const isShortlisted = shortlistedIds.has(app.id);
                const priority = priorityMap.get(app.candidate.id);
                const band = priority ? bandMeta[priority.priorityBand.toLowerCase()] : null;

                return (
                  <Card key={app.id} style={{ overflow: 'hidden', borderLeft: isShortlisted ? `4px solid ${colors.success}` : undefined }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.md, padding: spacing.lg }}>
                      {/* Left */}
                      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start', minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: radius.full, background: isShortlisted ? colors.success : colors.primaryLight, color: colors.textInverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 0, overflow: 'hidden' }}>
                          {isShortlisted ? '✓' : app.candidate.profile?.photoUrl ? (
                            <img src={app.candidate.profile.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          ) : (
                            initials(name)
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs }}>
                            <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text }}>{name}</span>
                            {isShortlisted && <Badge variant="success" size="sm">Shortlisted</Badge>}
                            {band && <Badge variant={band.variant} size="sm">📊 {band.label} ({priority!.score.toFixed(1)})</Badge>}
                          </div>
                          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', fontSize: fontSize.sm, color: colors.textSecondary }}>
                            <span>📋 {app.vacancy.title}</span>
                            {app.vacancy.seniority && <span>🎯 {app.vacancy.seniority}</span>}
                            <span>📅 {formatRelative(app.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {!isShortlisted ? (
                          <Button variant="success" size="sm" onClick={() => { void addToShortlist(app.id); }}>
                            ✓ Shortlist
                          </Button>
                        ) : (
                          <Badge variant="success" size="sm">Na shortlist</Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setEvalDialog({ appId: app.id, name }); setEvalComment(''); }}>
                          💬 Avaliar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, fontSize: fontSize.sm, color: colors.textSecondary }}>
            <span>Exibindo <strong style={{ color: colors.text }}>{filtered.length}</strong> de {apps.length}</span>
            <span>{evals.length > 0 ? `${evals.length} avaliação(ões) nesta sessão` : 'Nenhuma avaliação registrada nesta sessão'}</span>
          </div>
        </>
      )}

      {/* Eval dialog */}
      {evalDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="eval-dialog-title"
          onClick={() => !evalSaving && setEvalDialog(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' && !evalSaving) setEvalDialog(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: zIndex.modal }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: colors.surface, padding: spacing.xl, borderRadius: radius.xl, width: '100%', maxWidth: 520, boxShadow: shadows.lg, display: 'grid', gap: spacing.md }}>
            <div>
              <h3 id="eval-dialog-title" style={{ margin: 0, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text }}>
                Avaliação profissional
              </h3>
              <p style={{ margin: `${spacing.xs}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary }}>
                Sobre <strong>{evalDialog.name}</strong>
              </p>
            </div>

            <Textarea
              label="Seu parecer"
              value={evalComment}
              onChange={(e) => setEvalComment(e.target.value)}
              placeholder="Adicione sua avaliação profissional sobre o candidato..."
              rows={5}
              required
            />

            <div style={{ padding: spacing.sm, borderRadius: radius.md, background: colors.infoLight, fontSize: fontSize.xs, color: colors.info, lineHeight: 1.6 }}>
              💡 Esta avaliação ficará registrada no dossiê do candidato e será visível para o cliente na revisão.
            </div>

            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setEvalDialog(null)} disabled={evalSaving}>Cancelar</Button>
              <Button onClick={() => { void submitEval(); }} loading={evalSaving} disabled={!evalComment.trim()}>
                Salvar avaliação
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContent>
  );
}
