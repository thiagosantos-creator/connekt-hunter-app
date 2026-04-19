import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Select,
  Badge,
  StepTimeline,
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadows,
  InlineMessage,
} from '@connekt/ui';
import { apiPost } from '../services/api.js';

export function WorkspaceSetupView() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Form State */
  const [formData, setFormData] = useState({
    agencyName: '',
    email: '',
    password: '',
    plan: 'pro',
    primaryColor: colors.primary,
    publicName: '',
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // Simulate API call to create organization and user
      await new Promise(r => setTimeout(r, 1500));
      
      // In a real app, we would:
      // 1. Create User
      // 2. Create Organization
      // 3. Create Subscription in Stripe
      
      navigate('/dashboard');
    } catch (err) {
      setError('Falha ao criar workspace. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${colors.primary}11, ${colors.info}11)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: spacing.xl * 2,
    }}>
      <div style={{ maxWidth: 640, width: '100%', display: 'grid', gap: spacing.xl }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Configure seu Workspace</h1>
          <p style={{ color: colors.textSecondary }}>Estamos quase lá! Personalize sua agência e escolha seu plano.</p>
        </div>

        <StepTimeline 
          steps={[
            { label: 'Perfil', status: step === 1 ? 'active' : step > 1 ? 'completed' : 'pending' },
            { label: 'Plano', status: step === 2 ? 'active' : step > 2 ? 'completed' : 'pending' },
            { label: 'Branding', status: step === 3 ? 'active' : 'pending' },
          ]}
        />

        <Card variant="elevated" style={{ padding: spacing.lg }}>
          {step === 1 && (
            <div style={{ display: 'grid', gap: spacing.md }}>
              <CardTitle>Sobre sua agência</CardTitle>
              <Input 
                label="Nome da Agência" 
                value={formData.agencyName} 
                onChange={e => setFormData({...formData, agencyName: e.target.value})}
                placeholder="Ex: Connekt Digital"
              />
              <Input 
                label="E-mail profissional" 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="voce@suaempresa.com"
              />
              <Input 
                label="Senha" 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <Button onClick={nextStep} disabled={!formData.agencyName || !formData.email}>Continuar</Button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'grid', gap: spacing.md }}>
              <CardTitle>Escolha seu plano</CardTitle>
              <div style={{ display: 'grid', gap: spacing.md }}>
                {['starter', 'pro', 'agency'].map(p => (
                  <div 
                    key={p}
                    onClick={() => setFormData({...formData, plan: p})}
                    style={{
                      padding: spacing.md,
                      borderRadius: radius.lg,
                      border: `2px solid ${formData.plan === p ? colors.primary : colors.borderLight}`,
                      background: formData.plan === p ? `${colors.primary}08` : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: fontWeight.bold, textTransform: 'capitalize' }}>{p}</div>
                      <div style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                        {p === 'starter' ? 'Ideal para testar' : p === 'pro' ? 'Mais popular para recrutadores' : 'Para grandes agências'}
                      </div>
                    </div>
                    <div style={{ fontWeight: fontWeight.bold }}>
                      {p === 'starter' ? 'Grátis' : p === 'pro' ? 'R$ 499/mês' : 'R$ 1.499/mês'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
                <Button variant="ghost" onClick={prevStep} fullWidth>Voltar</Button>
                <Button onClick={nextStep} fullWidth>Continuar</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: spacing.md }}>
              <CardTitle>Personalize sua marca</CardTitle>
              <CardDescription>Essas cores serão aplicadas nos links que seus clientes e candidatos acessarem.</CardDescription>
              <Input 
                label="Nome Público da Empresa" 
                value={formData.publicName} 
                onChange={e => setFormData({...formData, publicName: e.target.value})}
                placeholder="Como seus clientes te conhecem"
              />
              <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                 <div style={{ flex: 1 }}>
                    <label style={{ fontSize: fontSize.sm, color: colors.textSecondary, display: 'block', marginBottom: 4 }}>Cor Primária</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                       {['#0F62FE', '#8A3FFC', '#007D79', '#D12771'].map(c => (
                         <div 
                           key={c}
                           onClick={() => setFormData({...formData, primaryColor: c})}
                           style={{ 
                             width: 32, 
                             height: 32, 
                             borderRadius: '50%', 
                             background: c, 
                             cursor: 'pointer',
                             border: formData.primaryColor === c ? '2px solid #000' : 'none',
                             boxShadow: shadows.sm,
                           }} 
                         />
                       ))}
                    </div>
                 </div>
              </div>

              {error && <InlineMessage variant="error">{error}</InlineMessage>}

              <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
                <Button variant="ghost" onClick={prevStep} fullWidth disabled={loading}>Voltar</Button>
                <Button onClick={handleFinish} fullWidth loading={loading}>Finalizar Configuração</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
