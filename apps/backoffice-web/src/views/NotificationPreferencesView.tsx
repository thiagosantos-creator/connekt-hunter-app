import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import { Button, Card, CardContent, CardHeader, CardTitle, InlineMessage, PageContent, PageHeader, Select, spacing } from '@connekt/ui';

type Prefs = {
  emailEnabled: boolean;
  eventNewInvite: boolean;
  eventStepCompleted: boolean;
  eventDecision: boolean;
  eventReminder: boolean;
  frequency: string;
};

export function NotificationPreferencesView() {
  const [prefs, setPrefs] = useState<Prefs>({ emailEnabled: true, eventNewInvite: true, eventStepCompleted: true, eventDecision: true, eventReminder: true, frequency: 'immediate' });
  const [msg, setMsg] = useState('');

  useEffect(() => { void apiGet<Prefs>('/notification-preferences/me').then(setPrefs).catch(() => null); }, []);

  const save = async () => {
    await apiPut('/notification-preferences/me', prefs);
    setMsg('Preferências salvas.');
  };

  return (
    <PageContent>
      <PageHeader title="Preferências de Notificação" />
      {msg && <InlineMessage variant="success" onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      <Card>
        <CardHeader><CardTitle>Centro de notificações</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <label><input type="checkbox" checked={prefs.emailEnabled} onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })} /> Canal: E-mail</label>
          <label><input type="checkbox" checked={prefs.eventNewInvite} onChange={(e) => setPrefs({ ...prefs, eventNewInvite: e.target.checked })} /> Novo convite</label>
          <label><input type="checkbox" checked={prefs.eventStepCompleted} onChange={(e) => setPrefs({ ...prefs, eventStepCompleted: e.target.checked })} /> Etapa concluída</label>
          <label><input type="checkbox" checked={prefs.eventDecision} onChange={(e) => setPrefs({ ...prefs, eventDecision: e.target.checked })} /> Decisão</label>
          <label><input type="checkbox" checked={prefs.eventReminder} onChange={(e) => setPrefs({ ...prefs, eventReminder: e.target.checked })} /> Lembrete</label>
          <Select label="Frequência" value={prefs.frequency} onChange={(e) => setPrefs({ ...prefs, frequency: e.target.value })} options={[{ value: 'immediate', label: 'Imediato' }, { value: 'daily', label: 'Diário' }]} />
          <Button onClick={() => { void save(); }}>Salvar</Button>
        </CardContent>
      </Card>
    </PageContent>
  );
}
