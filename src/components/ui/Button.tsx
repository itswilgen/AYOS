import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; variant?: 'primary' | 'secondary' | 'text'; className?: string; loading?: boolean }>
export default function Button({ children, href, variant = 'primary', className = '', loading = false, disabled, ...props }: Props) {
  const classes = `button button-${variant} ${className}`
  return href
    ? <Link to={href} className={classes}>{children}</Link>
    : <button className={classes} disabled={loading || disabled} aria-busy={loading} {...props}>
      {loading && <LoaderCircle className="button-spinner" size={17} aria-hidden="true" />}{children}
    </button>
}
