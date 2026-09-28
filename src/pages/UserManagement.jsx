import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import InviteUserCard from "@/components/users/InviteUserCard";
import UserList from "@/components/users/UserList";
import EditUserDialog from "@/components/users/EditUserDialog";
import RemoveUserDialog from "@/components/users/RemoveUserDialog";
import { toast } from "@/components/ui/use-toast";

// Admin-only team page: invite people to the app and edit their role and
// contact details without leaving the app.
export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setMembers(await base44.entities.User.list());
    } catch {
      setMembers([]);
    }
  }, []);

  // Deactivating keeps the person's data but blocks them from the app.
  const toggleActive = async (member) => {
    const reactivating = member.is_active === false;
    setBusyId(member.id);
    try {
      await base44.entities.User.update(member.id, { is_active: reactivating });
      toast({
        title: reactivating ? "User reactivated" : "User deactivated",
        description: reactivating
          ? `${member.email} can use the app again.`
          : `${member.email} can no longer access the app.`,
      });
      await load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not update user",
        description: err.response?.data?.error || err.message || "Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  // Removing deletes the account outright. Errors bubble to the dialog, which
  // shows them inline and keeps the user in place.
  const removeUser = async (member) => {
    setBusyId(member.id);
    try {
      await base44.entities.User.delete(member.id);
      setRemoving(null);
      toast({
        title: "User removed",
        description: `${member.email} no longer has access.`,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user, load]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Team &amp; access</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-12 space-y-6">
        <InviteUserCard onInvited={load} />
        <UserList
          users={members}
          loading={members === null}
          currentUserId={user.id}
          busyId={busyId}
          onEdit={setEditing}
          onToggleActive={toggleActive}
          onRequestRemove={setRemoving}
        />
      </main>

      <EditUserDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />
      <RemoveUserDialog
        member={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={removeUser}
      />
    </div>
  );
}