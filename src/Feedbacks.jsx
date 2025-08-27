import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoEspol from "./assets/logoToraxView.png";
import "./Dashboard.css";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./config";

export default function Feedbacks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const token = auth?.token;
  const userRole = auth?.role;

  const [radiologos, setRadiologos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [abiertos, setAbiertos] = useState({});
  const [activoId, setActivoId] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleAbierto = (key) => {
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const parseResultados = useCallback((r) => {
    try {
      const arr = JSON.parse(r);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  // Cargar lista de radiólogos
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/radiologos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setRadiologos(Array.isArray(data) ? data : []))
      .catch(() => setRadiologos([]));
  }, [token]);

  // Cargar registros por radiólogo
  const cargarRegistros = (id) => {
    setActivoId(id);
    setLoading(true);
    fetch(`${API_URL}/registros_por_radiologo/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) => new Date(b.inference_date) - new Date(a.inference_date));
        setRegistros(list);
      })
      .catch(() => setRegistros([]))
      .finally(() => setLoading(false));
  };

  // ------------------ EXPORTAR REGISTROS (solo admin) ------------------
  const [expUserId, setExpUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [format, setFormat] = useState("csv"); // csv | json | zip
  const [includeImages, setIncludeImages] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (expUserId) params.set("user_id", expUserId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("format", format);
      if (format === "zip" && includeImages) params.set("include_images", "true");

      const url = `${API_URL}/export/registros?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      const ext = format === "json" ? "json" : (format === "zip" ? "zip" : "csv");
      a.download = `registros.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      alert("No se pudo descargar el archivo.");
    } finally {
      setDownloading(false);
    }
  };
  // --------------------------------------------------------------------

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
                <li className="active">Resultados por Radiólogo</li>
                <li onClick={() => navigate("/usuarios")}>Usuarios</li>
              </>
            )}
          </ul>
        </aside>

        {/* Main */}
        <main className="dw-main">
          <h2 className="dw-title">Registros por Radiólogo</h2>

          {/* Selector de radiólogos (chips) */}
          <section className="card" style={{ marginBottom: 14 }}>
            <div className="rs-controls">
              <div className="rs-chips">
                {radiologos.map((r) => (
                  <button
                    key={r.id}
                    className={`chip ${r.id === activoId ? "active" : ""}`}
                    onClick={() => cargarRegistros(r.id)}
                    title={r.username}
                  >
                    {r.username}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Exportar registros (solo admin) */}
          {userRole === "administrador" && (
            <section className="card" style={{ marginBottom: 14 }}>
              <h3 className="cardTitle">Exportar registros</h3>
              <div className="formRow">
                <label className="field">
                  Usuario
                  <div className="selectWrap">
                    <select
                      className="select"
                      value={expUserId}
                      onChange={(e) => setExpUserId(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {radiologos.map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="field">
                  Desde
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>

                <label className="field">
                  Hasta
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>

                <label className="field">
                  Formato
                  <div className="selectWrap">
                    <select
                      className="select"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="zip">ZIP (CSV + imágenes)</option>
                    </select>
                  </div>
                </label>

                {format === "zip" && (
                  <label className="field" style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                    />
                    Incluir imágenes
                  </label>
                )}
              </div>

              <div className="dw-actions end">
                <button className="btn primary" onClick={handleDownload} disabled={downloading}>
                  {downloading ? "Generando…" : "Descargar"}
                </button>
              </div>
            </section>
          )}

          {/* Loading */}
          {loading && (
            <section className="card dw-progress" style={{ marginTop: 10 }}>
              <div className="progressRow">
                <progress className="progressBar" />
                <span className="progressLabel">Cargando registros…</span>
              </div>
            </section>
          )}

          {/* Grid de tarjetas */}
          {!loading && activoId && (
            registros.length === 0 ? (
              <section className="card" style={{ textAlign: "center" }}>
                <p className="muted">No hay registros disponibles para este radiólogo.</p>
              </section>
            ) : (
              <section className="rs-grid">
                {registros.map((registro) => {
                  const isOpen = abiertos[registro.key] ?? false;
                  const precision = Number(registro.precision ?? 0);
                  const resultadosArr = parseResultados(registro.resultados);

                  return (
                    <article key={registro.key} className={`rs-card card ${isOpen ? "open" : ""}`}>
                      <header className="rs-cardHeader" onClick={() => toggleAbierto(registro.key)}>
                        <button className="rs-toggle" aria-label={isOpen ? "Colapsar" : "Expandir"}>
                          {isOpen ? "−" : "+"}
                        </button>
                        <div className="rs-id">
                          <span className="muted">ID</span>
                          <strong className="mono">{registro.key}</strong>
                        </div>
                        <div className="rs-meta">
                          <span>{registro.inference_date}</span>
                          {/* <span className="chip sm">{(precision * 100).toFixed(2)}%</span> */}
                        </div>
                      </header>

                      {isOpen && (
                        <div className="rs-content">
                          <div className="rs-infoGrid">
                            <p><strong>Género:</strong> {registro.gender || "—"}</p>
                            <p>
                              <strong>Lugar:</strong>{" "}
                              {[registro.city, registro.parish, registro.canton].filter(Boolean).join(", ") || "—"}
                            </p>
                          </div>

                          {registro.image && (
                            <img
                              src={registro.image}
                              alt="Radiografía"
                              className="rs-thumb"
                            />
                          )}

                          {/* Encabezado sincronizado con Dashboard */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h4 className="rs-subtitle">Resultados</h4>
                            <strong className="rs-subtitle">Probabilidades</strong>
                          </div>

                          {resultadosArr.length > 0 ? (
                            <div className="resultsList">
                              {resultadosArr.map((r, i) => {
                                const pct = Math.max(0, Math.min(100, (r?.probability || 0) * 100));
                                return (
                                  <div key={`${registro.key}-${i}`} className="resultItem">
                                    <div className="resultRow">
                                      <span className="chip">{r?.label}</span>
                                      <span className="pct">{pct.toFixed(2)}%</span>
                                    </div>
                                    <div className="bar">
                                      <div className="barFill" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="muted">Sin resultados.</p>
                          )}

                          <h4 className="rs-subtitle">Observaciones</h4>
                          <p className="rs-feedback">
                            {registro.feedback || <span className="muted">Sin observaciones.</span>}
                          </p>

                          {/* Acciones (copiar ID / descargar imagen) */}
                          <div className="dw-actions end">
                            <button
                              className="btn ghost"
                              onClick={() => {
                                navigator.clipboard?.writeText(registro.key).catch(() => {});
                              }}
                            >
                              Copiar ID
                            </button>

                            {registro.image ? (
                              <a className="btn primary" href={registro.image} download={`rx_${registro.key}.png`}>
                                Descargar imagen
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            )
          )}
        </main>
      </div>
    </div>
  );
}
