import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Trash2, UserCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Edits the current user's profile fields (first/last name, phone, address,
// profile picture) and persists them via base44.auth.updateMe, then refreshes
// the auth context so the rest of the app reflects the changes.
export default function ProfileEditor() {
  const { user, checkUserAuth } = useAuth();
  const fileRef = useRef(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [picture, setPicture] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone_number || "");
      setAddress(user.address || "");
      setPicture(user.profile_picture || "");
    }
  }, [user]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setPicture(file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
        address: address.trim(),
        profile_picture: picture
      });
      await checkUserAuth();
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ title: "Could not save", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1">Profile</h2>
      <p className="text-sm text-muted-foreground mb-4">Add your details to personalize your account.</p>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-20 h-20 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
          {picture ? (
            <img src={picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="w-10 h-10 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
            {picture ? "Replace photo" : "Upload photo"}
          </Button>
          {picture && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive justify-start" onClick={() => setPicture("")} disabled={busy}>
              <Trash2 className="w-4 h-4 mr-1" /> Remove
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="p-first">First name</Label>
          <Input id="p-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="p-last">Last name</Label>
          <Input id="p-last" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="p-phone">Phone number</Label>
        <Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" className="mt-1" />
      </div>

      <div className="mt-4">
        <Label htmlFor="p-address">Address</Label>
        <Textarea id="p-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Street, city, state, ZIP" className="mt-1" />
      </div>

      <Button onClick={save} disabled={saving} className="min-h-11 mt-5">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save profile"}
      </Button>
    </section>
  );
}