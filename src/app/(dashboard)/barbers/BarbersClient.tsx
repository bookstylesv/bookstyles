'use client';

/**
 * BarbersClient — Grid de barberos con componentes reutilizables.
 * Usa: FormField, EmptyState, Dialog propio, Phosphor Icons.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Users, Clock, PencilSimple, Eye, EyeSlash, Plus, Scissors } from '@phosphor-icons/react';

// ── Tipos ──────────────────────────────────────────────────────────────────
type Schedule   = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };
type Barber = {
  id: number; bio: string | null; specialties: string[]; active: boolean;
  scheduleText: string; user: BarberUser; schedules: Schedule[];
};
type CreateForm = { fullName: string; email: string; password: string; phone: string; bio: string; specialtiesInput: string };

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function AvatarInitials({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.35), userSelect: 'none',
    }}>
      {getInitials(name)}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);

  // Estado crear
  const [creating,      setCreating]      = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [form, setForm] = useState<CreateForm>({ fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '' });

  // Estado editar
  const [editing,          setEditing]          = useState<Barber | null>(null);
  const [bio,              setBio]              = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [editLoading,      setEditLoading]      = useState(false);

  function openCreate() {
    setForm({ fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '' });
    setCreateError(''); setShowPass(false); setCreating(true);
  }

  function setField(field: keyof CreateForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setCreateError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    setCreateLoading(true); setCreateError('');
    try {
      const specialties = form.specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/barbers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim().toLowerCase(), password: form.password, phone: form.phone.trim() || undefined, bio: form.bio.trim() || undefined, specialties }),
      });
      const json = await res.json();
      if (!res.ok) { const msg = json.error?.message ?? 'Error al crear barbero'; setCreateError(msg); toast.error(msg); return; }
      setBarbers(prev => [...prev, json.data]);
      setCreating(false);
      toast.success(`✂️ Barbero "${form.fullName.trim()}" creado`);
    } catch { const msg = 'Error de red'; setCreateError(msg); toast.error(msg); }
    finally { setCreateLoading(false); }
  }

  function openEdit(b: Barber) {
    setEditing(b); setBio(b.bio ?? ''); setSpecialtiesInput(b.specialties.join(', '));
  }

  async function saveEdit() {
    if (!editing) return;
    setEditLoading(true);
    try {
      const specialties = specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/barbers/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio, specialties }) });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === editing.id ? { ...b, ...json.data } : b));
        setEditing(null); toast.success('Perfil actualizado');
      } else { toast.error(json.error?.message ?? 'Error al guardar'); }
    } catch { toast.error('Error de red'); } finally { setEditLoading(false); }
  }

  return (
    <>
      <PageHeader
        title="Barberos"
        description={`${barbers.length} barbero${barbers.length !== 1 ? 's' : ''} registrado${barbers.length !== 1 ? 's' : ''}`}
        action={<Button onClick={openCreate}><Plus size={15} weight="bold" /> Nuevo barbero</Button>}
      />

      {barbers.length === 0 ? (
        <EmptyState
          icon={<Users size={36} weight="thin" />}
          title="Sin barberos registrados"
          description="Agrega el primer barbero de tu equipo"
          action={<Button onClick={openCreate}><Plus size={15} weight="bold" /> Agregar barbero</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 20 }}>
          {barbers.map(b => (
            <div key={b.id} className="speeddan-card" style={{ opacity: b.active ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Cabecera */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AvatarInitials name={b.user.fullName} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.user.fullName}
                  </div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.user.email}
                  </div>
                  {b.user.phone && (
                    <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 1 }}>{b.user.phone}</div>
                  )}
                </div>
                <Badge variant={b.active ? 'default' : 'secondary'}>{b.active ? 'Activo' : 'Inactivo'}</Badge>
              </div>

              {b.bio && (
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', margin: 0, lineHeight: 1.5 }}>{b.bio}</p>
              )}

              {b.specialties.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {b.specialties.map(sp => (
                    <Badge key={sp} variant="outline" style={{ fontSize: 11 }}>{sp}</Badge>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--text-muted))' }}>
                <Clock size={13} style={{ flexShrink: 0 }} />
                <span>{b.scheduleText}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid hsl(var(--border-default))', marginTop: 'auto' }}>
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                  <PencilSimple size={13} weight="bold" /> Editar perfil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diálogo CREAR */}
      <Dialog open={creating} onOpenChange={v => { if (!v) setCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo barbero</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Nombre completo *">
              <Input value={form.fullName} onChange={e => setField('fullName', e.target.value)} placeholder="Carlos López" autoFocus />
            </FormField>
            <FormField label="Email *">
              <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="carlos@barberia.com" />
            </FormField>
            <FormField label="Contraseña *">
              <div style={{ position: 'relative' }}>
                <Input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setField('password', e.target.value)} placeholder="Mínimo 6 caracteres" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))', padding: 0, display: 'flex' }}>
                  {showPass ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>
            <FormField label="Teléfono">
              <Input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+503 7000-0000" />
            </FormField>
            <FormField label="Biografía">
              <Input value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Especialista en fades…" />
            </FormField>
            <FormField label="Especialidades (separadas por coma)">
              <Input value={form.specialtiesInput} onChange={e => setField('specialtiesInput', e.target.value)} placeholder="Fade, Barba, Diseño" />
            </FormField>
            {createError && <p style={{ color: 'hsl(var(--status-error))', fontSize: 13, margin: 0 }}>{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createLoading}>{createLoading ? 'Creando...' : 'Crear barbero'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo EDITAR */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil — {editing?.user.fullName}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <FormField label="Biografía">
              <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Descripción del barbero…" autoFocus />
            </FormField>
            <FormField label="Especialidades (separadas por coma)">
              <Input value={specialtiesInput} onChange={e => setSpecialtiesInput(e.target.value)} placeholder="Fade, Barba, Diseño…" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
