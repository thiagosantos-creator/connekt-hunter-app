import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyles } from '@connekt/ui';
import { useAuth } from './hooks/useAuth.js';
import { NavBar, ProtectedRoute, AuthProvider, PermissionRoute } from './components/layout/NavBar.js';
import { LoginView } from './views/LoginView.js';
import { VacanciesView } from './views/VacanciesView.js';
import { CandidatesView } from './views/CandidatesView.js';
import { ApplicationsView } from './views/ApplicationsView.js';
import { ShortlistView } from './views/ShortlistView.js';
import { ClientReviewView } from './views/ClientReviewView.js';
import { SmartInterviewView } from './views/SmartInterviewView.js';
import { ProductIntelligenceView } from './views/ProductIntelligenceView.js';
import { AccountView } from './views/AccountView.js';
import { AdminUsersView } from './views/AdminUsersView.js';
import { AuditTrailView } from './views/AuditTrailView.js';

function App() {
  const { user } = useAuth();
  const homeByRole: Record<string, string> = {
    admin: '/vacancies',
    headhunter: '/vacancies',
    client: '/applications',
  };
  const home = user ? homeByRole[user.role] ?? '/applications' : '/login';

  return (
    <BrowserRouter>
      <GlobalStyles />
      {user && <NavBar />}
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/vacancies" element={<ProtectedRoute><VacanciesView /></ProtectedRoute>} />
        <Route path="/candidates" element={<PermissionRoute permission="candidates:invite"><CandidatesView /></PermissionRoute>} />
        <Route path="/applications" element={<ProtectedRoute><ApplicationsView /></ProtectedRoute>} />
        <Route path="/shortlist" element={<PermissionRoute permission="shortlist:write"><ShortlistView /></PermissionRoute>} />
        <Route path="/client-review" element={<ProtectedRoute><ClientReviewView /></ProtectedRoute>} />
        <Route path="/smart-interview" element={<ProtectedRoute><SmartInterviewView /></ProtectedRoute>} />
        <Route path="/product-intelligence" element={<PermissionRoute permission="smart-interview:configure"><ProductIntelligenceView /></PermissionRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountView /></ProtectedRoute>} />
        <Route path="/admin/users" element={<PermissionRoute permission="users:manage"><AdminUsersView /></PermissionRoute>} />
        <Route path="/audit" element={<PermissionRoute permission="audit:read"><AuditTrailView /></PermissionRoute>} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider><App /></AuthProvider>
);
