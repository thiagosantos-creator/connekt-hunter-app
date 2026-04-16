import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getToken } from '../services/api.js';
import type { CandidateInfo } from '../services/types.js';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InlineMessage,
  Input,
  Badge,
  colors,
  fontSize,
  fontWeight,
  spacing,
  radius,
  shadows,
} from '@connekt/ui';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface StatusStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface CandidateStatus {
  candidateId: string;
  fullName: string | null;
  email: string;
  vacancy: { id: string; title: string; location?: string } | null;
  onboardingStatus: string;
  steps: StatusStep[];
  interview: { id: string; status: string } | null;
  introVideo?: {
    uploadedAt: string | null;
    durationSec: number | null;
    analysisStatus: string;
    summary: string | null;
    transcript: string | null;
    tags: string[];
    sentiment: unknown;
  } | null;
}

interface ParsedResumeData {
  status: string;
  parsedData: {
    summary?: string;
    experience?: Array<{ company?: string; role?: string; period?: string }>;
    education?: Array<{ institution?: string; degree?: string; period?: string }>;
    skills?: Array<{ name?: string } | string>;
    languages?: Array<{ name?: string; level?: string } | string>;
  } | null;
}

/* ── Re-upload component ─────────────────────────────────────────────── */
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

interface ResumeUploadResponse {
  id: string;
  upload: { url: string; method: 'PUT'; headers: Record<string, string> };
}

function ResumeUploadSection({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateFile = (f: File): string | null => {
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(ext)) return `Formato não suportado. Use: ${ALLOWED_EXTENSIONS.join(', ')}`;
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB} MB.`;
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError('');
    setSuccess(false);
    if (selected) {
      const err = validateFile(selected);
      if (err) { setError(err); return; }
    }
    setFile(selected);
  };

  const upload = async () => {
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const result = await apiPost<ResumeUploadResponse>('/candidate/onboarding/resume', {
        token: getToken(),
        filename: file.name,
        contentType: file.type || undefined,
      });
      if (result.upload?.url) {
        const res = await fetch(result.upload.url, { method: result.upload.method, headers: result.upload.headers, body: file });
        if (!res.ok) throw new Error('Falha ao enviar o arquivo.');
      }
      await apiPost('/candidate/onboarding/resume/complete', { token: getToken(), resumeId: result.id, filename: file.name });
      setSuccess(true);
      setFile(null);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: spacing.md, background: colors.successLight, borderRadius: radius.lg, color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
        ✅ Currículo atualizado com sucesso! Os dados serão reprocessados em breve.
      </div>
    );
  }

  return (
    <div>
      <div style={{ border: `2px dashed ${file ? colors.accent : colors.border}`, borderRadius: radius.lg, padding: spacing.lg, textAlign: 'center', background: colors.surfaceAlt, transition: 'border-color 0.2s', marginBottom: spacing.sm }}>
        <div style={{ fontSize: 28, marginBottom: spacing.xs }}>📄</div>
        <input type="file" accept=".pdf,.doc,.docx" onChange={handleChange} style={{ display: 'block', margin: '0 auto', fontSize: fontSize.sm }} />
        <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textMuted, fontSize: fontSize.xs }}>
          PDF, DOC, DOCX — Máx. {MAX_FILE_SIZE_MB} MB
        </p>
        {file && (
          <p style={{ marginTop: spacing.sm, color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
            📎 {file.name} ({Math.round(file.size / 1024)} KB)
          </p>
        )}
      </div>
      {error && <InlineMessage variant="error" style={{ marginBottom: spacing.sm }}>{error}</InlineMessage>}
      <Button onClick={() => { void upload(); }} disabled={!file || loading} loading={loading} style={{ width: '100%' }}>
        {loading ? 'Enviando...' : '⬆️ Enviar novo currículo'}
      </Button>
    </div>
  );
}

/* ── Quick video recorder widget ─────────────────────────────────────── */
function VideoRecorderWidget({ sessionId, questionId, onDone }: { sessionId: string; questionId: string; onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [phase, setPhase] = useState<'idle' | 'requesting' | 'recording' | 'preview' | 'uploading' | 'done' | 'error'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [errMsg, setErrMsg] = useState('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const start = async () => {
    setPhase('requesting');
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => null); }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mimeType });
        setBlob(b);
        if (previewRef.current) previewRef.current.src = URL.createObjectURL(b);
        setPhase('preview');
        stopStream();
      };

      recorder.start(250);
      setPhase('recording');
      setElapsed(0);
    } catch {
      setPhase('error');
      setErrMsg('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stop = () => recorderRef.current?.stop();
  const discard = () => { setBlob(null); setPhase('idle'); };

  const upload = async () => {
    if (!blob) return;
    setPhase('uploading');
    try {
      const presign = await apiPost<{ uploadUrl: string; objectKey: string }>(
        `/smart-interview/sessions/${sessionId}/answers/presign`,
        { questionId, contentType: blob.type },
      );
      await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
      await apiPost(`/smart-interview/sessions/${sessionId}/answers/complete`, { questionId, objectKey: presign.objectKey, durationSec: elapsed });
      setPhase('done');
      onDone();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (phase === 'done') {
    return (
      <div style={{ padding: spacing.md, background: colors.successLight, borderRadius: radius.lg, color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
        ✅ Novo vídeo enviado com sucesso!
      </div>
    );
  }

  return (
    <div>
      <div style={{ borderRadius: radius.lg, overflow: 'hidden', background: colors.primary, marginBottom: spacing.sm, position: 'relative', minHeight: 140 }}>
        <video ref={videoRef} muted playsInline style={{ width: '100%', maxHeight: 220, display: phase === 'preview' ? 'none' : 'block', objectFit: 'cover' }} />
        <video ref={previewRef} controls playsInline style={{ width: '100%', maxHeight: 220, display: phase === 'preview' ? 'block' : 'none', objectFit: 'cover' }} />
        {phase === 'recording' && (
          <div style={{ position: 'absolute', top: spacing.xs, left: spacing.xs, background: colors.overlayInverseHeavy, padding: `${spacing.xs}px ${spacing.sm + 2}px`, borderRadius: radius.full, color: colors.textInverse, fontSize: fontSize.xs, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.danger, display: 'inline-block', animation: 'recordPulse 1s ease infinite' }} />
            REC {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </div>
        )}
        {(phase === 'idle' || phase === 'requesting') && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textInverse, fontSize: fontSize.sm, opacity: 0.5 }}>
            {phase === 'requesting' ? 'Abrindo câmera...' : '📹 Câmera'}
          </div>
        )}
      </div>
      {errMsg && <InlineMessage variant="error" style={{ marginBottom: spacing.sm }}>{errMsg}</InlineMessage>}
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        {(phase === 'idle' || phase === 'error') && (
          <Button onClick={() => { void start(); }} style={{ flex: 1 }}>🎥 Gravar resposta</Button>
        )}
        {phase === 'recording' && (
          <Button variant="danger" onClick={stop} style={{ flex: 1 }}>⏹ Parar</Button>
        )}
        {phase === 'preview' && (
          <>
            <Button variant="ghost" onClick={discard}>🗑 Regravar</Button>
            <Button onClick={() => { void upload(); }} style={{ flex: 1 }}>✅ Enviar</Button>
          </>
        )}
        {phase === 'uploading' && (
          <Button disabled loading style={{ flex: 1 }}>Enviando...</Button>
        )}
      </div>
      <style>{`@keyframes recordPulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </div>
  );
}

/* ── Main Status View ────────────────────────────────────────────────── */
export function StatusView() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('candidate_info');
  const info: Partial<CandidateInfo> = raw ? (JSON.parse(raw) as Partial<CandidateInfo>) : {};

  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null);
  const [statusError, setStatusError] = useState('');

  // Upgrade form
  const [email, setEmail] = useState(info.email ?? '');
  const [fullName, setFullName] = useState(info.profile?.fullName ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  // Interview token
  const [interviewToken, setInterviewToken] = useState('');

  // Accordion sections
  const [expandedSection, setExpandedSection] = useState<string | null>('progress');
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  const loadData = useCallback(() => {
    const token = getToken();
    if (!token) return;
    void apiGet<CandidateStatus>(`/candidate/onboarding/status/${encodeURIComponent(token)}`)
      .then(setCandidateStatus)
      .catch((err) => setStatusError(`Não foi possível carregar o status: ${String(err)}`));
    void apiGet<ParsedResumeData>(`/candidate/onboarding/parsed-resume/${encodeURIComponent(token)}`)
      .then(setParsedResume)
      .catch(() => undefined);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const upgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setUpgradeMsg('Falha no upgrade: As senhas não coincidem.');
      return;
    }
    if (password && password.length < 8) {
      setUpgradeMsg('Falha no upgrade: A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      await apiPost('/auth/guest-upgrade', { token: getToken(), email, fullName, password: password || undefined });
      setUpgradeMsg(password ? 'Conta criada com sucesso! Você pode acessar usando e-mail e senha.' : 'Conta criada com sucesso. Você poderá usar login completo em breve.');
    } catch (err) {
      setUpgradeMsg(`Falha no upgrade: ${String(err)}`);
    } finally {
      setUpgrading(false);
    }
  };

  const goToInterview = () => {
    if (!interviewToken.trim()) return;
    localStorage.setItem('si_public_token', interviewToken.trim());
    navigate('/onboarding/media-check');
  };

  const name = candidateStatus?.fullName ?? info.profile?.fullName ?? info.email ?? 'Candidato';
  const completedSteps = candidateStatus?.steps.filter((s) => s.completed).length ?? 0;
  const totalSteps = candidateStatus?.steps.length ?? 0;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  // Onboarding is considered submitted once the resume step is complete
  const resumeStep = candidateStatus?.steps.find((s) => s.key === 'resume');
  const onboardingSubmitted = !!resumeStep?.completed;
  const preferencesStep = candidateStatus?.steps.find((s) => s.key === 'preferences');
  const introVideoStep = candidateStatus?.steps.find((s) => s.key === 'intro-video');
  const preferencesComplete = !!preferencesStep?.completed;
  const introVideoComplete = !!introVideoStep?.completed;

  const toggleSection = (key: string) => setExpandedSection((prev) => (prev === key ? null : key));

  /* ── Section header ────────────────────────────────────────────────── */
  const SectionHeader = ({ id, icon, title, badge }: { id: string; icon: string; title: string; badge?: string }) => (
    <button
      onClick={() => toggleSection(id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: spacing.sm,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: fontWeight.semibold, fontSize: fontSize.md, color: colors.text }}>{title}</span>
      {badge && <Badge variant="info">{badge}</Badge>}
      <span style={{ color: colors.textMuted, fontSize: fontSize.xs, transition: 'transform 0.2s', display: 'inline-block', transform: expandedSection === id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
    </button>
  );

  return (
    <div style={{ maxWidth: 620, margin: '32px auto', padding: `0 ${spacing.md}px`, display: 'grid', gap: spacing.md }}>

      {/* ── Hero card ─────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
        borderRadius: radius.xl, padding: spacing.xl, color: colors.textInverse, boxShadow: shadows.lg, position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ position: 'relative' }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: radius.full,
            background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: fontSize.xl, fontWeight: fontWeight.bold, marginBottom: spacing.md,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>

          <div style={{ fontSize: fontSize.xs, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portal do Candidato</div>
          <h2 style={{ margin: `0 0 ${spacing.xs}px`, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}>Olá, {name.split(' ')[0]}!</h2>

          {candidateStatus?.vacancy && (
            <div style={{ fontSize: fontSize.sm, opacity: 0.8, marginBottom: spacing.md }}>
              📋 Candidatura: <strong>{candidateStatus.vacancy.title}</strong>
              {candidateStatus.vacancy.location && ` · ${candidateStatus.vacancy.location}`}
            </div>
          )}

          {/* Progress bar */}
          {totalSteps > 0 && (
            <div style={{ marginTop: spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: fontSize.xs, opacity: 0.8 }}>
                <span>Progresso da candidatura</span>
                <span>{progressPct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: radius.full, background: 'rgba(255,255,255,0.15)' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: radius.full, background: progressPct === 100 ? '#10b981' : colors.accent, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {statusError && <InlineMessage variant="error">{statusError}</InlineMessage>}

      {/* ── Steps progress ────────────────────────────────────────────── */}
      {candidateStatus?.steps && candidateStatus.steps.length > 0 && (
        <Card>
          <CardHeader style={{ paddingBottom: spacing.sm }}>
            <SectionHeader id="progress" icon="🗺️" title="Progresso da candidatura" badge={`${completedSteps}/${totalSteps}`} />
          </CardHeader>
          {expandedSection === 'progress' && (
            <CardContent>
              <div style={{ display: 'grid', gap: spacing.xs }}>
                {candidateStatus.steps.map((step, i) => (
                  <div key={step.key} style={{
                    display: 'flex', alignItems: 'center', gap: spacing.sm,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    borderRadius: radius.lg,
                    background: step.current ? colors.infoLight : step.completed ? colors.successLight : colors.surfaceAlt,
                    border: `1px solid ${step.current ? colors.info : step.completed ? colors.success : colors.borderLight}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: radius.full, flexShrink: 0,
                      background: step.completed ? colors.success : step.current ? colors.accent : colors.border,
                      color: colors.textInverse, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                    }}>
                      {step.completed ? '✓' : i + 1}
                    </div>
                    <span style={{ flex: 1, color: step.current ? colors.accent : step.completed ? colors.success : colors.textSecondary, fontWeight: step.current ? fontWeight.semibold : fontWeight.normal, fontSize: fontSize.sm }}>
                      {step.label}
                    </span>
                    {step.current && <Badge variant="info">Atual</Badge>}
                    {step.completed && <Badge variant="success">Concluído</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Post-onboarding confirmation + next steps ─────────────────── */}
      {onboardingSubmitted && (
        <Card style={{ border: `1px solid ${colors.success}`, background: colors.successLight }}>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.md, color: colors.successDark, marginBottom: spacing.xs }}>
                  Candidatura enviada com sucesso!
                </div>
                <p style={{ margin: `0 0 ${spacing.md}px`, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 1.6 }}>
                  Seu currículo foi recebido. Nossa equipe irá analisar seu perfil e entraremos em contato sobre as próximas etapas.
                </p>

                {/* Next steps timeline */}
                <div style={{ marginBottom: spacing.md }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: spacing.sm }}>
                    O que acontece agora?
                  </div>
                  <div style={{ display: 'grid', gap: spacing.xs }}>
                    {[
                      { icon: '🔍', text: 'Revisão do perfil pela equipe de recrutamento' },
                      { icon: '🤖', text: 'Análise de compatibilidade com a vaga (IA assistida)' },
                      { icon: '📬', text: 'Retorno por e-mail em até 5–10 dias úteis' },
                    ].map(({ icon, text }) => (
                      <div key={text} style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, padding: `${spacing.xs}px 0` }}>
                        <span style={{ flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(!preferencesComplete || !introVideoComplete) && (
                  <div>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: spacing.sm }}>
                      Complete seu perfil para se destacar:
                    </div>
                    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                      {!preferencesComplete && (
                        <a href="/onboarding/preferences" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${spacing.xs}px ${spacing.sm}px`, background: colors.surface, borderRadius: radius.md, border: `1px solid ${colors.border}`, textDecoration: 'none', color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                          📋 Adicionar preferências
                        </a>
                      )}
                      {!introVideoComplete && (
                        <a href="/onboarding/intro-video" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${spacing.xs}px ${spacing.sm}px`, background: colors.surface, borderRadius: radius.md, border: `1px solid ${colors.border}`, textDecoration: 'none', color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                          🎥 Gravar vídeo de apresentação
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Intro video player ─────────────────────────────────────────── */}
      {introVideoComplete && candidateStatus?.introVideo && (
        <Card>
          <CardHeader style={{ paddingBottom: spacing.sm }}>
            <SectionHeader id="intro-video" icon="🎬" title="Vídeo de apresentação" badge={candidateStatus.introVideo.analysisStatus === 'completed' ? 'Analisado' : 'Processando...'} />
          </CardHeader>
          {expandedSection === 'intro-video' && (
            <CardContent>
              {candidateStatus.introVideo.playbackUrl && (
                <div style={{ marginBottom: spacing.md }}>
                  <video
                    controls
                    playsInline
                    style={{ width: '100%', maxHeight: 320, borderRadius: radius.lg, background: colors.primary, objectFit: 'cover' }}
                    src={candidateStatus.introVideo.playbackUrl as string}
                  />
                </div>
              )}

              {candidateStatus.introVideo.summary && (
                <div style={{ padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.lg, marginBottom: spacing.md, border: `1px solid ${colors.borderLight}` }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.xs }}>Resumo da IA</div>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 1.7 }}>{candidateStatus.introVideo.summary}</p>
                </div>
              )}

              {Array.isArray(candidateStatus.introVideo.tags) && candidateStatus.introVideo.tags.length > 0 && (
                <div style={{ marginBottom: spacing.md }}>
                  <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>Tags identificadas</div>
                  <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {candidateStatus.introVideo.tags.map((tag, i) => (
                      <span key={i} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.infoLight, color: colors.infoDark, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                        {String(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: spacing.md }}>
                <a href="/onboarding/intro-video" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: `${spacing.xs}px ${spacing.sm}px`, background: colors.surface, borderRadius: radius.md, border: `1px solid ${colors.border}`, textDecoration: 'none', color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  🔄 Regravar vídeo
                </a>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Parsed resume ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader style={{ paddingBottom: spacing.sm }}>
          <SectionHeader
            id="resume"
            icon="📄"
            title="Dados do currículo"
            badge={parsedResume?.status === 'completed' ? 'Processado' : parsedResume?.status === 'pending' ? 'Processando...' : undefined}
          />
        </CardHeader>
        {expandedSection === 'resume' && (
          <CardContent>
            {!parsedResume && (
              <InlineMessage variant="info">Nenhum currículo encontrado. Faça o upload abaixo.</InlineMessage>
            )}

            {parsedResume?.status === 'pending' && (
              <InlineMessage variant="warning" style={{ marginBottom: spacing.md }}>
                ⏳ Seu currículo está sendo processado pela IA. Aguarde alguns instantes e recarregue a página.
              </InlineMessage>
            )}

            {parsedResume?.status === 'failed' && (
              <InlineMessage variant="error" style={{ marginBottom: spacing.md }}>
                ⚠️ Não foi possível processar seu currículo automaticamente. Tente fazer o upload novamente em um formato diferente.
              </InlineMessage>
            )}

            {parsedResume?.parsedData && (
              <div style={{ marginBottom: spacing.lg }}>
                {/* Summary */}
                {parsedResume.parsedData.summary && (
                  <div style={{ padding: spacing.md, background: colors.surfaceAlt, borderRadius: radius.lg, marginBottom: spacing.md, border: `1px solid ${colors.borderLight}` }}>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.xs }}>Resumo profissional</div>
                    <p style={{ margin: 0, color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 1.7 }}>{parsedResume.parsedData.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {(parsedResume.parsedData.experience?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: spacing.md }}>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>Experiência profissional</div>
                    {parsedResume.parsedData.experience!.map((exp, i) => (
                      <div key={i} style={{ padding: `${spacing.sm}px ${spacing.md}px`, marginBottom: spacing.xs, borderLeft: `3px solid ${colors.accent}`, background: colors.surfaceAlt, borderRadius: `0 ${radius.md}px ${radius.md}px 0` }}>
                        <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: colors.text }}>{exp.role ?? 'Cargo'}</div>
                        <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                          {exp.company && <span>{exp.company}</span>}
                          {exp.period && <span style={{ color: colors.textMuted }}> · {exp.period}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {(parsedResume.parsedData.education?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: spacing.md }}>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>Formação acadêmica</div>
                    {parsedResume.parsedData.education!.map((edu, i) => (
                      <div key={i} style={{ padding: `${spacing.sm}px ${spacing.md}px`, marginBottom: spacing.xs, borderLeft: `3px solid ${colors.success}`, background: colors.surfaceAlt, borderRadius: `0 ${radius.md}px ${radius.md}px 0` }}>
                        <div style={{ fontWeight: fontWeight.semibold, fontSize: fontSize.sm, color: colors.text }}>{edu.degree ?? 'Curso'}</div>
                        <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                          {edu.institution && <span>{edu.institution}</span>}
                          {edu.period && <span style={{ color: colors.textMuted }}> · {edu.period}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {(parsedResume.parsedData.skills?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: spacing.md }}>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>Habilidades identificadas</div>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {parsedResume.parsedData.skills!.map((skill, i) => (
                        <span key={i} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.infoLight, color: colors.infoDark, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                          {typeof skill === 'string' ? skill : skill.name ?? ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {(parsedResume.parsedData.languages?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>Idiomas</div>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {parsedResume.parsedData.languages!.map((lang, i) => {
                        const name = typeof lang === 'string' ? lang : lang.name ?? '';
                        const level = typeof lang === 'object' ? lang.level : undefined;
                        return (
                          <span key={i} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.warningLight, color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                            {name}{level ? ` · ${level}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Re-upload section */}
            <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: spacing.md }}>
              <button
                onClick={() => setShowResumeUpload((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, padding: 0, display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: showResumeUpload ? spacing.md : 0 }}
              >
                {showResumeUpload ? '▾' : '▸'} {parsedResume?.parsedData ? 'Atualizar currículo' : 'Fazer upload do currículo'}
              </button>
              {showResumeUpload && (
                <ResumeUploadSection onSuccess={() => { setShowResumeUpload(false); loadData(); }} />
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Video interview ───────────────────────────────────────────── */}
      <Card>
        <CardHeader style={{ paddingBottom: spacing.sm }}>
          <SectionHeader id="interview" icon="🎥" title="Entrevista em vídeo" />
        </CardHeader>
        {expandedSection === 'interview' && (
          <CardContent>
            {candidateStatus?.interview ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                  <Badge variant={candidateStatus.interview.status === 'completed' ? 'success' : 'info'}>
                    {candidateStatus.interview.status === 'completed' ? '✅ Concluída' : '🔄 Em andamento'}
                  </Badge>
                  <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>ID: {candidateStatus.interview.id}</span>
                </div>

                <button
                  onClick={() => setShowVideoRecorder((v) => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, padding: 0, display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: showVideoRecorder ? spacing.md : 0 }}
                >
                  {showVideoRecorder ? '▾' : '▸'} Gravar nova resposta
                </button>
                {showVideoRecorder && (
                  <div style={{ marginTop: spacing.sm }}>
                    <div style={{ marginBottom: spacing.sm, padding: spacing.sm, background: colors.infoLight, borderRadius: radius.md, fontSize: fontSize.xs, color: colors.info }}>
                      💡 Insira o ID da questão que deseja regravar antes de iniciar.
                    </div>
                    <Input label="ID da questão" placeholder="ex: q_abc123" style={{ marginBottom: spacing.sm }} />
                    <VideoRecorderWidget
                      sessionId={candidateStatus.interview.id}
                      questionId="q_placeholder"
                      onDone={() => setShowVideoRecorder(false)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md }}>
                  Você ainda não iniciou a entrevista em vídeo. Se recebeu um código de acesso, insira abaixo para iniciar.
                </p>
                <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      label="Código da entrevista"
                      placeholder="Código recebido por e-mail"
                      value={interviewToken}
                      onChange={(e) => setInterviewToken(e.target.value)}
                    />
                  </div>
                  <Button onClick={goToInterview} disabled={!interviewToken.trim()}>
                    Iniciar →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Create account ────────────────────────────────────────────── */}
      <Card>
        <CardHeader style={{ paddingBottom: spacing.sm }}>
          <SectionHeader id="account" icon="🔐" title="Criar conta completa" />
        </CardHeader>
        {expandedSection === 'account' && (
          <CardContent>
            <CardDescription style={{ marginBottom: spacing.md }}>
              Faça upgrade de convidado para uma conta registrada e acesse seu portal a qualquer momento.
            </CardDescription>
            <form onSubmit={(e) => { void upgradeAccount(e); }} style={{ display: 'grid', gap: spacing.sm }}>
              <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              <Input label="Senha (opcional)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              {password && (
                <Input label="Confirmar senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              )}
              {upgradeMsg && (
                <InlineMessage variant={upgradeMsg.startsWith('Falha') ? 'error' : 'success'}>
                  {upgradeMsg}
                </InlineMessage>
              )}
              <Button type="submit" loading={upgrading} variant="outline">
                {upgrading ? 'Criando conta...' : '🚀 Criar conta'}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* ── Danger zone ───────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', paddingTop: spacing.sm }}>
        <button
          onClick={() => {
            if (window.confirm('Tem certeza? Todos os dados locais da candidatura serão removidos.')) {
              localStorage.clear();
              navigate('/');
            }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, fontSize: fontSize.sm, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
        >
          Iniciar nova candidatura
        </button>
      </div>
    </div>
  );
}
