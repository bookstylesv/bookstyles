/**
 * errors.ts — Clases de error tipadas para toda la app.
 * Cada error tiene código HTTP y código de app para
 * que el cliente sepa exactamente qué pasó.
 * No mezclar con lógica de negocio.
 */

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class TenantSuspendedError extends AppError {
  constructor() {
    super('Esta barbería está suspendida. Contacta al administrador.', 402, 'TENANT_SUSPENDED');
    this.name = 'TenantSuspendedError';
  }
}

/** Convierte cualquier error a AppError */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new AppError(err.message, 500);
  return new AppError('Error desconocido', 500);
}
