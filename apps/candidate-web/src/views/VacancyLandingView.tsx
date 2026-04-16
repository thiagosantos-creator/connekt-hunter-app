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
    <div style={{ maxWidth: 860, margin: '32px auto', padding: `0 ${spacing.md}px`, display: 'grid', gap: spacing.md }}>
      <Card variant="elevated" style={{ overflow: 'hidden' }}>
        {vacancy.organization.bannerUrl && (
          <img
            src={vacancy.organization.bannerUrl}
            alt={`Banner de ${vacancy.organization.name}`}
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', background: secondaryColor }}
          />
        )}
        <CardHeader style={{ background: secondaryColor }}>
          {vacancy.organization.logoUrl && (
            <img
              src={vacancy.organization.logoUrl}
              alt={`Logo de ${vacancy.organization.name}`}
              style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: radius.md, background: colors.surface, padding: spacing.sm, marginBottom: spacing.sm }}
            />
          )}
          <CardTitle style={{ color: primaryColor }}>{vacancy.title}</CardTitle>
          <CardDescription>{vacancy.organization.name}</CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'grid', gap: spacing.md }}>
          <p style={{ margin: 0 }}>{vacancy.description}</p>

          <div style={{ display: 'grid', gap: spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div><strong>Localização</strong><div>{vacancy.location || 'A combinar'}</div></div>
            <div><strong>Modalidade</strong><div>{vacancy.workModel || 'A combinar'}</div></div>
            <div><strong>Senioridade</strong><div>{vacancy.seniority || 'A combinar'}</div></div>
            <div><strong>Setor</strong><div>{vacancy.sector || 'A combinar'}</div></div>
            <div><strong>Contratação</strong><div>{vacancy.employmentType || 'A combinar'}</div></div>
            <div><strong>Faixa salarial</strong><div>{salaryLabel}</div></div>
          </div>

          <div>
            <strong>Skills obrigatórias</strong>
            <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
              {vacancy.requiredSkills.length > 0 ? vacancy.requiredSkills.map((skill) => (
                <span key={skill} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.primaryLight, color: colors.textInverse, fontSize: fontSize.sm }}>
                  {skill}
                </span>
              )) : <span>Nenhuma informada</span>}
            </div>
          </div>

          {vacancy.desiredSkills.length > 0 && (
            <div>
              <strong>Skills desejáveis</strong>
              <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
                {vacancy.desiredSkills.map((skill) => (
                  <span key={skill} style={{ padding: `${spacing.xs}px ${spacing.sm}px`, borderRadius: radius.full, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, fontSize: fontSize.sm }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Card variant="outlined" style={{ borderColor: primaryColor, borderWidth: 2 }}>
            <CardHeader>
              <CardTitle level={2}>Candidatar-se a esta vaga</CardTitle>
              <CardDescription>Preencha seus dados para iniciar a candidatura. Seu currículo será solicitado na próxima etapa.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { void handleSelfApply(e); }} style={{ display: 'grid', gap: spacing.sm }}>
                <Input
                  label="Nome completo"
                  value={applyName}
                  onChange={(e) => setApplyName(e.target.value)}
                  placeholder="Seu nome completo"
                  hint="Use o mesmo nome que deseja ver no processo seletivo."
                  autoComplete="name"
                  required
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={applyEmail}
                  onChange={(e) => setApplyEmail(e.target.value)}
                  placeholder="seu@email.com"
                  hint="Enviaremos atualizações e acesso da candidatura para este e-mail."
                  autoComplete="email"
                  required
                />
                <Input
                  label="Telefone"
                  value={applyPhone}
                  onChange={(e) => { setApplyPhone(e.target.value); setPhoneError(''); }}
                  onBlur={() => validatePhone(applyPhone)}
                  placeholder="+55 11 99999-0000"
                  hint="Opcional. Ajuda a acelerar o contato do recrutamento."
                  autoComplete="tel"
                  error={phoneError || undefined}
                />
                {applyMsg && <InlineMessage variant={applyVariant}>{applyMsg}</InlineMessage>}
                <Button type="submit" loading={applying}>
                  {applying ? 'Enviando...' : 'Candidatar-se'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Collapsible section for candidates who already received an invite */}
          <details style={{ borderRadius: radius.md, border: `1px solid ${colors.border}` }}>
            <summary style={{
              padding: `${spacing.md}px ${spacing.lg}px`,
              cursor: 'pointer',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: colors.textSecondary,
              userSelect: 'none',
            }}>
              <span>🔑 Já possui um convite ou código de acesso?</span>
              <span style={{ fontSize: fontSize.xs }}>▾</span>
            </summary>
            <div style={{ padding: `0 ${spacing.lg}px ${spacing.lg}px`, borderTop: `1px solid ${colors.borderLight}` }}>
              <p style={{ margin: `${spacing.md}px 0`, fontSize: fontSize.sm, color: colors.textSecondary }}>
                Se você recebeu um código de acesso por e-mail ou SMS do recrutador, cole-o abaixo para continuar direto para o onboarding.
              </p>
              <div style={{ display: 'grid', gap: spacing.sm }}>
                <Input
                  label="Código de acesso"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Cole aqui o código recebido"
                  hint="O código é longo — copie e cole diretamente para evitar erros."
                />
                <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button type="button" variant="outline" onClick={continueToPortal}>Continuar com este código</Button>
                  <Button type="button" variant="ghost" onClick={() => navigate('/')}>Ir para portal do candidato</Button>
                </div>
              </div>
            </div>
          </details>

          {vacancy.organization.contactEmail && (
            <p style={{ margin: 0, color: colors.textSecondary }}>
              Dúvidas sobre esta vaga: {vacancy.organization.contactEmail}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
