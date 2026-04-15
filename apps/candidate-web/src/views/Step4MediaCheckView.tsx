import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  InlineMessage,
  colors,
  spacing,
  fontSize,
  fontWeight,
  radius,
  shadows,
} from '@connekt/ui';

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface DeviceInfo {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  selectedCamera: string;
  selectedMicrophone: string;
}

function StatusIcon({ state }: { state: PermissionState }) {
  if (state === 'granted') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.success, fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors.success, display: 'inline-block', boxShadow: `0 0 0 3px ${colors.successLight}` }} />
        Permitido
      </span>
    );
  }
  if (state === 'denied') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.danger, fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors.danger, display: 'inline-block' }} />
        Bloqueado
      </span>
    );
  }
  if (state === 'requesting') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.warning, fontWeight: fontWeight.semibold, fontSize: fontSize.sm }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors.warning, display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
        Verificando...
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.textMuted, fontSize: fontSize.sm }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors.border, display: 'inline-block' }} />
      Pendente
    </span>
  );
}

export function Step4MediaCheckView() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraState, setCameraState] = useState<PermissionState>('idle');
  const [micState, setMicState] = useState<PermissionState>('idle');
  const [devices, setDevices] = useState<DeviceInfo>({ cameras: [], microphones: [], selectedCamera: '', selectedMicrophone: '' });
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState('');

  const stopStream = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const measureAudio = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setAudioLevel(Math.min(100, avg * 2.5));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const requestPermissions = useCallback(async () => {
    setError('');
    setCameraState('requesting');
    setMicState('requesting');
    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: devices.selectedCamera ? { deviceId: { exact: devices.selectedCamera } } : true,
        audio: devices.selectedMicrophone ? { deviceId: { exact: devices.selectedMicrophone } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }

      // Measure audio levels
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      measureAudio(analyser);

      // Enumerate devices (labels are only available after permission)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter((d) => d.kind === 'videoinput');
      const microphones = allDevices.filter((d) => d.kind === 'audioinput');
      setDevices((prev) => ({
        ...prev,
        cameras,
        microphones,
        selectedCamera: prev.selectedCamera || cameras[0]?.deviceId || '',
        selectedMicrophone: prev.selectedMicrophone || microphones[0]?.deviceId || '',
      }));

      setCameraState('granted');
      setMicState('granted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('notallowed') || msg.toLowerCase().includes('permission')) {
        setCameraState('denied');
        setMicState('denied');
        setError('Acesso negado. Clique no ícone 🔒 na barra de endereço do navegador e permita o acesso à câmera e microfone. Em seguida, recarregue a página.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('could not start')) {
        setCameraState('unavailable');
        setMicState('unavailable');
        setError('Câmera ou microfone não encontrado. Verifique se os dispositivos estão conectados e tente novamente.');
      } else {
        setCameraState('denied');
        setMicState('denied');
        setError(`Erro ao acessar dispositivos: ${msg}`);
      }
    }
  }, [devices.selectedCamera, devices.selectedMicrophone, stopStream, measureAudio]);

  // Check if browser supports required APIs
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      setMicState('unavailable');
      setError('Seu navegador não suporta gravação de vídeo. Use Chrome, Edge ou Firefox atualizados.');
    }
    return () => stopStream();
  }, [stopStream]);

  const handleSwitchDevice = async (type: 'camera' | 'microphone', deviceId: string) => {
    setDevices((prev) => ({
      ...prev,
      selectedCamera: type === 'camera' ? deviceId : prev.selectedCamera,
      selectedMicrophone: type === 'microphone' ? deviceId : prev.selectedMicrophone,
    }));
  };

  // Re-request when device selection changes
  useEffect(() => {
    if (cameraState === 'granted') {
      void requestPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices.selectedCamera, devices.selectedMicrophone]);

  const canProceed = cameraState === 'granted' && micState === 'granted';

  const proceed = () => {
    stopStream();
    navigate('/interview');
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: `0 ${spacing.md}px` }}>

      <div style={{ marginBottom: spacing.lg }}>
        <h2 style={{ margin: 0, fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text }}>
          Verificação de Câmera e Microfone
        </h2>
        <p style={{ margin: `${spacing.sm}px 0 0`, color: colors.textSecondary, fontSize: fontSize.md }}>
          Antes de iniciar a entrevista, precisamos verificar se sua câmera e microfone estão funcionando corretamente.
        </p>
      </div>

      {/* Permission status row */}
      <Card style={{ marginBottom: spacing.md }}>
        <CardContent>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md, marginBottom: spacing.md }}>
            <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}` }}>
              <div style={{ fontSize: fontSize.xxl, marginBottom: spacing.xs }}>📷</div>
              <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs }}>Câmera</div>
              <StatusIcon state={cameraState} />
            </div>
            <div style={{ padding: spacing.md, borderRadius: radius.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}` }}>
              <div style={{ fontSize: fontSize.xxl, marginBottom: spacing.xs }}>🎙️</div>
              <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs }}>Microfone</div>
              <StatusIcon state={micState} />
            </div>
          </div>

          <Button
            onClick={() => { void requestPermissions(); }}
            disabled={cameraState === 'requesting' || micState === 'requesting'}
            style={{ width: '100%' }}
          >
            {cameraState === 'idle' ? '🔐 Verificar câmera e microfone' :
             cameraState === 'requesting' ? '⏳ Aguardando permissão...' :
             cameraState === 'granted' ? '🔄 Verificar novamente' :
             '🔄 Tentar novamente'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <InlineMessage variant="error" style={{ marginBottom: spacing.md }}>
          {error}
        </InlineMessage>
      )}

      {/* Instructions when blocked */}
      {(cameraState === 'denied') && (
        <Card style={{ marginBottom: spacing.md, border: `1px solid ${colors.dangerLight}` }}>
          <CardContent>
            <div style={{ fontWeight: fontWeight.semibold, color: colors.danger, marginBottom: spacing.sm, fontSize: fontSize.sm }}>
              Como liberar o acesso:
            </div>
            <ol style={{ margin: 0, paddingLeft: spacing.lg, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.8 }}>
              <li>Clique no ícone <strong>🔒</strong> na barra de endereço do navegador</li>
              <li>Localize as permissões de <strong>Câmera</strong> e <strong>Microfone</strong></li>
              <li>Altere ambas para <strong>"Permitir"</strong></li>
              <li>Recarregue a página (F5) e clique em verificar novamente</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Live video preview */}
      {cameraState === 'granted' && (
        <Card style={{ marginBottom: spacing.md }}>
          <CardContent>
            <div style={{ fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md, fontSize: fontSize.sm }}>
              Pré-visualização ao vivo
            </div>
            <div style={{ position: 'relative', borderRadius: radius.lg, overflow: 'hidden', background: '#000', marginBottom: spacing.md }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', top: spacing.sm, right: spacing.sm,
                background: 'rgba(0,0,0,0.6)', borderRadius: radius.full,
                padding: `${spacing.xs}px ${spacing.sm}px`,
                fontSize: fontSize.xs, color: '#fff',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
                AO VIVO
              </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Audio level meter */}
            <div style={{ marginBottom: spacing.md }}>
              <div style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nível do microfone
              </div>
              <div style={{ height: 10, borderRadius: radius.full, background: colors.borderLight, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${audioLevel}%`,
                  borderRadius: radius.full,
                  background: audioLevel > 70 ? colors.success : audioLevel > 30 ? colors.accent : colors.warning,
                  transition: 'width 0.1s ease, background 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 }}>
                {audioLevel < 5 ? 'Fale algo para testar o microfone...' : audioLevel > 70 ? '✅ Microfone funcionando bem!' : 'Microfone detectado'}
              </div>
            </div>

            {/* Device selectors */}
            {devices.cameras.length > 1 && (
              <div style={{ marginBottom: spacing.sm }}>
                <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Câmera
                </label>
                <select
                  value={devices.selectedCamera}
                  onChange={(e) => { void handleSwitchDevice('camera', e.target.value); }}
                  style={{ width: '100%', padding: `${spacing.sm}px ${spacing.md}px`, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.sm, background: colors.surface, color: colors.text }}
                >
                  {devices.cameras.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Câmera ${d.deviceId.slice(0, 8)}`}</option>
                  ))}
                </select>
              </div>
            )}
            {devices.microphones.length > 1 && (
              <div>
                <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Microfone
                </label>
                <select
                  value={devices.selectedMicrophone}
                  onChange={(e) => { void handleSwitchDevice('microphone', e.target.value); }}
                  style={{ width: '100%', padding: `${spacing.sm}px ${spacing.md}px`, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: fontSize.sm, background: colors.surface, color: colors.text }}
                >
                  {devices.microphones.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Microfone ${d.deviceId.slice(0, 8)}`}</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      <Card style={{ marginBottom: spacing.lg, background: colors.surfaceAlt, border: `1px solid ${colors.borderLight}`, boxShadow: shadows.sm }}>
        <CardContent>
          <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.sm }}>
            Dicas para uma boa entrevista:
          </div>
          <ul style={{ margin: 0, paddingLeft: spacing.lg, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 2 }}>
            <li>🌟 Escolha um local bem iluminado, de frente para uma fonte de luz</li>
            <li>🔇 Minimize ruídos ao redor e feche janelas/portas</li>
            <li>👔 Vista-se como se fosse a uma entrevista presencial</li>
            <li>👁️ Olhe para a câmera ao responder, não para a tela</li>
            <li>⚡ Use uma conexão de internet estável (Wi-Fi ou cabo)</li>
          </ul>
        </CardContent>
      </Card>

      <div style={{ display: 'flex', gap: spacing.sm }}>
        <Button variant="secondary" type="button" onClick={() => navigate('/onboarding/resume')}>
          ← Voltar
        </Button>
        <Button
          onClick={proceed}
          disabled={!canProceed}
          style={{ flex: 1 }}
        >
          {canProceed ? '✅ Iniciar entrevista →' : 'Verifique câmera e microfone para continuar'}
        </Button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
