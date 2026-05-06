import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [attentions, setAttentions] = useState([]);

  const [form, setForm] = useState({
    patient_name: "",
    employee_number: "",
    attention_date: new Date().toISOString().slice(0, 10),
    area: "",
    diagnosis: "",
    risk_level: "Bajo",
    attention_minutes: 15,
    medicine_id: "",
    medicine_quantity: 0,
    notes: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  async function loadData() {
    setLoadingData(true);

    const medicinesResult = await supabase
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });

    const attentionsResult = await supabase
      .from("attentions")
      .select("*")
      .order("attention_date", { ascending: false });

    if (medicinesResult.error) {
      alert("Error cargando medicamentos: " + medicinesResult.error.message);
    } else {
      setMedicines(medicinesResult.data || []);
    }

    if (attentionsResult.error) {
      alert("Error cargando atenciones: " + attentionsResult.error.message);
    } else {
      setAttentions(attentionsResult.data || []);
    }

    setLoadingData(false);
  }

  async function login(event) {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("No se pudo iniciar sesión. Revisa correo y contraseña.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMedicines([]);
    setAttentions([]);
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveAttention(event) {
    event.preventDefault();

    if (!form.patient_name.trim()) {
      alert("Captura el nombre del paciente.");
      return;
    }

    if (!form.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const payload = {
      patient_name: form.patient_name.trim(),
      employee_number: form.employee_number.trim(),
      attention_date: form.attention_date,
      area: form.area.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      risk_level: form.risk_level,
      attention_minutes: Number(form.attention_minutes || 0),
      medicine_id: form.medicine_id || null,
      medicine_quantity: Number(form.medicine_quantity || 0),
      notes: form.notes.trim() || null,
    };

    const { data, error } = await supabase
      .from("attentions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert("No se pudo guardar la atención: " + error.message);
      return;
    }

    if (payload.medicine_id && payload.medicine_quantity > 0) {
      const medicine = medicines.find((item) => item.id === payload.medicine_id);
      const newStock = Math.max(
        Number(medicine?.stock || 0) - payload.medicine_quantity,
        0
      );

      const stockResult = await supabase
        .from("medicines")
        .update({ stock: newStock })
        .eq("id", payload.medicine_id);

      if (stockResult.error) {
        alert(
          "La atención se guardó, pero no se pudo descontar inventario: " +
            stockResult.error.message
        );
      }
    }

    setAttentions((current) => [data, ...current]);

    setForm({
      patient_name: "",
      employee_number: "",
      attention_date: new Date().toISOString().slice(0, 10),
      area: "",
      diagnosis: "",
      risk_level: "Bajo",
      attention_minutes: 15,
      medicine_id: "",
      medicine_quantity: 0,
      notes: "",
    });

    await loadData();
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Validando sesión...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-zinc-950">
            Dashboard Médico SOS
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Inicia sesión con el usuario creado en Supabase.
          </p>

          <form onSubmit={login} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Correo electrónico
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Contraseña
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800">
              Ingresar
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="bg-zinc-950 px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              SOS · Salud ocupacional
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Dashboard de Atenciones Médicas
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              Conectado a Supabase.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {loadingData && (
          <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
            Cargando información desde Supabase...
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Atenciones registradas</p>
            <p className="mt-2 text-3xl font-bold">{attentions.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Medicamentos en inventario</p>
            <p className="mt-2 text-3xl font-bold">{medicines.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Riesgo alto/crítico</p>
            <p className="mt-2 text-3xl font-bold">
              {
                attentions.filter((item) =>
                  ["Alto", "Crítico"].includes(item.risk_level)
                ).length
              }
            </p>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Registrar atención médica
          </h2>

          <form
            onSubmit={saveAttention}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="Nombre del paciente"
              value={form.patient_name}
              onChange={(event) =>
                updateField("patient_name", event.target.value)
              }
            />

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="Número de empleado"
              value={form.employee_number}
              onChange={(event) =>
                updateField("employee_number", event.target.value)
              }
            />

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              type="date"
              value={form.attention_date}
              onChange={(event) =>
                updateField("attention_date", event.target.value)
              }
            />

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="Área"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            />

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              placeholder="Diagnóstico / motivo"
              value={form.diagnosis}
              onChange={(event) => updateField("diagnosis", event.target.value)}
            />

            <select
              className="rounded-xl border border-zinc-300 px-3 py-2"
              value={form.risk_level}
              onChange={(event) => updateField("risk_level", event.target.value)}
            >
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Crítico">Crítico</option>
            </select>

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              type="number"
              min="0"
              placeholder="Tiempo en minutos"
              value={form.attention_minutes}
              onChange={(event) =>
                updateField("attention_minutes", event.target.value)
              }
            />

            <select
              className="rounded-xl border border-zinc-300 px-3 py-2"
              value={form.medicine_id}
              onChange={(event) => updateField("medicine_id", event.target.value)}
            >
              <option value="">Sin medicamento</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} | stock: {medicine.stock}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border border-zinc-300 px-3 py-2"
              type="number"
              min="0"
              placeholder="Cantidad medicamento"
              value={form.medicine_quantity}
              onChange={(event) =>
                updateField("medicine_quantity", event.target.value)
              }
            />

            <textarea
              className="rounded-xl border border-zinc-300 px-3 py-2 md:col-span-3"
              placeholder="Notas"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />

            <button className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 md:col-span-3">
              Guardar atención
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Inventario</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                  <th className="p-3">Medicamento</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Mínimo</th>
                  <th className="p-3">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine.id} className="border-b">
                    <td className="p-3 font-medium">{medicine.name}</td>
                    <td className="p-3">{medicine.stock}</td>
                    <td className="p-3">{medicine.minimum_stock}</td>
                    <td className="p-3">{medicine.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Historial de atenciones</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Diagnóstico</th>
                  <th className="p-3">Riesgo</th>
                  <th className="p-3">Tiempo</th>
                  <th className="p-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {attentions.map((attention) => (
                  <tr key={attention.id} className="border-b align-top">
                    <td className="p-3">{attention.attention_date}</td>
                    <td className="p-3 font-medium">{attention.patient_name}</td>
                    <td className="p-3">{attention.employee_number}</td>
                    <td className="p-3">{attention.area || "-"}</td>
                    <td className="p-3">{attention.diagnosis || "-"}</td>
                    <td className="p-3">{attention.risk_level}</td>
                    <td className="p-3">{attention.attention_minutes} min</td>
                    <td className="p-3">{attention.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}