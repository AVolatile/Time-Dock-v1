import type React from 'react'
import { Moon, Sun, X } from 'lucide-react'
import { WorkStatus } from '@shared/types'
import type { DashboardTheme } from '../../hooks/useDashboardTheme'
import { getStatusMeta } from '../../lib/viewUtils'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const buttonVariant: Record<ButtonVariant, string> = {
  primary: 'td-button td-button-primary',
  secondary: 'td-button td-button-secondary',
  ghost: 'td-button td-button-ghost',
  success: 'td-button td-button-success',
  warning: 'td-button td-button-warning',
  danger: 'td-button td-button-danger'
}

const buttonSize: Record<ButtonSize, string> = {
  xs: 'td-button-xs',
  sm: 'td-button-sm',
  md: 'td-button-md',
  lg: 'td-button-lg'
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariant[variant], buttonSize[size], className)}
      {...props}
    />
  )
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  tone?: 'default' | 'danger'
}

export function IconButton({
  active = false,
  tone = 'default',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'td-icon-button',
        active && 'td-icon-button-active',
        tone === 'danger' && 'td-icon-button-danger',
        className
      )}
      {...props}
    />
  )
}

export function Panel({
  children,
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cn('td-panel', interactive && 'td-panel-interactive', className)} {...props}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  meta
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <header className="td-page-header">
      <div className="min-w-0">
        {eyebrow && <div className="td-eyebrow">{eyebrow}</div>}
        <h1 className="td-page-title">{title}</h1>
        {description && <p className="td-page-description">{description}</p>}
        {meta && <div className="td-page-meta">{meta}</div>}
      </div>
      {actions && <div className="td-page-actions">{actions}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  description,
  actions,
  compact = false
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn('td-section-header', compact && 'td-section-header-compact')}>
      <div className="min-w-0">
        <h2 className="td-section-title">{title}</h2>
        {description && <p className="td-section-description">{description}</p>}
      </div>
      {actions && <div className="td-section-actions">{actions}</div>}
    </div>
  )
}

export function Toolbar({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('td-toolbar', className)}>{children}</div>
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className
}: {
  value: T
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('td-segmented', className)} role="tablist">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={cn('td-segmented-option', value === option.value && 'td-segmented-option-active')}
          onClick={() => onChange(option.value)}
          role="tab"
          aria-selected={value === option.value}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({
  status,
  label,
  compact = false
}: {
  status: WorkStatus
  label?: string
  compact?: boolean
}) {
  const meta = getStatusMeta(status)
  return (
    <span className={cn('td-status-badge', meta.badgeClass, compact && 'td-status-badge-compact')}>
      <span className={cn('td-status-dot', meta.dotClass)} />
      {label || meta.label}
    </span>
  )
}

export function Pill({
  children,
  tone = 'neutral',
  className
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  return <span className={cn('td-pill', `td-pill-${tone}`, className)}>{children}</span>
}

export function StatBlock({
  label,
  value,
  detail,
  icon,
  tone = 'neutral'
}: {
  label: string
  value: string
  detail?: string
  icon?: React.ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="td-stat">
      <div className="td-stat-top">
        <span className={cn('td-stat-icon', `td-stat-icon-${tone}`)}>{icon}</span>
        <span className="td-stat-label">{label}</span>
      </div>
      <div className="td-stat-value">{value}</div>
      {detail && <div className="td-stat-detail">{detail}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className={cn('td-empty', compact && 'td-empty-compact')}>
      {icon && <div className="td-empty-icon">{icon}</div>}
      <div className="td-empty-title">{title}</div>
      {description && <p className="td-empty-description">{description}</p>}
      {action && <div className="td-empty-action">{action}</div>}
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('td-field', className)}>
      <span className="td-field-label">{label}</span>
      {children}
      {(error || hint) && <span className={cn('td-field-help', error && 'td-field-error')}>{error || hint}</span>}
    </label>
  )
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('td-input', className)} {...props} />
}

export function SelectInput({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('td-input td-select', className)} {...props}>
      {children}
    </select>
  )
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('td-input td-textarea', className)} {...props} />
}

export function SwitchControl({
  checked,
  onChange,
  label,
  description,
  disabled = false
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={cn('td-switch-row', disabled && 'td-disabled')}
      onClick={() => !disabled && onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
    >
      <span className="min-w-0">
        {label && <span className="td-switch-label">{label}</span>}
        {description && <span className="td-switch-description">{description}</span>}
      </span>
      <span className={cn('td-switch', checked && 'td-switch-on')}>
        <span />
      </span>
    </button>
  )
}

export function AppearanceToggle({
  theme,
  onChange,
  showLabel = true,
  className
}: {
  theme: DashboardTheme
  onChange: (theme: DashboardTheme) => void
  showLabel?: boolean
  className?: string
}) {
  const isDark = theme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={cn('td-appearance-toggle', isDark && 'td-appearance-toggle-dark', className)}
      onClick={() => onChange(nextTheme)}
      aria-label={`Switch dashboard to ${nextTheme} mode`}
      aria-pressed={isDark}
    >
      <span className="td-appearance-track" aria-hidden="true">
        <span className="td-appearance-thumb">
          {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </span>
      </span>
      {showLabel && <span className="td-appearance-label">{isDark ? 'Dark' : 'Light'}</span>}
    </button>
  )
}

export function Dialog({
  title,
  description,
  children,
  footer,
  onClose,
  maxWidth = 'md'
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <div className="td-dialog-backdrop animate-fade-in" onMouseDown={onClose}>
      <section
        className={cn('td-dialog animate-slide-up', `td-dialog-${maxWidth}`)}
        onMouseDown={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header className="td-dialog-header">
          <div className="min-w-0">
            <h2 id="dialog-title" className="td-dialog-title">{title}</h2>
            {description && <p className="td-dialog-description">{description}</p>}
          </div>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="td-dialog-body">{children}</div>
        {footer && <footer className="td-dialog-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export function TableShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('td-table-shell', className)}>{children}</div>
}
