import { useToastStore } from './toastStore'
import {
  CheckCircle2, XCircle, AlertTriangle, Info, X,
  AlertOctagon
} from 'lucide-react'
import { useEffect, useState } from 'react'

const typeConfig = {
  success: { icon: CheckCircle2, bg: 'bg-status-working/10', border: 'border-status-working/30', text: 'text-status-working', iconColor: 'text-status-working' },
  error:   { icon: XCircle,      bg: 'bg-danger/10',          border: 'border-danger/30',          text: 'text-danger',          iconColor: 'text-danger' },
  warning: { icon: AlertTriangle, bg: 'bg-status-break/10',   border: 'border-status-break/30',    text: 'text-status-break',    iconColor: 'text-status-break' },
  info:    { icon: Info,          bg: 'bg-accent/10',          border: 'border-accent/30',          text: 'text-accent',          iconColor: 'text-accent' },
}

export default function ToastContainer() {
  const { toasts, removeToast, confirm, closeConfirm } = useToastStore()

  return (
    <>
      {/* Toast Stack */}
      <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirm?.isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 animate-fade-in" onClick={closeConfirm}>
          <div
            className="bg-surface-2 border border-border rounded-xl w-full max-w-sm p-5 shadow-popup animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`mt-0.5 ${confirm.variant === 'danger' ? 'text-danger' : confirm.variant === 'warning' ? 'text-status-break' : 'text-accent'}`}>
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{confirm.title}</h3>
                <p className="text-sm text-text-secondary mt-1">{confirm.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={confirm.onCancel} className="btn btn-ghost btn-sm">
                {confirm.cancelLabel || 'Cancel'}
              </button>
              <button
                onClick={confirm.onConfirm}
                className={`btn btn-sm ${
                  confirm.variant === 'danger' ? 'btn-danger' :
                  confirm.variant === 'warning' ? 'btn-warning' : 'btn-primary'
                }`}
              >
                {confirm.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ToastItem({ toast, onDismiss }: { toast: { id: string; type: string; title: string; message?: string }; onDismiss: () => void }) {
  const config = typeConfig[toast.type as keyof typeof typeConfig] || typeConfig.info
  const Icon = config.icon
  const [exiting, setExiting] = useState(false)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(onDismiss, 150)
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-lg border shadow-card
        ${config.bg} ${config.border}
        ${exiting ? 'opacity-0 translate-x-4 transition-all duration-150' : 'animate-slide-down'}
      `}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.text}`}>{toast.title}</div>
        {toast.message && (
          <div className="text-xs text-text-secondary mt-0.5 leading-relaxed">{toast.message}</div>
        )}
      </div>
      <button onClick={handleDismiss} className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors mt-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
