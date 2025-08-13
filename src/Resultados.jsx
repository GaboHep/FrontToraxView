import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoEspol from "./assets/logoToraxView.png";
import "./Dashboard.css";
import { useAuth } from "./context/AuthContext";

export default function Resultados() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const userRole = auth?.role;
  const token = auth?.token;

  const [registros, setRegistros] = useState([]);
  const [abiertos, setAbiertos] = useState({});
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | prec_desc | prec_asc
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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("https://backend-toraxview.onrender.com/mis_registros", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setRegistros(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error al cargar registros:", err);
        setRegistros([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = [...registros];

    if (term) {
      out = out.filter((r) => {
        const id = String(r.key || "").toLowerCase();
        const city = String(r.city || "").toLowerCase();
        const parish = String(r.parish || "").toLowerCase();
        const canton = String(r.canton || "").toLowerCase();
        const gender = String(r.gender || "").toLowerCase();
        return (
          id.includes(term) ||
          city.includes(term) ||
          parish.includes(term) ||
          canton.includes(term) ||
          gender.includes(term)
        );
      });
    }

    out.sort((a, b) => {
      const da = new Date(a.inference_date || a.inferenceDate || 0).getTime();
      const db = new Date(b.inference_date || b.inferenceDate || 0).getTime();
      const pa = Number(a.precision ?? 0);
      const pb = Number(b.precision ?? 0);
      switch (sortBy) {
        case "date_asc":
          return da - db;
        case "prec_desc":
          return pb - pa;
        case "prec_asc":
          return pa - pb;
        case "date_desc":
        default:
          return db - da;
      }
    });

    return out;
  }, [registros, q, sortBy]);

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

            {userRole === "radiologo" && (
              <li className="active">Resultados</li>
            )}

            {userRole === "administrador" && (
              <>
                <li onClick={() => navigate("/feedbacks")}>Resultados por Radiólogo</li>
                <li onClick={() => navigate("/usuarios")}>Usuarios</li>
              </>
            )}
          </ul>
        </aside>

        {/* Main */}
        <main className="dw-main">
          <h2 className="dw-title">Historial de Resultados</h2>

          {/* Filtros */}
          <section className="card" style={{ marginBottom: 14 }}>
            <div className="rs-controls">
              <input
                className="rs-input"
                placeholder="Buscar por ID, ciudad, parroquia, cantón o género…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="rs-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title="Ordenar"
              >
                <option value="date_desc">Fecha: más recientes</option>
                <option value="date_asc">Fecha: más antiguos</option>
                {/*<option value="prec_desc">Precisión: mayor a menor</option>*/}
                {/*<option value="prec_asc">Precisión: menor a mayor</option>*/}
              </select>
            </div>
          </section>

          {/* Estado carga / vacío */}
          {loading ? (
            <section className="card dw-progress" style={{ marginTop: 10 }}>
              <div className="progressRow">
                <progress className="progressBar" />
                <span className="progressLabel">Cargando…</span>
              </div>
            </section>
          ) : filteredSorted.length === 0 ? (
            <section className="card" style={{ textAlign: "center" }}>
              <p className="muted">No hay registros guardados aún.</p>
            </section>
          ) : (
            <section className="rs-grid">
              {filteredSorted.map((registro) => {
                const isOpen = abiertos[registro.key] ?? false;
                const precision = Number(registro.precision ?? 0);
                const precisionPct = `${(precision * 100).toFixed(2)}%`;
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
                        {/* <span className="chip sm">{precisionPct}</span> */}
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

                        <h4 className="rs-subtitle">Resultados</h4>
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

                        <div className="dw-actions end">
                          <button
                            className="btn ghost"
                            onClick={() => {
                              navigator.clipboard?.writeText(registro.key).catch(() => {});
                            }}
                          >
                            Copiar ID
                          </button>
                          <a className="btn primary" href={registro.image} download={`rx_${registro.key}.png`}>
                            Descargar imagen
                          </a>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
