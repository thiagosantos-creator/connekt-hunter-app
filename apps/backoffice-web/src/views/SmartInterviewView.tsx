import { useEffect, useState } from 'react';
import { apiPost, apiGet } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Application, Vacancy } from '../services/types.js';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  PageHeader,
  PageContent,
  InlineMessage,
  StepTimeline,
  SectionTitle,
  TableSkeleton,
  AiTag,
  spacing,
  colors,
  fontSize,
  radius,
} from '@connekt/ui';

interface InterviewQuestion {
  id: string;
  prompt: string;
  orderIndex: number;
  maxDuration?: number;
  source?: string;
}

interface TemplateWithQuestions {
  id: string;
  vacancyId: string;
  status: string;
  questions: InterviewQuestion[];
}

interface ReviewSession {
  id: string;
  status: string;
  answers: Array<{
    questionId: string;
    transcription?: string;
    aiScore?: number;
  }>;
}

export function SmartInterviewView() {
  useAuth();
  const [vacancyId, setVacancyId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState<TemplateWithQuestions | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [notes, setNotes] = useState('Aprovado para próxima etapa');
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [review, setReview] = useState<ReviewSession | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const currentStep = !templateId ? 0 : !sessionId ? 1 : !review ? 2 : 3;

  useEffect(() => {
    void Promise.all([
      apiGet<Vacancy[]>('/vacancies').then(setVacancies).catch(() => setVacancies([])),
      apiGet<Application[]>('/applications').then(setApplications).catch(() => setApplications([])),
    ]);
  }, []);

  const feedback = (text: string, variant: 'success' | 'error') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const saveTemplate = async () => {
    try {
      const tpl = await apiPost<TemplateWithQuestions>('/smart-interview/templates', {
        vacancyId,
        configJson: { intro: 'Entrevista assíncrona', attempts: 1 },
      });
      setTemplateId(tpl.id);
      setTemplate(tpl);
      feedback('Template salvo.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const generateQuestions = async () => {
    try {
      const tpl = await apiPost<TemplateWithQuestions>(`/smart-interview/templates/${templateId}/generate-questions`, {});
      setTemplate(tpl);
      feedback('Perguntas geradas pela IA.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const loadExistingTemplate = async () => {
    if (!vacancyId) return;
    try {
      const tpl = await apiGet<TemplateWithQuestions | null>(`/smart-interview/templates?vacancyId=${vacancyId}`);
      if (tpl) {
        setTemplateId(tpl.id);
        setTemplate(tpl);
        feedback('Template existente carregado.', 'success');
      }
    } catch {
      // no existing template
    }
  };

  const createSession = async () => {
    try {
      const session = await apiPost<{ id: string; publicToken: string }>(
        '/smart-interview/sessions',
        { applicationId },
      );
      setSessionId(session.id);
      setSessionToken(session.publicToken);
      feedback('Sessão criada com sucesso!', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const loadReview = async () => {
    if (!sessionId) return;
    setReviewLoading(true);
    try {
      const data = await apiGet<ReviewSession>(`/smart-interview/sessions/${sessionId}/review`);
      setReview(data);
    } catch (err) {
      feedback(String(err), 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const approveReview = async () => {
    try {
      await apiPost(`/smart-interview/sessions/${sessionId}/human-review`, {
        decision: reviewDecision,
        notes,
      });
      feedback('Review humano salvo.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  return (
    <PageContent>
      <PageHeader
        title="Entrevista Inteligente"
        description="Configure, envie e revise entrevistas assíncronas em 4 passos. Cada etapa é desbloqueada conforme o progresso."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <StepTimeline
        steps={['Configurar Template', 'Criar Sessão', 'Revisar Entrevista', 'Decisão']}
        current={currentStep}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>

        {/* ── Step 1: Template ────────────────────────────────────────────── */}
        <Card style={{ borderLeft: `3px solid ${currentStep === 0 ? colors.accent : templateId ? colors.success : colors.border}`, opacity: currentStep > 0 && templateId ? 0.85 : 1, transition: 'opacity 0.2s' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ width: 28, height: 28, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.sm, fontWeight: 700, color: colors.textInverse, background: templateId ? colors.success : colors.accent }}>
                {templateId ? '✓' : '1'}
              </span>
              <div>
                <CardTitle>Configurar Template</CardTitle>
                <CardDescription>Selecione a vaga e configure as perguntas da entrevista.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Vaga"
              value={vacancyId}
              onChange={(e) => { setVacancyId(e.target.value); setTemplateId(''); setTemplate(null); }}
              options={vacancies.map((item) => ({ value: item.id, label: item.title }))}
              placeholder="Selecione uma vaga"
            />
          </CardContent>
          <CardFooter style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button onClick={() => { void saveTemplate(); }} disabled={!vacancyId}>
              Criar Template
            </Button>
            <Button variant="outline" onClick={() => { void loadExistingTemplate(); }} disabled={!vacancyId}>
              Carregar Existente
            </Button>
            <Button
              variant="secondary"
              onClick={() => { void generateQuestions(); }}
              disabled={!templateId}
            >
              <AiTag /> Gerar Perguntas com IA
            </Button>
          </CardFooter>

          {/* Question Preview */}
          {template?.questions && template.questions.length > 0 && (
            <CardContent>
              <SectionTitle>Preview de Perguntas ({template.questions.length})</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {template.questions.map((q, i) => (
                  <div
                    key={q.id}
                    style={{
                      display: 'flex',
                      gap: spacing.sm,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      background: colors.surfaceAlt,
                      borderRadius: radius.md,
                      alignItems: 'flex-start',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <span style={{ width: 24, height: 24, borderRadius: radius.full, background: colors.primaryLight, color: colors.textInverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.xs, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.text }}>{q.prompt}</p>
                      <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
                        {q.maxDuration && (
                          <Badge variant="info" size="sm">⏱️ {q.maxDuration}s max</Badge>
                        )}
                        {q.source && (
                          <Badge variant={q.source === 'manual' ? 'neutral' : 'primary'} size="sm">{q.source === 'manual' ? '✏️ Manual' : '🤖 IA'}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── Step 2: Session ─────────────────────────────────────────────── */}
        <Card style={{ borderLeft: `3px solid ${currentStep === 1 ? colors.accent : sessionId ? colors.success : colors.border}`, opacity: !templateId ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ width: 28, height: 28, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.sm, fontWeight: 700, color: colors.textInverse, background: sessionId ? colors.success : templateId ? colors.accent : colors.textMuted }}>
                {sessionId ? '✓' : '2'}
              </span>
              <div>
                <CardTitle>Criar Sessão</CardTitle>
                <CardDescription>Selecione a aplicação e gere a sessão de entrevista para o candidato.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Aplicação (candidato + vaga)"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              options={applications.map((item) => ({ value: item.id, label: `${item.candidate.email} — ${item.vacancy.title}` }))}
              placeholder="Selecione uma aplicação"
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void createSession(); }} disabled={!applicationId || !templateId}>
              Criar Sessão
            </Button>
          </CardFooter>
          {sessionToken && (
            <CardContent>
              <div style={{ padding: spacing.md, background: colors.successLight, borderRadius: radius.md, border: `1px solid ${colors.success}`, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <span style={{ fontSize: fontSize.lg }}>✅</span>
                  <strong style={{ color: colors.success }}>Sessão criada com sucesso</strong>
                </div>
                <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                  Código do candidato: <code style={{ background: colors.surface, padding: `2px ${spacing.sm}px`, borderRadius: radius.sm, fontWeight: 700 }}>{sessionToken}</code>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── Step 3: Review + Decision ───────────────────────────────────── */}
        <Card style={{ borderLeft: `3px solid ${currentStep >= 2 ? colors.accent : colors.border}`, opacity: !sessionId && !templateId ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ width: 28, height: 28, borderRadius: radius.full, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.sm, fontWeight: 700, color: colors.textInverse, background: review ? colors.success : currentStep >= 2 ? colors.accent : colors.textMuted }}>
                {review ? '✓' : '3'}
              </span>
              <div>
                <CardTitle>Revisar & Decidir</CardTitle>
                <CardDescription>Carregue a sessão, revise respostas com scores de IA e registre sua decisão.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'flex', gap: spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 280px', minWidth: 200 }}>
                <Input
                  label="ID da Sessão"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => { void loadReview(); }} disabled={!sessionId}>
                Carregar Review
              </Button>
            </div>

            {reviewLoading && <TableSkeleton rows={3} columns={2} />}

            {review && (
              <div style={{ marginTop: spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.sm, borderRadius: radius.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  <Badge variant={review.status === 'submitted' ? 'success' : review.status === 'in_progress' ? 'info' : 'neutral'}>
                    {review.status === 'submitted' ? '📩 Submetida' : review.status === 'in_progress' ? '⏳ Em andamento' : review.status}
                  </Badge>
                  <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                    {review.answers?.length ?? 0} resposta(s) recebida(s)
                  </span>
                </div>

                <div style={{ display: 'grid', gap: spacing.sm }}>
                  {review.answers?.map((ans, i) => {
                    const scoreColor = ans.aiScore !== undefined
                      ? ans.aiScore >= 70 ? colors.success : ans.aiScore >= 50 ? colors.warning : colors.danger
                      : undefined;
                    return (
                      <div key={ans.questionId} style={{ padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.md, border: `1px solid ${colors.border}`, borderLeft: scoreColor ? `3px solid ${scoreColor}` : undefined }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                          <Badge variant="neutral" size="sm">Pergunta {i + 1}</Badge>
                          {ans.aiScore !== undefined && (
                            <Badge variant={ans.aiScore >= 70 ? 'success' : ans.aiScore >= 50 ? 'warning' : 'danger'} size="sm">
                              🤖 Score IA: {ans.aiScore}%
                            </Badge>
                          )}
                        </div>
                        {ans.transcription ? (
                          <p style={{ fontSize: fontSize.sm, color: colors.text, margin: 0, lineHeight: 1.6 }}>"{ans.transcription}"</p>
                        ) : (
                          <p style={{ fontSize: fontSize.sm, color: colors.textMuted, margin: 0, fontStyle: 'italic' }}>Sem transcrição disponível</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>

          {/* Decision section */}
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, borderTop: `1px solid ${colors.border}`, marginTop: spacing.sm }}>
            <SectionTitle>Decisão do Review Humano</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: spacing.md }}>
              <Select
                label="Decisão"
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
                options={[
                  { value: 'approved', label: '✅ Aprovado — prosseguir para próxima etapa' },
                  { value: 'rejected', label: '❌ Reprovado — encerrar processo' },
                  { value: 'needs_review', label: '🔄 Revisão adicional necessária' },
                ]}
              />
              <Textarea
                label="Notas de Review"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Adicione observações sobre o desempenho do candidato..."
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void approveReview(); }} disabled={!sessionId}>
              Registrar Review Humano
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContent>
  );
}
