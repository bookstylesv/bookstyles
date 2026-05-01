/**
 * GET /api/superadmin/tenants/:id/import/template?resource=xxx
 * Genera y devuelve un archivo .xlsx de plantilla para el recurso solicitado.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validateSuperadminKey, unauthorizedResponse } from '@/lib/superadmin-auth';
import * as XLSX from 'xlsx';
import { isValidResource, TEMPLATE_COLUMNS, TEMPLATE_EXAMPLE, RESOURCE_LABEL } from '@/lib/import-limits';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!validateSuperadminKey(req)) return unauthorizedResponse();

  const resource = req.nextUrl.searchParams.get('resource') ?? '';
  if (!isValidResource(resource))
    return NextResponse.json({ error: `Recurso "${resource}" no reconocido.` }, { status: 400 });

  const columns  = TEMPLATE_COLUMNS[resource];
  const example  = TEMPLATE_EXAMPLE[resource];
  const label    = RESOURCE_LABEL[resource];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([example], { header: columns });

  // Anchos de columna automáticos
  ws['!cols'] = columns.map(c => ({ wch: Math.max(c.length + 4, 18) }));

  XLSX.utils.book_append_sheet(wb, ws, label);

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  console.log(`[import/template] resource:${resource} descargada`);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-${resource}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
