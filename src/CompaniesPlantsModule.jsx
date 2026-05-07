import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function createInitialCompanyForm() {
  return {
    name: "",
    legal_name: "",
    rfc: "",
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    active: true,
    notes: "",
  };
}

function createInitialPlantForm() {
  return {
    company_id: "",
    name: "",
    location: "",
    address: "",
    active: true,
    notes: "",
  };
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const toneClass =
    tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      {helper && <p className="mt-2 text-sm opacity-70">{helper}</p>}
    </div>
  );
}

export default function CompaniesPlantsModule({ session, userRole }) {
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);

  const [companyForm, setCompanyForm] = useState(createInitialCompanyForm());
  const [plantForm, setPlantForm] = useState(createInitialPlantForm());

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editingPlantId, setEditingPlantId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const canManage = userRole === "admin";

  useEffect(() => {
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchText.trim()) return companies;

    const query = searchText.trim().toLowerCase();

    return companies.filter((company) => {
      const companyPlants = plants.filter(
        (plant) => plant.company_id === company.id
      );

      const searchBase = [
        company.name,
        company.legal_name,
        company.rfc,
        company.address,
        company.contact_name,
        company.contact_email,
        company.contact_phone,
        company.notes,
        ...companyPlants.flatMap((plant) => [
          plant.name,
          plant.location,
          plant.address,
          plant.notes,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchBase.includes(query);
    });
  }, [companies, plants, searchText]);

  const kpis = useMemo(() => {
    return {
      companies: companies.length,
      activeCompanies: companies.filter((item) => item.active).length,
      plants: plants.length,
      activePlants: plants.filter((item) => item.active).length,
    };
  }, [companies, plants]);

  async function loadData() {
    setLoading(true);

    const [companiesResponse, plantsResponse] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("company_plants")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (companiesResponse.error) {
      alert("Error cargando empresas: " + companiesResponse.error.message);
    } else {
      setCompanies(companiesResponse.data || []);
    }

    if (plantsResponse.error) {
      alert("Error cargando plantas: " + plantsResponse.error.message);
    } else {
      setPlants(plantsResponse.data || []);
    }

    setLoading(false);
  }

  function updateCompanyField(field, value) {
    setCompanyForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePlantField(field, value) {
    setPlantForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getCompanyName(companyId) {
    return (
      companies.find((company) => company.id === companyId)?.name ||
      "Empresa no identificada"
    );
  }

  function getPlantsByCompany(companyId) {
    return plants.filter((plant) => plant.company_id === companyId);
  }

  function startEditCompany(company) {
    if (!canManage) return;

    setEditingCompanyId(company.id);
    setCompanyForm({
      name: company.name || "",
      legal_name: company.legal_name || "",
      rfc: company.rfc || "",
      address: company.address || "",
      contact_name: company.contact_name || "",
      contact_email: company.contact_email || "",
      contact_phone: company.contact_phone || "",
      active: Boolean(company.active),
      notes: company.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEditPlant(plant) {
    if (!canManage) return;

    setEditingPlantId(plant.id);
    setPlantForm({
      company_id: plant.company_id || "",
      name: plant.name || "",
      location: plant.location || "",
      address: plant.address || "",
      active: Boolean(plant.active),
      notes: plant.notes || "",
    });

    setTimeout(() => {
      document
        .getElementById("plant-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function cancelCompanyEdit() {
    setEditingCompanyId(null);
    setCompanyForm(createInitialCompanyForm());
  }

  function cancelPlantEdit() {
    setEditingPlantId(null);
    setPlantForm(createInitialPlantForm());
  }

  async function saveCompany(event) {
    event.preventDefault();

    if (!canManage) {
      alert("Solo admin puede registrar o modificar empresas.");
      return;
    }

    if (!companyForm.name.trim()) {
      alert("Captura el nombre comercial de la empresa.");
      return;
    }

    const payload = {
      name: companyForm.name.trim(),
      legal_name: companyForm.legal_name.trim() || null,
      rfc: companyForm.rfc.trim() || null,
      address: companyForm.address.trim() || null,
      contact_name: companyForm.contact_name.trim() || null,
      contact_email: companyForm.contact_email.trim() || null,
      contact_phone: companyForm.contact_phone.trim() || null,
      active: Boolean(companyForm.active),
      notes: companyForm.notes.trim() || null,
    };

    if (editingCompanyId) {
      const { error } = await supabase
        .from("companies")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by_user_id: session?.user?.id || null,
          updated_by_email: session?.user?.email || "Sin correo",
        })
        .eq("id", editingCompanyId);

      if (error) {
        alert("No se pudo actualizar la empresa: " + error.message);
        return;
      }

      cancelCompanyEdit();
      await loadData();
      return;
    }

    const { error } = await supabase.from("companies").insert({
      ...payload,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    });

    if (error) {
      alert("No se pudo registrar la empresa: " + error.message);
      return;
    }

    setCompanyForm(createInitialCompanyForm());
    await loadData();
  }

  async function savePlant(event) {
    event.preventDefault();

    if (!canManage) {
      alert("Solo admin puede registrar o modificar plantas.");
      return;
    }

    if (!plantForm.company_id) {
      alert("Selecciona una empresa.");
      return;
    }

    if (!plantForm.name.trim()) {
      alert("Captura el nombre de la planta o sucursal.");
      return;
    }

    const payload = {
      company_id: plantForm.company_id,
      name: plantForm.name.trim(),
      location: plantForm.location.trim() || null,
      address: plantForm.address.trim() || null,
      active: Boolean(plantForm.active),
      notes: plantForm.notes.trim() || null,
    };

    if (editingPlantId) {
      const { error } = await supabase
        .from("company_plants")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by_user_id: session?.user?.id || null,
          updated_by_email: session?.user?.email || "Sin correo",
        })
        .eq("id", editingPlantId);

      if (error) {
        alert("No se pudo actualizar la planta: " + error.message);
        return;
      }

      cancelPlantEdit();
      await loadData();
      return;
    }

    const { error } = await supabase.from("company_plants").insert({
      ...payload,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    });

    if (error) {
      alert("No se pudo registrar la planta: " + error.message);
      return;
    }

    setPlantForm(createInitialPlantForm());
    await loadData();
  }

  async function deleteCompany(id) {
    if (!canManage) {
      alert("Solo admin puede eliminar empresas.");
      return;
    }

    const companyPlants = getPlantsByCompany(id);

    const message =
      companyPlants.length > 0
        ? `¿Eliminar esta empresa? También se eliminarán ${companyPlants.length} planta(s) registradas.`
        : "¿Eliminar esta empresa?";

    if (!confirm(message)) return;

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar la empresa: " + error.message);
      return;
    }

    await loadData();
  }

  async function deletePlant(id) {
    if (!canManage) {
      alert("Solo admin puede eliminar plantas.");
      return;
    }

    if (!confirm("¿Eliminar esta planta o sucursal?")) return;

    const { error } = await supabase
      .from("company_plants")
      .delete()
      .eq("id", id);

    if (error) {
      alert("No se pudo eliminar la planta: " + error.message);
      return;
    }

    await loadData();
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
          Cargando empresas y plantas...
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label="Empresas"
          value={kpis.companies}
          helper="Clientes registrados"
          tone="dark"
        />

        <KpiCard
          label="Empresas activas"
          value={kpis.activeCompanies}
          helper="Disponibles para operación"
        />

        <KpiCard
          label="Plantas"
          value={kpis.plants}
          helper="Sitios registrados"
          tone="blue"
        />

        <KpiCard
          label="Plantas activas"
          value={kpis.activePlants}
          helper="Centros habilitados"
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Catálogo maestro
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              {editingCompanyId ? "Editar empresa" : "Registrar empresa"}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Alta de clientes, razón social, contacto y datos comerciales.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canManage ? (
          <form
            onSubmit={saveCompany}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre comercial"
              value={companyForm.name}
              onChange={(event) =>
                updateCompanyField("name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Razón social"
              value={companyForm.legal_name}
              onChange={(event) =>
                updateCompanyField("legal_name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="RFC"
              value={companyForm.rfc}
              onChange={(event) =>
                updateCompanyField("rfc", event.target.value)
              }
            />

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={companyForm.active}
                onChange={(event) =>
                  updateCompanyField("active", event.target.checked)
                }
              />
              Empresa activa
            </label>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Dirección fiscal / administrativa"
              value={companyForm.address}
              onChange={(event) =>
                updateCompanyField("address", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Contacto principal"
              value={companyForm.contact_name}
              onChange={(event) =>
                updateCompanyField("contact_name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Teléfono contacto"
              value={companyForm.contact_phone}
              onChange={(event) =>
                updateCompanyField("contact_phone", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Correo contacto"
              type="email"
              value={companyForm.contact_email}
              onChange={(event) =>
                updateCompanyField("contact_email", event.target.value)
              }
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Notas comerciales / operativas"
              value={companyForm.notes}
              onChange={(event) =>
                updateCompanyField("notes", event.target.value)
              }
            />

            <div className="flex flex-col gap-2 md:col-span-4 md:flex-row">
              <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800">
                {editingCompanyId ? "Guardar empresa" : "Registrar empresa"}
              </button>

              {editingCompanyId && (
                <button
                  type="button"
                  onClick={cancelCompanyEdit}
                  className="rounded-2xl border border-zinc-300 px-5 py-4 font-black text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        ) : (
          <EmptyState text="Tu rol actual permite consulta, pero no alta o modificación de empresas." />
        )}
      </section>

      <section
        id="plant-form"
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Sitios operativos
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {editingPlantId ? "Editar planta" : "Registrar planta / sucursal"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Cada empresa puede tener una o varias plantas, sucursales o centros
            de trabajo.
          </p>
        </div>

        {canManage ? (
          <form
            onSubmit={savePlant}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={plantForm.company_id}
              onChange={(event) =>
                updatePlantField("company_id", event.target.value)
              }
            >
              <option value="">Seleccionar empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre de planta / sucursal"
              value={plantForm.name}
              onChange={(event) =>
                updatePlantField("name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Ubicación corta"
              value={plantForm.location}
              onChange={(event) =>
                updatePlantField("location", event.target.value)
              }
            />

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={plantForm.active}
                onChange={(event) =>
                  updatePlantField("active", event.target.checked)
                }
              />
              Planta activa
            </label>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Dirección de planta"
              value={plantForm.address}
              onChange={(event) =>
                updatePlantField("address", event.target.value)
              }
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Notas del sitio"
              value={plantForm.notes}
              onChange={(event) =>
                updatePlantField("notes", event.target.value)
              }
            />

            <div className="flex flex-col gap-2 md:col-span-4 md:flex-row">
              <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800">
                {editingPlantId ? "Guardar planta" : "Registrar planta"}
              </button>

              {editingPlantId && (
                <button
                  type="button"
                  onClick={cancelPlantEdit}
                  className="rounded-2xl border border-zinc-300 px-5 py-4 font-black text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        ) : (
          <EmptyState text="Tu rol actual permite consulta, pero no alta o modificación de plantas." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Directorio operativo
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Empresas y plantas registradas
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Base maestra para separar operación por cliente y centro de
              trabajo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm"
              placeholder="Buscar empresa, planta, RFC, contacto..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <button
              type="button"
              onClick={loadData}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {filteredCompanies.map((company) => {
            const companyPlants = getPlantsByCompany(company.id);

            return (
              <div
                key={company.id}
                className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight">
                        {company.name}
                      </h3>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          company.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {company.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-600">
                      {company.legal_name || "Sin razón social"} · RFC:{" "}
                      {company.rfc || "Sin RFC"}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Contacto: {company.contact_name || "-"} ·{" "}
                      {company.contact_email || "-"} ·{" "}
                      {company.contact_phone || "-"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">
                      Alta: {formatDateTime(company.created_at)} · Capturó:{" "}
                      {company.created_by_email || "-"}
                    </p>

                    {company.address && (
                      <p className="mt-2 text-sm text-zinc-500">
                        Dirección: {company.address}
                      </p>
                    )}

                    {company.notes && (
                      <p className="mt-2 text-sm text-zinc-500">
                        Notas: {company.notes}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditCompany(company)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCompany(company.id)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[950px] text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                        <th className="p-3">Planta / sucursal</th>
                        <th className="p-3">Empresa</th>
                        <th className="p-3">Ubicación</th>
                        <th className="p-3">Dirección</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Notas</th>
                        {canManage && (
                          <th className="p-3 text-right">Acciones</th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {companyPlants.map((plant) => (
                        <tr
                          key={plant.id}
                          className="border-b align-top hover:bg-white"
                        >
                          <td className="p-3 font-bold">{plant.name}</td>
                          <td className="p-3">{getCompanyName(plant.company_id)}</td>
                          <td className="p-3">{plant.location || "-"}</td>
                          <td className="p-3">{plant.address || "-"}</td>

                          <td className="p-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${
                                plant.active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {plant.active ? "Activa" : "Inactiva"}
                            </span>
                          </td>

                          <td className="p-3">{plant.notes || "-"}</td>

                          {canManage && (
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => startEditPlant(plant)}
                                className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => deletePlant(plant.id)}
                                className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {companyPlants.length === 0 && (
                    <div className="mt-4">
                      <EmptyState text="Esta empresa aún no tiene plantas registradas." />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredCompanies.length === 0 && (
            <EmptyState text="No hay empresas registradas o no coinciden con la búsqueda." />
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
          Siguiente integración
        </p>

        <h3 className="mt-2 text-2xl font-black tracking-tight">
          Conectar registros clínicos a empresa y planta
        </h3>

        <p className="mt-3 max-w-4xl text-sm text-zinc-300">
          Una vez validado este catálogo, el siguiente paso es agregar selector
          de empresa/planta en Atenciones, Antidoping y Crónico-degenerativos
          para separar reportes por cliente, planta y centro de trabajo.
        </p>
      </section>
    </div>
  );
}