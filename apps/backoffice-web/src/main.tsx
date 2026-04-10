import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyles } from '@connekt/ui';
import { useAuth } from './hooks/useAuth.js';
import { NavBar, ProtectedRoute, AuthProvider } from './components/layout/NavBar.js';
import { LoginView } from './views/LoginView.js';
import { VacanciesView } from './views/VacanciesView.js';
import { CandidatesView } from './views/CandidatesView.js';
import { ApplicationsView } from './views/ApplicationsView.js';
import { ShortlistView } from './views/ShortlistView.js';
import { ClientReviewView } from './views/ClientReviewView.js';
import { SmartInterviewView } from './views/SmartInterviewView.js';
import { ProductIntelligenceView } from './views/ProductIntelligenceView.js';

function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <GlobalStyles />
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
