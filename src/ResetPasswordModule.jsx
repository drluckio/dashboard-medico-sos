import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function ResetPasswordModule() {
  const [status, setStatus] = useState("validating");
  const [message, setMessage] = useState("Validando enlace de recuperación...");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    validateRecoveryLink();
  }, []);

  async function validateRecoveryLink() {
    try {
      const currentUrl = new URL(window.location.href);
      const query = new URLSearchParams(currentUrl.search);
      const hash = new URLSearchParams(window.location.hash.replace("#", ""));

      const urlError =
        query.get("error_description") ||
        hash.get("error_description") ||
        query.get("error") ||
        hash.get("error");

      if (urlError) {
        setStatus("error");
        setMessage(decodeURIComponent(urlError));
        return;
      }

      const code = query.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setStatus("error");
          setMessage("No se pudo validar el enlace: " + error.message);
          return;
        }
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setStatus("error");
          setMessage("No se pudo iniciar sesión temporal: " + error.message);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setStatus("error");
        setMessage("No se pudo leer la sesión: " + error.message);
        return;
      }

      if (!data?.session) {
        setStatus("error");
        setMessage(
          "Esta pantalla funciona, pero no hay una sesión de recuperación activa. Solicita un nuevo correo de recuperación y abre el enlace recibido."
        );
        return;
      }

      setStatus("ready");
      setMessage("Enlace validado. Captura tu nueva contraseña.");
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "Error inesperado al validar el enlace.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (password.length < 8) {
      setStatus("error");
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    setStatus("validating");
    setMessage("Actualizando contraseña...");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setSaving(false);
      setStatus("error");
      setMessage("No se pudo actualizar la contraseña: " + error.message);
      return;
    }

    await supabase.auth.signOut();

    setStatus("success");
    setMessage("Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...");

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  }

  const alertClass =
    status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <section className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          SOS MedicalOps
        </p>

        <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
          Restablecer contraseña
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Usa el enlace de recuperación enviado por correo para establecer una nueva contraseña.
        </p>

        <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${alertClass}`}>
          {message}
        </div>

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                Nueva contraseña
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                Confirmar contraseña
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4"
                placeholder="Repite la contraseña"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
            >
              {saving ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-4 w-full rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
        >
          Volver al inicio
        </button>
      </section>
    </main>
  );
}