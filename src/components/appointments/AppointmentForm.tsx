'use client';

/**
 * AppointmentForm — Formulario para crear/editar citas.
 * Selecciona: cliente, barbero, servicio, fecha+hora, notas.
 */

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

type Barber   = { id: number; user: { fullName: string } };
type Service  = { id: number; name: string; price: number; duration: number };
type Client   = { id: number; fullName: string };

type FormValues = {
  clientId: string;
  barberId: string;
  serviceId: string;
  startTime: string;
  notes: string;
};

type Props = {
  barbers: Barber[];
  services: Service[];
  clients: Client[];
  onSubmit: (data: FormValues) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export default function AppointmentForm({ barbers, services, clients, onSubmit, loading, error }: Props) {
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: { clientId: '', barberId: '', serviceId: '', startTime: '', notes: '' },
  });

  const barberId  = watch('barberId')  || '';
  const serviceId = watch('serviceId') || '';
  const clientId  = watch('clientId')  || '';

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>

        <FormField label="Cliente *">
          <Select value={clientId} onValueChange={v => setValue('clientId', v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Barbero *">
          <Select value={barberId} onValueChange={v => setValue('barberId', v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar barbero" />
            </SelectTrigger>
            <SelectContent>
              {barbers.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.user.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Servicio *">
          <Select value={serviceId} onValueChange={v => setValue('serviceId', v ?? '')}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar servicio" />
            </SelectTrigger>
            <SelectContent>
              {services.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name} — {s.duration}min — ${s.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Fecha y hora *" id="appt-start">
          <Input
            id="appt-start"
            type="datetime-local"
            {...register('startTime', { required: true })}
          />
        </FormField>

        <FormField label="Notas" id="appt-notes">
          <Input id="appt-notes" {...register('notes')} placeholder="Observaciones opcionales..." />
        </FormField>

        {error && <p style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Crear cita'}
        </Button>
      </div>
    </form>
  );
}
