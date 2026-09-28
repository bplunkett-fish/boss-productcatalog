import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import InviteUserCard from "@/components/users/InviteUserCard";
import UserList from "@/components/users/UserList";
import EditUserDialog from "@/components/users/EditUserDialog";

// Admin-only team page: invite people to the app and edit their role and
// contact details without leaving the app.
export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setMembers(await base44.entities.User.list());
    } catch {
      setMembers([]);
    }
  }, []);

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
          onEdit={setEditing}
        />
      </main>

      <EditUserDialog member={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />
    </div>
  );
}