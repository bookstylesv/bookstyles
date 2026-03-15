'use client';

/**
 * BarbersClient — Grid de tarjetas de barberos.
 * ✅ Avatar inline con iniciales (no depende de bg-muted)
 * ✅ Diálogo crear barbero (fullName, email, password, phone, bio, especialidades)
 * ✅ Diálogo editar perfil (bio + especialidades)
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PencilIcon, ClockIcon, PlusIcon, EyeIcon, EyeOffIcon } from 'lucide-react';

/* ─── Tipos ─────────────────────────────────────────────────── */
type Schedule   = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };
type Barber = {
  id:           number;
  bio:          string | null;
  specialties:  string[];
  active:       boolean;
  scheduleText: string;
  user:         BarberUser;
  schedules:    Schedule[];
};
type CreateForm = {
  fullName:         string;
  email:            string;
  password:         string;
  phone:            string;
  bio:              string;
  specialtiesInput: string;
};

/* ─── Helpers ───────────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Avatar con iniciales — usa CSS vars de la paleta, siempre visible */
function AvatarInitials({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   '50%',
      background:     'linear-gradient(135deg, hsl(var(--brand-primary)) 0%, hsl(var(--brand-primary-dark)) 100%)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      color:          '#fff',
      fontWeight:     700,
      fontSize:       Math.round(size * 0.35),
      flexShrink:     0,
      userSelect:     'none',
    }}>
      {getInitials(name)}
    </div>
  );
}

/* ─── Componente principal ───────────────────────────────────── */
export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);

  /* estado crear */
  const [creating,      setCreating]      = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError,   setCreateError]   = useState('');
  const [form, setForm] = useState<CreateForm>({
    fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '',
  });

  /* estado editar */
  const [editing,          setEditing]          = useState<Barber | null>(null);
  const [bio,              setBio]              = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [editLoading,      setEditLoading]      = useState(false);

  /* ── Crear ─────────────────────────────────────────────────── */
  function openCreate() {
    setForm({ fullName: '', email: '', password: '', phone: '', bio: '', specialtiesInput: '' });
    setCreateError('');
    setShowPass(false);
    setCreating(true);
  }

  function setField(field: keyof CreateForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setCreateError('Nombre, email y contraseña son obligatorios.');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const specialties = form.specialtiesInput
        .split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/barbers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:   form.fullName.trim(),
          email:      form.email.trim().toLowerCase(),
          password:   form.password,
          phone:      form.phone.trim()  || undefined,
          bio:        form.bio.trim()    || undefined,
          specialties,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error?.message ?? 'Error al crear barbero'); return; }
      setBarbers(prev => [...prev, json.data]);
      setCreating(false);
    } catch {
      setCreateError('Error de red. Verifica tu conexión.');
    } finally {
      setCreateLoading(false);
    }
  }

  /* ── Editar ─────────────────────────────────────────────────── */
  function openEdit(b: Barber) {
    setEditing(b);
    setBio(b.bio ?? '');
    setSpecialtiesInput(b.specialties.join(', '));
  }

  async function saveEdit() {
    if (!editing) return;
    setEditLoading(true);
    try {
      const specialties = specialtiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`/api/barbers/${editing.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, specialties }),
      });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === editing.id ? { ...b, ...json.data } : b));
        setEditing(null);
      }
    } finally {
      setEditLoading(false);
    }
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <>
      {/* Barra superior */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Button onClick={openCreate}>
          <PlusIcon size={16} /> Nuevo barbero
        </Button>
      </div>

      {/* Empty state */}
      {barbers.length === 0 && (
        <div style={{
          background:   'hsl(var(--bg-surface))',
          border:       '1px solid hsl(var(--border-default))',
          borderRadius: 'var(--radius-lg)',
          padding:      '64px 24px',
          textAlign:    'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
          <p style={{ color: 'hsl(var(--text-muted))', margin: '0 0 16px' }}>
            No hay barberos registrados aún.
          </p>
          <Button onClick={openCreate}>
            <PlusIcon size={16} /> Agregar primer barbero
          </Button>
        </div>
      )}

      {/* Grid de cards */}
      {barbers.length > 0 && (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap:                 16,
        }}>
          {barbers.map(b => (
            <div
              key={b.id}
              style={{
                background:    'hsl(var(--bg-surface))',
                border:        '1px solid hsl(var(--border-default))',
                borderRadius:  'var(--radius-lg)',
                padding:       '20px',
                display:       'flex',
                flexDirection: 'column',
                gap:           14,
                opacity:       b.active ? 1 : 0.6,
                transition:    'box-shadow 0.2s',
              }}
            >
              {/* Cabecera: avatar + datos + badge estado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AvatarInitials name={b.user.fullName} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight:   600,
                    color:        'hsl(var(--text-primary))',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {b.user.fullName}
                  </div>
                  <div style={{
                    fontSize:     12,
                    color:        'hsl(var(--text-muted))',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                    marginTop:    2,
                  }}>
                    {b.user.email}
                  </div>
                  {b.user.phone && (
                    <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 1 }}>
                      📞 {b.user.phone}
                    </div>
                  )}
                </div>
                <Badge variant={b.active ? 'default' : 'secondary'}>
                  {b.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              {/* Bio */}
              {b.bio && (
                <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', margin: 0, lineHeight: 1.5 }}>
                  {b.bio}
                </p>
              )}

              {/* Especialidades */}
              {b.specialties.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {b.specialties.map(sp => (
                    <Badge key={sp} variant="outline" style={{ fontSize: 11 }}>{sp}</Badge>
                  ))}
                </div>
              )}

              {/* Horario */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'hsl(var(--text-muted))' }}>
                <ClockIcon size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{b.scheduleText}</span>
              </div>

              {/* Acciones */}
              <div style={{
                display:        'flex',
                justifyContent: 'flex-end',
                paddingTop:     10,
                borderTop:      '1px solid hsl(var(--border-default))',
                marginTop:      'auto',
              }}>
                <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                  <PencilIcon size={13} /> Editar perfil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Diálogo CREAR ──────────────────────────────────────── */}
      <Dialog open={creating} onOpenChange={v => { if (!v) setCreating(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✂️ Nuevo barbero</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div>
              <Label htmlFor="bc-name">Nombre completo *</Label>
              <Input
                id="bc-name"
                value={form.fullName}
                onChange={e => setField('fullName', e.target.value)}
                placeholder="Carlos López"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="bc-email">Email *</Label>
              <Input
                id="bc-email"
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="carlos@barberia.com"
              />
            </div>

            {/* Password con toggle de visibilidad */}
            <div>
              <Label htmlFor="bc-pass">Contraseña *</Label>
              <div style={{ position: 'relative' }}>
                <Input
                  id="bc-pass"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position:   'absolute',
                    right:      10,
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    color:      'hsl(var(--text-muted))',
                    padding:    0,
                    display:    'flex',
                    lineHeight: 0,
                  }}
                >
                  {showPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="bc-phone">Teléfono</Label>
              <Input
                id="bc-phone"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+503 7000-0000"
              />
            </div>

            <div>
              <Label htmlFor="bc-bio">Biografía</Label>
              <Input
                id="bc-bio"
                value={form.bio}
                onChange={e => setField('bio', e.target.value)}
                placeholder="Especialista en fades y degradados…"
              />
            </div>

            <div>
              <Label htmlFor="bc-specs">Especialidades (separadas por coma)</Label>
              <Input
                id="bc-specs"
                value={form.specialtiesInput}
                onChange={e => setField('specialtiesInput', e.target.value)}
                placeholder="Fade, Barba, Diseño, Keratina"
              />
            </div>

            {createError && (
              <p style={{ color: 'hsl(var(--destructive))', fontSize: 13, margin: 0 }}>
                {createError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? 'Creando...' : 'Crear barbero'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo EDITAR ─────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil — {editing?.user.fullName}</DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <div>
              <Label htmlFor="be-bio">Biografía</Label>
              <Input
                id="be-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Descripción del barbero…"
              />
            </div>
            <div>
              <Label htmlFor="be-specs">Especialidades (separadas por coma)</Label>
              <Input
                id="be-specs"
                value={specialtiesInput}
                onChange={e => setSpecialtiesInput(e.target.value)}
                placeholder="Fade, Barba, Diseño…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editLoading}>
              {editLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
