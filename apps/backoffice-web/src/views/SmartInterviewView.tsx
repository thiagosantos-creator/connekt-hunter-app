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
        description="Configure, envie e revise entrevistas assíncronas em um fluxo único."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <StepTimeline
        steps={['Template', 'Sessão', 'Revisar', 'Decisão']}
        current={currentStep}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Step 1: Template */}
        <Card style={{ borderLeft: currentStep === 0 ? `3px solid ${colors.accent}` : undefined }}>
          <CardHeader>
            <CardTitle>1. Configurar Template</CardTitle>
            <CardDescription>Selecione a vaga e configure o template de perguntas.</CardDescription>
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
              <AiTag /> Gerar Perguntas
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
                      padding: spacing.sm,
                      background: colors.surfaceAlt,
                      borderRadius: radius.md,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Badge variant="neutral" size="sm">{i + 1}</Badge>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.text }}>{q.prompt}</p>
                      <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
                        {q.maxDuration && (
                          <Badge variant="info" size="sm">{q.maxDuration}s max</Badge>
                        )}
                        {q.source && (
                          <Badge variant={q.source === 'manual' ? 'neutral' : 'primary'} size="sm">{q.source}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 2: Session */}
        <Card style={{ borderLeft: currentStep === 1 ? `3px solid ${colors.accent}` : undefined }}>
          <CardHeader>
            <CardTitle>2. Criar Sessão</CardTitle>
            <CardDescription>Selecione a aplicação e gere a sessão de entrevista.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Aplicação"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              options={applications.map((item) => ({ value: item.id, label: `${item.candidate.email} — ${item.vacancy.title}` }))}
              placeholder="Selecione uma aplicação"
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void createSession(); }} disabled={!applicationId}>
              Criar Sessão
            </Button>
          </CardFooter>
          {sessionToken && (
            <CardContent>
              <div style={{ padding: spacing.sm, background: colors.successLight, borderRadius: radius.md, fontSize: fontSize.sm, color: colors.success }}>
                ✅ Sessão criada — código do candidato: <strong>{sessionToken}</strong>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Step 3: Review */}
        <Card style={{ borderLeft: currentStep >= 2 ? `3px solid ${colors.accent}` : undefined }}>
          <CardHeader>
            <CardTitle>3. Revisar Entrevista</CardTitle>
            <CardDescription>Carregue a sessão e revise respostas antes de decidir.</CardDescription>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Sessão"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
            <Button variant="outline" onClick={() => { void loadReview(); }} disabled={!sessionId}>
              Carregar Review
            </Button>

            {reviewLoading && <TableSkeleton rows={3} columns={2} />}

            {review && (
              <div style={{ marginTop: spacing.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                  <Badge variant={review.status === 'submitted' ? 'success' : review.status === 'in_progress' ? 'info' : 'neutral'}>
                    {review.status}
                  </Badge>
                  <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                    {review.answers?.length ?? 0} resposta(s)
                  </span>
                </div>

                {review.answers?.map((ans, i) => (
                  <div key={ans.questionId} style={{ padding: spacing.sm, background: colors.surfaceAlt, borderRadius: radius.md, marginBottom: spacing.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                      <Badge variant="neutral" size="sm">Pergunta {i + 1}</Badge>
                      {ans.aiScore !== undefined && (
                        <Badge variant={ans.aiScore >= 70 ? 'success' : ans.aiScore >= 50 ? 'warning' : 'danger'} size="sm">
                          IA: {ans.aiScore}%
                        </Badge>
                      )}
                    </div>
                    {ans.transcription && (
                      <p style={{ fontSize: fontSize.sm, color: colors.textSecondary, margin: 0 }}>{ans.transcription}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Select
              label="Decisão"
              value={reviewDecision}
              onChange={(e) => setReviewDecision(e.target.value)}
              options={[
                { value: 'approved', label: '✅ Aprovado' },
                { value: 'rejected', label: '❌ Reprovado' },
                { value: 'needs_review', label: '🔄 Necessita revisão adicional' },
              ]}
            />
            <Textarea
              label="Notas de Review"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void approveReview(); }} disabled={!sessionId}>
              Salvar Review Humano
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContent>
  );
}
