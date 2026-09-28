import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { userDisplayName } from "@/lib/userName";

// Confirms permanently removing someone from the team. Removal is not
// recoverable in-app, so it always goes through this dialog.
export default function RemoveUserDialog({ member, onOpenChange, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!member) return null;

  const name = userDisplayName(member);

  const confirm = async (e) => {
    // Keep the dialog open (and showing progress) until the request finishes.
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onConfirm(member);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not remove this user. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {member.email} will lose access to the app and be removed from this list. Their catalog and
            history are kept in the database, but they would have to be invited again to come back. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removing…</>
            ) : (
              "Remove user"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}