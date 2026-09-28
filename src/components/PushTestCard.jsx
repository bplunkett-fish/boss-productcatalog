import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

// Diagnostic tool: sends a test push notification to the signed-in admin, then
// shows the server's raw answer on screen so a delivery problem is visible
// (the text is passed through exactly as the notification service returns it).
export default function PushTestCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("sendPushNotification", {});
      setResult(res.data);
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.error || err.message || "Request failed" });
    } finally {
      setRunning(false);
    }
  };

  const ok = result?.ok === true;

  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">Push notification test</p>
      <p className="text-sm text-muted-foreground mt-1">
        Sends a test push to your own account and shows exactly what the server answers.
      </p>
      <Button variant="outline" className="mt-3 min-h-11" onClick={run} disabled={running}>
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
        ) : (
          <><BellRing className="w-4 h-4 mr-2" /> Send test push</>
        )}
      </Button>
      {result && (
        <div
          className={cn(
            "mt-3 rounded-xl border p-3",
            ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
          )}
        >
          <p className="text-xs font-medium text-foreground mb-1">
            {ok ? "Server response — success" : "Server response — failed"}
          </p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}