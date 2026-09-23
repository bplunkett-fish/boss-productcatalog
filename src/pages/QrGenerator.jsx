import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, QrCode as QrIcon, ShieldAlert, Download, Mail } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

const safeName = (s) => (s || "serial").replace(/[^\w.-]/g, "_").slice(0, 40);
const checkerStyle = {
  backgroundImage:
    "linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

export default function QrGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [serial, setSerial] = useState("");
  const [generating, setGenerating] = useState(false);
  const [svg, setSvg] = useState("");
  const [pngUrl, setPngUrl] = useState("");
  const [emailing, setEmailing] = useState(false);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center pb-28">
        <ShieldAlert className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-lg font-semibold text-foreground">Admins only</p>
        <p className="text-sm text-muted-foreground mt-1">The QR code generator is available to administrators.</p>
        <Button className="mt-6" onClick={goBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back to catalog</Button>
      </div>
    );
  }

  const claimUrl = (s) => `${window.location.origin}/claim?serial=${encodeURIComponent(s)}`;

  const handleGenerate = async (e) => {
    e.preventDefault();
    const s = serial.trim();
    if (!s) return;
    setGenerating(true);
    setSvg("");
    setPngUrl("");
    try {
      const [svgStr, dataUrl] = await Promise.all([
        QRCode.toString(claimUrl(s), { type: "svg", errorCorrectionLevel: "M", margin: 2 }),
        QRCode.toDataURL(claimUrl(s), {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 2400,
          color: { dark: "#000000", light: "#00000000" },
        }),
      ]);
      setSvg(svgStr);
      setPngUrl(dataUrl);
    } catch (err) {
      toast({ title: "Could not generate QR code", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadSvg = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MyBOSS-QR-${safeName(serial)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `MyBOSS-QR-${safeName(serial)}.png`;
    a.click();
  };

  const handleEmail = async () => {
    if (!pngUrl) return;
    setEmailing(true);
    try {
      const pngBase64 = pngUrl.split(",")[1];
      const res = await base44.functions.invoke("emailQrCode", {
        serial_number: serial.trim(),
        png_base64: pngBase64,
      });
      if (res.data?.status === "sent") {
        toast({ title: "Email sent", description: `QR code sent to ${user.email}` });
      } else {
        throw new Error(res.data?.error || "Failed to send");
      }
    } catch (err) {
      toast({ title: "Could not send email", description: err.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 md:top-14 z-10 bg-card/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <QrIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-foreground">QR Code Generator</p>
              <p className="text-xs text-muted-foreground hidden sm:block">Create claim-link QR codes</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden md:inline-flex" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-28 md:pb-12 space-y-6">
        <form onSubmit={handleGenerate} className="rounded-2xl bg-card border border-border p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serial">Serial number</Label>
            <Input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
              placeholder="Enter a serial number…"
              className="h-12 text-base font-mono"
              pattern="[A-Za-z0-9]*"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Alphanumeric characters only (letters and numbers). No ERP validation — the QR encodes a claim link for this serial.</p>
          </div>
          <Button type="submit" className="w-full h-11" disabled={generating || !serial.trim()}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><QrIcon className="w-4 h-4 mr-2" /> Generate QR code</>
            )}
          </Button>
        </form>

        {(svg || pngUrl) && (
          <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 space-y-5">
            <div className="flex flex-col items-center">
              <div className="w-56 h-56 rounded-xl border border-border flex items-center justify-center overflow-hidden" style={checkerStyle}>
                {pngUrl && <img src={pngUrl} alt={`QR code for ${serial}`} className="w-full h-full object-contain p-2" />}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center break-all">
                {claimUrl(serial.trim())}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" onClick={downloadSvg} disabled={!svg}>
                <Download className="w-4 h-4 mr-2" /> SVG
              </Button>
              <Button variant="outline" className="h-11" onClick={downloadPng} disabled={!pngUrl}>
                <Download className="w-4 h-4 mr-2" /> PNG
              </Button>
            </div>

            <Button className="w-full h-11" onClick={handleEmail} disabled={emailing}>
              {emailing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Email to {user?.email}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A high-resolution PNG (2400×2400, transparent background) is attached to the email.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}