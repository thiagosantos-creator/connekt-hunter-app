import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, InlineMessage, colors, spacing, fontSize, fontWeight, radius, shadows } from '@connekt/ui';

const MAX_DURATION_SEC = 180; // 3 minutes

type Phase = 'idle' | 'requesting' | 'recording' | 'preview' | 'uploading' | 'done' | 'error';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Step5IntroVideoView() {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // Countdown timer during recording
  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= MAX_DURATION_SEC) {
          recorderRef.current?.stop();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = async () => {
    setPhase('requesting');
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        if (previewRef.current) previewRef.current.src = URL.createObjectURL(blob);
        setPhase('preview');
        stopStream();
      };

      recorder.start(250);
      setPhase('recording');
      setElapsed(0);
    } catch (err) {
      console.error('[Step5IntroVideoView] camera access error:', err);
      setPhase('error');
      setErrMsg('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stop = () => recorderRef.current?.stop();

  const discard = () => {
    blobRef.current = null;
    setElapsed(0);
    setPhase('idle');
  };

  const upload = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setPhase('uploading');
    try {
      const presign = await apiPost<{ objectKey: string; provider: string; upload: { url: string; method: string; headers: Record<string, string> } }>(
        '/candidate/onboarding/intro-video/presign',
        { token: getToken(), filename: 'intro.webm', contentType: blob.type },
      );
      const uploadUrl = presign.upload?.url;
      if (!uploadUrl) throw new Error('URL de upload indisponível. Tente novamente.');

      const res = await fetch(uploadUrl, {
        method: presign.upload.method ?? 'PUT',
        headers: { 'Content-Type': blob.type, ...(presign.upload.headers ?? {}) },
        body: blob,
      });
      if (!res.ok) throw new Error('Falha ao enviar o vídeo. Tente novamente.');

      await apiPost('/candidate/onboarding/intro-video/complete', {
        token: getToken(),
        objectKey: presign.objectKey,
        provider: presign.provider,
        durationSec: elapsed,
      });

      setPhase('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const skip = () => navigate('/status');

  const remaining = Math.max(0, MAX_DURATION_SEC - elapsed);
  const isNearEnd = remaining <= 30 && phase === 'recording';

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={5} />

      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>
          Passo 5 — Vídeo de Apresentação
        </h2>
        <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textSecondary, fontSize: fontSize.md }}>
          Grave um vídeo de 2 a 3 minutos apresentando seu perfil profissional. Ele ficará vinculado ao seu cadastro e poderá ser utilizado em múltiplas candidaturas.
        </p>
      </div>

      {/* Prompt card */}
      {phase === 'idle' && (
        <Card style={{ marginBottom: spacing.md, background: colors.infoLight, border: `1px solid ${colors.info}` }}>
          <CardContent>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.accent, marginBottom: spacing.sm }}>
              💡 Sugestão de roteiro
            </div>
            <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.text, lineHeight: 1.7 }}>
              Fale sobre sua trajetória profissional, principais habilidades e o que você busca na próxima oportunidade.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video recorder area */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardContent>
          {/* Timer bar */}
          {phase === 'recording' && (
            <div style={{ marginBottom: spacing.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize.xs, color: isNearEnd ? colors.danger : colors.textMuted, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.danger, display: 'inline-block', animation: 'recordPulse 1s ease infinite' }} />
                  Gravando — {formatTime(elapsed)}
                </span>
                <span style={{ fontWeight: isNearEnd ? fontWeight.bold : fontWeight.normal }}>
                  {isNearEnd ? '⚠️ ' : ''}Restam {formatTime(remaining)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: radius.full, background: colors.borderLight, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(elapsed / MAX_DURATION_SEC) * 100}%`,
                  borderRadius: radius.full,
                  background: isNearEnd ? colors.danger : colors.accent,
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
          )}

          {/* Video element */}
          <div style={{ borderRadius: radius.lg, overflow: 'hidden', background: colors.primary, position: 'relative', minHeight: 200, marginBottom: spacing.sm }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', maxHeight: 300, display: phase === 'preview' ? 'none' : 'block', objectFit: 'cover' }}
            />
            <video
              ref={previewRef}
              controls
              playsInline
              style={{ width: '100%', maxHeight: 300, display: phase === 'preview' ? 'block' : 'none', objectFit: 'cover' }}
            />
            {(phase === 'idle' || phase === 'requesting') && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textInverse, gap: spacing.sm }}>
                <span style={{ fontSize: 40 }}>🎥</span>
                <span style={{ fontSize: fontSize.sm, opacity: 0.7 }}>
                  {phase === 'requesting' ? 'Abrindo câmera...' : 'Câmera desligada'}
                </span>
              </div>
            )}
            {phase === 'uploading' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textInverse, background: colors.overlayInverseHeavy, gap: spacing.sm }}>
                <span style={{ fontSize: fontSize.lg }}>⬆️ Enviando vídeo...</span>
              </div>
            )}
          </div>

          {errMsg && <div style={{ marginBottom: spacing.sm }}><InlineMessage variant="error">{errMsg}</InlineMessage></div>}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(phase === 'idle' || phase === 'error') && (
              <Button onClick={() => { void start(); }} style={{ flex: 1 }}>
                🎥 Iniciar gravação
              </Button>
            )}
            {phase === 'recording' && (
              <Button variant="danger" onClick={stop} style={{ flex: 1 }}>
                ⏹ Parar gravação
              </Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" onClick={discard}>🗑 Regravar</Button>
                <Button onClick={() => { void upload(); }} style={{ flex: 1 }}>
                  ✅ Enviar vídeo
                </Button>
              </>
            )}
            {phase === 'uploading' && (
              <Button disabled loading style={{ flex: 1 }}>Enviando...</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Done state */}
      {phase === 'done' && (
        <div style={{ padding: spacing.lg, background: colors.successLight, borderRadius: radius.xl, border: `1px solid ${colors.success}`, textAlign: 'center', marginBottom: spacing.md, boxShadow: shadows.sm }}>
          <div style={{ fontSize: 40, marginBottom: spacing.sm }}>🎉</div>
          <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.success, marginBottom: spacing.xs }}>
            Vídeo enviado com sucesso!
          </div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm }}>
            Seu perfil está completo. Entraremos em contato sobre as próximas etapas.
          </p>
        </div>
      )}

      {/* Tips */}
      {phase !== 'done' && (
        <Card style={{ marginBottom: spacing.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}`, boxShadow: shadows.sm }}>
          <CardContent>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm }}>
              Dicas para um bom vídeo:
            </div>
            <ul style={{ margin: 0, paddingLeft: spacing.lg, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 2 }}>
              <li>🌟 Escolha um local bem iluminado e silencioso</li>
              <li>👔 Vista-se profissionalmente</li>
              <li>👁️ Olhe para a câmera ao falar</li>
              <li>🎙️ Fale em ritmo natural, sem pressa</li>
              <li>⏱️ Mantenha entre 2 e 3 minutos (máx. 3 min)</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: spacing.sm }}>
        {phase !== 'done' && (
          <Button variant="secondary" type="button" onClick={() => navigate('/onboarding/preferences')}>
            ← Voltar
          </Button>
        )}
        {phase !== 'done' && (
          <Button variant="ghost" type="button" onClick={skip} disabled={phase === 'uploading'}>
            Pular por agora
          </Button>
        )}
        {phase === 'done' && (
          <Button onClick={() => navigate('/status')} style={{ flex: 1 }}>
            Ver minha candidatura →
          </Button>
        )}
      </div>

      <style>{`@keyframes recordPulse { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
    </div>
  );
}
