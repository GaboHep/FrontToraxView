import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoEspol from "./assets/logoToraxView.png";
import "./Dashboard.css";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./config";


export default function Usuarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const token = auth?.token;
  const userRole = auth?.role;

  const [radiologos, setRadiologos] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ username: "", password: "" });
  const [editingId, setEditingId] = useState(null);
  const [q, setQ] = useState("");

  // Cargar usuarios
  const fetchUsers = () => {
    if (!token) return;
    setLoadingList(true);
    fetch(`${API_URL}/radiologos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          console.warn("Token inválido o expirado");
          logout();
          return [];
        }
        return res.json();
      })
      .then((data) => {
        setRadiologos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error al obtener usuarios:", err);
        setRadiologos([]);
      })
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Handlers
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({ username: "", password: "" });
    setEditingId(null);
  };

  const handleEdit = (rad) => {
    setForm({ username: rad.username, password: "" }); // contraseña opcional al editar
    setEditingId(rad.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    fetch(`${API_URL}/radiologos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al eliminar");
        setRadiologos((prev) => prev.filter((r) => r.id !== id));
      })
      .catch(() => alert("❌ No se pudo eliminar el usuario."));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_URL}/radiologos/${editingId}`
        : `${API_URL}/radiologos`;

      // Construir payload: si se edita y password está vacío, no lo enviamos
      const payload = editingId
        ? (form.password?.trim()
            ? { username: form.username, password: form.password }
            : { username: form.username })
        : { username: form.username, password: form.password };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Error al guardar");
      }

      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("❌ No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  // Filtro de búsqueda
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return radiologos;
    return radiologos.filter((r) => String(r.username || "").toLowerCase().includes(term));
  }, [q, radiologos]);

  return (
    <div className="dw-wrap">
      {/* Header */}
      <header className="dw-header">
        <div className="lp-brand">
          <div className="logo-badge">
            <img src={logoEspol} alt="ESPOL" className="lp-logo" />
          </div>
          <span className="lp-brandName">ToraxVIEW</span>
        </div>

        <div className="dw-right">
          <div className="dw-user">
            <span className="dw-role">{userRole === "radiologo" ? "Radiólogo" : "Administrador"}</span>
            <span aria-hidden>👤</span>
          </div>
          <button
            className="dw-logout"
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="dw-body">
        {/* Sidebar */}
        <aside className="dw-sidebar">
          <ul>
            <li onClick={() => navigate("/dashboard")}>Análisis</li>
            {userRole === "radiologo" && <li onClick={() => navigate("/resultados")}>Resultados</li>}
            {userRole === "administrador" && (
              <>
                <li onClick={() => navigate("/feedbacks")}>Resultados por Radiólogo</li>
                <li className="active" onClick={() => navigate("/usuarios")}>Usuarios</li>
              </>
            )}
          </ul>
        </aside>

        {/* Main */}
        <main className="dw-main">
          <h2 className="dw-title">Gestión de Usuarios</h2>

          {/* Formulario (card) */}
          <section className="card" style={{ marginBottom: 14 }}>
            <h3 className="cardTitle">{editingId ? "Editar usuario" : "Crear nuevo usuario"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="formRow">
                <label>
                  Usuario
                  <input
                    type="text"
                    name="username"
                    placeholder="Nombre de usuario"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Contraseña {editingId && <span className="muted">(opcional al editar)</span>}
                  <input
                    type="password"
                    name="password"
                    placeholder={editingId ? "Deja en blanco para no cambiar" : "Contraseña"}
                    value={form.password}
                    onChange={handleChange}
                    required={!editingId}
                  />
                </label>
              </div>

              <div className="dw-actions">
                <button className="btn primary" type="submit" disabled={saving}>
                  {saving ? (editingId ? "Actualizando…" : "Creando…") : (editingId ? "Actualizar" : "Crear")}
                </button>
                {editingId && (
                  <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Buscador + Tabla (card) */}
          <section className="card">
            <div className="formRow" style={{ alignItems: "flex-end" }}>
              <label style={{ flex: 1 }}>
                Buscar por usuario
                <input
                  type="text"
                  placeholder="Escribe para filtrar…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn ghost" onClick={fetchUsers} disabled={loadingList}>
                  {loadingList ? "Actualizando…" : "Actualizar lista"}
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setQ("");
                  }}
                >
                  Limpiar filtro
                </button>
              </div>
            </div>

            {loadingList ? (
              <div className="dw-progress" style={{ marginTop: 10 }}>
                <div className="progressRow">
                  <progress className="progressBar" />
                  <span className="progressLabel">Cargando usuarios…</span>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="resultados-tabla user-table">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>ID</th>
                      <th>Usuario</th>
                      <th style={{ width: 220, textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(filtered) && filtered.length > 0 ? (
                      filtered.map((r) => (
                        <tr key={r.id}>
                          <td className="mono">{r.id}</td>
                          <td>{r.username}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 8 }}>
                              <button className="btn ghost" onClick={() => handleEdit(r)} disabled={saving}>
                                Editar
                              </button>
                              <button className="btn ghost" onClick={() => handleDelete(r.id)} disabled={saving}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="muted">
                          No hay usuarios registrados o el filtro no tiene coincidencias.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
