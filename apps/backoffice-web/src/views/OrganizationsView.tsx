import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../services/api.js';
import type { Organization } from '../services/types.js';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  InlineMessage,
  Input,
  PageContent,
  PageHeader,
  Select,
  spacing,
  colors,
  radius,
  fontSize,
} from '@connekt/ui';

type BrandingForm = {
  publicName: string;
  contactEmail: string;
  communicationDomain: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

type OrganizationForm = {
  name: string;
  status: string;
  ownerAdminUserId: string;
  branding: BrandingForm;
};

const emptyBranding: BrandingForm = {
  publicName: '',
  contactEmail: '',
  communicationDomain: '',
  logoUrl: '',
  bannerUrl: '',
  primaryColor: '',
  secondaryColor: '',
};

const emptyForm: OrganizationForm = {
  name: '',
  status: 'active',
  ownerAdminUserId: '',
  branding: emptyBranding,
};

function hasBrandingData(branding: BrandingForm): boolean {
  return Object.values(branding).some((value) => value.trim() !== '');
}

function toForm(row?: Organization | null): OrganizationForm {
  return {
    name: row?.name ?? '',
    status: row?.status ?? 'active',
    ownerAdminUserId: row?.ownerAdminUserId ?? '',
    branding: {
      publicName: row?.tenantSettings?.publicName ?? '',
      contactEmail: row?.tenantSettings?.contactEmail ?? '',
      communicationDomain: row?.tenantSettings?.communicationDomain ?? '',
      logoUrl: row?.tenantSettings?.logoUrl ?? '',
      bannerUrl: row?.tenantSettings?.bannerUrl ?? '',
      primaryColor: row?.tenantSettings?.primaryColor ?? '',
      secondaryColor: row?.tenantSettings?.secondaryColor ?? '',
    },
  };
}

export function OrganizationsView() {
  const [rows, setRows] = useState<Organization[]>([]);
  const [createForm, setCreateForm] = useState<OrganizationForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState<OrganizationForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [msgVariant, setMsgVariant] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);

  const load = async () => setRows(await apiGet<Organization[]>('/organizations'));

  useEffect(() => {
    void load().catch(() => setRows([]));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await apiPost<Organization>('/organizations', {
        name: createForm.name,
        status: createForm.status,
        ownerAdminUserId: createForm.ownerAdminUserId,
      });

      if (hasBrandingData(createForm.branding)) {
        await apiPut<Organization>(`/organizations/${created.id}`, {
          branding: createForm.branding,
        });
      }

      setCreateForm(emptyForm);
      setMsg('Empresa criada e configurada com sucesso.');
      setMsgVariant('success');
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await apiPut<Organization>(`/organizations/${editingId}`, {
        name: editForm.name,
        status: editForm.status,
        ownerAdminUserId: editForm.ownerAdminUserId,
        branding: editForm.branding,
      });
      setMsg('Empresa atualizada com sucesso.');
      setMsgVariant('success');
      await load();
    } catch (err) {
      setMsg(String(err));
      setMsgVariant('error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Organization) => {
    setEditingId(row.id);
    setEditForm(toForm(row));
  };

  const renderBrandingFields = (
    form: OrganizationForm,
    setForm: React.Dispatch<React.SetStateAction<OrganizationForm>>,
  ) => (
    <>
      <Input
        label="Nome público"
        value={form.branding.publicName}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, publicName: e.target.value } }))}
        placeholder="Nome que aparece para o candidato"
      />
      <Input
        label="E-mail de contato"
        type="email"
        value={form.branding.contactEmail}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, contactEmail: e.target.value } }))}
        placeholder="talentos@empresa.com"
      />
      <Input
        label="Domínio de comunicação"
        value={form.branding.communicationDomain}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, communicationDomain: e.target.value } }))}
        placeholder="empresa.com"
      />
      <Input
        label="Logo (URL)"
        value={form.branding.logoUrl}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, logoUrl: e.target.value } }))}
        placeholder="https://..."
      />
      <Input
        label="Banner (URL)"
        value={form.branding.bannerUrl}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, bannerUrl: e.target.value } }))}
        placeholder="https://..."
      />
      <Input
        label="Cor primária"
        value={form.branding.primaryColor}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, primaryColor: e.target.value } }))}
        placeholder="#0F62FE"
      />
      <Input
        label="Cor secundária"
        value={form.branding.secondaryColor}
        onChange={(e) => setForm((current) => ({ ...current, branding: { ...current.branding, secondaryColor: e.target.value } }))}
        placeholder="#111827"
      />
    </>
  );

  return (
    <PageContent>
      <PageHeader title="Empresas / Tenants" description="Cadastre, edite branding e mantenha dados operacionais das empresas sem ajustes manuais externos." />
      {msg && <InlineMessage variant={msgVariant} onDismiss={() => setMsg('')}>{msg}</InlineMessage>}

      <Card style={{ marginBottom: spacing.lg }}>
        <form onSubmit={(e) => { void create(e); }}>
          <CardHeader><CardTitle>Novo tenant</CardTitle></CardHeader>
          <CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <Input label="Nome da empresa" value={createForm.name} onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))} required />
            <Select label="Status" value={createForm.status} onChange={(e) => setCreateForm((current) => ({ ...current, status: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'disabled', label: 'Desativada' }]} />
            <Input label="Responsável (admin)" value={createForm.ownerAdminUserId} onChange={(e) => setCreateForm((current) => ({ ...current, ownerAdminUserId: e.target.value }))} placeholder="ID ou e-mail do administrador responsável" />
            {renderBrandingFields(createForm, setCreateForm)}
          </CardContent>
          <CardFooter><Button type="submit" loading={saving}>{saving ? 'Salvando...' : 'Criar tenant'}</Button></CardFooter>
        </form>
      </Card>

      {editingId && (
        <Card style={{ marginBottom: spacing.lg }}>
          <form onSubmit={(e) => { void saveEdit(e); }}>
            <CardHeader><CardTitle>Editar empresa</CardTitle></CardHeader>
            <CardContent style={{ display: 'grid', gap: spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              <Input label="Nome da empresa" value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} required />
              <Select label="Status" value={editForm.status} onChange={(e) => setEditForm((current) => ({ ...current, status: e.target.value }))} options={[{ value: 'active', label: 'Ativa' }, { value: 'disabled', label: 'Desativada' }]} />
              <Input label="Responsável (admin)" value={editForm.ownerAdminUserId} onChange={(e) => setEditForm((current) => ({ ...current, ownerAdminUserId: e.target.value }))} placeholder="ID ou e-mail do administrador responsável" />
              {renderBrandingFields(editForm, setEditForm)}

              {(editForm.branding.logoUrl || editForm.branding.bannerUrl) && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    display: 'grid',
                    gap: spacing.sm,
                  }}
                >
                  <strong style={{ fontSize: fontSize.sm }}>Preview de branding</strong>
                  {editForm.branding.bannerUrl && (
                    <img
                      src={editForm.branding.bannerUrl}
                      alt="Banner da empresa"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: radius.md, background: colors.surfaceAlt }}
                    />
                  )}
                  {editForm.branding.logoUrl && (
                    <img
                      src={editForm.branding.logoUrl}
                      alt="Logo da empresa"
                      style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: radius.md, background: colors.surfaceAlt, padding: spacing.sm }}
                    />
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter style={{ display: 'flex', gap: spacing.sm }}>
              <Button type="submit" loading={saving}>{saving ? 'Salvando...' : 'Salvar empresa'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setEditingId(''); setEditForm(emptyForm); }}>Cancelar</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <DataTable
        data={rows}
        rowKey={(row) => row.id}
        searchable
        searchPlaceholder="Buscar empresa por nome, e-mail ou domínio"
        columns={[
          {
            key: 'name',
            header: 'Empresa',
            render: (row: Organization) => row.tenantSettings?.publicName || row.name,
            searchValue: (row: Organization) => `${row.tenantSettings?.publicName ?? ''} ${row.name}`.trim(),
            sortValue: (row: Organization) => row.tenantSettings?.publicName || row.name,
          },
          { key: 'status', header: 'Status', render: (row: Organization) => row.status },
          { key: 'ownerAdminUserId', header: 'Responsável', render: (row: Organization) => row.ownerAdminUserId ?? '-' },
          {
            key: 'contactEmail',
            header: 'E-mail de contato',
            render: (row: Organization) => row.tenantSettings?.contactEmail ?? '-',
            searchValue: (row: Organization) => row.tenantSettings?.contactEmail ?? '',
          },
          {
            key: 'domain',
            header: 'Domínio',
            render: (row: Organization) => row.tenantSettings?.communicationDomain ?? '-',
            searchValue: (row: Organization) => row.tenantSettings?.communicationDomain ?? '',
          },
          {
            key: 'branding',
            header: 'Branding',
            render: (row: Organization) => (row.tenantSettings?.logoUrl || row.tenantSettings?.bannerUrl ? 'Configurado' : 'Pendente'),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (row: Organization) => (
              <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                Editar
              </Button>
            ),
          },
        ]}
      />
    </PageContent>
  );
}
