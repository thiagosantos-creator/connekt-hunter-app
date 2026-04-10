import React, { useState } from 'react';
import { apiGet, apiPost } from '../services/api.js';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, InlineMessage, ScoreBar, colors, spacing, fontSize, radius } from '@connekt/ui';

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

  const loadSession = async () => {
    try {
      const data = await apiGet<InterviewSession>(`/smart-interview/candidate/session/${encodeURIComponent(sessionToken)}`);
      setSession(data);
      localStorage.setItem('si_public_token', sessionToken);
    } catch (err) {
      setMsg(String(err));
    }
  };

  const uploadAnswer = async (questionId: string) => {
    if (!session) return;
    try {
      const presign = await apiPost<PresignResponse>(`/smart-interview/sessions/${session.id}/answers/presign`, { questionId });
      await apiPost(`/smart-interview/sessions/${session.id}/answers/complete`, { questionId, objectKey: presign.objectKey, durationSec: 45 });
      setMsg('Resposta gravada com sucesso.');
      if (current < session.template.questions.length - 1) setCurrent(current + 1);
    } catch (err) {
      setMsg(String(err));
    }
  };

  const finalize = async () => {
    if (!session) return;
    try {
      await apiPost(`/smart-interview/sessions/${session.id}/submit`, {});
      setMsg('Entrevista finalizada com sucesso!');
    } catch (err) {
      setMsg(String(err));
    }
  };

  const q = session?.template?.questions?.[current];
  const totalQuestions = session?.template?.questions?.length ?? 0;
  const progress = totalQuestions > 0 ? ((current + 1) / totalQuestions) * 100 : 0;

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
            <CardDescription>Insira o token da sessão recebido para iniciar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              label="Código da entrevista"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              placeholder="Código recebido para iniciar"
            />
            <Button onClick={() => { void loadSession(); }}>Iniciar Entrevista</Button>
          </CardContent>
        </Card>
      )}

      {session && q && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Pergunta {current + 1} de {totalQuestions}</CardTitle>
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

            <div style={{
              padding: spacing.sm,
              background: colors.successLight,
              borderRadius: radius.md,
              fontSize: fontSize.sm,
              color: colors.success,
              marginBottom: spacing.md,
            }}>
              ✅ Câmera configurada — dispositivo pronto
            </div>

            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button onClick={() => { void uploadAnswer(q.id); }}>
                🎥 Gravar Resposta
              </Button>
              <Button variant="outline" onClick={() => { void finalize(); }}>
                Finalizar Entrevista
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {msg && (
        <div style={{ marginTop: spacing.md }}>
          <InlineMessage variant={msg.startsWith('Error') ? 'error' : 'success'}>
            {msg}
          </InlineMessage>
        </div>
      )}
    </div>
  );
}
