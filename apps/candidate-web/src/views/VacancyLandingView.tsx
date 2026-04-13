import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import type { PublicVacancyInfo } from '../services/types.js';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  InlineMessage,
  Input,
  spacing,
  colors,
  radius,
  fontSize,
} from '@connekt/ui';

export function VacancyLandingView() {
  const navigate = useNavigate();
  const { vacancyId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [vacancy, setVacancy] = useState<PublicVacancyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(searchParams.get('token') ?? '');

  useEffect(() => {
    if (!vacancyId) return;
    setLoading(true);
    void apiGet<PublicVacancyInfo>(`/public/vacancies/${encodeURIComponent(vacancyId)}`)
      .then((data) => {
        setVacancy(data);
        setError('');
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [vacancyId]);

  const primaryColor = vacancy?.organization.primaryColor || colors.primary;
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

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando vaga...</div>;
  }

  if (error || !vacancy) {
    return (
      <div style={{ maxWidth: 720, margin: '48px auto', padding: `0 ${spacing.md}px` }}>
        <InlineMessage variant="error">{error || 'Vaga não encontrada.'}</InlineMessage>
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

          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Entrar na vaga</CardTitle>
              <CardDescription>Se você recebeu um convite, use o código para seguir direto para o onboarding.</CardDescription>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.sm }}>
              <Input
                label="Código de acesso"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole aqui o token recebido"
              />
              <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button type="button" onClick={continueToPortal}>Continuar candidatura</Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/')}>Ir para portal do candidato</Button>
              </div>
            </CardContent>
          </Card>

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
