"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, ShieldX, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";
import { resetForProductionLaunch } from "@/server/settings/reset-actions";

const CONFIRM_PHRASE = "INICIAR-OPERACIONES";

export function DangerZoneSection() {
  const { t } = useI18n();
  const s = t.settings;

  const [open, setOpen] = useState(false);        // expand detail card
  const [dialogOpen, setDialogOpen] = useState(false); // confirmation modal
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpenDialog() {
    setPhrase("");
    setPassword("");
    setDialogOpen(true);
  }

  async function handleConfirm() {
    if (phrase !== CONFIRM_PHRASE) {
      toast.error(s.resetPhraseMismatch);
      return;
    }
    setLoading(true);
    const result = await resetForProductionLaunch(password);
    setLoading(false);

    if (!result.ok) {
      if (result.error === "wrong_password") toast.error(s.resetWrongPassword);
      else if (result.error === "unauthorized") toast.error("Sin permisos de administrador.");
      else toast.error(s.resetError);
      return;
    }

    setDialogOpen(false);
    toast.success(s.resetSuccess, {
      description: s.resetSuccessDesc
        .replace("{orders}", String(result.orders))
        .replace("{stockIns}", String(result.stockIns))
        .replace("{registers}", String(result.registers))
        .replace("{printJobs}", String(result.printJobs)),
      duration: 8000,
    });
  }

  return (
    <>
      {/* ─── Danger Zone Card ─────────────────────────────────────────── */}
      <div className="mt-8 rounded-xl border-2 border-red-300 bg-red-50 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-red-700 text-sm">{s.dangerZone}</p>
            <p className="text-xs text-red-500 mt-0.5">{s.dangerZoneDesc}</p>
          </div>
          {open
            ? <ChevronUp className="h-4 w-4 text-red-500 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-red-500 shrink-0" />}
        </button>

        {/* Expandable content */}
        {open && (
          <div className="px-5 pb-5 border-t border-red-200 pt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-red-700 text-sm mb-1">{s.resetForLaunch}</h3>
              <p className="text-xs text-red-600 mb-3">{s.resetForLaunchDesc}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* What gets deleted */}
                <div className="bg-red-100 rounded-lg p-3">
                  <p className="font-semibold text-red-700 text-xs mb-1.5 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> {s.resetWhatDeletes}
                  </p>
                  <ul className="space-y-0.5 text-xs text-red-600">
                    {[s.resetItem1, s.resetItem2, s.resetItem3, s.resetItem4, s.resetItem5].map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="mt-0.5 shrink-0">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What is kept */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="font-semibold text-green-700 text-xs mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {s.resetWhatKeeps}
                  </p>
                  <ul className="space-y-0.5 text-xs text-green-700">
                    {[s.resetKeep1, s.resetKeep2, s.resetKeep3, s.resetKeep4, s.resetKeep5].map((item, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="mt-0.5 shrink-0">✓</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="gap-2 bg-red-600 hover:bg-red-700"
                onClick={handleOpenDialog}
              >
                <Trash2 className="h-4 w-4" />
                {s.resetButton}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Confirmation Modal ───────────────────────────────────────── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setDialogOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Red top bar */}
            <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
              <ShieldX className="h-6 w-6 text-white shrink-0" />
              <div>
                <h2 className="font-bold text-white text-base leading-tight">{s.resetConfirmTitle}</h2>
                <p className="text-red-200 text-xs mt-0.5">{s.resetConfirmDesc}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Phrase confirmation */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">
                  {s.resetConfirmPhrase}
                  <code className="ml-1 bg-gray-100 px-1.5 py-0.5 rounded text-red-700 font-bold tracking-wide">
                    {CONFIRM_PHRASE}
                  </code>
                </Label>
                <Input
                  value={phrase}
                  onChange={e => setPhrase(e.target.value)}
                  placeholder={CONFIRM_PHRASE}
                  disabled={loading}
                  className={`font-mono tracking-wide ${
                    phrase && phrase !== CONFIRM_PHRASE ? "border-red-400 focus:ring-red-400" : ""
                  } ${phrase === CONFIRM_PHRASE ? "border-green-400 focus:ring-green-400" : ""}`}
                />
                {phrase && phrase !== CONFIRM_PHRASE && (
                  <p className="text-xs text-red-500">{s.resetPhraseMismatch}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-700">{s.resetConfirmPassword}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={s.resetConfirmPasswordPlaceholder}
                  disabled={loading}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => setDialogOpen(false)}
                >
                  {s.resetCancelBtn}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700 gap-2"
                  disabled={loading || phrase !== CONFIRM_PHRASE || !password}
                  onClick={handleConfirm}
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      {s.resetConfirmBtn}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
