import { useState } from 'react';
import { apiPost } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  PageHeader,
  PageContent,
  InlineMessage,
  SectionTitle,
  spacing,
} from '@connekt/ui';

export function SmartInterviewView() {
  useAuth();
  const [vacancyId, setVacancyId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [notes, setNotes] = useState('Aprovado para próxima etapa');
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');

  const feedback = (text: string, variant: 'success' | 'error') => {
    setMsg(text);
    setMsgVariant(variant);
  };

  const saveTemplate = async () => {
    try {
      const tpl = await apiPost<{ id: string }>('/smart-interview/templates', {
        vacancyId,
        configJson: { intro: 'Entrevista assíncrona', attempts: 1 },
      });
      setTemplateId(tpl.id);
      feedback('Template salvo.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const generateQuestions = async () => {
    try {
      await apiPost(`/smart-interview/templates/${templateId}/generate-questions`, {});
      feedback('Perguntas mock IA geradas.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const createSession = async () => {
    try {
      const session = await apiPost<{ id: string; publicToken: string }>(
        '/smart-interview/sessions',
        { applicationId },
      );
      setSessionId(session.id);
      feedback(`Sessão criada. Token candidato: ${session.publicToken}`, 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  const approveReview = async () => {
    try {
      await apiPost(`/smart-interview/sessions/${sessionId}/human-review`, {
        decision: 'approved',
        notes,
      });
      feedback('Review humano salvo.', 'success');
    } catch (err) {
      feedback(String(err), 'error');
    }
  };

  return (
    <PageContent>
      <PageHeader
        title="Entrevista Inteligente"
        description="Configuração da vaga, editor de perguntas e review humano em um fluxo único de entrevista assíncrona."
      />

      {msg && (
        <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>
          {msg}
        </InlineMessage>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <SectionTitle>1. Configurar Template</SectionTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Vaga"
              value={vacancyId}
              onChange={(e) => setVacancyId(e.target.value)}
            />
          </CardContent>
          <CardFooter style={{ gap: spacing.sm }}>
            <Button onClick={() => { void saveTemplate(); }} disabled={!vacancyId}>
              Salvar Template
            </Button>
            <Button
              variant="secondary"
              onClick={() => { void generateQuestions(); }}
              disabled={!templateId}
            >
              Gerar Perguntas IA
            </Button>
          </CardFooter>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <SectionTitle>2. Criar Sessão</SectionTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Aplicação"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void createSession(); }} disabled={!applicationId}>
              Criar Sessão
            </Button>
          </CardFooter>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <SectionTitle>3. Review Humano</SectionTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Input
              label="ID da Sessão"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            />
            <Textarea
              label="Notas de Review"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={() => { void approveReview(); }} disabled={!sessionId}>
              Salvar Review Humano
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContent>
  );
}
