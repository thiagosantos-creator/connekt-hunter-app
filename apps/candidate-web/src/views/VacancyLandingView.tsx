import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api.js';
import { extractErrorMessage } from '../services/error-messages.js';
import type { PublicVacancyInfo } from '../services/types.js';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  InlineMessage,
  Input,
  Spinner,
  spacing,
  colors,
  radius,
  fontSize,
  fontWeight,
} from '@connekt/ui';

/** Returns relative luminance for an sRGB hex color (WCAG 2.1 formula). */
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Returns contrast ratio between two hex colours. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns the brand colour if it meets WCAG AA (4.5:1) against the given background, else the fallback. */
function safeColor(brandColor: string | undefined | null, background: string, fallback: string): string {
  if (!brandColor || !/^#[0-9a-fA-F]{6}$/.test(brandColor)) return fallback;
  return contrastRatio(brandColor, background) >= 4.5 ? brandColor : fallback;
}

export function VacancyLandingView() {
  const navigate = useNavigate();
  const { vacancyId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [vacancy, setVacancy] = useState<PublicVacancyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(searchParams.get('token') ?? '');

  // Self-apply form state
  const [applyEmail, setApplyEmail] = useState('');
  const [applyName, setApplyName] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [applyVariant, setApplyVariant] = useState<'success' | 'error'>('success');

  const loadVacancy = useCallback(async () => {
    if (!vacancyId) {
      setLoading(false);
      setError('Vaga não encontrada.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiGet<PublicVacancyInfo>(`/public/vacancies/${encodeURIComponent(vacancyId)}`);
      setVacancy(data);
      setError('');
    } catch (err) {
      setError(extractErrorMessage(err));
      setVacancy(null);
    } finally {
      setLoading(false);
    }
  }, [vacancyId]);

  useEffect(() => {
    void loadVacancy();
  }, [loadVacancy]);

  const retryLoadVacancy = () => {
    void loadVacancy();
  };

  const primaryColor = safeColor(vacancy?.organization.primaryColor, colors.surface, colors.primary);
  const secondaryColor = vacancy?.organization.secondaryColor || colors.surfaceAlt;
  const salaryLabel = useMemo(() => {
    if (!vacancy?.salaryMin && !vacancy?.salaryMax) return 'A combinar';
    const min = vacancy.salaryMin ? `R$ ${vacancy.salaryMin.toLocaleString('pt-BR')}` : '-';
    const max = vacancy.salaryMax ? `R$ ${vacancy.salaryMax.toLocaleString('pt-BR')}` : '-';
    return `${min} até ${max}`;
  }, [vacancy]);

  const continueToPortal = () => {
    const normalized = token.trim();
    if (!normalized) {
      navigate('/');
      return;
    }
    navigate(`/?token=${encodeURIComponent(normalized)}`);
  };

  const handlePhoneBlur = useCallback(() => { validatePhone(applyPhone); }, [applyPhone]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApplyPhone(e.target.value);
    setPhoneError('');
  }, []);

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true; // optional field
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      setPhoneError('Telefone inválido. Use o formato (XX) XXXXX-XXXX.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSelfApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacancyId) return;
    if (!validatePhone(applyPhone)) return;
    setApplying(true);
    setApplyMsg('');
    try {
      const result = await apiPost<{ token: string }>(`/public/vacancies/${encodeURIComponent(vacancyId)}/apply`, {
        email: applyEmail,
        fullName: applyName,
        phone: applyPhone.trim() || undefined,
      });
      localStorage.setItem('invite_token', result.token);
      setApplyMsg('Candidatura realizada com sucesso! Redirecionando...');
      setApplyVariant('success');
      setTimeout(() => navigate('/onboarding/consent'), 1200);
    } catch (err) {
      setApplyMsg(extractErrorMessage(err));
      setApplyVariant('error');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '48px auto', padding: `0 ${spacing.md}px` }}>
        <Card>
          <CardContent>
            <Spinner size={32} />
            <p style={{ margin: 0, textAlign: 'center', color: colors.textSecondary }}>
              Carregando detalhes da vaga e da empresa...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div style={{ maxWidth: 720, margin: '48px auto', padding: `0 ${spacing.md}px` }}>
        <Card>
          <CardContent>
            <EmptyState
              icon="⚠️"
              title="Não foi possível carregar a vaga"
              description={error || 'Vaga não encontrada.'}
              action={(
                <Button type="button" variant="outline" onClick={retryLoadVacancy}>
                  Tentar novamente
                </Button>
              )}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ 
      maxWidth: 960, 
      margin: '0 auto', 
      padding: `${spacing.xxl}px ${spacing.md}px`, 
      display: 'grid', 
      gap: spacing.xl 
    }}>
      {/* Hero Section */}
      <section style={{ 
        textAlign: 'center', 
        paddingBottom: spacing.xxl,
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: spacing.md
      }}>
        {vacancy.organization.logoUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.lg }}>
            <img
              src={vacancy.organization.logoUrl}
              alt={`Logo de ${vacancy.organization.name}`}
              style={{ 
                width: 100, 
                height: 100, 
                objectFit: 'contain', 
                borderRadius: radius.xl, 
                background: colors.surface, 
                padding: spacing.md, 
                boxShadow: shadows.lg,
                border: `1px solid ${colors.border}`
              }}
            />
          </div>
        )}
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: fontWeight.black, 
          color: primaryColor, 
          margin: 0, 
          letterSpacing: '-0.05em',
          lineHeight: 1.1
        }}>
          {vacancy.title}
        </h1>
        <p style={{ 
          fontSize: fontSize.xl, 
          color: colors.textSecondary, 
          marginTop: spacing.sm, 
          fontWeight: fontWeight.medium 
        }}>
          {vacancy.organization.name}
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing.xl, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: spacing.xl }}>
          <Card className="glass-panel" style={{ border: 'none' }}>
            <CardHeader>
              <CardTitle>Sobre a Oportunidade</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ 
                margin: 0, 
                fontSize: fontSize.md, 
                lineHeight: 1.8, 
                color: colors.textSecondary,
                whiteSpace: 'pre-wrap'
              }}>
                {vacancy.description}
              </p>
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: spacing.md, background: colors.surfaceAlt, padding: spacing.lg, borderRadius: radius.lg, border: `1px solid ${colors.border}` }}>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Localização</strong><div style={{ fontWeight: fontWeight.bold }}>{vacancy.location || 'A combinar'}</div></div>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Modalidade</strong><div style={{ fontWeight: fontWeight.bold }}>{vacancy.workModel || 'A combinar'}</div></div>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Senioridade</strong><div style={{ fontWeight: fontWeight.bold }}>{vacancy.seniority || 'A combinar'}</div></div>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Setor</strong><div style={{ fontWeight: fontWeight.bold }}>{vacancy.sector || 'A combinar'}</div></div>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Contratação</strong><div style={{ fontWeight: fontWeight.bold }}>{vacancy.employmentType || 'A combinar'}</div></div>
            <div><strong style={{ fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase' }}>Salário</strong><div style={{ fontWeight: fontWeight.bold }}>{salaryLabel}</div></div>
          </div>

          <Card className="glass-panel" style={{ border: 'none' }}>
            <CardHeader><CardTitle>Skills & Requisitos</CardTitle></CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.lg }}>
              <div>
                <strong style={{ display: 'block', marginBottom: spacing.sm, fontSize: fontSize.sm }}>Requisitos Obrigatórios</strong>
                <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                  {vacancy.requiredSkills.length > 0 ? vacancy.requiredSkills.map((skill) => (
                    <span key={skill} style={{ padding: `${spacing.xs}px ${spacing.md}px`, borderRadius: radius.full, background: colors.primary, color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                      {skill}
                    </span>
                  )) : <span style={{ color: colors.textMuted }}>Nenhuma informada</span>}
                </div>
              </div>

              {vacancy.desiredSkills.length > 0 && (
                <div>
                  <strong style={{ display: 'block', marginBottom: spacing.sm, fontSize: fontSize.sm }}>Desejáveis / Diferenciais</strong>
                  <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {vacancy.desiredSkills.map((skill) => (
                      <span key={skill} style={{ padding: `${spacing.xs}px ${spacing.md}px`, borderRadius: radius.full, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, fontSize: fontSize.sm, color: colors.text }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Apply Form */}
        <div style={{ position: 'sticky', top: 32, display: 'grid', gap: spacing.xl }}>
          <Card className="glass-panel" style={{ border: `1px solid ${primaryColor}44`, borderTop: `4px solid ${primaryColor}` }}>
            <CardHeader>
              <CardTitle level={2} style={{ fontSize: fontSize.xl }}>Candidatar-se</CardTitle>
              <CardDescription>Inicie seu processo seletivo agora.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { void handleSelfApply(e); }} style={{ display: 'grid', gap: spacing.md }}>
                <Input
                  label="Nome completo"
                  value={applyName}
                  onChange={(e) => setApplyName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
                <Input
                  label="Telefone"
                  value={applyPhone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="(XX) XXXXX-XXXX"
                  error={phoneError || undefined}
                />
                {applyMsg && <InlineMessage variant={applyVariant}>{applyMsg}</InlineMessage>}
                <Button type="submit" size="lg" loading={applying} fullWidth style={{ marginTop: spacing.sm }}>
                  {applying ? 'Processando...' : 'Candidatar-se à Vaga'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <details style={{ borderRadius: radius.md, border: `1px solid ${colors.border}`, background: 'rgba(255,255,255,0.02)' }}>
            <summary style={{ padding: `${spacing.md}px`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: fontSize.xs, color: colors.textMuted }}>
              <span>Já tem um código?</span>
              <span>▾</span>
            </summary>
            <div style={{ padding: spacing.md, borderTop: `1px solid ${colors.borderLight}` }}>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Insira o código"
              />
              <Button size="sm" variant="ghost" fullWidth onClick={continueToPortal} style={{ marginTop: spacing.sm }}>Acessar</Button>
            </div>
          </details>

          {vacancy.organization.contactEmail && (
            <div style={{ textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted }}>
              Dúvidas? <a href={`mailto:${vacancy.organization.contactEmail}`} style={{ color: primaryColor, textDecoration: 'none', fontWeight: fontWeight.bold }}>{vacancy.organization.contactEmail}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
