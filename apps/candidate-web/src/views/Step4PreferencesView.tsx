import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { Button, Card, CardContent, InlineMessage, Input, colors, spacing, fontSize, fontWeight, radius } from '@connekt/ui';

const LANGUAGES = ['Português', 'Inglês', 'Espanhol', 'Francês', 'Alemão', 'Mandarim', 'Italiano', 'Japonês'];
const MAX_JOB_TITLES = 3;

export function Step4PreferencesView() {
  const navigate = useNavigate();

  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [jobTitles, setJobTitles] = useState<string[]>(Array(MAX_JOB_TITLES).fill(''));
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const setJobTitle = (index: number, value: string) => {
    setJobTitles((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const skip = () => navigate('/onboarding/intro-video');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = salaryMin ? parseInt(salaryMin, 10) : undefined;
    const max = salaryMax ? parseInt(salaryMax, 10) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setError('O salário mínimo não pode ser maior que o máximo.');
      return;
    }
    const titles = jobTitles.map((t) => t.trim()).filter(Boolean);
    setLoading(true);
    setError('');
    try {
      await apiPost('/candidate/onboarding/preferences', {
        token: getToken(),
        salaryMin: min,
        salaryMax: max,
        jobTitles: titles,
        languages: selectedLanguages,
      });
      navigate('/onboarding/intro-video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar preferências. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={4} />
      <Card>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.xs}px`, color: colors.text }}>Passo 4 — Preferências Profissionais</h2>
          <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.lg }}>
            Compartilhe suas preferências para que possamos encontrar as melhores oportunidades para você. Todos os campos são opcionais.
          </p>

          <form onSubmit={(e) => { void submit(e); }}>
            {/* Salary */}
            <div style={{ marginBottom: spacing.lg }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>
                Pretensão salarial (R$)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.sm }}>
                <div>
                  <label style={{ display: 'block', fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 }}>Mínimo</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="ex: 5000"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 }}>Máximo</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="ex: 10000"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Job titles */}
            <div style={{ marginBottom: spacing.lg }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>
                Cargos de interesse (até {MAX_JOB_TITLES})
              </div>
              <div style={{ display: 'grid', gap: spacing.xs }}>
                {Array.from({ length: MAX_JOB_TITLES }, (_, i) => (
                  <Input
                    key={i}
                    type="text"
                    placeholder={`Cargo ${i + 1} — ex: Software Engineer`}
                    value={jobTitles[i] ?? ''}
                    onChange={(e) => setJobTitle(i, e.target.value)}
                    maxLength={80}
                  />
                ))}
              </div>
            </div>

            {/* Languages */}
            <div style={{ marginBottom: spacing.lg }}>
              <div style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textMuted, marginBottom: spacing.sm }}>
                Idiomas
              </div>
              <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                {LANGUAGES.map((lang) => {
                  const active = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      style={{
                        padding: `${spacing.xs}px ${spacing.sm}px`,
                        borderRadius: radius.full,
                        border: `1.5px solid ${active ? colors.accent : colors.border}`,
                        background: active ? colors.infoLight : colors.surface,
                        color: active ? colors.accent : colors.textSecondary,
                        fontSize: fontSize.sm,
                        fontWeight: active ? fontWeight.semibold : fontWeight.normal,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {active ? '✓ ' : ''}{lang}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <div style={{ marginBottom: spacing.md }}><InlineMessage variant="error">{error}</InlineMessage></div>}

            <div style={{ display: 'flex', gap: spacing.sm }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/onboarding/resume')}>
                ← Voltar
              </Button>
              <Button variant="ghost" type="button" onClick={skip} disabled={loading}>
                Pular por agora
              </Button>
              <Button type="submit" loading={loading} style={{ flex: 1 }}>
                {loading ? 'Salvando…' : 'Continuar →'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
