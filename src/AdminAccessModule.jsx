import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const roleOptions = ["admin", "medico", "enfermeria", "lectura", "bloqueado"];
const scopeOptions = [
  { value: "global", label: "Global / todas las empresas" },
  { value: "company", label: "Empresa completa" },
  { value: "plant", label: "Planta específica" },
];

function getRoleBadgeClass(role) {
  if (role === "admin") return "bg-red-100 text-red-800 ring-red-200";
  if (role === "medico") return "bg-blue-100 text-blue-800 ring-blue-200";
  if (role === "enfermeria") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (role === "lectura") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  if (role === "bloqueado") return "bg-black text-white ring-black";
  return "bg-amber-100 text-amber-800 ring-amber-200";
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

export default function AdminAccessModule({
  session,
  userRole,
  companies,
  plants,
}) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");
  const [searchText, setSearchText] = useState("");

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const activeCompanies = useMemo(() => {
    return companies.filter((company) => company.active);
  }, [companies]);

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return users;

    const query = searchText.trim().toLowerCase();

    return users.filter((user) => {
      const draft = drafts[user.user_id] || user;

      const companyName =
        companies.find((company) => company.id === draft.company_id)?.name || "";

      const plantName =
        plants.find((plant) => plant.id === draft.plant_id)?.name || "";

      return [
        user.email,
        draft.role,
        draft.scope,
        companyName,
        plantName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [users, drafts, companies, plants, searchText]);

  const kpis = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => (drafts[user.user_id]?.role || user.role) === "admin").length,
      plantUsers: users.filter((user) => (drafts[user.user_id]?.scope || user.scope) === "plant").length,
      blocked: users.filter((user) => (drafts[user.user_id]?.role || user.role) === "bloqueado").length,
    };
  }, [users, drafts]);

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabase.rpc("admin_list_users_access");

    if (error) {
      alert("No se pudieron cargar usuarios: " + error.message);
      setUsers([]);
      setDrafts({});
      setLoading(false);
      return;
    }

    const safeUsers = data || [];

    setUsers(safeUsers);

    const nextDrafts = {};

    safeUsers.forEach((user) => {
      nextDrafts[user.user_id] = {
        role: user.role || "lectura",
        scope: user.scope || "plant",
        company_id: user.company_id || "",
        plant_id: user.plant_id || "",
      };
    });

    setDrafts(nextDrafts);
    setLoading(false);
  }

  function getDraft(userId) {
    return (
      drafts[userId] || {
        role: "lectura",
        scope: "plant",
        company_id: "",
        plant_id: "",
      }
    );
  }

  function updateDraft(userId, field, value) {
    setDrafts((current) => {
      const previous = current[userId] || {
        role: "lectura",
        scope: "plant",
        company_id: "",
        plant_id: "",
      };

      if (field === "scope") {
        return {
          ...current,
          [userId]: {
            ...previous,
            scope: value,
            company_id: value === "global" ? "" : previous.company_id,
            plant_id: value === "global" || value === "company" ? "" : previous.plant_id,
          },
        };
      }

      if (field === "company_id") {
        return {
          ...current,
          [userId]: {
            ...previous,
            company_id: value,
            plant_id: "",
          },
        };
      }

      return {
        ...current,
        [userId]: {
          ...previous,
          [field]: value,
        },
      };
    });
  }

  function getPlantsForCompany(companyId) {
    if (!companyId) return [];
    return plants.filter((plant) => plant.company_id === companyId && plant.active);
  }

  function getCompanyName(companyId) {
    if (!companyId) return "-";
    return companies.find((company) => company.id === companyId)?.name || "-";
  }

  function getPlantName(plantId) {
    if (!plantId) return "-";
    return plants.find((plant) => plant.id === plantId)?.name || "-";
  }

  async function saveUserAccess(user) {
    const draft = getDraft(user.user_id);

    if (draft.scope === "company" && !draft.company_id) {
      alert("Para alcance por empresa, selecciona una empresa.");
      return;
    }

    if (draft.scope === "plant" && (!draft.company_id || !draft.plant_id)) {
      alert("Para alcance por planta, selecciona empresa y planta.");
      return;
    }

    if (user.user_id === session?.user?.id && draft.role !== "admin") {
      const confirmSelfChange = confirm(
        "Estás por quitarte el rol admin a ti mismo. Si continúas, podrías perder acceso a este panel. ¿Continuar?"
      );

      if (!confirmSelfChange) return;
    }

    setSavingUserId(user.user_id);

    const { error } = await supabase.rpc("admin_update_user_access", {
      target_user_id: user.user_id,
      new_role: draft.role,
      new_scope: draft.scope,
      new_company_id: draft.scope === "global" ? null : draft.company_id || null,
      new_plant_id: draft.scope === "plant" ? draft.plant_id || null : null,
    });

    if (error) {
      alert("No se pudo guardar la asignación: " + error.message);
      setSavingUserId("");
      return;
    }

    await loadUsers();
    setSavingUserId("");
  }

  if (!isAdmin) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
          Acceso restringido
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Administración no disponible
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Tu rol actual es <strong>{userRole || "sin rol"}</strong>. Solo usuarios
          con rol <strong>admin</strong> pueden asignar empresas, plantas y roles.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
          Cargando usuarios y asignaciones...
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Usuarios" value={kpis.total} helper="Registrados en Auth" tone="dark" />
        <KpiCard label="Admins" value={kpis.admins} helper="Acceso global" tone="red" />
        <KpiCard label="Asignados a planta" value={kpis.plantUsers} helper="Operación in-plant" tone="blue" />
        <KpiCard label="Bloqueados" value={kpis.blocked} helper="Sin acceso operativo" />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Administración operativa
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Usuarios, roles y alcance
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Define a qué empresa y planta pertenece cada usuario. Esto evitará que capture registros en un cliente equivocado.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm"
              placeholder="Buscar usuario, empresa o planta"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

            <button
              type="button"
              onClick={loadUsers}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Usuario</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Alcance</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Planta</th>
                <th className="p-3">Asignación actual</th>
                <th className="p-3">Creación</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const draft = getDraft(user.user_id);
                const availablePlants = getPlantsForCompany(draft.company_id);

                return (
                  <tr key={user.user_id} className="border-b align-top hover:bg-zinc-50">
                    <td className="p-3">
                      <div className="font-bold">{user.email}</div>
                      {user.user_id === session?.user?.id && (
                        <div className="mt-1 text-xs font-bold text-red-700">
                          Usuario actual
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <select
                        className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                        value={draft.role}
                        onChange={(event) =>
                          updateDraft(user.user_id, "role", event.target.value)
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      <div className="mt-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRoleBadgeClass(
                            draft.role
                          )}`}
                        >
                          {draft.role}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                        value={draft.scope}
                        onChange={(event) =>
                          updateDraft(user.user_id, "scope", event.target.value)
                        }
                      >
                        {scopeOptions.map((scope) => (
                          <option key={scope.value} value={scope.value}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                        value={draft.company_id || ""}
                        disabled={draft.scope === "global"}
                        onChange={(event) =>
                          updateDraft(user.user_id, "company_id", event.target.value)
                        }
                      >
                        <option value="">Seleccionar empresa</option>
                        {activeCompanies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                        value={draft.plant_id || ""}
                        disabled={draft.scope !== "plant" || !draft.company_id}
                        onChange={(event) =>
                          updateDraft(user.user_id, "plant_id", event.target.value)
                        }
                      >
                        <option value="">Seleccionar planta</option>
                        {availablePlants.map((plant) => (
                          <option key={plant.id} value={plant.id}>
                            {plant.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <div className="rounded-2xl bg-zinc-100 p-3 text-xs text-zinc-700">
                        <div>
                          <strong>Alcance:</strong> {draft.scope}
                        </div>
                        <div>
                          <strong>Empresa:</strong> {getCompanyName(draft.company_id)}
                        </div>
                        <div>
                          <strong>Planta:</strong> {getPlantName(draft.plant_id)}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{formatDateTime(user.created_at)}</td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={savingUserId === user.user_id}
                        onClick={() => saveUserAccess(user)}
                        className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white hover:bg-red-800 disabled:opacity-50"
                      >
                        {savingUserId === user.user_id ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay usuarios para mostrar." />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
          Regla operativa correcta
        </p>

        <h3 className="mt-2 text-2xl font-black tracking-tight">
          La empresa y planta deben venir del usuario, no de la captura
        </h3>

        <p className="mt-3 max-w-4xl text-sm text-zinc-300">
          El usuario in-plant debe registrar atenciones, antidoping o seguimientos
          dentro de su empresa/planta asignada. Solo administración SOS debe poder
          operar de forma global o corregir asignaciones.
        </p>
      </section>
    </div>
  );
}
