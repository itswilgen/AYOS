import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import FormField from './FormField'
import type { InputHTMLAttributes } from 'react'
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; error?: string; hint?: string }
export default function PasswordField({ label, error, hint, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return <FormField label={label} type={visible ? 'text' : 'password'} error={error} hint={hint} autoComplete={props.autoComplete} {...props} endAdornment={<button className="password-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
}
