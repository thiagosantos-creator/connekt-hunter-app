import { useEffect, useState, useMemo } from 'react';
import { 
  PageContent, 
  Card, 
  CardContent, 
  colors, 
  spacing, 
  radius, 
  fontSize, 
  fontWeight, 
  shadows,
  Button,
  Select,
  Spinner,
} from '@connekt/ui';
import { apiGet, apiPost } from '../services/api.js';
import type { 
  SourcingCandidate, 
  SourcingConflict, 
  SourcingFitInsight,
  Vacancy
} from '../services/types.js';
import { MatchInsightDrawer } from '../components/sourcing/MatchInsightDrawer.js';

const glassStyles = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  borderRadius: radius.xl,
};

export function CandidateSourcingView() {
  const [query, setQuery] = useState('');
  const [selectedVacancy, setSelectedVacancy] = useState('');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<SourcingCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Detail States
  const [insightLoading, setInsightLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<SourcingCandidate | null>(null);
  const [fitInsight, setFitInsight] = useState<SourcingFitInsight | null>(null);
  const [conflicts, setConflicts] = useState<SourcingConflict[]>([]);

  // Initial Load
  useEffect(() => {
    void apiGet<Vacancy[]>('/vacancies').then(setVacancies);
  }, []);

  // Search Logic
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) {
        setCandidates([]);
        return;
      }
      setLoading(true);
      try {
        const data = await apiGet<SourcingCandidate[]>(`/sourcing/search?query=${encodeURIComponent(query)}`);
        setCandidates(data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const handleAnalyseFit = async (candidate: SourcingCandidate) => {
    if (!selectedVacancy) {
      alert('Selecione uma vaga para analisar o fit.');
      return;
    }
    setSelectedCandidate(candidate);
    setInsightLoading(true);
    setFitInsight(null);
    try {
      const [insight, conflictData] = await Promise.all([
        apiPost<SourcingFitInsight>('/sourcing/fit-insight', { candidateId: candidate.id, vacancyId: selectedVacancy }),
        apiGet<SourcingConflict[]>(`/sourcing/conflicts?candidateId=${candidate.id}`)
      ]);
      setFitInsight(insight);
      setConflicts(conflictData);
    } catch (err) {
      console.error('Fit analysis failed:', err);
    } finally {
      setInsightLoading(false);
    }
  };

  const vacancyOptions = useMemo(() => vacancies.map(v => ({ value: v.id, label: v.title })), [vacancies]);

  return (
    <PageContent style={{ maxWidth: 1200 }}>
      
      <header style={{ marginBottom: spacing.xxl }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: fontWeight.black, color: colors.text, letterSpacing: '-0.04em', margin: 0 }}>
          Sourcing <span style={{ color: colors.accent }}>IA</span>
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: fontSize.lg, marginTop: spacing.xs }}>
          Descubra talentos na sua base e analise o fit ideal para suas vagas.
        </p>
      </header>

      {/* Toolbar */}
      <Card style={{ ...glassStyles, padding: spacing.md, marginBottom: spacing.xl, display: 'flex', gap: spacing.lg, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Pesquisar por nome, email ou skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: `${spacing.md}px ${spacing.xl}px`,
              borderRadius: radius.lg,
              border: `1px solid ${colors.border}`,
              fontSize: fontSize.md,
              background: 'rgba(255,255,255,0.5)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          {loading && <div style={{ position: 'absolute', right: spacing.md, top: '50%', transform: 'translateY(-50%)' }}><Spinner size={20} /></div>}
        </div>

        <div style={{ width: 300 }}>
          <Select
            placeholder="Selecione a Vaga para Match"
            value={selectedVacancy}
            onChange={(e) => setSelectedVacancy(e.target.value)}
            options={vacancyOptions}
          />
        </div>
      </Card>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: spacing.xl }}>
        {candidates.map(candidate => (
          <Card key={candidate.id} style={{ ...glassStyles, padding: 0, overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }} 
            className="hover-scale"
          >
            <CardContent style={{ padding: spacing.xl }}>
              <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center', marginBottom: spacing.lg }}>
                <div style={{ width: 64, height: 64, borderRadius: radius.full, background: colors.surfaceAlt, overflow: 'hidden' }}>
                  {candidate.photoUrl ? <img src={candidate.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.xxl, color: colors.textMuted }}>👤</div>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{candidate.fullName}</h3>
                  <p style={{ margin: 0, fontSize: fontSize.sm, color: colors.textSecondary }}>{candidate.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xl }}>
                {candidate.skills.slice(0, 5).map((skill, i) => (
                  <span key={i} style={{ background: colors.surfaceAlt, padding: '4px 10px', borderRadius: radius.md, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.textSecondary }}>
                    {skill}
                  </span>
                ))}
                {candidate.skills.length > 5 && <span style={{ fontSize: fontSize.xs, color: colors.textMuted, alignSelf: 'center' }}>+{candidate.skills.length - 5}</span>}
              </div>

              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button 
                  style={{ flex: 1, background: colors.accent, border: 'none' }} 
                  onClick={() => handleAnalyseFit(candidate)}
                  disabled={!selectedVacancy}
                >
                  Analisar Fit
                </Button>
                <Button variant="ghost">Perfil</Button>
              </div>

              {/* Conflict Alert Mock/Check - Show if in other shortlists */}
              {/* This could be integrated here if we pre-fetch conflict info, but for performance we do it in the drawer */}
            </CardContent>
          </Card>
        ))}

        {query && !loading && candidates.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: spacing.xxxl, color: colors.textSecondary }}>
            Nenhum candidato encontrado para "{query}".
          </div>
        )}
      </div>

      <MatchInsightDrawer
        insight={fitInsight}
        loading={insightLoading}
        candidateName={selectedCandidate?.fullName || ''}
        conflicts={conflicts}
        onClose={() => { setSelectedCandidate(null); setFitInsight(null); setConflicts([]); }}
      />

      <style>{`
        .hover-scale:hover { transform: translateY(-4px); }
      `}</style>
    </PageContent>
  );
}
