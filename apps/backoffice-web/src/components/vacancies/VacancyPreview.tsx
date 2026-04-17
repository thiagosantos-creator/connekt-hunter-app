import React, { useMemo } from 'react';
import type { Vacancy, Organization } from '../../services/types.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  spacing,
  colors,
  radius,
  fontSize,
  fontWeight,
  Button,
} from '@connekt/ui';

interface VacancyPreviewProps {
  vacancy: Vacancy;
  organization?: Organization;
  onClose: () => void;
}

export function VacancyPreview({ vacancy, organization, onClose }: VacancyPreviewProps) {
  const primaryColor = organization?.tenantSettings?.primaryColor || colors.primary;
  const secondaryColor = organization?.tenantSettings?.secondaryColor || colors.surfaceAlt;

  const salaryLabel = useMemo(() => {
    if (!vacancy.salaryMin && !vacancy.salaryMax) return 'A combinar';
    const min = vacancy.salaryMin ? `R$ ${vacancy.salaryMin.toLocaleString('pt-BR')}` : '-';
    const max = vacancy.salaryMax ? `R$ ${vacancy.salaryMax.toLocaleString('pt-BR')}` : '-';
    return `${min} até ${max}`;
  }, [vacancy]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: spacing.md,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 860,
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        position: 'relative'
      }}>
        <div style={{ position: 'sticky', top: spacing.md, right: spacing.md, display: 'flex', justifyContent: 'flex-end', zIndex: 10, paddingRight: spacing.md }}>
           <Button variant="outline" size="sm" onClick={onClose} style={{ backgroundColor: colors.surface }}>✖ Fechar Preview</Button>
        </div>

        <Card variant="elevated" style={{ border: 'none', borderRadius: 0 }}>
          {organization?.tenantSettings?.bannerUrl && (
            <img
              src={organization.tenantSettings.bannerUrl}
              alt="Banner"
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', background: secondaryColor }}
            />
          )}
          
          <CardHeader style={{ background: secondaryColor, paddingTop: organization?.tenantSettings?.bannerUrl ? spacing.md : spacing.xl }}>
            <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'flex-end' }}>
              {organization?.tenantSettings?.logoUrl && (
                <img
                  src={organization.tenantSettings.logoUrl}
                  alt="Logo"
                  style={{ 
                    width: 80, 
                    height: 80, 
                    objectFit: 'contain', 
                    borderRadius: radius.md, 
                    background: colors.surface, 
                    padding: spacing.sm, 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    marginTop: organization?.tenantSettings?.bannerUrl ? -60 : 0
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <CardTitle style={{ color: primaryColor, fontSize: fontSize.xl2 }}>{vacancy.title}</CardTitle>
                <CardDescription style={{ fontSize: fontSize.lg }}>{organization?.name || 'Sua Empresa'}</CardDescription>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.lg }}>
               <Badge variant="info">{vacancy.seniority}</Badge>
               <Badge variant="info">{vacancy.workModel}</Badge>
               <Badge variant="info">{vacancy.location || 'Brasil'}</Badge>
               <Badge variant="outline">{vacancy.employmentType?.toUpperCase()}</Badge>
            </div>
          </CardHeader>

          <CardContent style={{ display: 'grid', gap: spacing.xl, padding: spacing.xl }}>
            <div>
              <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm, borderBottom: `2px solid ${primaryColor}22`, paddingBottom: spacing.xs }}>
                Sobre a Vaga
              </h3>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: colors.textSecondary }}>
                {vacancy.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing.xl }}>
              <div>
                <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm }}>
                  Requisitos Obrigatórios
                </h3>
                <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                  {vacancy.requiredSkills && vacancy.requiredSkills.length > 0 ? vacancy.requiredSkills.map((skill: string) => (
                    <span key={skill} style={{ 
                      padding: `${spacing.xs}px ${spacing.sm}px`, 
                      borderRadius: radius.full, 
                      background: `${primaryColor}11`, 
                      color: primaryColor, 
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                      border: `1px solid ${primaryColor}33`
                    }}>
                      {skill}
                    </span>
                  )) : <span style={{ color: colors.textTertiary }}>Não informados</span>}
                </div>
              </div>

              {vacancy.desiredSkills && vacancy.desiredSkills.length > 0 && (
                <div>
                  <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm }}>
                    Desejáveis / Diferenciais
                  </h3>
                  <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                    {vacancy.desiredSkills.map((skill: string) => (
                      <span key={skill} style={{ 
                        padding: `${spacing.xs}px ${spacing.sm}px`, 
                        borderRadius: radius.full, 
                        background: colors.surfaceAlt, 
                        color: colors.textSecondary, 
                        border: `1px solid ${colors.border}`, 
                        fontSize: fontSize.sm 
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Card variant="outlined" style={{ background: colors.surfaceAlt, borderStyle: 'dashed' }}>
              <CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: fontSize.xs, textTransform: 'uppercase', color: colors.textTertiary }}>Salário</strong>
                  <span style={{ fontWeight: fontWeight.bold, color: colors.textPrimary }}>{salaryLabel}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: fontSize.xs, textTransform: 'uppercase', color: colors.textTertiary }}>Setor</strong>
                  <span style={{ color: colors.textPrimary }}>{vacancy.sector || vacancy.department || 'Recrutamento'}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: fontSize.xs, textTransform: 'uppercase', color: colors.textTertiary }}>Publicação</strong>
                  <span style={{ color: colors.textPrimary }}>
                    {vacancy.publishedAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(vacancy.publishedAt)) : 'Em breve'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div style={{ textAlign: 'center', padding: spacing.lg, borderTop: `1px solid ${colors.borderLight}` }}>
              <p style={{ color: colors.textTertiary, fontSize: fontSize.sm }}>
                Este é um preview da vaga. Candidatos visualizarão um formulário de inscrição abaixo deste conteúdo.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
