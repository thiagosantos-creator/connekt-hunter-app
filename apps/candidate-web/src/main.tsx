import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyles, colors, spacing, fontSize } from '@connekt/ui';
import { RequiresToken } from './components/layout/RequiresToken.js';
import { TokenEntryView } from './views/TokenEntryView.js';
import { Step1BasicView } from './views/Step1BasicView.js';
import { Step2ConsentView } from './views/Step2ConsentView.js';
import { Step3ResumeView } from './views/Step3ResumeView.js';
import { StatusView } from './views/StatusView.js';
import { InterviewView } from './views/InterviewView.js';
import { AccountView } from './views/AccountView.js';
import { VacancyLandingView } from './views/VacancyLandingView.js';

function App() {
  return (
    <BrowserRouter>
      <GlobalStyles />
      <header style={{ background: colors.primary, color: colors.textInverse, padding: `${spacing.sm + 4}px ${spacing.lg}px`, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <strong style={{ fontSize: fontSize.lg, letterSpacing: -0.3 }}>Connekt Hunter — Portal do Candidato</strong>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<TokenEntryView />} />
          <Route path="/vacancies/:vacancyId" element={<VacancyLandingView />} />
          <Route path="/onboarding/basic" element={<RequiresToken><Step1BasicView /></RequiresToken>} />
          <Route path="/onboarding/consent" element={<RequiresToken><Step2ConsentView /></RequiresToken>} />
          <Route path="/onboarding/resume" element={<RequiresToken><Step3ResumeView /></RequiresToken>} />
          <Route path="/status" element={<RequiresToken><StatusView /></RequiresToken>} />
          <Route path="/interview" element={<RequiresToken><InterviewView /></RequiresToken>} />
          <Route path="/account" element={<RequiresToken><AccountView /></RequiresToken>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
