import React from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

// Blocks the app for accounts an admin has deactivated. Deactivated users keep
// their catalog and history, but see only this notice until they are reactivated.
export default function AccountStatusGate({ children }) {
  const { user } = useAuth();

  if (user && user.is_active === false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <ShieldOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Account deactivated</h1>
          <p className="text-sm text-muted-foreground">
            Access to this app has been turned off for your account. Please contact your administrator
            if you think this is a mistake.
          </p>
          <Button variant="outline" className="min-h-11" onClick={() => base44.auth.logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return children;
}