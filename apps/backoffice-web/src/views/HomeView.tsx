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
} from '@connekt/ui';
import { useAuth } from '../hooks/useAuth.js';
import { apiGet } from '../services/api.js';
import type { Vacancy, ShortlistItemWithApplication } from '../services/types.js';

/* ── Metrics Helper ────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000;

function calculateAvgClosingTime(vacancies: Vacancy[]) {
  const closed = vacancies.filter((v) => v.closedAt && v.publishedAt);
  if (closed.length === 0) return 0;
  const totalDays = closed.reduce((sum, v) => {
    const diff = new Date(v.closedAt!).getTime() - new Date(v.publishedAt!).getTime();
    return sum + diff / MS_PER_DAY;
  }, 0);
  return Math.round(totalDays / closed.length);
}

/* ── PulseChart Component (Custom SVG) ─────────────────────────────── */

function PulseChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 5);
  const width = 400;
  const height = 120;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M 0,${height} L ${points} L ${width},${height} Z`}
          fill="url(#gradient)"
        />
        <polyline
          fill="none"
          stroke={colors.accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.1))' }}
        />
      </svg>
    </div>
  );
}

/* ── Main View ─────────────────────────────────────────────────────── */

export function HomeView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [shortlistCount, setShortlistCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [vData, sData] = await Promise.all([
          apiGet<Vacancy[]>('/vacancies'),
          apiGet<ShortlistItemWithApplication[]>('/shortlist/items'),
        ]);
        setVacancies(vData);
        setShortlistCount(sData.length);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => {
    const active = vacancies.filter(v => v.status === 'active').length;
    const avgDays = calculateAvgClosingTime(vacancies);
    return { active, avgDays };
  }, [vacancies]);

  // Mocked activity data for the chart
  const pulseData = [12, 18, 15, 25, 22, 30, 28, 35, 32, 45, 40, 55, 48, 60];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xxxl }}><Spinner size={48} /></div>;

  return (
    <PageContent style={{ maxWidth: 1600 }}>
      <header className="fade-up" style={{ marginBottom: spacing.xxl, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '4.5rem', 
            fontWeight: fontWeight.black, 
            color: colors.text, 
            letterSpacing: '-0.06em',
            lineHeight: 0.9
          }}>
            Olá, {user?.name?.split(' ')[0] ?? 'Recrutador'}
          </h1>
          <p style={{ margin: `${spacing.md}px 0 0`, fontSize: fontSize.xl, color: colors.textSecondary, fontWeight: fontWeight.medium, letterSpacing: '-0.01em' }}>
            Sua operação está com <span style={{ color: colors.accent, fontWeight: fontWeight.bold }}>{stats.active} vagas ativas</span> hoje.
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: 8 }}>
          <Button variant="outline" size="lg" onClick={() => navigate('/candidates')} style={{ borderRadius: radius.xl }}>Base de Talentos</Button>
          <Button size="lg" onClick={() => navigate('/vacancies')} style={{ borderRadius: radius.xl, boxShadow: shadows.glow }}>Postar Nova Vaga</Button>
        </div>
      </header>

      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.xl, marginBottom: spacing.xxl }}>
        <StatBox label="Vagas Ativas" value={stats.active} subtext="Processos em andamento" icon="📁" />
        <StatBox label="Shortlist" value={shortlistCount} subtext="Prontos para aprovação" icon="💎" />
        <StatBox label="Média de Fechamento" value={`${stats.avgDays}d`} subtext="Time-to-fill operacional" icon="⏱️" />
      </div>

      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: spacing.xxl }}>
        {/* Main Chart Section */}
        <Card className="glass-panel" style={{ border: 'none' }}>
          <CardHeader>
            <CardTitle>Pulso das Candidaturas</CardTitle>
            <p style={{ margin: 0, fontSize: fontSize.md, color: colors.textSecondary }}>Monitoramento em tempo real (últimos 14 dias)</p>
          </CardHeader>
          <CardContent style={{ padding: spacing.xl }}>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.03)', 
              borderRadius: radius.xl, 
              padding: spacing.xl,
              border: '1px solid rgba(59, 130, 246, 0.05)'
            }}>
              <PulseChart data={pulseData} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing.md, color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
              <span>Início do ciclo</span>
              <span style={{ color: colors.accent, fontWeight: fontWeight.bold }}>Performance Máxima</span>
              <span>Hoje</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Center */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card className="glass-panel" style={{ border: 'none' }}>
            <CardHeader><CardTitle>Ações Prioritárias</CardTitle></CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.md }}>
              <div 
                className="hover-card" 
                style={{ padding: spacing.md, background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: spacing.md }}
                onClick={() => navigate('/vacancies')}
              >
                <div style={{ width: 40, height: 40, borderRadius: radius.md, background: colors.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
                <div>
                  <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md }}>Gerar Vaga com IA</div>
                  <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Criar JD completo em segundos</div>
                </div>
              </div>
              <div 
                className="hover-card" 
                style={{ padding: spacing.md, background: colors.surface, borderRadius: radius.lg, border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: spacing.md }}
                onClick={() => navigate('/shortlist')}
              >
                <div style={{ width: 40, height: 40, borderRadius: radius.md, background: colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💎</div>
                <div>
                  <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md }}>Novos Candidatos</div>
                  <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Analise os perfis da Shortlist</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`, color: colors.textInverse, border: 'none', boxShadow: shadows.xl }}>
            <CardHeader><CardTitle style={{ color: colors.textInverse }}>Assistente Inteligente</CardTitle></CardHeader>
            <CardContent>
              <p style={{ margin: 0, fontSize: fontSize.md, opacity: 0.8, lineHeight: 1.6 }}>
                Com base nos últimos fechamentos, recomendamos focar na vaga de <strong>Senior Frontend Engineer</strong> para reduzir o time-to-fill.
              </p>
              <Button style={{ marginTop: spacing.lg, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: colors.textInverse }} onClick={() => navigate('/candidates')}>
                Otimizar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContent>
  );
}
