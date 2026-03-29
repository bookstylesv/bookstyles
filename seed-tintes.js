"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tenantId, categoria, productos, createdCount, _i, productos_1, prod;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tenantId = 1;
                    return [4 /*yield*/, prisma.barberCategoriaProducto.findFirst({
                            where: { tenantId: tenantId, nombre: 'Tintes' }
                        })];
                case 1:
                    categoria = _a.sent();
                    if (!!categoria) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.barberCategoriaProducto.create({
                            data: {
                                tenantId: tenantId,
                                nombre: 'Tintes',
                                color: 'purple',
                                activa: true
                            }
                        })];
                case 2:
                    categoria = _a.sent();
                    console.log("Created category \"Tintes\" with ID ".concat(categoria.id));
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Found category \"Tintes\" with ID ".concat(categoria.id));
                    _a.label = 4;
                case 4:
                    productos = [
                        { codigo: 'TNT-001', nombre: 'Tinte Igora Royal 6-0 Rubio Oscuro', precioVenta: 12.00, precioComision: 3.00 },
                        { codigo: 'TNT-002', nombre: 'Tinte Igora Royal 7-0 Rubio Medio', precioVenta: 12.00, precioComision: 3.00 },
                        { codigo: 'TNT-003', nombre: 'Tinte Igora Royal 1-0 Negro', precioVenta: 12.00, precioComision: null }, // no commision test
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
                    createdCount = 0;
                    _i = 0, productos_1 = productos;
                    _a.label = 5;
                case 5:
                    if (!(_i < productos_1.length)) return [3 /*break*/, 8];
                    prod = productos_1[_i];
                    // Upsert to handle re-runs gracefully
                    return [4 /*yield*/, prisma.barberProducto.upsert({
                            where: {
                                tenantId_codigo: {
                                    tenantId: tenantId,
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
                                tenantId: tenantId,
                                codigo: prod.codigo,
                                nombre: prod.nombre,
                                categoriaId: categoria.id,
                                precioVenta: prod.precioVenta,
                                precioComision: prod.precioComision,
                                unidadMedida: 'UNIDAD',
                                activo: true
                            }
                        })];
                case 6:
                    // Upsert to handle re-runs gracefully
                    _a.sent();
                    createdCount++;
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log("Seeded ".concat(createdCount, " products in category \"Tintes\"."));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
