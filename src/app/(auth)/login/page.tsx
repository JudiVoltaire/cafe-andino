"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import { useI18n } from "@/i18n/context";
import { LanguageSwitcher } from "@/i18n/language-switcher";

export default function LoginPage() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ username: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await signIn("credentials", {
        username: form.username,
        password: form.password,
        redirect: false,
      });
      if (res?.error) {
        toast.error(t.login.wrongCredentials);
        return;
      }
      // Redirect to first accessible module based on session scopes
      window.location.href = "/order";
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50">

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo + Brand */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border border-emerald-100 flex items-center justify-center mx-auto mb-4 overflow-hidden">
            <Image src="/logo.png" alt="Logo" width={64} height={64} className="object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bakery And Coffee Eben Ezer</h1>
          <p className="text-sm text-gray-500 mt-1.5">{t.login.tagline}</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg shadow-emerald-900/5 border border-emerald-100/60 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">{t.login.username}</label>
              <input
                name="username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                placeholder={t.login.usernamePlaceholder}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-700">{t.login.password}</label>
                <a href="#" className="text-xs font-medium text-emerald-700 hover:text-emerald-800">{t.login.forgotPassword}</a>
              </div>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-sm"
                placeholder={t.login.passwordPlaceholder}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full h-12 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {pending ? t.login.loggingIn : t.login.login}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            {t.login.systemLabel} · v1.1
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {t.login.copyright}
      </div>
    </div>
  );
}
