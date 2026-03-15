'use client';

/**
 * ServicesClient — CRUD de servicios.
 * Tabla: SpeedDanTable (réplica de DataTable.tsx del ERP DTE).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { PageHeader } from '@/components/shared/PageHeader';
import { SpeedDanTable, type SpeedDanColumn } from '@/components/shared/SpeedDanTable';
import { Plus, Scissors } from '@phosphor-icons/react';

type Service = {
  id: number; name: string; description: string | null;
  price: number; duration: number; category: string | null; active: boolean;
};

type FormValues = {
  name: string; description: string; price: string;
  duration: string; category: string; active: boolean;
};

const CATEGORIES: Record<string, string> = {
  cabello: 'Cabello', barba: 'Barba', combo: 'Combo', tratamiento: 'Tratamiento',
};

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();
  const selectedCategory = watch('category') ?? '';
  const activeVal        = watch('active');

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '', price: '', duration: '', category: 'cabello', active: true });
    setError(''); setOpen(true);
  }
  function openEdit(s: Service) {
    setEditing(s);
    reset({ name: s.name, description: s.description ?? '', price: String(s.price), duration: String(s.duration), category: s.category ?? 'cabello', active: s.active });
    setError(''); setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true); setError('');
    try {
      const body = { name: values.name, description: values.description || undefined, price: parseFloat(values.price), duration: parseInt(values.duration, 10), category: values.category || undefined, active: values.active };
      const url  = editing ? `/api/services/${editing.id}` : '/api/services';
      const res  = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { const msg = json.error?.message ?? 'Error al guardar'; setError(msg); toast.error(msg); return; }
      if (editing) {
        setServices(prev => prev.map(s => s.id === editing.id ? json.data : s));
        toast.success(`Servicio "${values.name}" actualizado`);
      } else {
        setServices(prev => [json.data, ...prev]);
        toast.success(`Servicio "${values.name}" creado`);
      }
      setOpen(false);
    } catch { setError('Error de red'); toast.error('Error de red'); } finally { setLoading(false); }
  }

  async function handleDelete(s: Service) {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    const res = await fetch(`/api/services/${s.id}`, { method: 'DELETE' });
    if (res.ok) { setServices(prev => prev.filter(x => x.id !== s.id)); toast.success(`"${s.name}" eliminado`); }
    else toast.error('No se pudo eliminar');
  }

  // ── Columnas SpeedDanTable ────────────────────────────────────────────
  const columns: SpeedDanColumn<Service>[] = [
    {
      key: 'name', label: 'Nombre',
      render: s => (
        <div style={{ opacity: s.active ? 1 : 0.5 }}>
          <div style={{ fontWeight: 500 }}>{s.name}</div>
          {s.description && (
            <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
              {s.description.slice(0, 60)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category', label: 'Categoría',
      render: s => s.category
        ? <Badge variant="secondary">{CATEGORIES[s.category] ?? s.category}</Badge>
        : <span style={{ color: '#d0d0d0' }}>—</span>,
    },
    {
      key: 'price', label: 'Precio', align: 'right',
      render: s => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>${s.price.toFixed(2)}</span>,
    },
    {
      key: 'duration', label: 'Duración', muted: true, align: 'center',
      render: s => `${s.duration} min`,
    },
    {
      key: 'active', label: 'Estado',
      render: s => <Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Activo' : 'Inactivo'}</Badge>,
    },
  ];

  const activeCount = services.filter(s => s.active).length;

  return (
    <>
      <PageHeader
        title="Servicios"
        description={`${activeCount} de ${services.length} activos`}
        action={<Button onClick={openCreate}><Plus size={15} weight="bold" /> Nuevo servicio</Button>}
      />

      {/* Tabla */}
      <div className="speeddan-card" style={{ overflow: 'hidden' }}>
        <SpeedDanTable
          items={services}
          columns={columns}
          emptyIcon={<Scissors size={36} weight="thin" />}
          emptyTitle="Sin servicios"
          emptyDesc="Agrega el primer servicio de tu barbería."
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
              <FormField label="Nombre *">
                <Input {...register('name', { required: true })} placeholder="Corte de cabello" autoFocus />
              </FormField>
              <FormField label="Descripción">
                <Input {...register('description')} placeholder="Descripción opcional" />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Precio *">
                  <Input type="number" step="0.01" min="0" {...register('price', { required: true })} placeholder="10.00" />
                </FormField>
                <FormField label="Duración (min) *">
                  <Input type="number" min="1" {...register('duration', { required: true })} placeholder="30" />
                </FormField>
              </div>
              <FormField label="Categoría">
                <Select value={selectedCategory} onValueChange={v => setValue('category', v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={activeVal ?? true}
                  onChange={e => setValue('active', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'hsl(var(--brand-primary))' }}
                />
                <span style={{ fontSize: 13, color: 'hsl(var(--text-secondary))' }}>Servicio activo</span>
              </label>
              {error && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servicio'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
