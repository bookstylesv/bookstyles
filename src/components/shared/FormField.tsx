'use client';

/**
 * FormField — Wrapper reutilizable: label + campo + mensaje de error.
 * Elimina código duplicado en formularios de Barbers, Clients, Services, Billing, etc.
 *
 * Uso:
 *   <FormField label="Nombre *" error={errors.name?.message}>
 *     <Input {...register('name')} placeholder="..." />
 *   </FormField>
 */

import * as React from 'react';

type FormFieldProps = {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function FormField({ label, error, hint, children, className = '', id }: FormFieldProps) {
  return (
    <div className={`speeddan-form-field ${className}`}>
      {label && (
        <label
          htmlFor={id}
          data-slot="label"
          className="speeddan-label"
        >
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="speeddan-field-hint">{hint}</p>
      )}
      {error && (
        <p className="speeddan-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
