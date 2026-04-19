import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  colors, 
  spacing, 
  radius, 
  fontSize, 
  fontWeight,
  Spinner,
  Button
} from '@connekt/ui';
import { SourcingFitInsight } from '../../services/types';

interface Props {
  insight: SourcingFitInsight | null;
  loading: boolean;
  onClose: () => void;
  candidateName: string;
  conflicts?: Array<{ vacancyId: string; vacancyTitle: string; addedAt: string }>;
}

export function MatchInsightDrawer({ insight, loading, onClose, candidateName, conflicts }: Props) {
  if (!loading && !insight) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 450,
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(30px)',
      boxShadow: '-10px 0 50px rgba(0,0,0,0.1)',
      zIndex: 1000,
      padding: spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: `1px solid ${colors.border}`,
      animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <header style={{ marginBottom: spacing.xl, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: '-0.02em' }}>
            Análise de Fit IA
          </h2>
          <p style={{ margin: 0, fontSize: fontSize.md, color: colors.textSecondary }}>{candidateName}</p>
        </div>
        <Button variant="ghost" onClick={onClose}>&times;</Button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Conflict Alert */}
        {conflicts && conflicts.length > 0 && (
          <div style={{
            background: 'rgba(255, 187, 0, 0.1)',
            border: `1px solid rgba(255, 187, 0, 0.3)`,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs
          }}>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#b58900' }}>
              ⚠️ Atenção: Candidato em múltiplas vagas
            </div>
            {conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: fontSize.xs, color: '#7b5e00' }}>
                Ativo no Shortlist da vaga: <strong>{c.vacancyTitle}</strong>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: spacing.md }}>
            <Spinner size={32} />
            <p style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Processando evidências com IA...</p>
          </div>
        ) : insight && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            
            {/* Score Circle */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: `${spacing.xl}px 0` }}>
              <div style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `8px solid ${colors.surfaceAlt}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <svg style={{ position: 'absolute', transform: 'rotate(-90deg)' }} width="120" height="120">
                  <circle
                    cx="60" cy="60" r="52"
                    fill="transparent"
                    stroke={colors.accent}
                    strokeWidth="8"
                    strokeDasharray={326.7}
                    strokeDashoffset={326.7 - (326.7 * insight.score) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div style={{ fontSize: '1.8rem', fontWeight: fontWeight.black, color: colors.text }}>
                  {Math.round(insight.score)}%
                </div>
              </div>
            </div>

            {/* Explanations */}
            {insight.explanations.map((exp, i) => (
              <Card key={i} style={{ background: colors.surfaceAlt, border: 'none', borderRadius: radius.lg }}>
                <CardContent style={{ padding: spacing.md }}>
                  <p style={{ margin: 0, fontSize: fontSize.sm, lineHeight: 1.6, color: colors.text }}>
                    {exp.explanation}
                  </p>
                </CardContent>
              </Card>
            ))}

            {/* Breakdowns */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <h3 style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.xs }}>Dimensões Analisadas</h3>
              {insight.breakdowns.map((b, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                    <span style={{ textTransform: 'uppercase', color: colors.textSecondary }}>{b.dimension}</span>
                    <span style={{ color: colors.accent }}>{b.score}%</span>
                  </div>
                  <div style={{ height: 6, background: colors.surfaceAlt, borderRadius: radius.full, overflow: 'hidden' }}>
                    <div style={{ width: `${b.score}%`, height: '100%', background: colors.accent, borderRadius: radius.full }} />
                  </div>
                  <p style={{ margin: 0, fontSize: fontSize.xs, color: colors.textMuted }}>{b.reasoning}</p>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      <footer style={{ marginTop: spacing.xl, display: 'flex', gap: spacing.md }}>
        <Button style={{ flex: 1 }} variant="primary">Convidar para Vaga</Button>
        <Button style={{ flex: 1 }} variant="secondary">Adicionar ao Shortlist</Button>
      </footer>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
