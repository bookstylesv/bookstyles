'use client';

/**
 * BillingClient — Caja de pagos con KPIs y tabla.
 * Permite registrar pagos y cambiar estado/método.
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
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

type UnpaidAppointment = {
  id: number;
  startTime: string;
  client: { id: number; fullName: string };
  barber: { user: { fullName: string } };
  service: { id: number; name: string; price: number };
};

type Payment = {
  id:        number;
  amount:    number;
  method:    string;
  status:    string;
  paidAt:    string | null;
  createdAt: string;
  notes:     string | null;
  appointment: {
    id:      number;
    startTime: string;
    client:  { id: number; fullName: string };
    barber:  { user: { fullName: string } };
    service: { id: number; name: string };
  };
};

type Stats = {
  ingresosHoy:    number;
  ingresosMes:    number;
  pendienteSum:   number;
  pendienteCount: number;
};

type FormValues = {
  appointmentId: string;
  amount:        string;
  method:        string;
  notes:         string;
};

// ── Helpers ───────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', QR: 'QR',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PAID: 'default', PENDING: 'secondary', REFUNDED: 'destructive',
};
const STATUS_LABELS: Record<string, string> = {
  PAID: 'Pagado', PENDING: 'Pendiente', REFUNDED: 'Reembolsado',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

// ── Componente principal ──────────────────────────────────

type Props = {
  initialPayments:     Payment[];
  initialUnpaid:       UnpaidAppointment[];
  initialStats:        Stats;
};

export default function BillingClient({ initialPayments, initialUnpaid, initialStats }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [unpaid, setUnpaid]     = useState<UnpaidAppointment[]>(initialUnpaid);
  const [stats, setStats]       = useState<Stats>(initialStats);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: { appointmentId: '', amount: '', method: 'CASH', notes: '' },
  });

  const methodVal = watch('method') || 'CASH';
  const apptIdVal = watch('appointmentId') || '';

  // Auto-fill amount when appointment is selected
  function onApptSelect(v: string | null) {
    setValue('appointmentId', v ?? '');
    const appt = unpaid.find(a => String(a.id) === v);
    if (appt) setValue('amount', String(appt.service.price));
  }

  function openRegister() {
    reset({ appointmentId: '', amount: '', method: 'CASH', notes: '' });
    setError('');
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: Number(values.appointmentId),
          amount:        parseFloat(values.amount),
          method:        values.method,
          notes:         values.notes || undefined,
          status:        'PAID',
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Error'); return; }

      setPayments(prev => [json.data, ...prev]);
      setUnpaid(prev => prev.filter(a => a.id !== Number(values.appointmentId)));
      // Actualizar stats localmente
      setStats(prev => ({
        ...prev,
        ingresosHoy:    prev.ingresosHoy + parseFloat(values.amount),
        ingresosMes:    prev.ingresosMes + parseFloat(values.amount),
        pendienteCount: Math.max(0, prev.pendienteCount - 1),
      }));
      setOpen(false);
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterStatus
    ? payments.filter(p => p.status === filterStatus)
    : payments;

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Ingresos hoy',   value: formatMoney(stats.ingresosHoy),    color: 'var(--color-success)' },
          { label: 'Ingresos mes',   value: formatMoney(stats.ingresosMes),    color: 'var(--color-success)' },
          { label: 'Pendiente ($)',  value: formatMoney(stats.pendienteSum),   color: 'var(--color-warning)' },
          { label: 'Pendientes (#)', value: String(stats.pendienteCount),      color: 'var(--color-warning)' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background:   'hsl(var(--bg-surface))',
            border:       '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--radius-lg)',
            padding:      '16px 20px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: `hsl(${kpi.color})`, margin: 0 }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Barra */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? '')}>
          <SelectTrigger style={{ width: 180 }}>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PAID">Pagados</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="REFUNDED">Reembolsados</SelectItem>
          </SelectContent>
        </Select>
        <div style={{ flex: 1 }} />
        {unpaid.length > 0 && (
          <Button onClick={openRegister}>
            <PlusIcon /> Registrar pago ({unpaid.length} pendiente{unpaid.length > 1 ? 's' : ''})
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div style={{
        background:   'hsl(var(--bg-surface))',
        border:       '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--radius-lg)',
        overflow:     'hidden',
      }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Barbero</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha cita</TableHead>
              <TableHead>Fecha pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '40px 0' }}>
                  Sin registros de pago
                </TableCell>
              </TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell style={{ fontWeight: 500 }}>
                  {p.appointment.client.fullName}
                </TableCell>
                <TableCell style={{ color: 'hsl(var(--text-secondary))' }}>
                  {p.appointment.barber.user.fullName}
                </TableCell>
                <TableCell style={{ color: 'hsl(var(--text-secondary))' }}>
                  {p.appointment.service.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{METHOD_LABELS[p.method] ?? p.method}</Badge>
                </TableCell>
                <TableCell style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(p.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_COLORS[p.status] ?? 'outline'}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Badge>
                </TableCell>
                <TableCell style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>
                  {formatDate(p.appointment.startTime)}
                </TableCell>
                <TableCell style={{ fontSize: 12, color: 'hsl(var(--text-muted))' }}>
                  {formatDate(p.paidAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginTop: 10, textAlign: 'right' }}>
          {filtered.length} registros
          {filterStatus === 'PAID' && ` · Total: ${formatMoney(filtered.reduce((s, p) => s + p.amount, 0))}`}
        </p>
      )}

      {/* Diálogo Registrar pago */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>

              <div>
                <Label>Cita *</Label>
                <Select value={apptIdVal} onValueChange={onApptSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar cita" />
                  </SelectTrigger>
                  <SelectContent>
                    {unpaid.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.client.fullName} — {a.service.name} ({new Date(a.startTime).toLocaleDateString('es-SV')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label htmlFor="pay-amount">Monto ($) *</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register('amount', { required: true })}
                    placeholder="10.00"
                  />
                </div>
                <div>
                  <Label>Método *</Label>
                  <Select value={methodVal} onValueChange={v => setValue('method', v ?? 'CASH')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CARD">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="QR">QR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="pay-notes">Notas</Label>
                <Input id="pay-notes" {...register('notes')} placeholder="Observaciones opcionales" />
              </div>

              {error && <p style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !apptIdVal}>
                {loading ? 'Registrando...' : 'Registrar pago'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
