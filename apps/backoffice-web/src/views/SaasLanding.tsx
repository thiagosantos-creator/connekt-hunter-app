import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Badge,
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadows,
} from '@connekt/ui';

/* ── Components ──────────────────────────────────────────────────────── */

const Nav = () => (
  <nav style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${spacing.xl * 2}px`,
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(16px)',
    borderBottom: `1px solid rgba(0, 0, 0, 0.05)`,
    zIndex: 1000,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: radius.md, 
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: fontWeight.bold,
        fontSize: 18,
      }}>C</div>
      <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text }}>Connekt <span style={{ color: colors.primary }}>Hunter</span></span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
      <a href="#features" style={{ textDecoration: 'none', color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>Features</a>
      <a href="#pricing" style={{ textDecoration: 'none', color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>Pricing</a>
      <Button variant="ghost" size="sm" onClick={() => window.location.href = '/login'}>Entrar</Button>
      <Button variant="primary" size="sm" onClick={() => window.location.href = '/onboarding'}>Começar agora</Button>
    </div>
  </nav>
);

const FeatureCard = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
  <Card style={{ 
    border: 'none', 
    background: 'rgba(255, 255, 255, 0.6)', 
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
    transition: 'transform 0.3s ease',
  }}>
    <CardContent style={{ padding: spacing.xl }}>
      <div style={{ fontSize: 32, marginBottom: spacing.md }}>{icon}</div>
      <h3 style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, marginBottom: spacing.sm }}>{title}</h3>
      <p style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.6 }}>{description}</p>
    </CardContent>
  </Card>
);

const PricingCard = ({ tier, price, features, highlighted = false }: { tier: string, price: string, features: string[], highlighted?: boolean }) => (
  <Card style={{ 
    border: highlighted ? `2px solid ${colors.primary}` : `1px solid ${colors.borderLight}`,
    transform: highlighted ? 'scale(1.05)' : 'none',
    zIndex: highlighted ? 10 : 1,
    background: '#fff',
    boxShadow: highlighted ? shadows.lg : shadows.sm,
  }}>
    <CardContent style={{ padding: spacing.xl * 1.5, display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <div>
        <Badge variant={highlighted ? 'info' : 'secondary'} style={{ marginBottom: spacing.sm }}>{tier}</Badge>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: fontWeight.bold }}>{price}</span>
          <span style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>/mês</span>
        </div>
      </div>
      <div style={{ display: 'grid', gap: spacing.sm }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontSize: fontSize.sm, color: colors.textSecondary }}>
            <span style={{ color: colors.success }}>✓</span> {f}
          </div>
        ))}
      </div>
      <Button variant={highlighted ? 'primary' : 'outline'} fullWidth style={{ marginTop: spacing.md }}>
        Selecionar {tier}
      </Button>
    </CardContent>
  </Card>
);

/* ── View ───────────────────────────────────────────────────────────── */

export function SaasLanding() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      background: '#fafafa', 
      minHeight: '100vh', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: colors.text,
      overflowX: 'hidden'
    }}>
      <Nav />
      
      {/* Hero Section */}
      <section style={{ 
        paddingTop: 160, 
        paddingBottom: 100, 
        textAlign: 'center', 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `radial-gradient(circle at top right, ${colors.primaryLight}44, transparent), radial-gradient(circle at bottom left, ${colors.infoLight}44, transparent)`,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: `0 ${spacing.xl}px` }}>
          <Badge variant="info" style={{ marginBottom: spacing.lg, padding: '6px 12px' }}>✨ A nova era do Headhunting</Badge>
          <h1 style={{ 
            fontSize: 64, 
            fontWeight: 800, 
            lineHeight: 1.1, 
            letterSpacing: '-0.02em',
            marginBottom: spacing.lg,
            background: `linear-gradient(to bottom, ${colors.text}, ${colors.textSecondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Contrate os melhores talentos com a força da <span style={{ color: colors.primary }}>IA Generativa.</span>
          </h1>
          <p style={{ 
            fontSize: fontSize.lg, 
            color: colors.textSecondary, 
            lineHeight: 1.6, 
            marginBottom: spacing.xl * 2,
            maxWidth: 600,
            margin: '0 auto 40px'
          }}>
            Automatize o screening, conduza entrevistas técnicas inteligentes e apresente dossiers premium para seus clientes em tempo recorde.
          </p>
          <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center' }}>
            <Button size="lg" onClick={() => navigate('/onboarding')}>Começar Grátis</Button>
            <Button size="lg" variant="outline">Agendar Demonstração</Button>
          </div>
        </div>

        {/* Dashboard Mockup Component (Simplified) */}
        <div style={{ 
          marginTop: 80, 
          width: '90%', 
          maxWidth: 1100, 
          height: 500, 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(24px)', 
          borderRadius: 24, 
          border: `1px solid rgba(255, 255, 255, 0.5)`,
          boxShadow: '0 32px 64px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
           <div style={{ height: 40, background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%' }}>
              <div style={{ borderRight: '1px solid rgba(0,0,0,0.05)', padding: 20 }}>
                 <div style={{ height: 20, width: '80%', background: 'rgba(0,0,0,0.05)', borderRadius: 10, marginBottom: 20 }} />
                 {[1,2,3,4].map(i => <div key={i} style={{ height: 12, width: '60%', background: 'rgba(0,0,0,0.03)', borderRadius: 6, marginBottom: 15 }} />)}
              </div>
              <div style={{ padding: 40, textAlign: 'left' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div style={{ height: 32, width: 200, background: colors.primaryLight, borderRadius: 16 }} />
                    <div style={{ height: 32, width: 100, background: 'rgba(0,0,0,0.05)', borderRadius: 16 }} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: 120, background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }} />)}
                 </div>
              </div>
           </div>
           {/* Floating AI Insight Card */}
           <div style={{ 
              position: 'absolute', 
              bottom: 40, 
              right: 40, 
              width: 280, 
              background: '#fff', 
              padding: 24, 
              borderRadius: 20, 
              boxShadow: shadows.lg,
              border: `1px solid ${colors.infoLight}`,
           }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                 <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.info, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>✨</div>
                 <span style={{ fontWeight: fontWeight.bold, fontSize: fontSize.xs }}>AI Matching insight</span>
              </div>
              <p style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Candidato Lucas Martins possui 96% de compatibilidade técnica com a vaga de Lead Eng.</p>
              <div style={{ height: 4, width: '100%', background: colors.borderLight, borderRadius: 2 }}>
                 <div style={{ height: '100%', width: '96%', background: colors.success, borderRadius: 2 }} />
              </div>
           </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '100px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
           <h2 style={{ fontSize: 32, fontWeight: fontWeight.bold, marginBottom: spacing.md }}>Plataforma completa para agências</h2>
           <p style={{ color: colors.textSecondary }}>Otimize cada etapa do seu funil de recrutamento.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl }}>
           <FeatureCard 
             icon="🧠" 
             title="Smart Interviewer" 
             description="Deixe nossa IA conduzir as primeiras entrevistas técnicas. Receba transcrições e análises profundas de soft e hard skills."
           />
           <FeatureCard 
             icon="📑" 
             title="Dossiers Premium" 
             description="Apresente perfis que encantam. Dossiers gerados automaticamente com insights de risco, matching e recomendações."
           />
           <FeatureCard 
             icon="🤝" 
             title="Colaboração com Clientes" 
             description="Compartilhe links mágicos de review. Seus clientes aprovam ou rejeitam perfis em um interface branded e intuitiva."
           />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '100px 20px', background: '#fff', borderTop: `1px solid ${colors.borderLight}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
             <h2 style={{ fontSize: 32, fontWeight: fontWeight.bold, marginBottom: spacing.md }}>Planos simples para crescer</h2>
             <p style={{ color: colors.textSecondary }}>Cancele a qualquer momento. Suporte humano 24/7.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: spacing.xl, alignItems: 'center' }}>
             <PricingCard 
               tier="Starter" 
               price="R$0" 
               features={['1 vaga ativa', 'Screening básico', 'Dossier limitado']} 
             />
             <PricingCard 
               tier="Pro" 
               price="R$499" 
               features={['10 vagas ativas', 'AI Video Interviews', 'Dossiers Premium', 'White-label links']} 
               highlighted 
             />
             <PricingCard 
               tier="Agency" 
               price="R$1.499" 
               features={['Vagas ilimitadas', 'Multi-tenant admin', 'API Access', 'Account Manager']} 
             />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '64px 20px', background: colors.primaryDark, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
         <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontWeight: fontWeight.bold, color: '#fff' }}>Connekt Hunter</span>
         </div>
         <p style={{ fontSize: fontSize.xs }}>© 2026 Connekt Digital. Todos os direitos reservados.</p>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
