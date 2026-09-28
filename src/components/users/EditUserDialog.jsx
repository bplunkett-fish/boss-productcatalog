import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Edits an existing user's role and contact details. Email addresses are owned
// by their account and cannot be changed from here.
export default function EditUserDialog({ member, onOpenChange, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!member) {
      setForm(null);
      return;
    }
    setForm({
      role: member.role || "user",
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      phone_number: member.phone_number || "",
      address: member.address || "",
    });
    setError("");
  }, [member]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form || !member) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.User.update(member.id, {
        role: form.role,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone_number: form.phone_number.trim(),
        address: form.address.trim(),
      });
      toast({ title: "User updated" });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!member || !form) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)} disabled={saving}>
              <SelectTrigger id="edit-role" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-first">First name</Label>
              <Input
                id="edit-first"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                className="mt-1"
                maxLength={60}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="edit-last">Last name</Label>
              <Input
                id="edit-last"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                className="mt-1"
                maxLength={60}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-phone">Phone number</Label>
            <Input
              id="edit-phone"
              type="tel"
              inputMode="tel"
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              className="mt-1"
              maxLength={40}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="edit-address">Address</Label>
            <Input
              id="edit-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="mt-1"
              maxLength={200}
              disabled={saving}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="min-h-11">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}