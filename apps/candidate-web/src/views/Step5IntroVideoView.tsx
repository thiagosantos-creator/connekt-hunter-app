import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, InlineMessage, colors, spacing, fontSize, fontWeight, radius, shadows } from '@connekt/ui';

const MAX_DURATION_SEC = 180;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [errMsg, setErrMsg] = useState('');
  const [sourceName, setSourceName] = useState('');

  const mediaRecordingSupported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setInterval(() => {
      setElapsed((seconds) => {
        const next = seconds + 1;
        if (next >= MAX_DURATION_SEC) recorderRef.current?.stop();
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const start = async () => {
    if (!mediaRecordingSupported) {
      setErrMsg('Seu navegador não suporta gravação direta. Envie um vídeo pronto do dispositivo.');
      setPhase('error');
      return;
    }

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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setSourceName('gravação ao vivo');
        if (previewRef.current) previewRef.current.src = URL.createObjectURL(blob);
        setPhase('preview');
        stopStream();
      };

      recorder.start(250);
      setPhase('recording');
      setElapsed(0);
    } catch (error) {
      console.error('[Step5IntroVideoView] camera access error:', error);
      setPhase('error');
      setErrMsg('Não foi possível acessar a câmera. Você pode liberar a permissão do navegador ou enviar um vídeo já gravado.');
    }
  };

  const stop = () => recorderRef.current?.stop();

  const discard = () => {
    blobRef.current = null;
    setSourceName('');
    setElapsed(0);
    setPhase('idle');
  };

  const loadVideoDuration = (file: File) => new Promise<number>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : 0);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setErrMsg('Selecione um arquivo de vídeo válido para continuar.');
      return;
    }

    blobRef.current = file;
    setSourceName(file.name);
    setElapsed(await loadVideoDuration(file));
    setErrMsg('');
    if (previewRef.current) previewRef.current.src = URL.createObjectURL(file);
    setPhase('preview');
  };

  const upload = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    setPhase('uploading');
    try {
      const filename = sourceName && sourceName.includes('.') ? sourceName : 'intro.webm';
      const presign = await apiPost<{ objectKey: string; provider: string; upload: { url: string; method: string; headers: Record<string, string> } }>(
        '/candidate/onboarding/intro-video/presign',
        { token: getToken(), filename, contentType: blob.type || 'video/webm' },
      );
      if (!presign.upload?.url) throw new Error('URL de upload indisponível. Tente novamente.');

      const res = await fetch(presign.upload.url, {
        method: presign.upload.method ?? 'PUT',
        headers: { 'Content-Type': blob.type || 'video/webm', ...(presign.upload.headers ?? {}) },
        body: blob,
      });
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? 'Acesso negado ao armazenamento do vídeo. Recarregue a página e tente novamente.'
            : 'Falha ao enviar o vídeo. Tente novamente.',
        );
      }

      await apiPost('/candidate/onboarding/intro-video/complete', {
        token: getToken(),
        objectKey: presign.objectKey,
        provider: presign.provider,
        durationSec: elapsed,
      });

      setPhase('done');
    } catch (error) {
      setErrMsg(error instanceof Error ? error.message : String(error));
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
          Grave ou envie um vídeo de 2 a 3 minutos contando sua trajetória, principais experiências e o que busca na próxima oportunidade.
        </p>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => { void handleFileSelected(e); }} style={{ display: 'none' }} />

      {phase === 'idle' && (
        <Card style={{ marginBottom: spacing.md, background: colors.infoLight, border: `1px solid ${colors.info}` }}>
          <CardContent>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.accent, marginBottom: spacing.sm }}>
              Sugestão de roteiro
            </div>
            <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.text, lineHeight: 1.7 }}>
              Fale sobre sua trajetória profissional, principais habilidades, resultados relevantes e o tipo de desafio que procura agora.
            </p>
            {!mediaRecordingSupported && (
              <div style={{ marginTop: spacing.md }}>
                <InlineMessage variant="warning">
                  A gravação direta não está disponível neste navegador. Use o botão de envio para anexar um vídeo já gravado.
                </InlineMessage>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card style={{ marginBottom: spacing.md }}>
        <CardContent>
          {phase === 'recording' && (
            <div style={{ marginBottom: spacing.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSize.xs, color: isNearEnd ? colors.danger : colors.textMuted, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.danger, display: 'inline-block', animation: 'recordPulse 1s ease infinite' }} />
                  Gravando — {formatTime(elapsed)}
                </span>
                <span style={{ fontWeight: isNearEnd ? fontWeight.bold : fontWeight.normal }}>
                  {isNearEnd ? 'Atenção: ' : ''}restam {formatTime(remaining)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: radius.full, background: colors.borderLight, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(elapsed / MAX_DURATION_SEC) * 100}%`, borderRadius: radius.full, background: isNearEnd ? colors.danger : colors.accent, transition: 'width 1s linear' }} />
              </div>
            </div>
          )}

          <div style={{ borderRadius: radius.lg, overflow: 'hidden', background: colors.primary, position: 'relative', minHeight: 200, marginBottom: spacing.sm }}>
            <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 300, display: phase === 'preview' ? 'none' : 'block', objectFit: 'cover' }} />
            <video ref={previewRef} controls playsInline style={{ width: '100%', maxHeight: 300, display: phase === 'preview' ? 'block' : 'none', objectFit: 'cover' }} />
            {(phase === 'idle' || phase === 'requesting') && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textInverse, gap: spacing.sm }}>
                <span style={{ fontSize: 40 }}>🎥</span>
                <span style={{ fontSize: fontSize.sm, opacity: 0.7 }}>
                  {phase === 'requesting' ? 'Abrindo câmera...' : 'Pronto para gravar ou enviar um vídeo'}
                </span>
              </div>
            )}
            {phase === 'uploading' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textInverse, background: colors.overlayInverseHeavy, gap: spacing.sm }}>
                <span style={{ fontSize: fontSize.lg }}>Enviando vídeo...</span>
              </div>
            )}
          </div>

          {sourceName && phase === 'preview' && (
            <div style={{ marginBottom: spacing.sm }}>
              <InlineMessage variant="info">Origem selecionada: {sourceName}</InlineMessage>
            </div>
          )}
          {errMsg && <div style={{ marginBottom: spacing.sm }}><InlineMessage variant="error">{errMsg}</InlineMessage></div>}

          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(phase === 'idle' || phase === 'error') && (
              <Button onClick={() => { void start(); }} style={{ flex: 1 }} disabled={!mediaRecordingSupported}>
                Iniciar gravação
              </Button>
            )}
            {(phase === 'idle' || phase === 'error') && (
              <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
                Enviar vídeo pronto
              </Button>
            )}
            {phase === 'recording' && (
              <Button variant="danger" onClick={stop} style={{ flex: 1 }}>
                Parar gravação
              </Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" onClick={discard}>Regravar</Button>
                <Button onClick={() => { void upload(); }} style={{ flex: 1 }}>
                  Enviar vídeo
                </Button>
              </>
            )}
            {phase === 'uploading' && (
              <Button disabled loading style={{ flex: 1 }}>Enviando...</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {phase === 'done' && (
        <div style={{ padding: spacing.lg, background: colors.successLight, borderRadius: radius.xl, border: `1px solid ${colors.success}`, textAlign: 'center', marginBottom: spacing.md, boxShadow: shadows.sm }}>
          <div style={{ fontSize: 40, marginBottom: spacing.sm }}>🎉</div>
          <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.success, marginBottom: spacing.xs }}>
            Vídeo enviado com sucesso
          </div>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm }}>
            O sistema vai analisar o conteúdo para gerar palavras-chave, sentimento e sinais relevantes para o recrutador.
          </p>
        </div>
      )}

      {phase !== 'done' && (
        <Card style={{ marginBottom: spacing.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}`, boxShadow: shadows.sm }}>
          <CardContent>
            <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm }}>
              Dicas para um bom vídeo
            </div>
            <ul style={{ margin: 0, paddingLeft: spacing.lg, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 2 }}>
              <li>Escolha um local bem iluminado e silencioso</li>
              <li>Foque em experiências, resultados e habilidades-chave</li>
              <li>Olhe para a câmera e fale com ritmo natural</li>
              <li>Mantenha entre 2 e 3 minutos</li>
            </ul>
          </CardContent>
        </Card>
      )}

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
