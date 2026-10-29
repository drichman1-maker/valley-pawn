import * as AlertDialog from '@radix-ui/react-alert-dialog';

/**
 * Accessible confirmation dialog (Radix AlertDialog: focus trap, Escape, focus return,
 * background inert). Used for destructive or high-impact owner actions.
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = false, confirmDisabled = false, busy = false, children }) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-card p-5 shadow-xl">
          <AlertDialog.Title className="font-serif text-xl">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-ink-soft">{description}</div>
          </AlertDialog.Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md border border-line-strong px-4 py-2 text-sm font-semibold">Cancel</AlertDialog.Cancel>
            <button
              type="button"
              disabled={confirmDisabled || busy}
              onClick={onConfirm}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${destructive ? 'bg-sold' : 'bg-ink'}`}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
