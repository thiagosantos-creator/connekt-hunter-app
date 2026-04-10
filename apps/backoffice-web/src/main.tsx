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
      { label: 'Vacancies', to: '/vacancies' }, { label: 'Candidates', to: '/candidates' }, { label: 'Applications', to: '/applications' }, { label: 'Shortlist', to: '/shortlist' }, { label: 'Client Review', to: '/client-review' },
    ],
    headhunter: [
      { label: 'Vacancies', to: '/vacancies' }, { label: 'Candidates', to: '/candidates' }, { label: 'Applications', to: '/applications' }, { label: 'Shortlist', to: '/shortlist' },
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

function CandidatesView() {
  const [email, setEmail] = useState('');
  const [vacancyId, setVacancyId] = useState('');
  const [orgId, setOrgId] = useState('org_demo');
  const [result, setResult] = useState<Candidate | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const c = await apiPost<Candidate>('/candidates/invite', { organizationId: orgId, email, vacancyId });
      setResult(c);
      setMsg('Candidate invited! Token: ' + c.token);
    } catch (err) { setMsg(String(err)); } finally { setLoading(false); }
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

function ShortlistView() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [evalComment, setEvalComment] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [evals, setEvals] = useState<EvalRecord[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { void apiGet<Application[]>('/applications').then(setApps); }, []);

  const addToShortlist = async (appId: string) => {
    try {
      await apiPost<ShortlistItem>('/shortlist', { applicationId: appId });
      setShortlistedIds(prev => new Set([...prev, appId]));
      setMsg('Added to shortlist!');
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
        <Route path="*" element={<Navigate to={user ? '/vacancies' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider><App /></AuthProvider>
);
