import * as AlertDialog from '@radix-ui/react-alert-dialog';

/**
 * Accessible confirmation dialog (Radix AlertDialog: focus trap, Escape, focus return,
 * background inert). Used for destructive or high-impact owner actions.
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = false, confirmDisabled = false, busy = false, children }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line-strong bg-surface p-5 shadow-[var(--shadow-lift)]">
          <AlertDialog.Title className="font-display text-xl font-bold tracking-tight">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-fg-soft">{description}</div>
          </AlertDialog.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel className="btn btn-outline px-4 py-2 text-sm">Cancel</AlertDialog.Cancel>
            <button
              type="button"
              disabled={confirmDisabled || busy}
              onClick={onConfirm}
              className={`btn px-4 py-2 text-sm ${destructive ? 'bg-sold text-bg hover:bg-[#ff8f82]' : 'btn-ink'}`}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
