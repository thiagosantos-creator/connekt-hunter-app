import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getToken } from '../services/api.js';
import type { CandidateInfo } from '../services/types.js';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, InlineMessage, Input, colors, fontSize, spacing, radius } from '@connekt/ui';

interface StatusStep {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
}

interface CandidateStatus {
  candidateId: string;
  fullName: string | null;
  email: string;
  vacancy: { id: string; title: string } | null;
  onboardingStatus: string;
  steps: StatusStep[];
  interview: { id: string; status: string } | null;
  decision: { decision: string; at: string } | null;
}

interface ParsedResumeData {
  status: string;
  parsedData: {
    summary?: string;
    experience?: Array<{ company?: string; role?: string; period?: string }>;
    education?: Array<{ institution?: string; degree?: string; period?: string }>;
    skills?: Array<{ name?: string } | string>;
    languages?: Array<{ name?: string; level?: string } | string>;
  } | null;
}

export function StatusView() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('candidate_info');
  const info: Partial<CandidateInfo> = raw ? (JSON.parse(raw) as Partial<CandidateInfo>) : {};
  const [email, setEmail] = useState(info.email ?? '');
  const [fullName, setFullName] = useState(info.profile?.fullName ?? '');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [interviewToken, setInterviewToken] = useState('');
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null);

  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void apiGet<CandidateStatus>(`/candidate/onboarding/status/${encodeURIComponent(token)}`)
      .then(setCandidateStatus)
      .catch((err) => setStatusError(`Não foi possível carregar o status: ${String(err)}`));
    void apiGet<ParsedResumeData>(`/candidate/onboarding/parsed-resume/${encodeURIComponent(token)}`)
      .then(setParsedResume)
      .catch(() => undefined); // resume parsing is optional, silent fail is acceptable
  }, []);

  const upgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgrading(true);
    setUpgradeMsg('');
    try {
      await apiPost('/auth/guest-upgrade', { token: getToken(), email, fullName });
      setUpgradeMsg('Conta criada com sucesso. Você poderá usar login completo em breve.');
    } catch (err) {
      setUpgradeMsg(`Falha no upgrade: ${String(err)}`);
    } finally {
      setUpgrading(false);
    }
  };

  const goToInterview = () => {
    if (!interviewToken.trim()) return;
    localStorage.setItem('si_public_token', interviewToken.trim());
    navigate('/interview');
  };

  const decisionLabel: Record<string, string> = {
    approve: '✅ Aprovado',
    reject: '❌ Não selecionado',
    interview: '📋 Convidado para entrevista',
    hold: '⏳ Em espera',
  };

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: `0 ${spacing.md}px` }}>
      <Card variant="elevated" style={{ textAlign: 'center' }}>
        <CardContent>
          <h2 style={{ margin: `0 0 ${spacing.sm}px`, color: colors.text }}>Candidatura enviada</h2>
          {statusError && (
            <InlineMessage variant="error">{statusError}</InlineMessage>
          )}
          <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            Olá <strong>{candidateStatus?.fullName ?? info.profile?.fullName ?? info.email ?? 'Candidato'}</strong>,
          </p>
          {candidateStatus?.vacancy && (
            <p style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
              Vaga: <strong>{candidateStatus.vacancy.title}</strong>
            </p>
          )}
          {candidateStatus?.decision && (
            <InlineMessage variant={candidateStatus.decision.decision === 'approve' ? 'success' : candidateStatus.decision.decision === 'reject' ? 'error' : 'info'}>
              {decisionLabel[candidateStatus.decision.decision] ?? candidateStatus.decision.decision}
            </InlineMessage>
          )}
        </CardContent>
      </Card>

      {candidateStatus?.steps && (
        <Card style={{ marginTop: spacing.md }}>
          <CardHeader>
            <CardTitle>Progresso da candidatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: spacing.xs }}>
              {candidateStatus.steps.map((step) => (
                <div key={step.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  borderRadius: radius.sm,
                  background: step.current ? colors.infoLight : step.completed ? colors.successLight : 'transparent',
                }}>
                  <span style={{ fontSize: fontSize.lg }}>
                    {step.completed ? '✅' : step.current ? '🔵' : '⬜'}
                  </span>
                  <span style={{
                    color: step.completed ? colors.success : step.current ? colors.info : colors.textSecondary,
                    fontWeight: step.current ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {parsedResume?.parsedData && (
        <Card style={{ marginTop: spacing.md }}>
          <CardHeader>
            <CardTitle>Dados extraídos do currículo</CardTitle>
            <CardDescription>Confira se as informações abaixo estão corretas.</CardDescription>
          </CardHeader>
          <CardContent style={{ textAlign: 'left' }}>
            {parsedResume.parsedData.summary && (
              <div style={{ marginBottom: spacing.sm }}>
                <strong>Resumo</strong>
                <p style={{ margin: `${spacing.xs}px 0 0`, color: colors.textSecondary }}>{parsedResume.parsedData.summary}</p>
              </div>
            )}
            {parsedResume.parsedData.experience?.length ? (
              <div style={{ marginBottom: spacing.sm }}>
                <strong>Experiência</strong>
                {parsedResume.parsedData.experience.map((exp, i) => (
                  <div key={i} style={{ padding: `${spacing.xs}px 0`, borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ fontWeight: 500 }}>{exp.role ?? 'Cargo'}</span>
                    {exp.company && <span> — {exp.company}</span>}
                    {exp.period && <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}> ({exp.period})</span>}
                  </div>
                ))}
              </div>
            ) : null}
            {parsedResume.parsedData.education?.length ? (
              <div style={{ marginBottom: spacing.sm }}>
                <strong>Formação</strong>
                {parsedResume.parsedData.education.map((edu, i) => (
                  <div key={i} style={{ padding: `${spacing.xs}px 0`, borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ fontWeight: 500 }}>{edu.degree ?? 'Curso'}</span>
                    {edu.institution && <span> — {edu.institution}</span>}
                    {edu.period && <span style={{ color: colors.textSecondary, fontSize: fontSize.sm }}> ({edu.period})</span>}
                  </div>
                ))}
              </div>
            ) : null}
            {parsedResume?.parsedData?.skills && parsedResume.parsedData.skills.length > 0 && (
              <div>
                <strong>Habilidades</strong>
                <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
                  {parsedResume.parsedData.skills.map((skill, i) => (
                    <span key={i} style={{
                      padding: `${spacing.xs}px ${spacing.sm}px`,
                      borderRadius: radius.full,
                      background: colors.primaryLight,
                      color: colors.textInverse,
                      fontSize: fontSize.sm,
                    }}>
                      {typeof skill === 'string' ? skill : skill.name ?? ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader>
          <CardTitle>Entrevista inteligente</CardTitle>
          <CardDescription>Se recebeu um código de entrevista, insira abaixo para iniciar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Código da entrevista"
                value={interviewToken}
                onChange={(e) => setInterviewToken(e.target.value)}
              />
            </div>
            <Button variant="primary" onClick={goToInterview} disabled={!interviewToken.trim()}>
              Iniciar entrevista
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <CardHeader>
          <CardTitle>Opcional: criar conta</CardTitle>
          <CardDescription>Faça upgrade de convidado para uma conta registrada.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { void upgradeAccount(e); }}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            {upgradeMsg && (
              <InlineMessage variant={upgradeMsg.startsWith('Falha') ? 'error' : 'success'}>
                {upgradeMsg}
              </InlineMessage>
            )}
            <Button type="submit" loading={upgrading} variant="outline">
              {upgrading ? 'Criando...' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div style={{ textAlign: 'center', marginTop: spacing.lg }}>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm('Tem certeza? Todos os dados da candidatura atual serão removidos.')) {
              localStorage.clear();
              navigate('/');
            }
          }}
        >
          Iniciar nova candidatura
        </Button>
      </div>
    </div>
  );
}
