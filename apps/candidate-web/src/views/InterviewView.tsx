import React, { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost } from '../services/api.js';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  InlineMessage,
  ScoreBar,
  Badge,
  Spinner,
  colors,
  spacing,
  fontSize,
  radius,
} from '@connekt/ui';

interface InterviewQuestion {
  id: string;
  prompt: string;
}

interface InterviewTemplate {
  questions: InterviewQuestion[];
}

interface InterviewSession {
  id: string;
  template: InterviewTemplate;
}

interface PresignResponse {
  objectKey: string;
}

export function InterviewView() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('si_public_token') ?? '');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const autoLoaded = useRef(false);

  // Auto-load session from stored token (once on mount)
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    const stored = localStorage.getItem('si_public_token');
    if (stored) {
      void loadSession(stored);
    }
  });

  const loadSession = async (token?: string) => {
    const t = token ?? sessionToken;
    if (!t) return;
    setLoading(true);
    try {
      const data = await apiGet<InterviewSession>(`/smart-interview/candidate/session/${encodeURIComponent(t)}`);
      setSession(data);
      localStorage.setItem('si_public_token', t);
      setMsg('');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const uploadAnswer = async (questionId: string) => {
    if (!session) return;
    setLoading(true);
    setRecordingStartTime(Date.now());
    try {
      const presign = await apiPost<PresignResponse>(`/smart-interview/sessions/${session.id}/answers/presign`, { questionId });
      const durationSec = recordingStartTime
        ? Math.max(1, Math.round((Date.now() - recordingStartTime) / 1000))
        : 30; // fallback if timer wasn't started
      await apiPost(`/smart-interview/sessions/${session.id}/answers/complete`, { questionId, objectKey: presign.objectKey, durationSec });
      setAnsweredIds((prev) => new Set([...prev, questionId]));
      setRecordingStartTime(null);
      setMsg('Resposta gravada com sucesso!');
      setMsgVariant('success');
      if (current < session.template.questions.length - 1) setCurrent(current + 1);
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const finalize = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await apiPost(`/smart-interview/sessions/${session.id}/submit`, {});
      setMsg('Entrevista finalizada com sucesso! 🎉');
      setMsgVariant('success');
      setSubmitted(true);
      localStorage.removeItem('si_public_token');
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setLoading(false);
    }
  };

  const q = session?.template?.questions?.[current];
  const totalQuestions = session?.template?.questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((current + 1) / totalQuestions) * 100 : 0;

  if (submitted) {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: `0 ${spacing.md}px`, textAlign: 'center' }}>
        <Card variant="elevated">
          <CardContent>
            <div style={{ fontSize: 64, marginBottom: spacing.md }}>🎉</div>
            <h2 style={{ color: colors.text, margin: `0 0 ${spacing.sm}px` }}>Entrevista Concluída!</h2>
            <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
              Suas respostas foram enviadas com sucesso. Nossa equipe irá revisar e entrar em contato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <h2 style={{ color: colors.text, marginBottom: spacing.sm }}>Entrevista Inteligente</h2>
      <p style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
        Responda às perguntas gravando suas respostas em vídeo.
      </p>

      {!session && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Iniciar Entrevista</CardTitle>
            <CardDescription>Insira o código recebido para acessar a entrevista.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              label="Código da entrevista"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              placeholder="Código recebido para iniciar"
            />
            <Button onClick={() => { void loadSession(); }} disabled={loading} style={{ width: '100%' }}>
              {loading ? <><Spinner size={16} /> Carregando…</> : 'Iniciar Entrevista'}
            </Button>
          </CardContent>
        </Card>
      )}

      {session && q && (
        <Card variant="elevated">
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle>Pergunta {current + 1} de {totalQuestions}</CardTitle>
              <Badge variant="info" size="sm">{answeredIds.size}/{totalQuestions} respondidas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScoreBar value={progress} label="Progresso" color={colors.accent} height={6} />

            <div style={{
              background: colors.surfaceAlt,
              padding: spacing.md,
              borderRadius: radius.md,
              marginTop: spacing.md,
              marginBottom: spacing.md,
              fontSize: fontSize.lg,
              color: colors.text,
              lineHeight: 1.6,
            }}>
              {q.prompt}
            </div>

            {answeredIds.has(q.id) ? (
              <div style={{
                padding: spacing.sm,
                background: colors.successLight,
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                color: colors.success,
                marginBottom: spacing.md,
              }}>
                ✅ Resposta gravada para esta pergunta
              </div>
            ) : (
              <div style={{
                padding: spacing.sm,
                background: colors.infoLight,
                borderRadius: radius.md,
                fontSize: fontSize.sm,
                color: colors.info,
                marginBottom: spacing.md,
              }}>
                📹 Câmera configurada — pronto para gravar
              </div>
            )}

            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
              {current > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCurrent(current - 1)}>
                  ← Anterior
                </Button>
              )}
              <Button onClick={() => { void uploadAnswer(q.id); }} disabled={loading}>
                {loading ? <><Spinner size={14} /> Gravando…</> : '🎥 Gravar Resposta'}
              </Button>
              {current < totalQuestions - 1 && (
                <Button variant="outline" size="sm" onClick={() => setCurrent(current + 1)}>
                  Próxima →
                </Button>
              )}
              {answeredIds.size === totalQuestions && (
                <Button variant="success" onClick={() => { void finalize(); }} disabled={loading}>
                  ✅ Finalizar Entrevista
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {msg && (
        <div style={{ marginTop: spacing.md }}>
          <InlineMessage variant={msgVariant}>
            {msg}
          </InlineMessage>
        </div>
      )}
    </div>
  );
}
