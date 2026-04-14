import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import type { NotificationDispatch, NotificationPreference } from '../services/types.js';
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, DataTable, FormSkeleton, InlineMessage, PageContent, PageHeader, SectionTitle, Select, TableSkeleton, spacing } from '@connekt/ui';
import type { MessageVariant } from '@connekt/ui';

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
  const [msgVariant, setMsgVariant] = useState<MessageVariant>('success');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiGet<NotificationPreference>('/notification-preferences/me').then(setPrefs).catch((err) => setLoadError(`Erro ao carregar preferências: ${String(err)}`)),
      apiGet<NotificationDispatch[]>('/notification-preferences/me/dispatches').then(setDispatches).catch(() => setDispatches([])),
    ]).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut('/notification-preferences/me', prefs);
      setDispatches(await apiGet<NotificationDispatch[]>('/notification-preferences/me/dispatches'));
      setMsgVariant('success');
      setMsg('Preferências salvas com sucesso.');
    } catch (err) {
      setMsgVariant('error');
      setMsg(`Erro ao salvar: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent>
      <PageHeader title="Preferências de Notificação" description="Configure quais canais e eventos devem gerar notificações." />
      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}
      {loadError && <InlineMessage variant="warning" onDismiss={() => setLoadError('')}>{loadError}</InlineMessage>}
      <Card style={{ marginBottom: spacing.lg }}>
        <CardHeader><CardTitle>Centro de notificações</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {loading ? (
            <FormSkeleton rows={10} />
          ) : (
            <>
              <SectionTitle>Canais de envio</SectionTitle>
              <Checkbox label="E-mail" description="Notificações enviadas para seu e-mail cadastrado." checked={prefs.emailEnabled} onChange={(v) => setPrefs({ ...prefs, emailEnabled: v })} />
              <Checkbox label="Telefone (SMS/WhatsApp)" description="Notificações por SMS ou WhatsApp." checked={prefs.phoneEnabled} onChange={(v) => setPrefs({ ...prefs, phoneEnabled: v })} />
              <Checkbox label="In-app" description="Notificações exibidas dentro do sistema." checked={prefs.inAppEnabled} onChange={(v) => setPrefs({ ...prefs, inAppEnabled: v })} />

              <div style={{ marginTop: spacing.md }}>
                <SectionTitle>Eventos monitorados</SectionTitle>
              </div>
              <Checkbox label="Novo convite" description="Quando um candidato é convidado para uma vaga." checked={prefs.eventNewInvite} onChange={(v) => setPrefs({ ...prefs, eventNewInvite: v })} />
              <Checkbox label="Onboarding concluído" description="Quando um candidato completa uma etapa do onboarding." checked={prefs.eventStepCompleted} onChange={(v) => setPrefs({ ...prefs, eventStepCompleted: v })} />
              <Checkbox label="Decisão registrada" description="Quando uma decisão de aprovação/rejeição é feita." checked={prefs.eventDecision} onChange={(v) => setPrefs({ ...prefs, eventDecision: v })} />
              <Checkbox label="Lembrete operacional" description="Lembretes automáticos de follow-up e prazos." checked={prefs.eventReminder} onChange={(v) => setPrefs({ ...prefs, eventReminder: v })} />
              <Checkbox label="Alteração de acesso" description="Mudanças de permissão ou status de usuários." checked={prefs.eventAccessChange} onChange={(v) => setPrefs({ ...prefs, eventAccessChange: v })} />
              <Checkbox label="Auditoria crítica" description="Eventos de segurança e compliance." checked={prefs.eventCriticalAudit} onChange={(v) => setPrefs({ ...prefs, eventCriticalAudit: v })} />

              <Select label="Frequência de envio" value={prefs.frequency} onChange={(e) => setPrefs({ ...prefs, frequency: e.target.value })} options={[{ value: 'immediate', label: 'Imediato' }, { value: 'daily', label: 'Resumo diário' }, { value: 'weekly', label: 'Resumo semanal' }]} />
              <Button onClick={() => { void save(); }} loading={saving} disabled={!!loadError}>Salvar preferências</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico de dispatch</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
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
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
