import { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
  StepTimeline,
  colors,
  spacing,
  fontSize,
  radius,
  shadows,
  AiTag,
} from '@connekt/ui';
import { apiPost } from '../../services/api.js';
import type { VacancyAssistSuggestion, Organization } from '../../services/types.js';

interface VacancyWizardProps {
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
  organizations: Organization[];
  initialData?: any;
  orgId?: string;
  setOrgId: (id: string) => void;
}

export function VacancyWizard({ onClose, onSave, organizations, initialData, orgId, setOrgId }: VacancyWizardProps) {
  const [step, setStep] = useState(0);
  const [loadingAi, setLoadingAi] = useState(false);
  const [suggestion, setSuggestion] = useState<VacancyAssistSuggestion | null>(null);

  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    workModel: initialData?.workModel?.toLowerCase() || 'remote',
    seniority: initialData?.seniority?.toLowerCase() || 'pleno',
    sector: initialData?.sector || '',
    experienceYearsMin: initialData?.experienceYearsMin || '',
    experienceYearsMax: initialData?.experienceYearsMax || '',
    employmentType: initialData?.employmentType || 'clt',
    status: initialData?.status || 'active',
    department: initialData?.department || '',
    requiredSkills: initialData?.requiredSkills || [],
    desiredSkills: initialData?.desiredSkills || [],
    salaryMin: initialData?.salaryMin || '',
    salaryMax: initialData?.salaryMax || '',
  });

  const [skillInput, setSkillInput] = useState('');

  const steps = ['Fundamentos', 'Job Design', 'Requisitos', 'Publicação'];

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));

  const generateAI = async () => {
    if (!form.title || !form.seniority) return;
    setLoadingAi(true);
    try {
      const ai = await apiPost<VacancyAssistSuggestion>('/vacancies/assist-content', {
        title: form.title,
        seniority: form.seniority,
        sector: form.sector || form.department || 'geral',
        workModel: form.workModel,
        location: form.location,
      });
      setSuggestion(ai);
      
      // Auto-populate description AND skills if they are empty
      setForm(f => ({ 
        ...f, 
        description: f.description.length < 10 ? ai.summary : f.description,
        requiredSkills: f.requiredSkills.length === 0 ? ai.requiredSkills : f.requiredSkills,
        desiredSkills: f.desiredSkills.length === 0 ? ai.desiredSkills : f.desiredSkills,
      }));
    } catch (err) {
      console.error('AI generation failed', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const addSkill = (type: 'requiredSkills' | 'desiredSkills') => {
    if (!skillInput.trim()) return;
    setForm(f => ({
      ...f,
      [type]: Array.from(new Set([...f[type], skillInput.trim()]))
    }));
    setSkillInput('');
  };

  const removeSkill = (type: 'requiredSkills' | 'desiredSkills', skill: string) => {
    setForm(f => ({
      ...f,
      [type]: f[type].filter((s: string) => s !== skill)
    }));
  };

  const isStepValid = () => {
    if (step === 0) return form.title && orgId;
    if (step === 1) return form.description.length > 50;
    return true;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.98)', 
      zIndex: 1000, overflowY: 'auto', display: 'flex', flexDirection: 'column'
    }}>
      <header style={{ 
        padding: `${spacing.lg}px ${spacing.xl}px`, borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>{initialData ? 'Editar Vaga' : 'Nova Vaga Premium'}</h2>
          <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Fluxo guiado por IA para máxima performance</div>
        </div>
        <Button variant="ghost" onClick={onClose}>Sair da criação</Button>
      </header>

      <main style={{ flex: 1, maxWidth: 800, margin: '0 auto', width: '100%', padding: `${spacing.xl}px 0` }}>
        <StepTimeline steps={steps} current={step} />

        <Card style={{ marginTop: spacing.xl, boxShadow: shadows.lg }}>
          <CardContent style={{ padding: spacing.xl }}>
            
            {/* STEP 0: BASICS */}
            {step === 0 && (
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <Select 
                  label="Empresa / Cliente" 
                  value={orgId} 
                  onChange={e => setOrgId(e.target.value)}
                  options={organizations.map(o => ({ value: o.id, label: o.tenantSettings?.publicName || o.name }))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 600 }}>Qual o título da vaga?</label>
                  <Button variant="secondary" size="sm" onClick={generateAI} loading={loadingAi} disabled={!form.title || !form.seniority}>
                    ✨ Gerar com IA
                  </Button>
                </div>
                <Input 
                  placeholder="Ex: Engenheiro de Software Senior (Backend)"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                  <Input 
                    label="Localização" 
                    placeholder="Ex: São Paulo, SP ou Remoto"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                  <Select 
                    label="Senioridade"
                    value={form.seniority}
                    onChange={e => setForm(f => ({ ...f, seniority: e.target.value }))}
                    options={[{value: 'estagio', label: 'Estágio'}, {value: 'junior', label: 'Júnior'}, {value: 'pleno', label: 'Pleno'}, {value: 'senior', label: 'Sênior'}, {value: 'especialista', label: 'Especialista'}]}
                  />
                </div>
                <Select 
                  label="Modelo de Trabalho"
                  value={form.workModel}
                  onChange={e => setForm(f => ({ ...f, workModel: e.target.value }))}
                  options={[{value: 'remote', label: 'Remoto'}, {value: 'hybrid', label: 'Híbrido'}, {value: 'onsite', label: 'Presencial'}]}
                />
              </div>
            )}

            {/* STEP 1: JOB DESIGN (AI) */}
            {step === 1 && (
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontWeight: 600 }}>Descrição da Vaga</label>
                </div>
                <Textarea 
                  rows={12}
                  placeholder="Descreva as responsabilidades e cultura..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
                {suggestion && (
                   <div style={{ padding: spacing.md, background: colors.infoLight, borderRadius: radius.md, fontSize: fontSize.sm }}>
                     <AiTag /> A IA sugere focar em: <strong>{suggestion.marketContext}</strong>
                   </div>
                )}
              </div>
            )}

            {/* STEP 2: REQUIREMENTS */}
            {step === 2 && (
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <div>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: spacing.xs }}>Hard Skills & Requisitos</label>
                  <div style={{ display: 'flex', gap: spacing.sm }}>
                    <Input 
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      placeholder="Ex: React, Node.js, AWS..."
                    />
                    <Button variant="outline" onClick={() => addSkill('requiredSkills')}>+ Obrigatória</Button>
                    <Button variant="outline" onClick={() => addSkill('desiredSkills')}>+ Desejável</Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.xl }}>
                  <div>
                    <h4 style={{ fontSize: fontSize.sm, color: colors.successDark }}>Obrigatórias</h4>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
                      {form.requiredSkills.map((s: string) => (
                        <span key={s} style={{ padding: '4px 10px', background: colors.successLight, borderRadius: radius.full, fontSize: fontSize.xs, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {s} <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => removeSkill('requiredSkills', s)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: fontSize.sm, color: colors.infoDark }}>Desejáveis</h4>
                    <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs }}>
                      {form.desiredSkills.map((s: string) => (
                        <span key={s} style={{ padding: '4px 10px', background: colors.infoLight, borderRadius: radius.full, fontSize: fontSize.xs, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {s} <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => removeSkill('desiredSkills', s)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PUBLICATION */}
            {step === 3 && (
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                  <Input label="Salário Mínimo" type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} />
                  <Input label="Salário Máximo" type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} />
                </div>
                <Input label="Departamento / Setor" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
                <Select 
                  label="Tipo de Contratação"
                  value={form.employmentType}
                  options={[{value: 'clt', label: 'CLT'}, {value: 'pj', label: 'PJ'}, {value: 'contract', label: 'Contrato temporário'}]}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                   <Input 
                     label="Data de Publicação" 
                     type="date" 
                     value={form.publishedAt ? new Date(form.publishedAt).toISOString().split('T')[0] : ''} 
                     onChange={e => setForm(f => ({ ...f, publishedAt: e.target.value }))} 
                   />
                   <Input 
                     label="Data de Encerramento" 
                     type="date" 
                     value={form.closedAt ? new Date(form.closedAt).toISOString().split('T')[0] : ''} 
                     onChange={e => setForm(f => ({ ...f, closedAt: e.target.value }))} 
                   />
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <footer style={{ marginTop: spacing.xl, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={handlePrev} disabled={step === 0}>Voltar</Button>
          {step < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={!isStepValid()}>Próximo Passo</Button>
          ) : (
            <Button onClick={() => onSave(form)} loading={loadingAi}>Finalizar e Publicar</Button>
          )}
        </footer>
      </main>
    </div>
  );
}
