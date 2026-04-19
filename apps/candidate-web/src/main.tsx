import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GlobalStyles, colors, spacing, fontSize, fontWeight, radius, shadows, zIndex } from '@connekt/ui';
import { RequiresToken } from './components/layout/RequiresToken.js';
import { ErrorBoundary } from './components/layout/ErrorBoundary.js';
import { TokenEntryView } from './views/TokenEntryView.js';
import { Step1BasicView } from './views/Step1BasicView.js';
import { Step2ConsentView } from './views/Step2ConsentView.js';
import { Step3ResumeView } from './views/Step3ResumeView.js';
import { Step4PreferencesView } from './views/Step4PreferencesView.js';
import { Step5IntroVideoView } from './views/Step5IntroVideoView.js';
import { StatusView } from './views/StatusView.js';
import { InterviewView } from './views/InterviewView.js';
import { AccountView } from './views/AccountView.js';
import { VacancyLandingView } from './views/VacancyLandingView.js';
import { Step3ReviewParsedView } from './views/Step3ReviewParsedView.js';
import { Step4MediaCheckView } from './views/Step4MediaCheckView.js';
import { AuthCallbackView } from './views/AuthCallbackView.js';

function App() {
  // Reactive candidate info derived from localStorage (re-reads on every render cycle)
  const raw = localStorage.getItem('candidate_info');
  const info = raw ? (JSON.parse(raw) as { profile?: { fullName?: string; photoUrl?: string | null } }) : {};
  const displayName = info.profile?.fullName ?? '?';
  const photo = info.profile?.photoUrl ?? null;
  const initials = displayName !== '?' ? displayName.charAt(0).toUpperCase() : '👤';

  const [dropOpen, setDropOpen] = useState(false);

  return (
    <BrowserRouter>
      <GlobalStyles />
      <header style={{
        background: colors.primary,
        color: colors.textInverse,
        padding: `0 ${spacing.xl}px`,
        boxShadow: `0 1px 0 ${colors.overlayInverseLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: zIndex.sticky,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ width: 28, height: 28, borderRadius: radius.md, background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: fontWeight.bold, color: colors.textInverse }}>
            C
          </div>
          <strong style={{ fontSize: fontSize.md, letterSpacing: -0.3 }}>Connekt Hunter</strong>
          <span style={{ opacity: 0.4, margin: `0 ${spacing.xs}px` }}>·</span>
          <span style={{ fontSize: fontSize.sm, opacity: 0.7 }}>Portal do Candidato</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <a href="/status" className="connekt-nav-link" style={{ color: colors.overlayHeavy, fontSize: fontSize.sm, padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.md, textDecoration: 'none' }}>
            Minha candidatura
          </a>

          {/* ── Avatar / account dropdown ──────────────────────────── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="connekt-nav-link"
              style={{
                display: 'flex', alignItems: 'center', gap: spacing.sm,
                background: colors.overlayLight, border: `1px solid ${colors.overlayMedium}`,
                borderRadius: radius.full, padding: `${spacing.xs}px ${spacing.sm + 2}px ${spacing.xs}px ${spacing.xs}px`,
                cursor: 'pointer', color: colors.textInverse,
                fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.overlayMedium; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = colors.overlayLight; }}
              title="Minha conta"
            >
              {/* Avatar circle */}
              <div style={{
                width: 28, height: 28, borderRadius: radius.full,
                background: colors.accent, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: fontSize.xs, fontWeight: fontWeight.bold, flexShrink: 0,
              }}>
                {photo
                  ? <img src={photo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: colors.textInverse }}>{initials}</span>
                }
              </div>
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>
                {displayName !== '?' ? displayName.split(' ')[0] : 'Conta'}
              </span>
              <span style={{ fontSize: 10, opacity: 0.6 }}>{dropOpen ? '▲' : '▼'}</span>
            </button>

            {dropOpen && (
              <div style={{
                position: 'absolute', top: '110%', right: 0,
                background: colors.surface, border: `1px solid ${colors.borderLight}`,
                borderRadius: radius.lg, boxShadow: shadows.lg,
                minWidth: 160, zIndex: zIndex.dropdown, overflow: 'hidden',
              }}>
                <a
                  href="/account"
                  onClick={() => setDropOpen(false)}
                  style={{
                    display: 'block', padding: `${spacing.sm}px ${spacing.md}px`,
                    color: colors.text, fontSize: fontSize.sm, textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.surfaceAlt; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  👤 Minha conta
                </a>
                <div style={{ height: 1, background: colors.borderLight }} />
                <button
                  onClick={() => {
                    setDropOpen(false);
                    if (window.confirm('Sair? Todos os dados locais serão removidos.')) {
                      localStorage.clear();
                      window.location.href = '/';
                    }
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.danger, fontSize: fontSize.sm,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = colors.surfaceAlt; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
      <main style={{ minHeight: 'calc(100vh - 56px)' }}>

        <Routes>
          <Route path="/" element={<TokenEntryView />} />
          <Route path="/vacancies/:vacancyId" element={<VacancyLandingView />} />
          <Route path="/onboarding/basic" element={<RequiresToken><Step1BasicView /></RequiresToken>} />
          <Route path="/onboarding/consent" element={<RequiresToken><Step2ConsentView /></RequiresToken>} />
          <Route path="/onboarding/resume" element={<RequiresToken><Step3ResumeView /></RequiresToken>} />
          <Route path="/onboarding/review" element={<RequiresToken><Step3ReviewParsedView /></RequiresToken>} />
          <Route path="/onboarding/preferences" element={<RequiresToken><Step4PreferencesView /></RequiresToken>} />
          <Route path="/onboarding/intro-video" element={<RequiresToken><Step5IntroVideoView /></RequiresToken>} />
          <Route path="/onboarding/media-check" element={<RequiresToken><Step4MediaCheckView /></RequiresToken>} />
          <Route path="/status" element={<RequiresToken><StatusView /></RequiresToken>} />
          <Route path="/interview" element={<RequiresToken><InterviewView /></RequiresToken>} />
          <Route path="/account" element={<RequiresToken><AccountView /></RequiresToken>} />
          <Route path="/auth/callback" element={<AuthCallbackView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
