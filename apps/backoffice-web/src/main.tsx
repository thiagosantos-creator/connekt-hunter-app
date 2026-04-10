import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function getToken(): string { return localStorage.getItem('bo_token') ?? ''; }

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------
interface AuthCtx { user: { id: string; email: string; name: string; role: string } | null; logout: () => void }
const AuthContext = createContext<AuthCtx>({ user: null, logout: () => {} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const raw = localStorage.getItem('bo_user');
  const [user, setUser] = useState<AuthCtx['user']>(raw ? (JSON.parse(raw) as AuthCtx['user']) : null);
  const logout = () => { localStorage.removeItem('bo_token'); localStorage.removeItem('bo_user'); setUser(null); };
  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}

function useAuth() { return useContext(AuthContext); }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// ---------------------------------------------------------------------------
// Login view
// ---------------------------------------------------------------------------
function LoginView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('headhunter@demo.local');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/vacancies'); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost<{ token: string; user: AuthCtx['user']; error?: string }>('/auth/dev-login', { email });
      if (data.error) { setError(data.error); return; }
      localStorage.setItem('bo_token', data.token);
      localStorage.setItem('bo_user', JSON.stringify(data.user));
      window.location.href = '/vacancies';
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2>Backoffice Login</h2>
      <p style={{ color: '#666', fontSize: 13 }}>Dev mode — use a seeded email address.</p>
      <form onSubmit={(e) => { void handleSubmit(e); }}>
        <label>Email<br />
          <input style={{ width: '100%', padding: 8, marginTop: 4 }} type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button style={{ marginTop: 12, padding: '8px 20px' }} type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Dev Login'}
        </button>
      </form>
      <details style={{ marginTop: 16, fontSize: 12 }}>
        <summary>Demo accounts</summary>
        <ul>
          <li>admin@demo.local</li>
          <li>headhunter@demo.local</li>
          <li>client@demo.local</li>
        </ul>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navByRole: Record<string, Array<{ label: string; to: string }>> = {
    admin: [
      { label: 'Vacancies', to: '/vacancies' }, { label: 'Candidates', to: '/candidates' }, { label: 'Applications', to: '/applications' }, { label: 'Shortlist', to: '/shortlist' }, { label: 'Client Review', to: '/client-review' }, { label: 'Smart Interview', to: '/smart-interview' }, { label: 'Product Intelligence', to: '/product-intelligence' },
    ],
    headhunter: [
      { label: 'Vacancies', to: '/vacancies' }, { label: 'Candidates', to: '/candidates' }, { label: 'Applications', to: '/applications' }, { label: 'Shortlist', to: '/shortlist' }, { label: 'Smart Interview', to: '/smart-interview' }, { label: 'Product Intelligence', to: '/product-intelligence' },
    ],
    client: [
      { label: 'Applications', to: '/applications' }, { label: 'Client Review', to: '/client-review' },
    ],
  };

  const navItems = user ? navByRole[user.role] ?? [] : [];
  return (
    <nav style={{ background: '#1a1a2e', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <strong>Connekt Hunter</strong>
      {navItems.map((item) => (
        <Link key={item.to} to={item.to}
          style={{ color: '#adf', textDecoration: 'none', fontSize: 14 }}>{item.label}</Link>
      ))}
      <span style={{ marginLeft: 'auto', fontSize: 13 }}>{user?.name} ({user?.role})</span>
      <button style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { logout(); navigate('/login'); }}>Logout</button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Vacancies view
// ---------------------------------------------------------------------------
interface Vacancy { id: string; title: string; description: string; organizationId: string }

function VacanciesView() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orgId, setOrgId] = useState('org_demo');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setVacancies(await apiGet<Vacancy[]>('/vacancies')); } catch { /* ignored */ }
  };

  useEffect(() => { void load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await apiPost('/vacancies', { organizationId: orgId, title, description });
      setTitle(''); setDescription('');
      setMsg('Vacancy created!');
      await load();
    } catch (err) { setMsg(String(err)); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Vacancies</h2>
      <form onSubmit={(e) => { void create(e); }} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Create Vacancy</h3>
        <label>Org ID<br /><input value={orgId} onChange={e => setOrgId(e.target.value)} style={{ width: '100%', padding: 6 }} /></label><br /><br />
        <label>Title<br /><input value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: 6 }} /></label><br /><br />
        <label>Description<br /><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 6 }} /></label><br />
        {msg && <p style={{ color: msg.includes('error') || msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
        <button type="submit" disabled={loading} style={{ padding: '8px 20px' }}>{loading ? 'Creating…' : 'Create'}</button>
      </form>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Title</th>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>ID</th>
        </tr></thead>
        <tbody>{vacancies.map(v => (
          <tr key={v.id} style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px' }}>{v.title}</td>
            <td style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>{v.id}</td>
          </tr>
        ))}</tbody>
      </table>
      {vacancies.length === 0 && <p style={{ color: '#888' }}>No vacancies yet.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidates view
// ---------------------------------------------------------------------------
interface Candidate { id: string; email: string; token: string }
interface CandidateRecommendation {
  id: string;
  candidateId: string;
  vacancyId: string;
  recommendationType: string;
  title: string;
  explanation: string;
  confidence: number;
}

function CandidatesView() {
  const [email, setEmail] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [orgId, setOrgId] = useState('org_demo');
  const [result, setResult] = useState<Candidate | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendationCandidateId, setRecommendationCandidateId] = useState('');
  const [recommendationVacancyId, setRecommendationVacancyId] = useState('');
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const c = await apiPost<Candidate>('/candidates/invite', { organizationId: orgId, email, vacancyId });
      setResult(c);
      setMsg('Candidate invited! Token: ' + c.token);
    } catch (err) { setMsg(String(err)); } finally { setLoading(false); }
  };

  const loadRecommendations = async () => {
    try {
      const data = await apiGet<CandidateRecommendation[]>(`/recommendation-engine/${recommendationVacancyId}`);
      setRecommendations(data.filter((item) => item.candidateId === recommendationCandidateId));
      setMsg('Recomendações carregadas para o candidato.');
    } catch (err) { setMsg(String(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Candidates</h2>
      <form onSubmit={(e) => { void invite(e); }} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, maxWidth: 500 }}>
        <h3 style={{ marginTop: 0 }}>Invite Candidate</h3>
        <label>Org ID<br /><input value={orgId} onChange={e => setOrgId(e.target.value)} style={{ width: '100%', padding: 6 }} /></label><br /><br />
        <label>Candidate Email<br /><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 6 }} /></label><br /><br />
        <label>Vacancy ID<br /><input value={vacancyId} onChange={e => setVacancyId(e.target.value)} required style={{ width: '100%', padding: 6 }} /></label><br />
        {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green', wordBreak: 'break-all' }}>{msg}</p>}
        <button type="submit" disabled={loading} style={{ padding: '8px 20px' }}>{loading ? 'Inviting…' : 'Invite'}</button>
      </form>
      {result && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0fff0', borderRadius: 6 }}>
          <strong>Invite token:</strong> <code>{result.token}</code><br />
          <small>Share with candidate for candidate-web login</small>
        </div>
      )}
      <div style={{ marginTop: 20, border: '1px solid #ddd', padding: 16, borderRadius: 8, maxWidth: 700 }}>
        <h3 style={{ marginTop: 0 }}>Recomendações por candidato</h3>
        <input placeholder="Candidate ID" value={recommendationCandidateId} onChange={(e) => setRecommendationCandidateId(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <input placeholder="Vacancy ID" value={recommendationVacancyId} onChange={(e) => setRecommendationVacancyId(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <button onClick={() => { void loadRecommendations(); }} disabled={!recommendationCandidateId || !recommendationVacancyId}>Carregar recomendações</button>
        {recommendations.length > 0 && (
          <ul>
            {recommendations.map((item) => <li key={item.id}><strong>{item.title}</strong> ({Math.round(item.confidence * 100)}%) — {item.explanation}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applications view
// ---------------------------------------------------------------------------
interface Application {
  id: string; status: string; createdAt: string;
  candidate: { email: string };
  vacancy: { title: string };
}

function ApplicationsView() {
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    apiGet<Application[]>('/applications').then(setApps).catch(console.error);
  }, []);

  const statusColor: Record<string, string> = { submitted: '#888', shortlisted: '#0a0', approved: '#060', rejected: '#c00', hold: '#880' };

  return (
    <div style={{ padding: 20 }}>
      <h2>Applications</h2>
      <button onClick={() => apiGet<Application[]>('/applications').then(setApps)} style={{ marginBottom: 12, padding: '6px 14px' }}>Refresh</button>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          {['Candidate', 'Vacancy', 'Status', 'Date', 'ID'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 12px' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{apps.map(a => (
          <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px' }}>{a.candidate.email}</td>
            <td style={{ padding: '8px 12px' }}>{a.vacancy.title}</td>
            <td style={{ padding: '8px 12px', color: statusColor[a.status] ?? '#444' }}>{a.status}</td>
            <td style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
            <td style={{ padding: '8px 12px', fontSize: 11, color: '#aaa' }}>{a.id}</td>
          </tr>
        ))}</tbody>
      </table>
      {apps.length === 0 && <p style={{ color: '#888' }}>No applications yet.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shortlist view
// ---------------------------------------------------------------------------
interface ShortlistItem { id: string; applicationId: string; shortlistId: string }
interface EvalRecord { id: string; comment: string; evaluatorId: string }
interface PriorityScore { id: string; candidateId: string; score: number; priorityBand: string }

function ShortlistView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [evalComment, setEvalComment] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [evals, setEvals] = useState<EvalRecord[]>([]);
  const [msg, setMsg] = useState('');
  const [vacancyIdForPriority, setVacancyIdForPriority] = useState('');
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);

  useEffect(() => { void apiGet<Application[]>('/applications').then(setApps); }, []);

  const addToShortlist = async (appId: string) => {
    try {
      await apiPost<ShortlistItem>('/shortlist', { applicationId: appId });
      setShortlistedIds(prev => new Set([...prev, appId]));
      setMsg('Added to shortlist!');
    } catch (err) { setMsg(String(err)); }
  };

  const calculatePriority = async () => {
    try {
      const data = await apiPost<PriorityScore[]>('/decision-engine/priority/calculate', { vacancyId: vacancyIdForPriority });
      setPriorities(data);
      setMsg('Priorização dinâmica calculada.');
    } catch (err) { setMsg(String(err)); }
  };

  const submitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedApp) return;
    try {
      const r = await apiPost<EvalRecord>('/evaluations', { applicationId: selectedApp, evaluatorId: user.id, comment: evalComment });
      setEvals(prev => [...prev, r]);
      setEvalComment('');
      setMsg('Evaluation saved!');
    } catch (err) { setMsg(String(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Shortlist</h2>
      {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
      <h3>Applications</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Candidate</th>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vacancy</th>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Action</th>
        </tr></thead>
        <tbody>{apps.map(a => (
          <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px' }}>{a.candidate.email}</td>
            <td style={{ padding: '8px 12px' }}>{a.vacancy.title}</td>
            <td style={{ padding: '8px 12px' }}>
              {shortlistedIds.has(a.id)
                ? <span style={{ color: '#0a0' }}>✓ Shortlisted</span>
                : <button onClick={() => { void addToShortlist(a.id); }} style={{ padding: '4px 12px' }}>Add to Shortlist</button>
              }
              {' '}
              <button onClick={() => setSelectedApp(a.id)} style={{ padding: '4px 12px', marginLeft: 4 }}>Evaluate</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      {selectedApp && (
        <form onSubmit={(e) => { void submitEval(e); }} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8, maxWidth: 500 }}>
          <h3 style={{ marginTop: 0 }}>Evaluation for application <code style={{ fontSize: 12 }}>{selectedApp}</code></h3>
          <textarea value={evalComment} onChange={e => setEvalComment(e.target.value)} rows={4}
            placeholder="Add your professional assessment..." required style={{ width: '100%', padding: 8 }} />
          <br />
          <button type="submit" style={{ padding: '8px 20px', marginTop: 8 }}>Save Evaluation</button>
          {evals.length > 0 && <p style={{ color: 'green', marginTop: 8 }}>{evals.length} evaluation(s) saved</p>}
        </form>
      )}
      <div style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Priorização dinâmica da shortlist</h3>
        <input placeholder="Vacancy ID" value={vacancyIdForPriority} onChange={(e) => setVacancyIdForPriority(e.target.value)} style={{ width: 320, marginRight: 8 }} />
        <button onClick={() => { void calculatePriority(); }} disabled={!vacancyIdForPriority}>Calcular prioridade</button>
        {priorities.length > 0 && (
          <table style={{ width: '100%', marginTop: 12 }}>
            <thead><tr><th>Candidato</th><th>Score</th><th>Banda</th></tr></thead>
            <tbody>{priorities.map((item) => <tr key={item.id}><td>{item.candidateId}</td><td>{item.score.toFixed(1)}</td><td>{item.priorityBand}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Review view
// ---------------------------------------------------------------------------
interface Decision { id: string; decision: string; shortlistItemId: string }

function ClientReviewView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => { void apiGet<Application[]>('/applications').then(setApps); }, []);

  const decide = async (appId: string, decision: string) => {
    if (!user) return;
    try {
      await apiPost<Decision>('/client-decisions', { shortlistItemId: appId, reviewerId: user.id, decision });
      setDecisions(prev => ({ ...prev, [appId]: decision }));
      setMsg(`Decision "${decision}" saved.`);
    } catch (err) { setMsg(String(err)); }
  };

  const decisionColors: Record<string, string> = { approve: '#060', reject: '#c00', interview: '#00a', hold: '#880' };

  return (
    <div style={{ padding: 20 }}>
      <h2>Client Review</h2>
      <p style={{ color: '#666' }}>Review shortlisted candidates and record your decision.</p>
      {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f5f5f5' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Candidate</th>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vacancy</th>
          <th style={{ textAlign: 'left', padding: '8px 12px' }}>Decision</th>
        </tr></thead>
        <tbody>{apps.map(a => (
          <tr key={a.id} style={{ borderTop: '1px solid #eee' }}>
            <td style={{ padding: '8px 12px' }}>{a.candidate.email}</td>
            <td style={{ padding: '8px 12px' }}>{a.vacancy.title}</td>
            <td style={{ padding: '8px 12px' }}>
              {decisions[a.id]
                ? <strong style={{ color: decisionColors[decisions[a.id]] ?? '#444' }}>{decisions[a.id]}</strong>
                : (
                  <span style={{ display: 'flex', gap: 6 }}>
                    {['approve', 'reject', 'interview', 'hold'].map(d => (
                      <button key={d} onClick={() => { void decide(a.id, d); }}
                        style={{ padding: '4px 10px', background: decisionColors[d], color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                        {d}
                      </button>
                    ))}
                  </span>
                )}
            </td>
          </tr>
        ))}</tbody>
      </table>
      {apps.length === 0 && <p style={{ color: '#888' }}>No applications found.</p>}
    </div>
  );
}



function SmartInterviewView() {
  const [vacancyId, setVacancyId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [notes, setNotes] = useState('Aprovado para próxima etapa');
  const [msg, setMsg] = useState('');

  const saveTemplate = async () => {
    try {
      const tpl = await apiPost<{ id: string }>('/smart-interview/templates', { vacancyId, configJson: { intro: 'Entrevista assíncrona', attempts: 1 } });
      setTemplateId(tpl.id);
      setMsg('Template salvo.');
    } catch (err) { setMsg(String(err)); }
  };

  const generateQuestions = async () => {
    try {
      await apiPost(`/smart-interview/templates/${templateId}/generate-questions`, {});
      setMsg('Perguntas mock IA geradas.');
    } catch (err) { setMsg(String(err)); }
  };

  const createSession = async () => {
    try {
      const session = await apiPost<{ id: string; publicToken: string }>('/smart-interview/sessions', { applicationId });
      setSessionId(session.id);
      setMsg(`Sessão criada. Token candidato: ${session.publicToken}`);
    } catch (err) { setMsg(String(err)); }
  };

  const approveReview = async () => {
    try {
      await apiPost(`/smart-interview/sessions/${sessionId}/human-review`, { decision: 'approved', notes });
      setMsg('Review humano salvo.');
    } catch (err) { setMsg(String(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Smart Interview</h2>
      <p style={{ color: '#666' }}>Configuração da vaga, editor de perguntas e review humano em um fluxo único.</p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 700 }}>
        <label>Vacancy ID
          <input value={vacancyId} onChange={(e) => setVacancyId(e.target.value)} style={{ width: '100%', padding: 6 }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { void saveTemplate(); }}>Salvar template</button>
          <button onClick={() => { void generateQuestions(); }} disabled={!templateId}>Gerar perguntas IA mock</button>
        </div>
        <label>Application ID
          <input value={applicationId} onChange={(e) => setApplicationId(e.target.value)} style={{ width: '100%', padding: 6 }} />
        </label>
        <button onClick={() => { void createSession(); }} disabled={!applicationId}>Criar sessão por aplicação</button>
        <label>Session ID (review)
          <input value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>Notas de review
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: 6 }} rows={3} />
        </label>
        <button onClick={() => { void approveReview(); }} disabled={!sessionId}>Salvar review humano</button>
      </div>
      {msg && <p style={{ marginTop: 12, color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
    </div>
  );
}



function ProductIntelligenceView() {
  const [applicationId, setApplicationId] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [otherCandidateId, setOtherCandidateId] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [ranking, setRanking] = useState<Array<{ candidateId: string; rank: number; score: number; manualOverride: boolean }>>([]);
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [risk, setRisk] = useState<Record<string, unknown> | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; suggestionType: string; explanation: string; status: string }>>([]);
  const [msg, setMsg] = useState('');

  const compute = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-matching/compute', { applicationId });
      setResult(data);
      setMsg('Matching calculado com breakdown, evidências e explicação.');
    } catch (err) { setMsg(String(err)); }
  };

  const generateInsights = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-insights/generate', { candidateId, vacancyId });
      setResult(data);
      setMsg('Insights gerados.');
    } catch (err) { setMsg(String(err)); }
  };

  const compare = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/candidate-matching/compare', { vacancyId, leftCandidateId: candidateId, rightCandidateId: otherCandidateId });
      setResult(data);
      setMsg('Comparativo assistido gerado.');
    } catch (err) { setMsg(String(err)); }
  };

  const generateRanking = async () => {
    try {
      const data = await apiPost<Array<{ candidateId: string; rank: number; score: number; manualOverride: boolean }>>('/candidate-ranking/generate', { vacancyId });
      setRanking(data);
      setMsg('Ranking assistido gerado.');
    } catch (err) { setMsg(String(err)); }
  };

  const generateRecommendations = async () => {
    try {
      const data = await apiPost<CandidateRecommendation[]>('/recommendation-engine/generate', { candidateId, vacancyId });
      setRecommendations(data);
      setMsg('Recomendações geradas com explicações.');
    } catch (err) { setMsg(String(err)); }
  };

  const analyzeRisk = async () => {
    try {
      const data = await apiPost<Record<string, unknown>>('/risk-analysis/analyze', { candidateId, vacancyId });
      setRisk(data);
      setMsg('Risco identificado com explicação assistiva.');
    } catch (err) { setMsg(String(err)); }
  };

  const suggestWorkflow = async () => {
    try {
      const data = await apiPost<Array<{ id: string; suggestionType: string; explanation: string; status: string }>>('/workflow-automation/suggest', { candidateId, vacancyId });
      setSuggestions(data);
      setMsg('Ações sugeridas carregadas.');
    } catch (err) { setMsg(String(err)); }
  };

  const executeSuggestion = async (suggestionId: string) => {
    try {
      const data = await apiPost<Record<string, unknown>>('/workflow-automation/execute', { suggestionId });
      setResult(data);
      setMsg('Automação assistida executada com override humano.');
    } catch (err) { setMsg(String(err)); }
  };

  const moveUp = async (candidateIdToPromote: string) => {
    const ordered = [...ranking].sort((a, b) => a.rank - b.rank).map((item) => item.candidateId);
    const idx = ordered.indexOf(candidateIdToPromote);
    if (idx <= 0) return;
    [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
    try {
      const data = await apiPost<Array<{ candidateId: string; rank: number; score: number; manualOverride: boolean }>>('/candidate-ranking/override', { vacancyId, orderedCandidateIds: ordered });
      setRanking(data);
      setMsg('Ordem atualizada com override humano.');
    } catch (err) { setMsg(String(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Product Intelligence</h2>
      <p style={{ color: '#666' }}>Matching, insights, comparador e ranking assistido (decisão final sempre humana).</p>
      <div style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
        <input placeholder="Application ID" value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
        <button onClick={() => { void compute(); }} disabled={!applicationId}>Compute matching</button>
        <input placeholder="Vacancy ID" value={vacancyId} onChange={(e) => setVacancyId(e.target.value)} />
        <input placeholder="Candidate ID" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} />
        <button onClick={() => { void generateInsights(); }} disabled={!vacancyId || !candidateId}>Generate insights</button>
        <input placeholder="Compare with Candidate ID" value={otherCandidateId} onChange={(e) => setOtherCandidateId(e.target.value)} />
        <button onClick={() => { void compare(); }} disabled={!vacancyId || !candidateId || !otherCandidateId}>Compare candidates</button>
        <button onClick={() => { void generateRanking(); }} disabled={!vacancyId}>Generate ranking</button>
        <button onClick={() => { void generateRecommendations(); }} disabled={!vacancyId || !candidateId}>Generate recommendations</button>
        <button onClick={() => { void analyzeRisk(); }} disabled={!vacancyId || !candidateId}>Analyze risk</button>
        <button onClick={() => { void suggestWorkflow(); }} disabled={!vacancyId || !candidateId}>Suggest actions</button>
      </div>
      {msg && <p style={{ color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
      {ranking.length > 0 && (
        <table style={{ width: '100%', marginTop: 14 }}>
          <thead><tr><th>Rank</th><th>Candidate</th><th>Score</th><th>Override</th></tr></thead>
          <tbody>{ranking.sort((a, b) => a.rank - b.rank).map((item) => (
            <tr key={item.candidateId}><td>{item.rank}</td><td>{item.candidateId}</td><td>{item.score}</td><td><button onClick={() => { void moveUp(item.candidateId); }}>Move up</button> {item.manualOverride ? 'manual' : 'assistive'}</td></tr>
          ))}</tbody>
        </table>
      )}
      {recommendations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>Painel de recomendações</h3>
          <ul>{recommendations.map((item) => <li key={item.id}><strong>{item.title}</strong> ({Math.round(item.confidence * 100)}%) — {item.explanation}</li>)}</ul>
        </div>
      )}
      {risk && <pre style={{ marginTop: 16, background: '#fff5f5', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{JSON.stringify(risk, null, 2)}</pre>}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3>Ações sugeridas</h3>
          {suggestions.map((item) => (
            <div key={item.id} style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
              <strong>{item.suggestionType}</strong> — {item.explanation}
              <div><button onClick={() => { void executeSuggestion(item.id); }}>Executar ação sugerida</button></div>
            </div>
          ))}
        </div>
      )}
      {result && <pre style={{ marginTop: 16, background: '#f7f7f7', padding: 12, borderRadius: 8, overflowX: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      {user && <NavBar />}
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/vacancies" element={<ProtectedRoute><VacanciesView /></ProtectedRoute>} />
        <Route path="/candidates" element={<ProtectedRoute><CandidatesView /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><ApplicationsView /></ProtectedRoute>} />
        <Route path="/shortlist" element={<ProtectedRoute><ShortlistView /></ProtectedRoute>} />
        <Route path="/client-review" element={<ProtectedRoute><ClientReviewView /></ProtectedRoute>} />
        <Route path="/smart-interview" element={<ProtectedRoute><SmartInterviewView /></ProtectedRoute>} />
        <Route path="/product-intelligence" element={<ProtectedRoute><ProductIntelligenceView /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/vacancies' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider><App /></AuthProvider>
);
