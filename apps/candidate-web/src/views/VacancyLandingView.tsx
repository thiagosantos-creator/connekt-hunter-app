import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../services/api.js';
import { extractErrorMessage } from '../services/error-messages.js';
import type { PublicVacancyInfo } from '../services/types.js';
import {
  Button,
  Card,
  CardContent,
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
  shadows,
} from '@connekt/ui';

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

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
    if (!phone.trim()) return true;
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: colors.background }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Spinner size={48} color={colors.primary} />
          <p style={{ marginTop: spacing.md, color: colors.textSecondary, fontWeight: fontWeight.medium }}>
            Preparando experiência...
          </p>
        </div>
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div style={{ maxWidth: 720, margin: '64px auto', padding: `0 ${spacing.md}px` }}>
        <Card style={{ borderRadius: radius.xl, overflow: 'hidden', boxShadow: shadows.xl }}>
          <CardContent style={{ padding: spacing.xl }}>
            <EmptyState
              icon="🔍"
              title="Vaga Indisponível"
              description={error || 'A vaga que você está procurando foi encerrada ou não existe.'}
              action={
                <Button type="button" variant="outline" size="lg" onClick={retryLoadVacancy}>
                  Tentar novamente
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', paddingBottom: spacing.xxl * 2 }}>
      {/* Dynamic Background */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '45vh',
        background: `linear-gradient(135deg, ${primaryColor}22 0%, ${secondaryColor}11 100%)`,
        zIndex: -2,
      }} />
      <div style={{
        position: 'absolute',
        top: -100, left: '50%',
        width: '60vw', height: '60vw',
        background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 60%)`,
        transform: 'translateX(-50%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: `${spacing.xl}px ${spacing.md}px`,
        display: 'grid',
        gap: spacing.xl
      }}>
        {/* Premium Hero Section */}
        <section style={{
          textAlign: 'center',
          paddingTop: spacing.xxl,
          paddingBottom: spacing.lg,
        }}>
          {vacancy.organization.logoUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.xl }}>
              <div style={{
                background: colors.surface,
                padding: spacing.md,
                borderRadius: radius.xl,
                boxShadow: shadows.lg,
                border: "1px solid rgba(255,255,255,0.8)",
                display: 'inline-flex'
              }}>
                <img
                  src={vacancy.organization.logoUrl}
                  alt={`Logo de ${vacancy.organization.name}`}
                  style={{ width: 90, height: 90, objectFit: 'contain' }}
                />
              </div>
            </div>
          )}
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: colors.text,
            margin: 0,
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
            textShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            {vacancy.title}
          </h1>
          <p style={{
            fontSize: fontSize.xl,
            color: primaryColor,
            marginTop: spacing.sm,
            fontWeight: fontWeight.bold,
            letterSpacing: '-0.3px'
          }}>
            {vacancy.organization.name}
          </p>
        </section>

        {/* Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 4fr)', gap: spacing.xxl, alignItems: 'start' }}>
          
          {/* Main Details */}
          <div style={{ display: 'grid', gap: spacing.xl }}>
            {/* Context Badges (Premium Grid) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: spacing.md,
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              padding: spacing.xl,
              borderRadius: radius.xl,
              boxShadow: shadows.sm,
              border: "1px solid rgba(255, 255, 255, 0.8)"
            }}>
              <div><span style={{ display: 'block', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Local</span><div style={{ fontWeight: 700, color: colors.text }}>{vacancy.location || 'Brasil'}</div></div>
              <div><span style={{ display: 'block', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Modelo</span><div style={{ fontWeight: 700, color: colors.text }}>{vacancy.workModel || 'Híbrido'}</div></div>
              <div><span style={{ display: 'block', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Nível</span><div style={{ fontWeight: 700, color: colors.text }}>{vacancy.seniority || 'Oportunidade'}</div></div>
              <div><span style={{ display: 'block', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Contrato</span><div style={{ fontWeight: 700, color: colors.text }}>{vacancy.employmentType || 'A combinar'}</div></div>
            </div>

            {/* Description Glass Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: radius.xl,
              padding: spacing.xxl,
              boxShadow: shadows.md,
              border: "1px solid rgba(255, 255, 255, 0.7)"
            }}>
              <h2 style={{ fontSize: fontSize.xl2, fontWeight: 800, margin: `0 0 ${spacing.lg}px 0`, color: colors.text }}>
                Por dentro da oportunidade
              </h2>
              <div style={{
                fontSize: fontSize.md,
                lineHeight: 1.8,
                color: colors.textSecondary,
                whiteSpace: 'pre-wrap'
              }}>
                {vacancy.description}
              </div>
            </div>

            {/* Skills & Requirements Section */}
            {(vacancy.requiredSkills.length > 0 || vacancy.desiredSkills.length > 0) && (
              <div style={{ display: 'grid', gap: spacing.lg, padding: spacing.xxl, background: colors.surface, borderRadius: radius.xl, boxShadow: shadows.md, border: `1px solid ${colors.borderLight}` }}>
                <h2 style={{ fontSize: fontSize.xl2, fontWeight: 800, margin: 0, color: colors.text }}>
                  O que esperamos de você
                </h2>
                
                {vacancy.requiredSkills.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: fontSize.sm, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: colors.textTertiary, marginBottom: spacing.md }}>
                      Competências Essenciais
                    </h3>
                    <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                      {vacancy.requiredSkills.map((skill) => (
                        <div key={skill} style={{
                          padding: `${spacing.sm}px ${spacing.lg}px`,
                          borderRadius: radius.full,
                          background: `${primaryColor}15`,
                          color: primaryColor,
                          fontWeight: 700,
                          fontSize: fontSize.sm,
                          boxShadow: `inset 0 0 0 1px ${primaryColor}25`
                        }}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vacancy.desiredSkills.length > 0 && (
                  <div style={{ marginTop: spacing.md }}>
                    <h3 style={{ fontSize: fontSize.sm, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: colors.textTertiary, marginBottom: spacing.md }}>
                      Desejáveis & Diferenciais
                    </h3>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {vacancy.desiredSkills.map((skill) => (
                        <div key={skill} style={{
                          padding: `${spacing.xs}px ${spacing.md}px`,
                          borderRadius: radius.full,
                          background: colors.surfaceAlt,
                          color: colors.textSecondary,
                          fontWeight: 600,
                          fontSize: fontSize.sm,
                          border: `1px solid ${colors.border}`
                        }}>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Sidebar: Apply Form */}
          <div style={{ position: 'sticky', top: 88, display: 'grid', gap: spacing.lg }}>
            <div style={{
              background: colors.surface,
              borderRadius: radius.xl,
              padding: spacing.xl,
              boxShadow: shadows.xl,
              border: `1px solid ${colors.borderLight}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Accent Line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
              
              <div style={{ marginBottom: spacing.lg, marginTop: spacing.sm }}>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                  Acelere sua carreira
                </h3>
                <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, margin: `${spacing.sm}px 0 0 0` }}>
                  Preencha seus dados para iniciar o processo seletivo oficial.
                </p>
              </div>

              <form onSubmit={(e) => { void handleSelfApply(e); }} style={{ display: 'grid', gap: spacing.md }}>
                <Input
                  label="Nome completo"
                  value={applyName}
                  onChange={(e) => setApplyName(e.target.value)}
                  placeholder="Ex: Ana Silva"
                  required
                />
                <Input
                  label="E-mail profissional"
                  type="email"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
                <Input
                  label="WhatsApp / Telefone"
                  value={applyPhone}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  placeholder="(XX) XXXXX-XXXX"
                  error={phoneError || undefined}
                />
                
                {applyMsg && (
                  <div style={{ marginTop: spacing.xs }}>
                    <InlineMessage variant={applyVariant}>{applyMsg}</InlineMessage>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  size="xl" 
                  loading={applying} 
                  style={{ 
                    marginTop: spacing.md, 
                    fontWeight: 800, 
                    letterSpacing: '0.5px',
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    border: 'none',
                    boxShadow: `0 8px 20px ${primaryColor}40`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  {applying ? 'Processando...' : 'INICIAR INSCRIÇÃO'}
                </Button>
                
                <div style={{ textAlign: 'center', fontSize: 11, color: colors.textTertiary, marginTop: spacing.sm }}>
                  Sua candidatura entrará diretamente na base de talentos.
                </div>
              </form>
            </div>

            {/* Resume Token Access */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              borderRadius: radius.xl,
              padding: spacing.lg,
              border: "1px solid rgba(255,255,255,0.7)"
            }}>
              <p style={{ fontSize: fontSize.sm, fontWeight: 600, color: colors.textSecondary, margin: `0 0 ${spacing.sm}px 0` }}>
                Já iniciou sua candidatura?
              </p>
              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Código de acesso"
                  style={{ flex: 1 }}
                />
                <Button variant="outline" onClick={continueToPortal} style={{ background: colors.surface }}>Continuar</Button>
              </div>
            </div>

            {vacancy.organization.contactEmail && (
              <div style={{ textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted }}>
                Dúvidas sobre a vaga? <a href={`mailto:${vacancy.organization.contactEmail}`} style={{ color: primaryColor, textDecoration: 'none', fontWeight: fontWeight.bold }}>{vacancy.organization.contactEmail}</a>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
