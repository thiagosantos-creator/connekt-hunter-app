import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyles, colors, spacing, fontSize, fontWeight, radius } from '@connekt/ui';
import { RequiresToken } from './components/layout/RequiresToken.js';
import { ErrorBoundary } from './components/layout/ErrorBoundary.js';
import { TokenEntryView } from './views/TokenEntryView.js';
import { Step1BasicView } from './views/Step1BasicView.js';
import { Step2ConsentView } from './views/Step2ConsentView.js';
import { Step3ResumeView } from './views/Step3ResumeView.js';
import { StatusView } from './views/StatusView.js';
import { InterviewView } from './views/InterviewView.js';
import { AccountView } from './views/AccountView.js';
import { VacancyLandingView } from './views/VacancyLandingView.js';
import { Step4MediaCheckView } from './views/Step4MediaCheckView.js';

function App() {
  return (
    <BrowserRouter>
      <GlobalStyles />
      <header style={{
        background: colors.primary,
        color: colors.textInverse,
        padding: `0 ${spacing.xl}px`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ width: 28, height: 28, borderRadius: radius.md, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: fontWeight.bold }}>
            C
          </div>
          <strong style={{ fontSize: fontSize.md, letterSpacing: -0.3 }}>Connekt Hunter</strong>
          <span style={{ opacity: 0.4, margin: `0 ${spacing.xs}px` }}>·</span>
          <span style={{ fontSize: fontSize.sm, opacity: 0.7 }}>Portal do Candidato</span>
        </div>
        <nav style={{ display: 'flex', gap: spacing.xs }}>
          <a href="/status" style={{ color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.md, transition: 'background 0.15s', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}>
            Minha candidatura
          </a>
          <a href="/account" style={{ color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.md, transition: 'background 0.15s', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}>
            Minha conta
          </a>
        </nav>
      </header>
      <main style={{ minHeight: 'calc(100vh - 56px)' }}>

        <Routes>
          <Route path="/" element={<TokenEntryView />} />
          <Route path="/vacancies/:vacancyId" element={<VacancyLandingView />} />
          <Route path="/onboarding/basic" element={<RequiresToken><Step1BasicView /></RequiresToken>} />
          <Route path="/onboarding/consent" element={<RequiresToken><Step2ConsentView /></RequiresToken>} />
          <Route path="/onboarding/resume" element={<RequiresToken><Step3ResumeView /></RequiresToken>} />
          <Route path="/onboarding/media-check" element={<RequiresToken><Step4MediaCheckView /></RequiresToken>} />
          <Route path="/status" element={<RequiresToken><StatusView /></RequiresToken>} />
          <Route path="/interview" element={<RequiresToken><InterviewView /></RequiresToken>} />
          <Route path="/account" element={<RequiresToken><AccountView /></RequiresToken>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
