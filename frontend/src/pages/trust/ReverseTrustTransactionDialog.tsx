import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface ReverseTrustTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  errorMessage?: string | null;
}

export function ReverseTrustTransactionDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  errorMessage,
}: ReverseTrustTransactionDialogProps) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reverse trust transaction"
      description="This posts a new offsetting entry — the original record is never edited or deleted, per trust accounting rules."
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-warning-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-warning-600" strokeWidth={2} />
        </div>
        <p className="text-sm text-text-secondary pt-1.5">
          A reversal entry will be posted with the inverse amount. Both the original and the
          reversal remain permanently on the ledger for audit purposes.
        </p>
      </div>

      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Reason for reversal
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        placeholder="e.g. Posted against the wrong owner — correcting allocation"
      />

      {errorMessage && (
        <div className="mt-3 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(reason)}
          disabled={isPending || reason.trim().length === 0}
        >
          {isPending ? "Posting reversal..." : "Post reversal"}
        </Button>
      </div>
    </Modal>
  );
}
