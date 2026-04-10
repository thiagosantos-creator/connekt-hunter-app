import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function getToken(): string { return localStorage.getItem('invite_token') ?? ''; }

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const text = await res.text();
    if (text.includes('token_expired')) {
      localStorage.removeItem('invite_token');
      localStorage.removeItem('candidate_info');
      throw new Error('Token expirado. Por favor, solicite um novo convite.');
    }
    throw new Error(text || 'Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (res.status === 401) {
    const body = await res.text();
    if (body.includes('token_expired')) {
      localStorage.removeItem('invite_token');
      localStorage.removeItem('candidate_info');
      throw new Error('Token expirado. Por favor, solicite um novo convite.');
    }
    throw new Error(body || 'Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CandidateInfo {
  id: string; email: string; token: string;
  profile?: { fullName?: string };
  onboarding?: { basicCompleted: boolean; consentCompleted: boolean; resumeCompleted: boolean; status: string };
}

// ---------------------------------------------------------------------------
// Token Entry view
// ---------------------------------------------------------------------------
function TokenEntryView() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const c = await apiGet<CandidateInfo>(`/candidate/token/${encodeURIComponent(token)}`);
      if (!c) { setError('Token not found'); return; }
      localStorage.setItem('invite_token', token);
      localStorage.setItem('candidate_info', JSON.stringify(c));

      const onb = c.onboarding;
      if (onb?.status === 'completed') { navigate('/status'); return; }
      if (!onb?.basicCompleted) { navigate('/onboarding/basic'); return; }
      if (!onb?.consentCompleted) { navigate('/onboarding/consent'); return; }
      navigate('/onboarding/resume');
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Candidate Portal</h2>
      <p style={{ color: '#666' }}>Enter the invite token from your email to continue.</p>
      <form onSubmit={(e) => { void submit(e); }}>
        <label>Invite Token<br />
          <input style={{ width: '100%', padding: 8, marginTop: 4, fontFamily: 'monospace' }}
            value={token} onChange={e => setToken(e.target.value)} required placeholder="xxxxxxxx-xxxx-…" />
        </label>
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ marginTop: 12, padding: '8px 20px', width: '100%' }}>
          {loading ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
      {[['1', 'Basic Info'], ['2', 'LGPD/Terms'], ['3', 'Upload CV']].map(([n, label], i) => (
        <React.Fragment key={n}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: Number(n) === current ? '#1a1a2e' : Number(n) < current ? '#0a0' : '#aaa'
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: Number(n) === current ? '#1a1a2e' : Number(n) < current ? '#0a0' : '#ddd',
              color: '#fff', fontWeight: 'bold', fontSize: 13
            }}>{Number(n) < current ? '✓' : n}</span>
            <span style={{ fontSize: 13 }}>{label}</span>
          </div>
          {i < 2 && <div style={{ flex: 1, height: 2, background: Number(n) < current ? '#0a0' : '#ddd' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Basic Info
// ---------------------------------------------------------------------------
function Step1BasicView() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await apiPost('/candidate/onboarding/basic', { token: getToken(), fullName, phone });
      navigate('/onboarding/consent');
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <StepIndicator current={1} />
      <h2>Step 1 — Basic Information</h2>
      <form onSubmit={(e) => { void submit(e); }}>
        <label>Full Name<br />
          <input value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </label><br /><br />
        <label>Phone<br />
          <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 4 }} />
        </label><br />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ marginTop: 12, padding: '8px 20px' }}>
          {loading ? 'Saving…' : 'Next →'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — LGPD Consent
// ---------------------------------------------------------------------------
function Step2ConsentView() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) { setError('You must accept to continue.'); return; }
    setLoading(true); setError('');
    try {
      await apiPost('/candidate/onboarding/consent', { token: getToken() });
      navigate('/onboarding/resume');
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <StepIndicator current={2} />
      <h2>Step 2 — LGPD / Terms of Service</h2>
      <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 16, maxHeight: 200, overflow: 'auto', fontSize: 13, color: '#444' }}>
        <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
        <p>Ao aceitar, você autoriza o armazenamento e processamento dos seus dados pessoais, incluindo o currículo, para fins de recrutamento e seleção pela plataforma Connekt Hunter e suas organizações parceiras.</p>
        <p>Seus dados serão tratados com confidencialidade e utilizados exclusivamente para as finalidades descritas. Você pode solicitar a exclusão dos seus dados a qualquer momento.</p>
        <strong>Termos de Uso</strong>
        <p>Ao utilizar esta plataforma, você concorda com os termos de uso e declara que as informações fornecidas são verdadeiras.</p>
      </div>
      <form onSubmit={(e) => { void submit(e); }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
          <span>Li e aceito a política de privacidade (LGPD) e os Termos de Uso</span>
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={() => navigate('/onboarding/basic')} style={{ padding: '8px 16px' }}>← Back</button>
          <button type="submit" disabled={loading || !accepted} style={{ padding: '8px 20px' }}>
            {loading ? 'Saving…' : 'Accept & Continue →'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Resume Upload
// ---------------------------------------------------------------------------
function Step3ResumeView() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    setLoading(true); setError('');
    try {
      await apiPost('/candidate/onboarding/resume', { token: getToken(), filename: file.name });
      navigate('/status');
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24 }}>
      <StepIndicator current={3} />
      <h2>Step 3 — Upload CV</h2>
      <p style={{ color: '#666' }}>Upload your resume (PDF, DOC, DOCX).</p>
      <form onSubmit={(e) => { void submit(e); }}>
        <div style={{ border: '2px dashed #ccc', borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 16 }}>
          <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] ?? null)}
            style={{ display: 'block', margin: '0 auto' }} />
          {file && <p style={{ marginTop: 8, color: '#444' }}>Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</p>}
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => navigate('/onboarding/consent')} style={{ padding: '8px 16px' }}>← Back</button>
          <button type="submit" disabled={loading || !file} style={{ padding: '8px 20px' }}>
            {loading ? 'Uploading…' : 'Submit Application →'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status view
// ---------------------------------------------------------------------------
function StatusView() {
  const raw = localStorage.getItem('candidate_info');
  const info: Partial<CandidateInfo> = raw ? (JSON.parse(raw) as Partial<CandidateInfo>) : {};
  const [email, setEmail] = useState(info.email ?? '');
  const [fullName, setFullName] = useState(info.profile?.fullName ?? '');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const upgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      await apiPost('/auth/guest-upgrade', { token: getToken(), email, fullName });
      setUpgradeMsg('Conta criada com sucesso. Você poderá usar login completo em breve.');
    } catch (err) {
      setUpgradeMsg(`Falha no upgrade: ${String(err)}`);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2>Application Submitted!</h2>
      <p>Hi <strong>{info.profile?.fullName ?? info.email ?? 'Candidate'}</strong>,</p>
      <p>Your application has been received. Our team will review your profile and CV.</p>
      <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f1', borderRadius: 8, padding: 16, marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>What happens next?</h3>
        <ol style={{ textAlign: 'left', color: '#444' }}>
          <li>Your CV will be processed automatically.</li>
          <li>A recruiter will review your application.</li>
          <li>If shortlisted, the client will make a decision.</li>
          <li>You will be notified about the outcome.</li>
        </ol>
      </div>
      <form onSubmit={(e) => { void upgradeAccount(e); }} style={{ marginTop: 20, textAlign: 'left', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Opcional: criar conta</h3>
        <p style={{ color: '#666', fontSize: 13 }}>Upgrade de convidado para conta registrada (Slice 02).</p>
        <label>Email<br /><input style={{ width: '100%', padding: 6 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><br /><br />
        <label>Nome completo<br /><input style={{ width: '100%', padding: 6 }} value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label><br />
        {upgradeMsg && <p style={{ color: upgradeMsg.startsWith('Falha') ? 'red' : 'green' }}>{upgradeMsg}</p>}
        <button type="submit" disabled={upgrading} style={{ padding: '8px 20px' }}>{upgrading ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <button onClick={() => { localStorage.clear(); window.location.href = '/'; }}
        style={{ marginTop: 24, padding: '10px 24px' }}>Start New Application</button>
    </div>
  );
}



function InterviewView() {
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('si_public_token') ?? '');
  const [session, setSession] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [msg, setMsg] = useState('');

  const loadSession = async () => {
    try {
      const data = await apiGet<any>(`/smart-interview/candidate/session/${encodeURIComponent(sessionToken)}`);
      setSession(data);
      localStorage.setItem('si_public_token', sessionToken);
    } catch (err) { setMsg(String(err)); }
  };

  const uploadAnswer = async (questionId: string) => {
    try {
      const presign = await apiPost<any>(`/smart-interview/sessions/${session.id}/answers/presign`, { questionId });
      await apiPost(`/smart-interview/sessions/${session.id}/answers/complete`, { questionId, objectKey: presign.objectKey, durationSec: 45 });
      setMsg('Resposta gravada (mock).');
      if (current < session.template.questions.length - 1) setCurrent(current + 1);
    } catch (err) { setMsg(String(err)); }
  };

  const finalize = async () => {
    try {
      await apiPost(`/smart-interview/sessions/${session.id}/submit`, {});
      setMsg('Entrevista finalizada com sucesso!');
    } catch (err) { setMsg(String(err)); }
  };

  const q = session?.template?.questions?.[current];

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h2>Smart Interview</h2>
      <p style={{ color: '#666' }}>Fluxo assíncrono: intro, setup de câmera e gravação por pergunta.</p>
      {!session && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <label>Session public token
            <input value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} style={{ width: '100%', padding: 6 }} />
          </label>
          <button style={{ marginTop: 8 }} onClick={() => { void loadSession(); }}>Iniciar entrevista</button>
        </div>
      )}
      {session && q && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <p><strong>Progresso:</strong> {current + 1}/{session.template.questions.length}</p>
          <p><strong>Pergunta:</strong> {q.prompt}</p>
          <p style={{ color: '#777', fontSize: 13 }}>Setup de câmera (mock): dispositivo pronto ✅</p>
          <button onClick={() => { void uploadAnswer(q.id); }}>Gravar resposta (mock)</button>
          <button onClick={() => { void finalize(); }} style={{ marginLeft: 8 }}>Finalizar entrevista</button>
        </div>
      )}
      {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Guard - requires invite token in localStorage + validates on bootstrap
// ---------------------------------------------------------------------------
function RequiresToken({ children }: { children: React.ReactNode }) {
  const token = getToken();
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    apiGet(`/candidate/token/${encodeURIComponent(token)}`)
      .then(() => setValid(true))
      .catch(() => {
        localStorage.removeItem('invite_token');
        localStorage.removeItem('candidate_info');
        setValid(false);
      });
  }, [token]);

  if (valid === null) return <div style={{ textAlign: 'center', marginTop: 80 }}>Validando token…</div>;
  if (!valid) { navigate('/', { replace: true }); return null; }
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
function App() {
  return (
    <BrowserRouter>
      <header style={{ background: '#1a1a2e', color: '#fff', padding: '12px 20px' }}>
        <strong>Connekt Hunter — Candidate Portal</strong>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<TokenEntryView />} />
          <Route path="/onboarding/basic" element={<RequiresToken><Step1BasicView /></RequiresToken>} />
          <Route path="/onboarding/consent" element={<RequiresToken><Step2ConsentView /></RequiresToken>} />
          <Route path="/onboarding/resume" element={<RequiresToken><Step3ResumeView /></RequiresToken>} />
          <Route path="/status" element={<RequiresToken><StatusView /></RequiresToken>} />
          <Route path="/interview" element={<RequiresToken><InterviewView /></RequiresToken>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
