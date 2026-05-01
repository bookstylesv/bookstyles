/**
 * GET /api/superadmin/tenants/:id/import/template?resource=xxx
 * Genera y devuelve un archivo .xlsx con DOS hojas:
 *   Hoja 1 — "Plantilla"  → solo encabezados, lista para llenar
 *   Hoja 2 — "Ejemplos"   → 5 filas de muestra con datos reales
 * Al importar, el endpoint de importación solo lee la Hoja 1.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import * as XLSX from 'xlsx';
import { isValidResource, TEMPLATE_COLUMNS, TEMPLATE_EXAMPLES, RESOURCE_LABEL } from '@/lib/import-limits';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const resource = req.nextUrl.searchParams.get('resource') ?? '';
  if (!isValidResource(resource))
    return NextResponse.json({ error: `Recurso "${resource}" no reconocido.` }, { status: 400 });

  const columns  = TEMPLATE_COLUMNS[resource];
  const examples = TEMPLATE_EXAMPLES[resource];
  const label    = RESOURCE_LABEL[resource];

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: plantilla vacía (solo headers) ──────────────
  const emptyRow = Object.fromEntries(columns.map(c => [c, '']));
  const wsTemplate = XLSX.utils.json_to_sheet([emptyRow], { header: columns });

  // Estilo de encabezados: ancho automático
  wsTemplate['!cols'] = columns.map(c => ({ wch: Math.max(c.length + 4, 20) }));

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Plantilla');

  // ── Hoja 2: 5 filas de ejemplo ──────────────────────────
  const wsExamples = XLSX.utils.json_to_sheet(examples, { header: columns });
  wsExamples['!cols'] = columns.map(c => ({ wch: Math.max(c.length + 4, 20) }));

  XLSX.utils.book_append_sheet(wb, wsExamples, 'Ejemplos');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  console.log(`[import/template] resource:${resource} label:${label} descargada`);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-${resource}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
