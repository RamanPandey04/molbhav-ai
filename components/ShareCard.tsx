"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";

/** Shareable buyer link + QR. Prints cleanly for the kirana counter. */
export function ShareCard() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.origin + "/"), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the link is still visible to select */
    }
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card">
      <div className="shrink-0 rounded-xl border border-paper-rule p-2" aria-hidden={!url}>
        {url ? <QRCodeSVG value={url} size={96} fgColor="#0E1526" /> : <div className="h-24 w-24" />}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight">Share with neighbours</p>
        <button onClick={copy} className="btn-ghost mt-2.5 min-h-[44px] px-3 text-sm" disabled={!url}>
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
