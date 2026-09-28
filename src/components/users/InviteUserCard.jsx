import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Invites a person to the app by email. Admins can invite either role; accounts
// are created by the invitation itself, so there is nothing to fill in beyond
// the email address and the role they should start with.
export default function InviteUserCard({ onInvited }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await base44.users.inviteUser(value, role);
      // Record the invitation so this address can still sign up if an admin has
      // turned self-registration off.
      let exemptionSaved = true;
      try {
        await base44.entities.RegistrationInvite.create({
          email: value.toLowerCase(),
          role,
          invited_date: new Date().toISOString(),
        });
      } catch {
        exemptionSaved = false;
      }
      toast({
        title: "Invitation sent",
        description: exemptionSaved
          ? `${value} was invited as ${role === "admin" ? "an admin" : "a user"}.`
          : `${value} was invited, but the signup exemption could not be saved.`,
      });
      setEmail("");
      setRole("user");
      onInvited?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not send the invitation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Invite a user</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Send an email invitation. They choose their own password when they accept, and will appear in the list
        below once they have signed up.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="invite-email">Email address</Label>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="mt-1"
            maxLength={254}
            disabled={sending}
          />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={setRole} disabled={sending}>
            <SelectTrigger id="invite-role" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">
            Admins can manage the product database, serials, messaging, and users.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={sending} className="min-h-11">
          {sending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
          ) : (
            <><UserPlus className="w-4 h-4 mr-2" /> Send invitation</>
          )}
        </Button>
      </form>
    </section>
  );
}