import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  isPending = false,
  errorMessage,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-danger-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-danger-600" strokeWidth={2} />
        </div>
        <p className="text-sm text-text-secondary pt-1.5">{description}</p>
      </div>

      {errorMessage && (
        <div className="mt-4 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Deleting..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
