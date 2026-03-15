'use client';

/**
 * ServicesClient — CRUD interactivo de servicios.
 * Tabla + Dialog de crear/editar + confirmación de borrado.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';

type Service = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string | null;
  active: boolean;
};

type FormValues = {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  active: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  cabello: 'Cabello',
  barba: 'Barba',
  combo: 'Combo',
  tratamiento: 'Tratamiento',
};

const CATEGORY_COLORS: Record<string, string> = {
  cabello: 'default',
  barba: 'secondary',
  combo: 'outline',
  tratamiento: 'destructive',
};

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>();
  const selectedCategory = watch('category') ?? '';
  const activeVal = watch('active');

  function openCreate() {
    setEditing(null);
    reset({ name: '', description: '', price: '', duration: '', category: 'cabello', active: true });
    setError('');
    setOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    reset({
      name: s.name,
      description: s.description ?? '',
      price: String(s.price),
      duration: String(s.duration),
      category: s.category ?? 'cabello',
      active: s.active,
    });
    setError('');
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError('');
    try {
      const body = {
        name: values.name,
        description: values.description || undefined,
        price: parseFloat(values.price),
        duration: parseInt(values.duration, 10),
        category: values.category || undefined,
        active: values.active,
      };

      const url = editing ? `/api/services/${editing.id}` : '/api/services';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error?.message ?? 'Error al guardar';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (editing) {
        setServices(prev => prev.map(s => s.id === editing.id ? json.data : s));
        toast.success(`Servicio "${values.name}" actualizado`);
      } else {
        setServices(prev => [json.data, ...prev]);
        toast.success(`Servicio "${values.name}" creado`);
      }
      setOpen(false);
    } catch {
      setError('Error de red');
      toast.error('Error de red. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`¿Eliminar "${service.name}"?`)) return;
    const res = await fetch(`/api/services/${service.id}`, { method: 'DELETE' });
    if (res.ok) {
      setServices(prev => prev.filter(s => s.id !== service.id));
      toast.success(`Servicio "${service.name}" eliminado`);
    } else {
      toast.error('No se pudo eliminar el servicio');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button onClick={openCreate}>
          <PlusIcon /> Nuevo servicio
        </Button>
      </div>

      <div style={{
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '32px 0' }}>
                  No hay servicios. Crea el primero.
                </TableCell>
              </TableRow>
            )}
            {services.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  {s.description && (
                    <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2 }}>
                      {s.description.slice(0, 60)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {s.category ? (
                    <Badge variant={CATEGORY_COLORS[s.category] as never ?? 'outline'}>
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>${s.price.toFixed(2)}</TableCell>
                <TableCell>{s.duration} min</TableCell>
                <TableCell>
                  <Badge variant={s.active ? 'default' : 'secondary'}>
                    {s.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(s)}>
                      <TrashIcon className="text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
              <div>
                <Label htmlFor="svc-name">Nombre *</Label>
                <Input id="svc-name" {...register('name', { required: true })} placeholder="Corte de cabello" />
              </div>
              <div>
                <Label htmlFor="svc-desc">Descripción</Label>
                <Input id="svc-desc" {...register('description')} placeholder="Descripción opcional" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label htmlFor="svc-price">Precio *</Label>
                  <Input id="svc-price" type="number" step="0.01" min="0" {...register('price', { required: true })} placeholder="10.00" />
                </div>
                <div>
                  <Label htmlFor="svc-dur">Duración (min) *</Label>
                  <Input id="svc-dur" type="number" min="1" {...register('duration', { required: true })} placeholder="30" />
                </div>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={selectedCategory || ''} onValueChange={v => setValue('category', v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cabello">Cabello</SelectItem>
                    <SelectItem value="barba">Barba</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                    <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="svc-active"
                  checked={activeVal ?? true}
                  onChange={e => setValue('active', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <Label htmlFor="svc-active">Servicio activo</Label>
              </div>
              {error && <p style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear servicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
