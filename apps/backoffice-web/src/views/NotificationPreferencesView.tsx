import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import type { NotificationDispatch, NotificationPreference } from '../services/types.js';
import { Button, Card, CardContent, CardHeader, CardTitle, DataTable, InlineMessage, PageContent, PageHeader, Select, spacing } from '@connekt/ui';

const defaultPrefs: NotificationPreference = {
  emailEnabled: true,
  phoneEnabled: false,
  inAppEnabled: true,
  eventNewInvite: true,
  eventStepCompleted: true,
  eventDecision: true,
  eventReminder: true,
  eventAccessChange: true,
  eventCriticalAudit: true,
  frequency: 'immediate',
};

export function NotificationPreferencesView() {
  const [prefs, setPrefs] = useState<NotificationPreference>(defaultPrefs);
  const [dispatches, setDispatches] = useState<NotificationDispatch[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void apiGet<NotificationPreference>('/notification-preferences/me').then(setPrefs).catch(() => null);
    void apiGet<NotificationDispatch[]>('/notification-preferences/me/dispatches').then(setDispatches).catch(() => setDispatches([]));
  }, []);

  const save = async () => {
    await apiPut('/notification-preferences/me', prefs);
    setDispatches(await apiGet<NotificationDispatch[]>('/notification-preferences/me/dispatches'));
    setMsg('PreferÃªncias salvas.');
  };

  return (
    <PageContent>
      <PageHeader title="PreferÃªncias de NotificaÃ§Ã£o" />
      {msg && <InlineMessage variant="success" onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader><CardTitle>Centro de notificaÃ§Ãµes</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <label><input type="checkbox" checked={prefs.emailEnabled} onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })} /> Canal: E-mail</label>
          <label><input type="checkbox" checked={prefs.phoneEnabled} onChange={(e) => setPrefs({ ...prefs, phoneEnabled: e.target.checked })} /> Canal: Telefone</label>
          <label><input type="checkbox" checked={prefs.inAppEnabled} onChange={(e) => setPrefs({ ...prefs, inAppEnabled: e.target.checked })} /> Canal: In-app</label>
          <label><input type="checkbox" checked={prefs.eventNewInvite} onChange={(e) => setPrefs({ ...prefs, eventNewInvite: e.target.checked })} /> Evento: novo convite</label>
          <label><input type="checkbox" checked={prefs.eventStepCompleted} onChange={(e) => setPrefs({ ...prefs, eventStepCompleted: e.target.checked })} /> Evento: onboarding concluÃ­do</label>
          <label><input type="checkbox" checked={prefs.eventDecision} onChange={(e) => setPrefs({ ...prefs, eventDecision: e.target.checked })} /> Evento: decisÃ£o</label>
          <label><input type="checkbox" checked={prefs.eventReminder} onChange={(e) => setPrefs({ ...prefs, eventReminder: e.target.checked })} /> Evento: lembrete operacional</label>
          <label><input type="checkbox" checked={prefs.eventAccessChange} onChange={(e) => setPrefs({ ...prefs, eventAccessChange: e.target.checked })} /> Evento: alteraÃ§Ã£o de acesso</label>
          <label><input type="checkbox" checked={prefs.eventCriticalAudit} onChange={(e) => setPrefs({ ...prefs, eventCriticalAudit: e.target.checked })} /> Evento: auditoria crÃ­tica</label>
          <Select label="FrequÃªncia" value={prefs.frequency} onChange={(e) => setPrefs({ ...prefs, frequency: e.target.value })} options={[{ value: 'immediate', label: 'Imediato' }, { value: 'daily', label: 'DiÃ¡rio' }, { value: 'weekly', label: 'Semanal' }]} />
          <Button onClick={() => { void save(); }}>Salvar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>HistÃ³rico de dispatch</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'createdAt', header: 'Data', render: (row: NotificationDispatch) => new Date(row.createdAt).toLocaleString('pt-BR') },
              { key: 'eventKey', header: 'Evento', render: (row: NotificationDispatch) => row.eventKey },
              { key: 'channel', header: 'Canal', render: (row: NotificationDispatch) => row.channel },
              { key: 'status', header: 'Status', render: (row: NotificationDispatch) => row.status },
              { key: 'destination', header: 'Destino', render: (row: NotificationDispatch) => row.destination },
            ]}
            data={dispatches}
            rowKey={(row) => row.id}
            pageSize={8}
            emptyMessage="Nenhum dispatch registrado"
          />
        </CardContent>
      </Card>
    </PageContent>
  );
}
