import { useState } from 'react'
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from './toastStore'
import type { Toast, ToastType } from './toastStore'
import { Button, IconButton } from '../ui'

const typeConfig = {
  success: {
    icon: CheckCircle2,
    iconClass: 'td-toast-icon-success'
  },
  error: {
    icon: XCircle,
    iconClass: 'td-toast-icon-error'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'td-toast-icon-warning'
  },
  info: {
    icon: Info,
    iconClass: 'td-toast-icon-info'
  }
}

export default function ToastContainer() {
  const { toasts, removeToast, confirm, closeConfirm } = useToastStore()

  return (
    <>
      <div className="toast-stack">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>

      {confirm?.isOpen && (
        <div
          className="td-dialog-backdrop animate-fade-in"
          onMouseDown={closeConfirm}
          role="presentation"
        >
          <section
            className="td-dialog td-dialog-sm animate-slide-up"
            onMouseDown={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <header className="td-dialog-header">
              <div className="flex items-start gap-3">
                <div className={`td-toast-icon ${confirm.variant === 'danger' ? 'bg-[color:var(--td-danger-soft)] text-[color:var(--td-danger)]' : confirm.variant === 'warning' ? 'bg-[color:var(--td-warning-soft)] text-[color:var(--td-warning)]' : 'bg-[color:var(--td-accent-soft)] text-[color:var(--td-accent)]'}`}>
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div>
                  <h2 id="confirm-title" className="td-dialog-title">{confirm.title}</h2>
                  <p id="confirm-message" className="td-dialog-description">{confirm.message}</p>
                </div>
              </div>
            </header>
            <footer className="td-dialog-footer">
              <Button onClick={confirm.onCancel} variant="ghost" size="sm">
                {confirm.cancelLabel || 'Cancel'}
              </Button>
              <Button
                onClick={confirm.onConfirm}
                variant={confirm.variant === 'danger' ? 'danger' : confirm.variant === 'warning' ? 'warning' : 'primary'}
                size="sm"
              >
                {confirm.confirmLabel || 'Confirm'}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const config = typeConfig[toast.type as ToastType] || typeConfig.info
  const Icon = config.icon
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    window.setTimeout(onDismiss, 150)
  }

  return (
    <div
      className={`td-toast td-toast-${toast.type} ${exiting ? 'translate-x-3 opacity-0 transition-all duration-150' : 'animate-slide-down'}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className={`td-toast-icon ${config.iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="td-toast-title">{toast.title}</div>
        {toast.message && <div className="td-toast-message">{toast.message}</div>}
      </div>
      <IconButton onClick={handleDismiss} aria-label="Dismiss notification">
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  )
}
