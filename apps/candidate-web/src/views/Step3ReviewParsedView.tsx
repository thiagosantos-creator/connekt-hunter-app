import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, getToken } from '../services/api.js';
import { StepIndicator } from '../components/layout/StepIndicator.js';
import { 
  Button, Card, CardContent, Input, Textarea, InlineMessage, 
  colors, spacing, fontSize, radius, fontWeight 
} from '@connekt/ui';
import type { ParsedResumeData } from '../services/types.js';

export function Step3ReviewParsedView() {
  const navigate = useNavigate();
  const [data, setData] = useState<ParsedResumeData['parsedData'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParsed = async () => {
      try {
        const res = await apiGet<ParsedResumeData>(`/candidate/onboarding/parsed-resume/${getToken()}`);
        setData(res.parsedData);
      } catch (err) {
        setError('Não foi possível carregar os dados do currículo.');
      } finally {
        setLoading(false);
      }
    };
    void fetchParsed();
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    try {
      await apiPost('/candidate/onboarding/profile/sync', {
        token: getToken(),
        data,
      });
      navigate('/onboarding/preferences');
    } catch (err) {
      setError('Erro ao salvar informações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const removeItem = (listKey: 'experience' | 'education' | 'skills' | 'languages', index: number) => {
    setData(prev => {
      if (!prev) return null;
      const list = [...(prev[listKey] || [])];
      list.splice(index, 1);
      return { ...prev, [listKey]: list };
    });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center' }}>
        <p style={{ color: colors.textSecondary }}>Analisando seu currículo com IA...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: `0 ${spacing.md}px` }}>
      <StepIndicator current={3} />
      
      <div style={{ marginBottom: spacing.xl }}>
        <h2 style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs }}>
          Confirme seus dados
        </h2>
        <p style={{ color: colors.textSecondary }}>
          Extraímos as informações do seu currículo. Verifique se tudo está correto para garantir o melhor match com as vagas.
        </p>
      </div>

      <Card style={{ marginBottom: spacing.lg }}>
        <CardContent>
          <h3 style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.md }}>Dados Pessoais</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
            <Input 
              label="Nome Completo" 
              value={data?.fullName || ''} 
              onChange={e => updateField('fullName', e.target.value)} 
            />
            <Input 
              label="Telefone" 
              value={data?.phone || ''} 
              onChange={e => updateField('phone', e.target.value)} 
            />
          </div>
          <Textarea 
            label="Resumo Profissional" 
            value={data?.summary || ''} 
            onChange={e => updateField('summary', e.target.value)}
          />
        </CardContent>
      </Card>

      <section style={{ marginBottom: spacing.xl }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>Experiência Profissional</h3>
        </div>
        {(data?.experience || []).length === 0 && (
          <p style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Nenhuma experiência detectada.</p>
        )}
        {(data?.experience || []).map((exp: any, i: number) => (
          <Card key={i} style={{ marginBottom: spacing.sm, position: 'relative' }}>
            <CardContent style={{ padding: spacing.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Input 
                  label="Empresa" 
                  value={exp.company || ''} 
                  onChange={e => {
                    const list = [...(data?.experience || [])];
                    list[i] = { ...exp, company: e.target.value };
                    updateField('experience', list);
                  }} 
                />
                <Input 
                  label="Cargo" 
                  value={exp.role || ''} 
                  onChange={e => {
                    const list = [...(data?.experience || [])];
                    list[i] = { ...exp, role: e.target.value };
                    updateField('experience', list);
                  }} 
                />
              </div>
              <Input 
                label="Período" 
                value={exp.period || ''} 
                onChange={e => {
                  const list = [...(data?.experience || [])];
                  list[i] = { ...exp, period: e.target.value };
                  updateField('experience', list);
                }} 
              />
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => removeItem('experience', i)}
                style={{ position: 'absolute', top: spacing.md, right: spacing.md }}
              >
                Remover
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section style={{ marginBottom: spacing.xl }}>
        <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md }}>Formação Acadêmica</h3>
        {(data?.education || []).map((edu: any, i: number) => (
          <Card key={i} style={{ marginBottom: spacing.sm, position: 'relative' }}>
            <CardContent style={{ padding: spacing.md }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Input 
                  label="Instituição" 
                  value={edu.institution || ''} 
                  onChange={e => {
                    const list = [...(data?.education || [])];
                    list[i] = { ...edu, institution: e.target.value };
                    updateField('education', list);
                  }} 
                />
                <Input 
                  label="Curso / Grau" 
                  value={edu.degree || ''} 
                  onChange={e => {
                    const list = [...(data?.education || [])];
                    list[i] = { ...edu, degree: e.target.value };
                    updateField('education', list);
                  }} 
                />
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => removeItem('education', i)}
                style={{ position: 'absolute', top: spacing.md, right: spacing.md }}
              >
                Remover
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section style={{ marginBottom: spacing.xl }}>
        <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md }}>Conhecimentos (Skills)</h3>
        <p style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm }}>
          Suas principais habilidades técnicas e comportamentais identificadas.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
          {(data?.skills || []).map((skill: any, i: number) => (
            <div 
              key={i} 
              style={{ 
                background: colors.surfaceAlt, 
                padding: `${spacing.xs}px ${spacing.sm}px`, 
                borderRadius: radius.full,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.xs,
                fontSize: fontSize.sm
              }}
            >
              <span>{typeof skill === 'string' ? skill : skill.name}</span>
              <button 
                onClick={() => removeItem('skills', i)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: colors.danger, 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: 2
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: spacing.xl }}>
        <h3 style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.md }}>Idiomas</h3>
        {(data?.languages || []).map((lang: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xs }}>
            <Input 
              style={{ flex: 2 }}
              value={typeof lang === 'string' ? lang : lang.name} 
              onChange={e => {
                const list = [...(data?.languages || [])];
                list[i] = typeof lang === 'string' ? e.target.value : { ...lang, name: e.target.value };
                updateField('languages', list);
              }} 
            />
            <Input 
              style={{ flex: 1 }}
              placeholder="Nível (ex: Fluente)"
              value={typeof lang === 'string' ? '' : lang.level || ''} 
              onChange={e => {
                const list = [...(data?.languages || [])];
                const name = typeof lang === 'string' ? lang : lang.name;
                list[i] = { name, level: e.target.value };
                updateField('languages', list);
              }} 
            />
            <Button variant="danger" onClick={() => removeItem('languages', i)}>×</Button>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.xl }}>
        <Button variant="secondary" onClick={() => navigate('/onboarding/resume')}>
          ← Reenviar Currículo
        </Button>
        <Button onClick={handleSave} loading={saving} style={{ flex: 1 }}>
          {saving ? 'Salvando...' : 'Confirmar e continuar →'}
        </Button>
      </div>

      {error && <InlineMessage variant="error" style={{ marginTop: spacing.md }}>{error}</InlineMessage>}
    </div>
  );
}
