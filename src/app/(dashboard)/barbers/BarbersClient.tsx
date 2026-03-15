'use client';

/**
 * BarbersClient — Vista de tarjetas de barberos.
 * Muestra: avatar con iniciales, nombre, especialidades, horario, estado.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PencilIcon, ClockIcon } from 'lucide-react';

type Schedule = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type BarberUser = { id: number; fullName: string; email: string; phone: string | null; avatarUrl: string | null; active: boolean };

type Barber = {
  id: number;
  bio: string | null;
  specialties: string[];
  active: boolean;
  scheduleText: string;
  user: BarberUser;
  schedules: Schedule[];
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function BarbersClient({ initialBarbers }: { initialBarbers: Barber[] }) {
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [bio, setBio] = useState('');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [loading, setLoading] = useState(false);

  function openEdit(b: Barber) {
    setEditing(b);
    setBio(b.bio ?? '');
    setSpecialtiesInput(b.specialties.join(', '));
  }

  async function saveEdit() {
    if (!editing) return;
    setLoading(true);
    try {
      const specialties = specialtiesInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/barbers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, specialties }),
      });
      const json = await res.json();
      if (res.ok) {
        setBarbers(prev => prev.map(b => b.id === editing.id ? json.data : b));
        setEditing(null);
      }
    } finally {
      setLoading(false);
    }
  }

  if (barbers.length === 0) {
    return (
      <div style={{
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'hsl(var(--text-muted))',
      }}>
        No hay barberos registrados aún.
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {barbers.map(b => (
          <div key={b.id} style={{
            background: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size="lg">
                {b.user.avatarUrl && <AvatarImage src={b.user.avatarUrl} alt={b.user.fullName} />}
                <AvatarFallback>{getInitials(b.user.fullName)}</AvatarFallback>
              </Avatar>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{b.user.fullName}</div>
                <div style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>{b.user.email}</div>
              </div>
              <Badge variant={b.active ? 'default' : 'secondary'}>
                {b.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            {/* Bio */}
            {b.bio && (
              <p style={{ fontSize: 13, color: 'hsl(var(--text-secondary))', margin: 0 }}>
                {b.bio}
              </p>
            )}

            {/* Specialties */}
            {b.specialties.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {b.specialties.map(sp => (
                  <Badge key={sp} variant="outline">{sp}</Badge>
                ))}
              </div>
            )}

            {/* Schedule */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'hsl(var(--text-muted))' }}>
              <ClockIcon size={13} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{b.scheduleText}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                <PencilIcon /> Editar perfil
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil — {editing?.user.fullName}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <div>
              <Label htmlFor="barber-bio">Biografía</Label>
              <Input id="barber-bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Descripción del barbero..." />
            </div>
            <div>
              <Label htmlFor="barber-specs">Especialidades (separadas por coma)</Label>
              <Input
                id="barber-specs"
                value={specialtiesInput}
                onChange={e => setSpecialtiesInput(e.target.value)}
                placeholder="Fade, Barba, Diseño..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
