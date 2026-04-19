import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContent,
  StatBox,
  colors,
  fontSize,
  fontWeight,
  radius,
  shadows,
  spacing,
  Spinner,
  Select,
} from '@connekt/ui';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet } from '../services/api.js';
import type { 
  Vacancy, 
  Organization, 
  HeadhunterDashboardMetrics 
} from '../services/types.js';

/* ── Custom Styled Components (Styles) ─────────────────────────────── */

const glassStyles = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  borderRadius: radius.xl,
};

const metricLabelStyle = {
  fontSize: fontSize.sm,
  color: colors.textSecondary,
  fontWeight: fontWeight.medium,
  marginBottom: spacing.xs,
};

const metricValueStyle = {
  fontSize: '2.5rem',
  fontWeight: fontWeight.black,
  color: colors.text,
  letterSpacing: '-0.04em',
  lineHeight: 1,
};

/* ── Funnel Component ────────────────────────────────────────────── */

function EfficiencyFunnel({ data }: { data: HeadhunterDashboardMetrics['funnel'] }) {
  const steps = [
    { label: 'Shortlisted', value: data.shortlisted, color: colors.accent },
    { label: 'Aprovados', value: data.approved, color: colors.success },
    { label: 'Contratados', value: data.hired, color: colors.primary },
  ];

  const max = Math.max(...steps.map(s => s.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, width: '100%', padding: spacing.md }}>
      {steps.map((step, i) => {
        const width = (step.value / max) * 100;
        return (
          <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
            <div style={{ width: 100, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary }}>{step.label}</div>
            <div style={{ flex: 1, height: 32, background: colors.surfaceAlt, borderRadius: radius.full, overflow: 'hidden', position: 'relative' }}>
              <div 
                style={{ 
                  width: `${width}%`, 
                  height: '100%', 
                  background: `linear-gradient(90deg, ${step.color}, ${step.color}dd)`, 
                  transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: radius.full,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: spacing.sm,
                  minWidth: step.value > 0 ? '40px' : '0'
                }}
              >
                <span style={{ color: colors.textInverse, fontSize: fontSize.xs, fontWeight: fontWeight.black }}>{step.value}</span>
              </div>
            </div>
            {i < steps.length - 1 && steps[i].value > 0 && (
               <div style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.bold, width: 45 }}>
                 {Math.round((steps[i+1].value / steps[i].value) * 100) || 0}%
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── PulseChart (Upgraded) ────────────────────────────────────────── */

function PulseChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 5);
  const width = 800;
  const height = 150;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 0,${height} L ${points} L ${width},${height} Z`}
          fill="url(#chartGradient)"
          style={{ transition: 'all 0.5s ease' }}
        />
        <polyline
          fill="none"
          stroke={colors.accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          style={{ filter: `drop-shadow(0px 8px 12px ${colors.accent}44)`, transition: 'all 0.5s ease' }}
        />
      </svg>
    </div>
  );
}

/* ── Main View ─────────────────────────────────────────────────────── */

export function HomeView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('14');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterVacancy, setFilterVacancy] = useState('');
  
  const [metrics, setMetrics] = useState<HeadhunterDashboardMetrics | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);

  // Fetch Logic
  useEffect(() => {
    const init = async () => {
      try {
        const [orgsData, vData] = await Promise.all([
          apiGet<Organization[]>('/organizations'),
          apiGet<Vacancy[]>('/vacancies'),
        ]);
        setOrgs(orgsData);
        setVacancies(vData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    void init();
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          days: filterDays,
          ...(filterOrg && { organizationId: filterOrg }),
          ...(filterVacancy && { vacancyId: filterVacancy }),
        });
        const data = await apiGet<HeadhunterDashboardMetrics>(`/headhunter-dashboard/metrics?${query.toString()}`);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    void loadMetrics();
  }, [filterDays, filterOrg, filterVacancy]);

  // Derived Options
  const orgOptions = useMemo(() => orgs.map(o => ({ value: o.id, label: o.name })), [orgs]);
  const vacancyOptions = useMemo(() => {
    const filtered = filterOrg ? vacancies.filter(v => v.organizationId === filterOrg) : vacancies;
    return filtered.map(v => ({ value: v.id, label: v.title }));
  }, [vacancies, filterOrg]);

  if (!metrics && loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxxl }}><Spinner size={48} /></div>;
  }

  // Mocked activity for the pulse (since real activity stream might be too much for now)
  const pulseData = [10, 15, 8, 20, 25, 18, 22, 35, 30, 45, 38, 50, 42, 65];

  return (
    <PageContent style={{ maxWidth: 1600, paddingBottom: spacing.xxxl }}>
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="fade-up" style={{ marginBottom: spacing.xxl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '4.5rem', 
            fontWeight: fontWeight.black, 
            color: colors.text, 
            letterSpacing: '-0.06em',
            lineHeight: 0.9
          }}>
            Dashboard
          </h1>
          <p style={{ margin: `${spacing.md}px 0 0`, fontSize: fontSize.xl, color: colors.textSecondary, fontWeight: fontWeight.medium, letterSpacing: '-0.01em' }}>
            Visão executiva da sua operação de recrutamento.
          </p>
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <Card className="glass-panel" style={{ padding: spacing.sm, display: 'flex', gap: spacing.md, alignItems: 'center', ...glassStyles }}>
          <Select
            value={filterDays}
            onChange={(e) => setFilterDays(e.target.value)}
            options={[
              { value: '7', label: 'Últimos 7 dias' },
              { value: '14', label: 'Últimos 14 dias' },
              { value: '30', label: 'Últimos 30 dias' },
            ]}
            style={{ minWidth: 160 }}
          />
          <Select
            value={filterOrg}
            onChange={(e) => { setFilterOrg(e.target.value); setFilterVacancy(''); }}
            options={orgOptions}
            placeholder="Todos os Clientes"
            style={{ minWidth: 200 }}
          />
          <Select
            value={filterVacancy}
            onChange={(e) => setFilterVacancy(e.target.value)}
            options={vacancyOptions}
            placeholder="Todas as Vagas"
            style={{ minWidth: 200 }}
          />
        </Card>
      </header>

      {/* ── KPI Grid ──────────────────────────────────────────────── */}
      <div className="fade-up" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: spacing.xl, 
        marginBottom: spacing.xxl 
      }}>
        <Card style={{ ...glassStyles, padding: spacing.xl }}>
          <div style={metricLabelStyle}>Vagas Publicadas</div>
          <div style={metricValueStyle}>{metrics?.kpis.published}</div>
          <div style={{ marginTop: spacing.md, fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.bold }}>↑ 12% vs anterior</div>
        </Card>
        
        <Card style={{ ...glassStyles, padding: spacing.xl }}>
          <div style={metricLabelStyle}>Vagas Fechadas</div>
          <div style={metricValueStyle}>{metrics?.kpis.filled}</div>
          <div style={{ marginTop: spacing.md, fontSize: fontSize.xs, color: colors.textMuted }}>Meta: 10</div>
        </Card>

        <Card style={{ ...glassStyles, padding: spacing.xl }}>
          <div style={metricLabelStyle}>Contratações</div>
          <div style={metricValueStyle}>{metrics?.kpis.hires}</div>
          <div style={{ marginTop: spacing.md, fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.bold }}>Foco em Retenção</div>
        </Card>

        <Card style={{ ...glassStyles, padding: spacing.xl }}>
          <div style={metricLabelStyle}>Média Shortlist</div>
          <div style={metricValueStyle}>{metrics?.kpis.avgShortlist}</div>
          <div style={{ marginTop: spacing.md, fontSize: fontSize.xs, color: colors.textSecondary }}>Candidatos/Vaga</div>
        </Card>
      </div>

      {/* ── Advanced Charts & Efficiency ───────────────────────────── */}
      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: spacing.xxl, alignItems: 'start' }}>
        
        {/* Performance Chart */}
        <Card className="glass-panel" style={{ border: 'none', ...glassStyles, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: spacing.xl, opacity: 0.1, fontSize: '8rem', pointerEvents: 'none' }}>📈</div>
          <CardHeader>
            <CardTitle>Pulso das Candidaturas</CardTitle>
            <p style={{ margin: 0, fontSize: fontSize.md, color: colors.textSecondary }}>Monitoramento de engajamento no período</p>
          </CardHeader>
          <CardContent style={{ padding: spacing.xl }}>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.02)', 
              borderRadius: radius.xl, 
              padding: spacing.xl,
              border: '1px solid rgba(59, 130, 246, 0.05)'
            }}>
              {loading ? <Spinner /> : <PulseChart data={pulseData} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.lg, color: colors.textSecondary, fontSize: fontSize.sm }}>
               <div style={{ display: 'flex', gap: spacing.md }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                   <div style={{ width: 12, height: 12, borderRadius: 3, background: colors.accent }}></div>
                   <span>Volume de Aplicações</span>
                 </div>
               </div>
               <div style={{ fontWeight: fontWeight.bold, color: colors.accent }}>Tendência de Alta</div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency & Funnel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card className="glass-panel" style={{ border: 'none', ...glassStyles }}>
            <CardHeader>
              <CardTitle>Eficiência do Funil</CardTitle>
              <p style={{ margin: 0, fontSize: fontSize.md, color: colors.textSecondary }}>Taxas de conversão entre etapas</p>
            </CardHeader>
            <CardContent>
              {metrics && <EfficiencyFunnel data={metrics.funnel} />}
            </CardContent>
          </Card>

          <Card style={{ ...glassStyles, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: spacing.xl, borderRight: `1px solid ${colors.border}` }}>
                <div style={metricLabelStyle}>Time-to-Shortlist (Média)</div>
                <div style={{ ...metricValueStyle, fontSize: '2rem' }}>{metrics?.kpis.tts}<span style={{ fontSize: fontSize.lg, marginLeft: 4 }}>d</span></div>
                <div style={{ marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.success }}>-2d vs meta</div>
              </div>
              <div style={{ padding: spacing.xl }}>
                <div style={metricLabelStyle}>Time-to-Approval (Média)</div>
                <div style={{ ...metricValueStyle, fontSize: '2rem' }}>{metrics?.kpis.tta}<span style={{ fontSize: fontSize.lg, marginLeft: 4 }}>d</span></div>
                <div style={{ marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.warning }}>No SLA</div>
              </div>
            </div>
          </Card>

          {/* Quick AI Coaching */}
          <Card style={{ 
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, 
            color: colors.textInverse, 
            border: 'none', 
            boxShadow: shadows.xl,
            ...glassStyles,
            backdropFilter: 'none'
          }}>
            <CardHeader><CardTitle style={{ color: colors.textInverse }}>Sugerido por IA</CardTitle></CardHeader>
            <CardContent>
              <p style={{ margin: 0, fontSize: fontSize.md, opacity: 0.9, lineHeight: 1.6 }}>
                Identificamos um gargalo na <strong>Aprovação de Shortlist</strong> no Cliente "TechFlow". Recomenda-se enviar um lembrete das candidaturas pendentes.
              </p>
              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.lg }}>
                <Button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: colors.textInverse }} size="sm" onClick={() => navigate('/shortlist')}>
                  Ver Pendências
                </Button>
                <Button variant="ghost" style={{ color: colors.textInverse, opacity: 0.8 }} size="sm">Ignorar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {loading && (
        <div style={{ 
          position: 'fixed', 
          bottom: spacing.xl, 
          right: spacing.xl, 
          background: colors.surface, 
          padding: spacing.md, 
          borderRadius: radius.md, 
          boxShadow: shadows.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          zIndex: 100
        }}>
          <Spinner size={16} />
          <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Atualizando métricas...</span>
        </div>
      )}
    </PageContent>
  );
}
