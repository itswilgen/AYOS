import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; startAdornment?: ReactNode; endAdornment?: ReactNode }
export default function FormField({ label, error, hint, startAdornment, endAdornment, id, ...props }: Props) {
  const fieldId = id ?? props.name
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  return <div className={`form-field${error ? ' has-error' : ''}`}>
    <label htmlFor={fieldId}>{label}</label>
    <div className={`input-wrap${startAdornment ? ' has-leading' : ''}${endAdornment ? ' has-trailing' : ''}`}>
      {startAdornment && <span className="field-leading" aria-hidden="true">{startAdornment}</span>}
      <input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined} {...props} />
      {endAdornment}
    </div>
    {hint && <p id={hintId} className="field-hint">{hint}</p>}{error && <p id={errorId} className="field-error" role="alert">{error}</p>}
  </div>
}
