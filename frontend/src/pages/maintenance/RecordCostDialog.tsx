import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

interface RecordCostDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (cost: number) => void;
  isPending: boolean;
  errorMessage?: string | null;
}

export function RecordCostDialog({ open, onClose, onConfirm, isPending, errorMessage }: RecordCostDialogProps) {
  const [cost, setCost] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record cost"
      description="This posts an expense against the unit's owner(s) in the trust ledger, proportional to their ownership share."
    >
      <label className="block text-sm font-medium text-text-primary mb-1.5">Cost (KES)</label>
      <input
        type="number"
        step="0.01"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        placeholder="e.g. 4500"
      />

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 bg-danger-50 text-danger-600 text-sm rounded-lg px-3.5 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(Number(cost))}
          disabled={isPending || !cost || Number(cost) <= 0}
        >
          {isPending ? "Recording..." : "Record cost"}
        </Button>
      </div>
    </Modal>
  );
}
