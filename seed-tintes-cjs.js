const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenantId = 1;

    let categoria = await prisma.barberCategoriaProducto.findFirst({
        where: { tenantId, nombre: 'Tintes' }
    });

    if (!categoria) {
        categoria = await prisma.barberCategoriaProducto.create({
            data: {
                tenantId,
                nombre: 'Tintes',
                color: 'purple',
                activa: true
            }
        });
        console.log(`Created category "Tintes" with ID ${categoria.id}`);
    }

    const productos = [
        { codigo: 'TNT-001', nombre: 'Tinte Igora Royal 6-0 Rubio Oscuro', precioVenta: 12.00, precioComision: 3.00 },
        { codigo: 'TNT-002', nombre: 'Tinte Igora Royal 7-0 Rubio Medio', precioVenta: 12.00, precioComision: 3.00 },
        { codigo: 'TNT-003', nombre: 'Tinte Igora Royal 1-0 Negro', precioVenta: 12.00, precioComision: null },
        { codigo: 'TNT-004', nombre: 'Tinte Igora Royal 9-1 Rubio Muy Claro Ceniza', precioVenta: 14.00, precioComision: 4.00 },
        { codigo: 'TNT-005', nombre: 'Tinte Alfaparf Evolution 8.1 Rubio Claro Ceniza', precioVenta: 11.50, precioComision: 2.50 },
        { codigo: 'TNT-006', nombre: 'Tinte Alfaparf Evolution 7.32 Rubio Medio Dorado Irisado', precioVenta: 11.50, precioComision: 2.50 },
        { codigo: 'TNT-007', nombre: 'Tinte Alfaparf Evolution 5.0 Castaño Claro', precioVenta: 11.50, precioComision: null },
        { codigo: 'TNT-008', nombre: 'Tinte Salerm Vison 4 Castaño Medio', precioVenta: 9.00, precioComision: 1.50 },
        { codigo: 'TNT-009', nombre: 'Tinte Salerm Vison 6.1 Rubio Oscuro Ceniza', precioVenta: 9.00, precioComision: 1.50 },
        { codigo: 'TNT-010', nombre: 'Tinte Salerm Vison 8.12 Rubio Claro Perla', precioVenta: 10.00, precioComision: 2.00 },
        { codigo: 'TNT-011', nombre: 'Tinte Küül Color System 6.66 Rubio Oscuro Rojo Intenso', precioVenta: 7.50, precioComision: 1.00 },
        { codigo: 'TNT-012', nombre: 'Tinte Küül Color System 7.44 Rubio Medio Cobre Intenso', precioVenta: 7.50, precioComision: 1.00 },
        { codigo: 'TNT-013', nombre: 'Tinte Küül Color System 1.11 Negro Azulado', precioVenta: 7.50, precioComision: 1.00 },
        { codigo: 'TNT-014', nombre: 'Decolorante Igora Vario Blond Plus 450g', precioVenta: 28.00, precioComision: 5.00 },
        { codigo: 'TNT-015', nombre: 'Decolorante Salerm Magic Bleach 500g', precioVenta: 22.00, precioComision: 4.00 },
    ];

    let createdCount = 0;

    for (const prod of productos) {
        await prisma.barberProducto.upsert({
            where: {
                tenantId_codigo: {
                    tenantId,
                    codigo: prod.codigo
                }
            },
            update: {
                nombre: prod.nombre,
                categoriaId: categoria.id,
                precioVenta: prod.precioVenta,
                precioComision: prod.precioComision,
                unidadMedida: 'UNIDAD'
            },
            create: {
                tenantId,
                codigo: prod.codigo,
                nombre: prod.nombre,
                categoriaId: categoria.id,
                precioVenta: prod.precioVenta,
                precioComision: prod.precioComision,
                unidadMedida: 'UNIDAD',
                activo: true
            }
        });
        createdCount++;
    }

    console.log(`Successfully seeded ${createdCount} products in category "Tintes".`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
