import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageContent,
  PageHeader,
  ScoreGauge,
  Select,
  StatBox,
  StatusPill,
  Tabs,
  colors,
  fontSize,
  fontWeight,
  radius,
  spacing,
} from '@connekt/ui';
import { apiGet } from '../services/api.js';
import type { Application } from '../services/types.js';

const premiumStyles = `
@keyframes fadeInSlide {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.premium-card {
  animation: fadeInSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  background: ${colors.surface};
  border-radius: ${radius.xl}px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.04);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.premium-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.06);
}
`;

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

const statusLabel: Record<string, string> = {
  submitted: 'Enviada',
  shortlisted: 'Shortlist',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  hold: 'Aguardando',
  completed: 'Concluída',
  in_progress: 'Em andamento',
  draft: 'Rascunho',
  reviewed: 'Revisada',
};

export function ApplicationsView() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [vacancyFilter, setVacancyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const load = () => {
    setLoading(true);
    apiGet<Application[]>('/applications')
      .then(setApps)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  /* ── Computed ───────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const total = apps.length;
    const submitted = apps.filter((a) => a.status === 'submitted').length;
    const shortlisted = apps.filter((a) => a.status === 'shortlisted').length;
    const approved = apps.filter((a) => a.status === 'approved').length;
    const rejected = apps.filter((a) => a.status === 'rejected').length;
    const reviewed = apps.filter((a) => ['reviewed', 'completed'].includes(a.status)).length;
    const progress = total > 0 ? Math.round(((total - submitted) / total) * 100) : 0;
    return { total, submitted, shortlisted, approved, rejected, reviewed, progress };
  }, [apps]);

  const vacancies = useMemo(() => {
    const seen = new Map<string, string>();
    apps.forEach((a) => seen.set(a.vacancy.id, a.vacancy.title));
    return Array.from(seen, ([id, title]) => ({ value: id, label: title }));
  }, [apps]);

  const filtered = useMemo(() => {
    let result = apps;
    if (activeTab === 'submitted') result = result.filter((a) => a.status === 'submitted');
    else if (activeTab === 'shortlisted') result = result.filter((a) => a.status === 'shortlisted');
    else if (activeTab === 'approved') result = result.filter((a) => a.status === 'approved');
    else if (activeTab === 'rejected') result = result.filter((a) => a.status === 'rejected');

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
  }, [apps, activeTab, vacancyFilter, searchTerm]);

  const tabs = [
    { key: 'all', label: 'Todas', badge: stats.total },
    { key: 'submitted', label: 'Novas', badge: stats.submitted },
    { key: 'shortlisted', label: 'Shortlist', badge: stats.shortlisted },
    { key: 'approved', label: 'Aprovadas', badge: stats.approved },
    { key: 'rejected', label: 'Rejeitadas', badge: stats.rejected },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Aplicações"
        description="Acompanhe o pipeline de candidatos, avalie perfis e evolua cada aplicação."
        actions={<Button variant="outline" size="sm" onClick={load}>↻ Atualizar</Button>}
      />

      {loading ? (
        <div style={{ display: 'grid', gap: spacing.lg }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: spacing.md }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 80, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 100, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState
          title="Nenhuma aplicação encontrada"
          description="As aplicações aparecerão aqui quando candidatos se inscreverem nas vagas."
          icon="📬"
        />
      ) : (
        <>
          {/* Stats Premium */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing.md, marginBottom: spacing.xl }}>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, ${colors.surface}, #f8fafc)`, border: `1px solid ${colors.borderLight}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs }}>Total</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.total}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #eff6ff, #fff)`, border: `1px solid ${colors.infoLight}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(59, 130, 246, 0.05)', width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.info, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Novas</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.infoDark }}>{stats.submitted}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #fffbeb, #fff)`, border: `1px solid ${colors.warningLight}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(245, 158, 11, 0.1)', width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.warning, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Shortlist</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.text }}>{stats.shortlisted}</div>
            </div>
            <div style={{ padding: spacing.lg, borderRadius: radius.xl, background: `linear-gradient(135deg, #ecfdf5, #fff)`, border: `1px solid ${colors.successLight}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(16, 185, 129, 0.1)', width: 100, height: 100, borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ fontSize: fontSize.sm, color: colors.success, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>Aprovadas</div>
              <div style={{ fontSize: '28px', fontWeight: fontWeight.bold, color: colors.successDark }}>{stats.approved}</div>
            </div>
            <div style={{ padding: spacing.md, background: colors.surface, border: `1px solid ${colors.borderLight}`, borderRadius: radius.xl, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <ScoreGauge value={stats.progress} size={52} strokeWidth={5} />
              <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', fontWeight: fontWeight.medium }}>Conversão</div>
            </div>
          </div>

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
            {vacancies.length > 1 && (
              <div style={{ flex: '0 1 240px', minWidth: 180 }}>
                <Select
                  label="Vaga"
                  value={vacancyFilter}
                  onChange={(e) => setVacancyFilter(e.target.value)}
                  options={[{ value: '', label: 'Todas as vagas' }, ...vacancies]}
                />
              </div>
            )}
          </div>

          <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Cards */}
          {filtered.length === 0 ? (
            <EmptyState title="Nenhuma aplicação" description="Ajuste os filtros para ver resultados." icon="🔍" />
          ) : (
            <div style={{ display: 'grid', gap: spacing.md }}>
              <style>{premiumStyles}</style>
              {filtered.map((app, index) => {
                const name = app.candidate.profile?.fullName || app.candidate.email;
                return (
                  <div key={app.id} className="premium-card" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.md, padding: spacing.lg }}>
                      {/* Left */}
                      <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-start', minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: radius.full, background: colors.primaryLight, color: colors.textInverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 0, overflow: 'hidden' }}>
                          {app.candidate.profile?.photoUrl ? (
                            <img src={app.candidate.profile.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          ) : (
                            initials(name)
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs }}>
                            <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text }}>{name}</span>
                            <StatusPill status={app.status} />
                          </div>
                          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', fontSize: fontSize.sm, color: colors.textSecondary }}>
                            <span title="Vaga">📋 {app.vacancy.title}</span>
                            {app.vacancy.location && <span title="Local">📍 {app.vacancy.location}</span>}
                            {app.vacancy.seniority && <span title="Senioridade">🎯 {app.vacancy.seniority}</span>}
                            <span title="Data">📅 {formatRelative(app.createdAt)}</span>
                          </div>
                          {(app.vacancy.requiredSkills?.length ?? 0) > 0 && (
                            <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.sm }}>
                              {app.vacancy.requiredSkills!.slice(0, 4).map((s) => (
                                <Badge key={s} variant="info" size="sm">{s}</Badge>
                              ))}
                              {(app.vacancy.requiredSkills!.length > 4) && (
                                <span style={{ fontSize: fontSize.xs, color: colors.textMuted, alignSelf: 'center' }}>+{app.vacancy.requiredSkills!.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/applications/${app.id}/dossier`)}>
                          Ver perfil
                        </Button>
                        <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                          {statusLabel[app.status] ?? app.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Premium */}
          <div style={{ 
            marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.full, 
            background: 'rgba(255,255,255,0.6)', border: `1px solid ${colors.borderLight}`, 
            backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            fontSize: fontSize.sm, color: colors.textSecondary 
          }}>
            <span style={{ paddingLeft: spacing.sm }}>Exibindo <strong style={{ color: colors.text }}>{filtered.length}</strong> de {apps.length} aplicações</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, paddingRight: spacing.sm }}>
              {stats.submitted > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.info, boxShadow: `0 0 8px ${colors.info}` }} />}
              <span>{stats.submitted > 0 ? `${stats.submitted} nova(s) para triar` : '✅ Todas triadas'}</span>
            </div>
          </div>
        </>
      )}
    </PageContent>
  );
}
