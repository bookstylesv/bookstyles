'use client';

/**
 * ClientsClient — CRUD interactivo de clientes.
 * Tabla con historial de citas + diálogo crear/editar.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from 'lucide-react';

type Client = {
  id:                number;
  fullName:          string;
  email:             string;
  phone:             string | null;
  active:            boolean;
  createdAt:         string;
  totalAppointments: number;
  lastVisit:         string | null;
};

type FormValues = {
  fullName: string;
  email:    string;
  phone:    string;
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const [clients, setClients]  = useState<Client[]>(initialClients);
  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState<Client | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  const { register, handleSubmit, reset } = useForm<FormValues>();

  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search),
  );

  function openCreate() {
    setEditing(null);
    reset({ fullName: '', email: '', phone: '' });
    setError('');
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    reset({ fullName: c.fullName, email: c.email, phone: c.phone ?? '' });
    setError('');
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError('');
    try {
      const body = {
        fullName: values.fullName.trim(),
        email:    values.email.trim().toLowerCase(),
        phone:    values.phone.trim() || undefined,
      };

      const url    = editing ? `/api/clients/${editing.id}` : '/api/clients';
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Error al guardar'); return; }

      if (editing) {
        setClients(prev => prev.map(c => c.id === editing.id
          ? { ...c, ...json.data }
          : c,
        ));
      } else {
        setClients(prev => [{ ...json.data, totalAppointments: 0, lastVisit: null }, ...prev]);
      }
      setOpen(false);
    } catch {
      setError('Error de red. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(client: Client) {
    if (!confirm(`¿Eliminar a "${client.fullName}"?\nSi tiene citas se desactivará en lugar de borrarse.`)) return;
    const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
    if (res.ok) {
      setClients(prev => prev.filter(c => c.id !== client.id));
    }
  }

  async function handleToggleActive(client: Client) {
    const newActive = !client.active;
    const res = await fetch(`/api/clients/${client.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: newActive }),
    });
    if (res.ok) {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, active: newActive } : c));
    }
  }

  return (
    <>
      {/* Barra de herramientas */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Input
          placeholder="Buscar por nombre, email o teléfono…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <div style={{ flex: 1 }} />
        <Button onClick={openCreate}>
          <PlusIcon /> Nuevo cliente
        </Button>
      </div>

      {/* Tabla */}
      <div style={{
        background:    'hsl(var(--bg-surface))',
        border:        '1px solid hsl(var(--border-default))',
        borderRadius:  'var(--radius-lg)',
        overflow:      'hidden',
      }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Citas</TableHead>
              <TableHead>Última visita</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '40px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <UserIcon size={32} style={{ opacity: 0.3 }} />
                    <span>{search ? 'Sin resultados para esa búsqueda' : 'Sin clientes registrados'}</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c.id} style={{ opacity: c.active ? 1 : 0.55 }}>
                <TableCell>
                  <div style={{ fontWeight: 500 }}>{c.fullName}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                    {c.email}
                  </div>
                </TableCell>
                <TableCell style={{ color: 'hsl(var(--text-secondary))' }}>
                  {c.phone ?? '—'}
                </TableCell>
                <TableCell>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: c.totalAppointments > 0 ? 600 : 400,
                    color: c.totalAppointments > 0
                      ? 'hsl(var(--text-primary))'
                      : 'hsl(var(--text-muted))',
                  }}>
                    {c.totalAppointments}
                  </span>
                </TableCell>
                <TableCell style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>
                  {formatDate(c.lastVisit)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.active ? 'default' : 'secondary'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)} title="Editar">
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c)} title="Eliminar">
                      <TrashIcon className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats footer */}
      {clients.length > 0 && (
        <p style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 10, textAlign: 'right' }}>
          {clients.filter(c => c.active).length} activos · {clients.length} total
          {search && ` · ${filtered.length} mostrados`}
        </p>
      )}

      {/* Diálogo crear / editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
              <div>
                <Label htmlFor="cli-name">Nombre completo *</Label>
                <Input
                  id="cli-name"
                  {...register('fullName', { required: true })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="cli-email">Email *</Label>
                <Input
                  id="cli-email"
                  type="email"
                  {...register('email', { required: true })}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="cli-phone">Teléfono</Label>
                <Input
                  id="cli-phone"
                  {...register('phone')}
                  placeholder="+503 7000-0000"
                />
              </div>
              {error && (
                <p style={{ color: 'hsl(var(--destructive))', fontSize: 13, margin: 0 }}>
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
