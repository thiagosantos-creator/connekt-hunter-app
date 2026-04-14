import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  fontWeight,
  radius,
  shadows,
} from '@connekt/ui';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface InterviewQuestion {
  id: string;
  prompt: string;
  maxDurationSec?: number;
}

interface InterviewTemplate {
  questions: InterviewQuestion[];
}

interface InterviewSession {
  id: string;
  template: InterviewTemplate;
}

interface PresignResponse {
  uploadUrl: string;
  objectKey: string;
}

/* ── Recording states ────────────────────────────────────────────────── */
type RecordState = 'idle' | 'countdown' | 'recording' | 'preview' | 'uploading' | 'done';

/* ── Utility ─────────────────────────────────────────────────────────── */
const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/* ── Recorder hook ───────────────────────────────────────────────────── */
function useVideoRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recorderError, setRecorderError] = useState('');

  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }
    } catch {
      setRecorderError('Não foi possível acessar a câmera. Volte e verifique as permissões.');
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    setRecorderError('');
    setRecordedBlob(null);
    setRecordState('countdown');
    setCountdown(3);

    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countInterval);

        chunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const recorder = new MediaRecorder(streamRef.current!, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setRecordedBlob(blob);
          if (previewRef.current) {
            previewRef.current.src = URL.createObjectURL(blob);
          }
          setRecordState('preview');
        };

        recorder.start(250); // collect every 250ms
        setRecordState('recording');
        setElapsed(0);
      }
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordState('idle');
  }, []);

  // Tick elapsed time while recording
  useEffect(() => {
    if (recordState !== 'recording') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recordState]);

  return {
    videoRef, previewRef, recordState, setRecordState,
    countdown, elapsed, recordedBlob,
    recorderError, setRecorderError,
    startPreview, stopStream, startRecording, stopRecording, discardRecording,
  };
}

/* ── Main view ───────────────────────────────────────────────────────── */
export function InterviewView() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('si_public_token') ?? '');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const autoLoaded = useRef(false);

  const {
    videoRef, previewRef, recordState, setRecordState,
    countdown, elapsed, recordedBlob,
    recorderError, setRecorderError,
    startPreview, stopStream, startRecording, stopRecording, discardRecording,
  } = useVideoRecorder();

  // Auto-load session from stored token (once on mount)
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    const stored = localStorage.getItem('si_public_token');
    if (stored) void loadSession(stored);
  });

  // Start camera preview when session is loaded
  useEffect(() => {
    if (session) void startPreview();
    return () => stopStream();
  }, [session, startPreview, stopStream]);

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

  const uploadAnswer = useCallback(async (questionId: string, blob: Blob, durationSec: number) => {
    if (!session) return;
    setRecordState('uploading');
    setRecorderError('');
    try {
      // 1. Request presigned upload URL
      const presign = await apiPost<PresignResponse>(
        `/smart-interview/sessions/${session.id}/answers/presign`,
        { questionId, contentType: blob.type },
      );

      // 2. Upload blob directly to storage (S3/GCS compatible)
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error('Falha ao enviar o vídeo para o servidor.');

      // 3. Mark as complete
      await apiPost(`/smart-interview/sessions/${session.id}/answers/complete`, {
        questionId,
        objectKey: presign.objectKey,
        durationSec,
      });

      setAnsweredIds((prev) => new Set([...prev, questionId]));
      setMsg('✅ Resposta gravada e enviada com sucesso!');
      setMsgVariant('success');
      setRecordState('done');
      discardRecording();

      if (current < session.template.questions.length - 1) {
        setTimeout(() => setCurrent((c) => c + 1), 1200);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
      setMsgVariant('error');
      setRecordState('preview');
    }
  }, [session, current, setRecordState, setRecorderError, discardRecording]);

  const finalize = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await apiPost(`/smart-interview/sessions/${session.id}/submit`, {});
      setMsg('Entrevista finalizada com sucesso! 🎉');
      setMsgVariant('success');
      setSubmitted(true);
      localStorage.removeItem('si_public_token');
      stopStream();
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
  const allAnswered = session !== null && answeredIds.size === totalQuestions;

  /* ── Submitted screen ──────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: `0 ${spacing.md}px`, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: spacing.lg }}>🎉</div>
        <h2 style={{ color: colors.text, margin: `0 0 ${spacing.sm}px`, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}>
          Entrevista Concluída!
        </h2>
        <p style={{ color: colors.textSecondary, fontSize: fontSize.md, marginBottom: spacing.xl, lineHeight: 1.7 }}>
          Suas respostas foram enviadas com sucesso. Nossa equipe irá revisar e entrar em contato em breve.
        </p>
        <div style={{ padding: spacing.lg, background: colors.surfaceAlt, borderRadius: radius.xl, border: `1px solid ${colors.borderLight}`, fontSize: fontSize.sm, color: colors.textSecondary }}>
          🔒 Seus dados e respostas estão protegidos de acordo com a LGPD.
        </div>
      </div>
    );
  }

  /* ── Main render ───────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 680, margin: '32px auto', padding: `0 ${spacing.md}px` }}>
      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>
          Entrevista Inteligente
        </h2>
        <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSecondary, fontSize: fontSize.md }}>
          Responda a cada pergunta gravando sua resposta em vídeo.
        </p>
      </div>

      {/* Token entry — session not loaded */}
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
            <Button onClick={() => { void loadSession(); }} disabled={loading} style={{ width: '100%', marginTop: spacing.md }}>
              {loading ? <><Spinner size={16} /> Carregando…</> : 'Iniciar Entrevista'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recorder errors */}
      {recorderError && (
        <InlineMessage variant="error" style={{ marginBottom: spacing.md }}>
          {recorderError}
        </InlineMessage>
      )}

      {/* Interview card */}
      {session && q && (
        <>
          {/* Progress header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <ScoreBar value={progress} label={`Pergunta ${current + 1} de ${totalQuestions}`} color={colors.accent} height={8} />
            <Badge variant="info" style={{ marginLeft: spacing.md, flexShrink: 0 }}>
              {answeredIds.size}/{totalQuestions} respondidas
            </Badge>
          </div>

          {/* Question prompt */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            color: colors.textInverse,
            padding: spacing.lg,
            borderRadius: radius.xl,
            marginBottom: spacing.md,
            boxShadow: shadows.md,
          }}>
            <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, marginBottom: spacing.sm }}>
              Pergunta {current + 1}
            </div>
            <div style={{ fontSize: fontSize.lg, lineHeight: 1.6, fontWeight: fontWeight.medium }}>
              {q.prompt}
            </div>
          </div>

          {/* Video recorder */}
          <Card style={{ marginBottom: spacing.md, overflow: 'hidden' }}>
            <CardContent style={{ padding: 0 }}>
              {/* Live camera feed / countdown / preview */}
              <div style={{ position: 'relative', background: '#000', borderRadius: `${radius.xl}px ${radius.xl}px 0 0`, overflow: 'hidden' }}>
                {/* Live view (always mounted, hidden when in preview) */}
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'cover',
                    display: recordState === 'preview' ? 'none' : 'block',
                  }}
                />
                {/* Playback preview */}
                <video
                  ref={previewRef}
                  controls
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'cover',
                    display: recordState === 'preview' ? 'block' : 'none',
                  }}
                />

                {/* Countdown overlay */}
                {recordState === 'countdown' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.6)',
                    flexDirection: 'column', gap: spacing.sm,
                  }}>
                    <div style={{ fontSize: 80, fontWeight: fontWeight.bold, color: '#fff', lineHeight: 1 }}>
                      {countdown}
                    </div>
                    <div style={{ fontSize: fontSize.md, color: 'rgba(255,255,255,0.8)' }}>
                      Preparando gravação...
                    </div>
                  </div>
                )}

                {/* Recording indicator */}
                {recordState === 'recording' && (
                  <div style={{
                    position: 'absolute', top: spacing.sm, left: spacing.sm,
                    background: 'rgba(0,0,0,0.65)', borderRadius: radius.full,
                    padding: `${spacing.xs}px ${spacing.sm}px`,
                    display: 'flex', alignItems: 'center', gap: spacing.xs,
                    fontSize: fontSize.xs, color: '#fff',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'recordPulse 1s ease-in-out infinite' }} />
                    REC {formatSeconds(elapsed)}
                  </div>
                )}

                {/* Uploading overlay */}
                {recordState === 'uploading' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.55)',
                    flexDirection: 'column', gap: spacing.md,
                  }}>
                    <Spinner size={40} />
                    <div style={{ color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.medium }}>Enviando resposta...</div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ padding: spacing.md, display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Already answered */}
                {answeredIds.has(q.id) && recordState !== 'recording' && recordState !== 'preview' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <span style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                      ✅ Resposta gravada e enviada
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => discardRecording()}>
                      🔄 Gravar novamente
                    </Button>
                  </div>
                ) : recordState === 'idle' ? (
                  <Button onClick={startRecording} style={{ flex: 1 }}>
                    🎥 Gravar Resposta
                  </Button>
                ) : recordState === 'countdown' ? (
                  <Button disabled style={{ flex: 1 }}>
                    ⏳ Iniciando em {countdown}...
                  </Button>
                ) : recordState === 'recording' ? (
                  <Button variant="danger" onClick={stopRecording} style={{ flex: 1 }}>
                    ⏹ Parar Gravação ({formatSeconds(elapsed)})
                  </Button>
                ) : recordState === 'preview' && recordedBlob ? (
                  <div style={{ display: 'flex', gap: spacing.sm, flex: 1, flexWrap: 'wrap' }}>
                    <Button variant="ghost" onClick={() => { discardRecording(); }}>
                      🗑 Descartar
                    </Button>
                    <Button
                      onClick={() => { void uploadAnswer(q.id, recordedBlob, elapsed); }}
                      style={{ flex: 1 }}
                    >
                      ✅ Confirmar e Enviar Resposta
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Navigation between questions */}
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.md }}>
            {current > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCurrent(current - 1)}>
                ← Anterior
              </Button>
            )}
            <div style={{ flex: 1 }} />
            {current < totalQuestions - 1 && (
              <Button variant="outline" size="sm" onClick={() => setCurrent(current + 1)}>
                Próxima →
              </Button>
            )}
          </div>

          {/* Finalize button */}
          {allAnswered && (
            <div style={{ padding: spacing.lg, background: colors.successLight, borderRadius: radius.xl, border: `1px solid ${colors.success}`, textAlign: 'center' }}>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.success, marginBottom: spacing.md }}>
                🎉 Todas as respostas foram gravadas!
              </div>
              <Button variant="success" onClick={() => { void finalize(); }} loading={loading} style={{ minWidth: 240 }}>
                Finalizar Entrevista
              </Button>
            </div>
          )}
        </>
      )}

      {/* Feedback message */}
      {msg && (
        <div style={{ marginTop: spacing.md }}>
          <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
            {msg}
          </InlineMessage>
        </div>
      )}

      <style>{`
        @keyframes recordPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(239,68,68,0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 0 5px rgba(239,68,68,0.1); }
        }
      `}</style>
    </div>
  );
}
