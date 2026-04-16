import { colors, fontSize, fontWeight, radius, shadows, spacing } from '../tokens/tokens.js';
import { Button } from './Button.js';
import { Card, CardContent, CardHeader, CardTitle } from './Card.js';
import { Badge, RiskBadge } from './Badge.js';
import { ScoreBar } from './Score.js';
import { AiTag, EmptyState, Tabs, StepTimeline } from './Layout.js';

// --- Shared Internal Components ---

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const safeArray = <T,>(value?: T[] | null) => (Array.isArray(value) ? value : []);
const sentence = (value?: string) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1).replace(/[-_]/g, ' ')}` : '';
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : 'Não informado';
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('pt-BR') : 'Não informado';
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'C';
const radarColor = (value: number) => value >= 80 ? colors.success : value >= 60 ? colors.info : value >= 40 ? colors.warning : colors.danger;

function stringList(value?: Array<string | { name?: string }> | string) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  return value.map((item) => typeof item === 'string' ? item : item?.name ?? '').filter(Boolean);
}

function SignalRadar({ values }: { values: Array<{ label: string; value: number }> }) {
  const size = 280;
  const center = size / 2;
  const radiusValue = 82;
  const point = (index: number, raw: number, scale = 1) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2) / values.length) * index;
    const distance = radiusValue * scale * (raw / 100);
    return { x: center + Math.cos(angle) * distance, y: center + Math.sin(angle) * distance };
  };
  const polygon = values.map((item, index) => {
    const p = point(index, clamp(item.value));
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={values.map((_, index) => {
            const p = point(index, level);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke={colors.border}
          strokeWidth={1}
        />
      ))}
      {values.map((item, index) => {
        const edge = point(index, 100);
        const label = point(index, 100, 1.23);
        return (
          <g key={item.label}>
            <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke={colors.borderLight} strokeWidth={1} />
            <text x={label.x} y={label.y} textAnchor="middle" fontSize={fontSize.xs} fill={colors.textSecondary}>{item.label}</text>
          </g>
        );
      })}
      <polygon points={polygon} fill="rgba(37,99,235,0.16)" stroke={colors.info} strokeWidth={2} />
      {values.map((item, index) => {
        const p = point(index, clamp(item.value));
        return <circle key={`${item.label}-point`} cx={p.x} cy={p.y} r={4} fill={colors.info} />;
      })}
    </svg>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: spacing.sm, borderRadius: radius.lg, background: colors.overlayLight, border: '1px solid rgba(255,255,255,0.16)' }}>
      <div style={{ fontSize: fontSize.xs, opacity: 0.78, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function TagBlock({ title, tags, tone, emptyLabel }: { title: string; tags: string[]; tone: 'success' | 'warning' | 'info' | 'neutral'; emptyLabel: string }) {
  const toneMap = {
    success: { bg: colors.successLight, fg: colors.successDark, border: 'transparent' },
    warning: { bg: colors.warningLight, fg: colors.warningDark, border: 'transparent' },
    info: { bg: colors.infoLight, fg: colors.infoDark, border: 'transparent' },
    neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary, border: colors.border },
  } as const;
  const palette = toneMap[tone];
  return (
    <div>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>{title}</div>
      {tags.length > 0 ? (
        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <span key={tag} style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: radius.full, background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`, fontSize: fontSize.xs, fontWeight: fontWeight.medium }}>{tag}</span>
          ))}
        </div>
      ) : <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{emptyLabel}</div>}
    </div>
  );
}

function InsightBlock({ title, items, accent, emptyLabel }: { title: string; items: string[]; accent: string; emptyLabel: string }) {
  return (
    <div>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>{title}</div>
      {items.length > 0 ? (
        <div style={{ display: 'grid', gap: spacing.xs }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: spacing.sm }}>
              <div style={{ width: 10, height: 10, borderRadius: radius.full, background: accent, marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{item}</div>
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{emptyLabel}</div>}
    </div>
  );
}

function ProgressItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: spacing.sm, borderRadius: radius.lg, background: done ? colors.successLight : colors.surfaceAlt, border: `1px solid ${done ? 'transparent' : colors.border}` }}>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{label}</div>
      <Badge variant={done ? 'success' : 'neutral'}>{done ? 'Concluído' : 'Pendente'}</Badge>
    </div>
  );
}

function TimelineRow({ title, subtitle, body }: { title: string; subtitle: string; body: string }) {
  return (
    <div style={{ display: 'flex', gap: spacing.sm }}>
      <div style={{ width: 10, height: 10, borderRadius: radius.full, background: colors.accent, marginTop: 6, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>{title}</div>
        <div style={{ fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 }}>{subtitle}</div>
        <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

// --- Main Component ---

export interface CandidateDossierProps {
  detail: any; // Type as ApplicationDetail from backoffice if possible, but keeping it generic for UI package
  intelligence: {
    matching?: any;
    risk?: any;
    insights?: any;
    recommendations: any[];
    workflowSuggestions: any[];
  };
  viewerRole?: 'admin' | 'headhunter' | 'client';
  onOpenPortal?: () => void;
  candidateWebBase?: string;
  hideTopNav?: boolean;
}

export function CandidateDossier({
  detail,
  intelligence,
  viewerRole = 'client',
  onOpenPortal,
  candidateWebBase,
  hideTopNav = false,
}: CandidateDossierProps) {
  if (!detail) return <EmptyState title="Perfil indisponível" description="Não foi possível montar a apresentação do candidato." />;

  const latestResume = detail?.candidate.onboarding?.resumes?.[0]?.parseResult?.parsedJson;
  const resume = latestResume;
  const name = detail?.candidate.profile?.fullName || detail?.candidate.email || 'Candidato';
  const headline = safeArray(resume?.experience)[0]?.role || detail?.vacancy.title || 'Perfil em avaliação';
  const place = typeof resume?.location === 'string' ? resume.location : resume?.location?.city || detail?.vacancy.location || 'Localização não informada';
  const skills = Array.from(new Set([
    ...stringList(resume?.skills),
    ...safeArray(detail?.vacancy.requiredSkills),
    ...safeArray(detail?.vacancy.desiredSkills),
  ])).filter(Boolean);

  const topScore = (key: 'roleFit' | 'communication' | 'adaptability' | 'readiness') => {
    const matching = intelligence.matching;
    const risk = intelligence.risk;
    const onboarding = detail?.candidate.onboarding;
    const breakdown = (dimension: string, fallback: number) => clamp(Math.round(matching?.breakdowns?.find((item: any) => item.dimension === dimension)?.score ?? fallback));

    if (key === 'roleFit') return clamp(Math.round(matching?.score ?? 62));
    if (key === 'communication') return breakdown('interview', detail?.smartInterviewSessions?.length ? 84 : 66);
    if (key === 'adaptability') return clamp(Math.round(100 - ((risk?.riskScore ?? 0.35) * 100)));
    return clamp(
      (onboarding?.basicCompleted ? 24 : 0)
      + (onboarding?.consentCompleted ? 18 : 0)
      + (onboarding?.resumeCompleted ? 28 : 0)
      + Math.min((detail?.evaluations?.length ?? 0) * 10, 20)
      + (latestResume ? 10 : 0),
    ) || 40;
  };

  const smartCards = [
    { label: 'Fit da vaga', value: topScore('roleFit') },
    { label: 'Comunicação', value: topScore('communication') },
    { label: 'Adaptabilidade', value: topScore('adaptability') },
    { label: 'Prontidão', value: topScore('readiness') },
  ];

  const radarValues = [
    ...smartCards,
    { label: 'Skills', value: clamp((skills.length * 18) + 20) },
    { label: 'Consistência', value: clamp(Math.round((smartCards[0].value + smartCards[2].value) / 2)) },
  ];

  return (
    <div className="candidate-dossier" style={{ width: '100%' }}>
      {/* ── Hero banner ─────────────────────────────────────────── */}
      <section style={{
        marginBottom: spacing.lg,
        padding: spacing.xl,
        borderRadius: radius.xl,
        color: colors.textInverse,
        background: `linear-gradient(135deg, ${detail.vacancy.organization?.tenantSettings?.primaryColor || colors.primary} 0%, ${detail.vacancy.organization?.tenantSettings?.secondaryColor || colors.primaryLight} 100%)`,
        overflow: 'hidden',
        boxShadow: shadows.lg
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: spacing.lg }}>
          <div>
            <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg }}>
              <div style={{
                width: 78, height: 78, borderRadius: radius.full,
                background: colors.overlayMedium, border: '1px solid rgba(255,255,255,0.24)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
                overflow: 'hidden', flexShrink: 0
              }}>
                {detail.candidate.profile?.photoUrl ? (
                  <img src={detail.candidate.profile.photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                ) : (
                  initials(name)
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: fontSize.lg, opacity: 0.9 }}>{headline}</div>
                <div style={{ marginTop: spacing.xs, fontSize: fontSize.sm, opacity: 0.88 }}>{detail.vacancy.organization?.tenantSettings?.publicName || detail.vacancy.organization?.name || 'Connekt'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              <Badge variant="info">{sentence(detail.status)}</Badge>
              {detail.candidate.onboarding?.resumeCompleted ? <Badge variant="success">Onboarding concluído</Badge> : <Badge variant="warning">Onboarding em andamento</Badge>}
              {detail.shortlistItems?.length ? <Badge variant="warning">Em shortlist</Badge> : <Badge variant="neutral">Em triagem</Badge>}
              {detail.shortlistItems?.[0]?.decisions?.[0] && <Badge variant="success">Cliente: {sentence(detail.shortlistItems[0].decisions[0].decision)}</Badge>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: spacing.sm, marginBottom: spacing.md }}>
              <MiniInfo label="E-mail" value={detail.candidate.email} />
              <MiniInfo label="Telefone" value={detail.candidate.profile?.phone || detail.candidate.phone || 'Não informado'} />
              <MiniInfo label="Localização" value={place} />
              <MiniInfo label="Aplicado em" value={formatDate(detail.createdAt)} />
            </div>

            <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.overlayMedium, border: '1px solid rgba(255,255,255,0.2)' }}>
              <AiTag />
              <div style={{ marginTop: spacing.xs, fontSize: fontSize.sm, lineHeight: 1.7 }}>
                {intelligence.insights?.summary || intelligence.matching?.explanations?.[0]?.explanation || detail.smartInterviewSessions?.[0]?.aiAnalysis?.summary || 'Perfil pronto para uma avaliação mais consultiva após o onboarding.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: spacing.sm, alignSelf: 'start', padding: spacing.lg, borderRadius: radius.xl, background: 'rgba(9,16,29,0.28)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: shadows.lg }}>
            {smartCards.map((card) => (
              <div key={card.label} style={{ padding: spacing.sm, borderRadius: radius.lg, background: colors.overlayLight, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: fontSize.xs, opacity: 0.8 }}>{card.label}</div>
                <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold }}>{card.value}</div>
              </div>
            ))}
            {(onOpenPortal || (candidateWebBase && detail.candidate.token)) && (
              <div style={{ gridColumn: '1 / -1', marginTop: spacing.sm }}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (onOpenPortal) onOpenPortal();
                    else if (candidateWebBase && detail.candidate.token) window.open(`${candidateWebBase}/?token=${encodeURIComponent(detail.candidate.token ?? '')}`, '_blank', 'noopener,noreferrer');
                  }}
                  style={{ width: '100%', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
                >
                  Abrir portal do candidato
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Smart scores + Risk ─────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg }}>
        <Card style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}>
          <CardHeader><CardTitle>Smart scores</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: spacing.sm, marginBottom: spacing.lg }}>
              {smartCards.map((card) => (
                <div key={card.label} style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                  <div style={{ fontSize: fontSize.xxxl, lineHeight: 1, fontWeight: fontWeight.bold, color: radarColor(card.value), marginTop: spacing.xs }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><SignalRadar values={radarValues} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sinais de IA e risco</CardTitle></CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            {safeArray(intelligence.matching?.breakdowns).slice(0, 4).map((item: any) => (
              <ScoreBar key={item.dimension} value={item.score} label={sentence(item.dimension)} color={radarColor(item.score)} />
            ))}
            <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                {intelligence.risk ? (
                  <>
                    <RiskBadge level={(intelligence.risk.overallRisk as 'low' | 'medium' | 'high' | 'critical') || 'medium'} />
                    <Badge variant="neutral">Score de risco {Math.round((intelligence.risk.riskScore ?? 0) * 100)}</Badge>
                  </>
                ) : (
                  <Badge variant="neutral">Risco ainda não calculado</Badge>
                )}
              </div>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{intelligence.risk?.explanation || 'O cálculo de risco aparecerá aqui quando houver sinais suficientes.'}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Skills + Insights ───────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg }}>
        <Card>
          <CardHeader><CardTitle>Skills, idiomas e aderência</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            <TagBlock title="Skills mapeadas" tags={skills} tone="info" emptyLabel="As competências identificadas aparecerão aqui." />
            <TagBlock title="Obrigatórias da vaga" tags={safeArray(detail.vacancy.requiredSkills)} tone="success" emptyLabel="Sem skills obrigatórias definidas." />
            <TagBlock title="Desejáveis" tags={safeArray(detail.vacancy.desiredSkills)} tone="warning" emptyLabel="Sem skills desejáveis definidas." />
            <TagBlock title="Idiomas" tags={stringList(resume?.languages)} tone="neutral" emptyLabel="Idiomas ainda não identificados." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Insights assistivos</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            <InsightBlock title="Pontos fortes" items={safeArray(intelligence.insights?.strengths)} accent={colors.success} emptyLabel="A IA ainda não destacou forças específicas." />
            <InsightBlock title="Pontos de atenção" items={safeArray(intelligence.insights?.risks)} accent={colors.warning} emptyLabel="Nenhum ponto sensível foi destacado." />
            <InsightBlock title="Recomendações IA" items={safeArray(intelligence.insights?.recommendations)} accent={colors.info} emptyLabel="As recomendações aparecerão aqui." />
          </CardContent>
        </Card>
      </section>

      {/* ── Experience + Education ──────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg }}>
        <Card>
          <CardHeader><CardTitle>Experiência profissional</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            {safeArray(resume?.experience).length > 0 ? safeArray(resume?.experience).map((item: any, index: number) => (
              <div key={`${item.company ?? 'company'}-${index}`} style={{ paddingBottom: spacing.md, borderBottom: index === safeArray(resume?.experience).length - 1 ? 'none' : `1px solid ${colors.borderLight}` }}>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>{item.role || 'Experiência identificada'}</div>
                <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, margin: `${spacing.xs}px 0` }}>{item.company || 'Empresa não identificada'}{item.period ? ` • ${item.period}` : ''}</div>
                {item.summary && <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{item.summary}</div>}
              </div>
            )) : <EmptyState title="Experiência não estruturada" description="O parse do currículo ainda não trouxe histórico detalhado." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Educação e onboarding</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            {safeArray(resume?.education).length > 0 ? safeArray(resume?.education).map((item: any, index: number) => (
              <div key={`${item.institution ?? 'education'}-${index}`} style={{ paddingBottom: spacing.md, borderBottom: index === safeArray(resume?.education).length - 1 ? 'none' : `1px solid ${colors.borderLight}` }}>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>{item.degree || 'Formação identificada'}</div>
                <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{item.institution || 'Instituição não identificada'}{item.period ? ` • ${item.period}` : ''}</div>
              </div>
            )) : <EmptyState title="Educação não estruturada" description="Nenhuma formação consolidada foi identificada." />}
            <div style={{ display: 'grid', gap: spacing.sm }}>
              <ProgressItem label="Dados básicos" done={Boolean(detail.candidate.onboarding?.basicCompleted)} />
              <ProgressItem label="Consentimento" done={Boolean(detail.candidate.onboarding?.consentCompleted)} />
              <ProgressItem label="Currículo" done={Boolean(detail.candidate.onboarding?.resumeCompleted)} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Intro video ──────────────────────────────────────── */}
      {detail.candidate.profile?.introVideoKey && (
        <section style={{ marginBottom: spacing.lg }}>
          <Card>
            <CardHeader><CardTitle>Vídeo de apresentação</CardTitle></CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.md }}>
              <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }}>
                  <Badge variant={detail.candidate.profile.introVideoAnalysisStatus === 'completed' ? 'success' : 'warning'}>
                    {detail.candidate.profile.introVideoAnalysisStatus === 'completed' ? '✅ Analisado' : '⏳ Processando'}
                  </Badge>
                  {detail.candidate.profile.introVideoDurationSec != null && (
                    <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                      Duração: {Math.floor(detail.candidate.profile.introVideoDurationSec / 60)}:{String(detail.candidate.profile.introVideoDurationSec % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
                {detail.candidate.profile.introVideoSummary && (
                  <div style={{ marginTop: spacing.sm }}>
                    <AiTag />
                    <div style={{ marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>
                      {detail.candidate.profile.introVideoSummary}
                    </div>
                  </div>
                )}
                {Array.isArray(detail.candidate.profile.introVideoTags) && detail.candidate.profile.introVideoTags.length > 0 && (
                  <div style={{ marginTop: spacing.sm, display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {detail.candidate.profile.introVideoTags.map((tag: any, idx: number) => (
                      <span key={idx} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.infoLight, color: colors.infoDark, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {String(tag)}
                      </span>
                    ))}
                  </div>
                )}
                {detail.candidate.profile.introVideoSentimentJson && (
                  <div style={{ marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.textMuted }}>
                    Sentimento: {String((detail.candidate.profile.introVideoSentimentJson as Record<string, unknown>).sentiment ?? 'N/A')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Smart Interview ─────────────────────────────────────── */}
      {safeArray(detail.smartInterviewSessions).length > 0 && (
        <section style={{ marginBottom: spacing.lg }}>
          <Card>
            <CardHeader><CardTitle>Entrevista inteligente</CardTitle></CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.md }}>
              {detail.smartInterviewSessions!.map((session: any) => (
                <div key={session.id} style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.xs }}>
                    <Badge variant={session.status === 'reviewed' ? 'success' : session.status === 'submitted' ? 'info' : 'warning'}>{sentence(session.status)}</Badge>
                    {session.startedAt && <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Início: {formatDate(session.startedAt)}</span>}
                    {session.submittedAt && <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Enviado: {formatDate(session.submittedAt)}</span>}
                  </div>
                  {session.aiAnalysis && (
                    <div style={{ marginTop: spacing.sm }}>
                      <AiTag />
                      <div style={{ marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>
                        {session.aiAnalysis.summary}
                      </div>
                      {Array.isArray(session.aiAnalysis.highlights) && session.aiAnalysis.highlights.length > 0 && (
                        <div style={{ marginTop: spacing.sm }}>
                          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.success, marginBottom: spacing.xs }}>Destaques</div>
                          {session.aiAnalysis.highlights.map((h: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: spacing.xs, marginBottom: 2 }}>
                              <span style={{ color: colors.success }}>•</span>
                              <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{String(h)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {Array.isArray(session.aiAnalysis.risks) && session.aiAnalysis.risks.length > 0 && (
                        <div style={{ marginTop: spacing.sm }}>
                          <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.warning, marginBottom: spacing.xs }}>Pontos de atenção</div>
                          {session.aiAnalysis.risks.map((r: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: spacing.xs, marginBottom: 2 }}>
                              <span style={{ color: colors.warning }}>•</span>
                              <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{String(r)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {session.humanReview && (
                    <div style={{ marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.md, background: colors.surface, border: `1px solid ${colors.borderLight}` }}>
                      <div style={{ fontSize: fontSize.xs, color: colors.textMuted }}>Revisão humana por {session.humanReview.reviewer?.name || 'Avaliador'}</div>
                      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 }}>{sentence(session.humanReview.decision)}</div>
                      {session.humanReview.notes && <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{session.humanReview.notes}</div>}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Evaluations + Recommendations ───────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg }}>
        <Card>
          <CardHeader><CardTitle>Pareceres e histórico</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            {safeArray(detail.evaluations).length > 0 ? detail.evaluations?.map((item: any) => {
              const hasRatings = [item.ratingTechnical, item.ratingBehavioral, item.ratingInterviewer, item.ratingAi].some((v) => v != null);
              return (
                <div key={item.id} style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
                    <div>
                      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text }}>{item.evaluator?.name || item.evaluator?.email || 'Avaliador'}</div>
                      <div style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{formatDateTime(item.createdAt)}</div>
                    </div>
                    {item.overallRating != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.md, background: colors.primaryLight, color: colors.textInverse }}>
                        <span style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, lineHeight: 1 }}>{item.overallRating}%</span>
                        <span style={{ fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>ranking</span>
                      </div>
                    )}
                  </div>
                  {hasRatings && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${spacing.xs}px ${spacing.md}px`, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, background: colors.surface, border: `1px solid ${colors.border}` }}>
                      {([
                        { key: 'ratingTechnical', label: '🔧 Técnica' },
                        { key: 'ratingBehavioral', label: '🤝 Comportamental' },
                        { key: 'ratingInterviewer', label: '🎙️ Entrevistador' },
                        { key: 'ratingAi', label: '🤖 IA' },
                      ] as const).map(({ key, label }) => {
                        const val = (item as any)[key];
                        if (val == null) return null;
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                            <span style={{ fontSize: fontSize.xs, color: colors.textSecondary, minWidth: 90 }}>{label}</span>
                            <span style={{ color: colors.warning }}>{Array.from({ length: val }, (_, i) => <span key={i}>★</span>)}</span>
                            <span style={{ fontSize: fontSize.xs, color: colors.textMuted }}>{val}/5</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{item.comment}</div>
                </div>
              );
            }) : <EmptyState title="Sem avaliações humanas" description="Os pareceres do time aparecerão aqui quando forem registrados." />}
            {detail.shortlistItems?.[0]?.decisions?.[0] && (
              <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.successLight, color: colors.successDark }}>
                <div style={{ fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Última decisão do cliente</div>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginTop: spacing.xs }}>{sentence(detail.shortlistItems[0].decisions[0].decision)}</div>
                {detail.shortlistItems[0].decisions[0].reviewer && (
                  <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 }}>por {detail.shortlistItems[0].decisions[0].reviewer.name || detail.shortlistItems[0].decisions[0].reviewer.email}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recomendações e próximos passos</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md }}>
            {intelligence.recommendations.length > 0 ? intelligence.recommendations.map((item: any) => (
              <div key={item.id} style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs }}>
                  <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>{item.title}</div>
                  <Badge variant="info">{Math.round(item.confidence * 100)}%</Badge>
                </div>
                <div style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.7 }}>{item.explanation}</div>
                {item.actionableInsights && (
                  <div style={{ marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.infoDark }}>
                    {(typeof item.actionableInsights === 'string' ? [item.actionableInsights] : item.actionableInsights).map((insight: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: spacing.xs, marginBottom: 2 }}>
                        <span>💡</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : <EmptyState title="Sem recomendações geradas" description="As recomendações assistivas aparecerão aqui quando houver sinal suficiente." />}
            {viewerRole !== 'client' && intelligence.workflowSuggestions.length > 0 && intelligence.workflowSuggestions.map((item: any) => (
              <TimelineRow key={item.id} title={sentence(item.suggestionType)} subtitle={sentence(item.status)} body={item.explanation} />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
