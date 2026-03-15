'use client';

/**
 * ClientsClient — CRUD de clientes.
 * Tabla: SpeedDanTable (réplica de DataTable.tsx del ERP DTE).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { PageHeader } from '@/components/shared/PageHeader';
import { SpeedDanTable, type SpeedDanColumn } from '@/components/shared/SpeedDanTable';
import { MagnifyingGlass, UserCircle, Plus } from '@phosphor-icons/react';

type Client = {
  id: number; fullName: string; email: string; phone: string | null;
  active: boolean; createdAt: string; totalAppointments: number; lastVisit: string | null;
};
type FormValues = { fullName: string; email: string; phone: string };

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  const { register, handleSubmit, reset } = useForm<FormValues>();

  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search),
  );

  function openCreate() {
    setEditing(null); reset({ fullName: '', email: '', phone: '' }); setError(''); setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c); reset({ fullName: c.fullName, email: c.email, phone: c.phone ?? '' }); setError(''); setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true); setError('');
    try {
      const body = { fullName: values.fullName.trim(), email: values.email.trim().toLowerCase(), phone: values.phone.trim() || undefined };
      const url  = editing ? `/api/clients/${editing.id}` : '/api/clients';
      const res  = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { const msg = json.error?.message ?? 'Error al guardar'; setError(msg); toast.error(msg); return; }
      if (editing) {
        setClients(prev => prev.map(c => c.id === editing.id ? { ...c, ...json.data } : c));
        toast.success(`"${values.fullName.trim()}" actualizado`);
      } else {
        setClients(prev => [{ ...json.data, totalAppointments: 0, lastVisit: null }, ...prev]);
        toast.success(`Cliente "${values.fullName.trim()}" creado`);
      }
      setOpen(false);
    } catch { setError('Error de red'); toast.error('Error de red'); } finally { setLoading(false); }
  }

  async function handleDelete(c: Client) {
    if (!confirm(`¿Eliminar a "${c.fullName}"?\nSi tiene citas se desactivará.`)) return;
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' });
    if (res.ok) { setClients(prev => prev.filter(x => x.id !== c.id)); toast.success(`"${c.fullName}" eliminado`); }
    else toast.error('No se pudo eliminar');
  }

  async function toggleActive(c: Client) {
    const next = !c.active;
    const res  = await fetch(`/api/clients/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) { setClients(prev => prev.map(x => x.id === c.id ? { ...x, active: next } : x)); toast.success(`${c.fullName} ${next ? 'activado' : 'desactivado'}`); }
    else toast.error('No se pudo cambiar el estado');
  }

  // ── Columnas SpeedDanTable ────────────────────────────────────────────
  const columns: SpeedDanColumn<Client>[] = [
    {
      key: 'fullName', label: 'Cliente',
      render: c => (
        <div style={{ opacity: c.active ? 1 : 0.5 }}>
          <div style={{ fontWeight: 500 }}>{c.fullName}</div>
          <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>{c.email}</div>
        </div>
      ),
    },
    {
      key: 'phone', label: 'Teléfono', muted: true,
      render: c => c.phone ?? '—',
    },
    {
      key: 'totalAppointments', label: 'Citas', align: 'center',
      render: c => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: c.totalAppointments > 0 ? 600 : 400, color: c.totalAppointments > 0 ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))' }}>
          {c.totalAppointments}
        </span>
      ),
    },
    {
      key: 'lastVisit', label: 'Última visita', muted: true,
      render: c => formatDate(c.lastVisit),
    },
    {
      key: 'active', label: 'Estado',
      render: c => (
        <Badge
          variant={c.active ? 'default' : 'secondary'}
          style={{ cursor: 'pointer' }}
          onClick={() => toggleActive(c)}
        >
          {c.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clients.filter(c => c.active).length} activos · ${clients.length} total`}
        action={<Button onClick={openCreate}><Plus size={15} weight="bold" /> Nuevo cliente</Button>}
      />

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 16, maxWidth: 320, position: 'relative' }}>
        <MagnifyingGlass size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
        <Input
          placeholder="Buscar por nombre, email o teléfono…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 32 }}
        />
      </div>

      {/* Tabla */}
      <div className="speeddan-card" style={{ overflow: 'hidden' }}>
        <SpeedDanTable
          items={filtered}
          columns={columns}
          emptyIcon={<UserCircle size={36} weight="thin" />}
          emptyTitle={search ? 'Sin resultados' : 'Sin clientes'}
          emptyDesc={search ? 'Intenta con otro término de búsqueda.' : 'Agrega el primer cliente de tu barbería.'}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {clients.length > 0 && (
        <p style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 8, textAlign: 'right' }}>
          {clients.filter(c => c.active).length} activos · {clients.length} total
          {search && ` · ${filtered.length} mostrados`}
        </p>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              <FormField label="Nombre completo *">
                <Input {...register('fullName', { required: true })} placeholder="Juan Pérez" autoFocus />
              </FormField>
              <FormField label="Email *">
                <Input type="email" {...register('email', { required: true })} placeholder="juan@ejemplo.com" />
              </FormField>
              <FormField label="Teléfono">
                <Input {...register('phone')} placeholder="+503 7000-0000" />
              </FormField>
              {error && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
