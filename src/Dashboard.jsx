import React, { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logoEspol from "./assets/logoToraxView.png";
import "./Dashboard.css";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./config";


export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, logout } = useAuth();
  const userRole = auth?.role;

  const [image, setImage] = useState(null);          // DataURL para preview
  const [fileObj, setFileObj] = useState(null);      // File real para enviar
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [precision, setPrecision] = useState(null);
  const [feedback, setFeedback] = useState("");

  // Toast de aviso { type: "success" | "error", text: string }
  const [notice, setNotice] = useState(null);

  const [formData, setFormData] = useState({
    key: crypto.randomUUID(),
    birthDate: "",
    gender: "",
    city: "",
    parish: "",
    canton: "",
    inferenceDate: new Date().toISOString().split("T")[0],
  });

  // ---------- handlers ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetAll = () => {
    setImage(null);
    setFileObj(null);
    setResultados([]);
    setPrecision(null);
    setFeedback("");
    setFormData({
      key: crypto.randomUUID(),
      birthDate: "",
      gender: "",
      city: "",
      parish: "",
      canton: "",
      inferenceDate: new Date().toISOString().split("T")[0],
    });
    setShowResults(false);
    setLoading(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileObj(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setShowResults(false);
      setResultados([]);
      setPrecision(null);
    };
    reader.readAsDataURL(file);
  };

  // drag & drop (opcional)
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileObj(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setShowResults(false);
      setResultados([]);
      setPrecision(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ---------- predict (sin simulación de porcentaje) ----------
  const handleDiagnose = async () => {
    if (!fileObj && !image) return;

    setLoading(true);
    setShowResults(false);

    try {
      const fd = new FormData();
      if (fileObj) {
        fd.append("file", fileObj, fileObj.name || "image.png");
      } else {
        const blob = await fetch(image).then((r) => r.blob());
        fd.append("file", blob, "image.png");
      }

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: fd,
      });

      if (!response.ok) throw new Error("Error en predicción");

      const data = await response.json();
      setResultados(Array.isArray(data.predictions) ? data.predictions : []);
      setPrecision(typeof data.precision === "number" ? data.precision : null);
      setShowResults(true);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", text: "Ocurrió un error al procesar la imagen." });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ---------- save ----------
  const handleGuardar = async () => {
    const nuevoRegistro = {
      key: formData.key,
      inference_date: formData.inferenceDate,
      birth_date: formData.birthDate,
      gender: formData.gender,
      city: formData.city,
      parish: formData.parish,
      canton: formData.canton,
      precision: precision,
      resultados: JSON.stringify(resultados),
      feedback: feedback,
      image: image, // dataURL
    };

    try {
      const response = await fetch(`${API_URL}/guardar_registro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth?.token}`,
        },
        body: JSON.stringify(nuevoRegistro),
      });

      if (!response.ok) throw new Error("Error al guardar en base de datos");

      // aviso de éxito + flujo hacia /resultados
      setNotice({ type: "success", text: "Registro guardado correctamente" });
      setTimeout(() => {
        resetAll();
        navigate("/resultados");
      }, 3000);
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", text: "Error al guardar el registro" });
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const precisionPct = useMemo(
    () => (precision != null ? (precision * 100).toFixed(2) : null),
    [precision]
  );

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
            <li
              className={location.pathname === "/dashboard" ? "active" : ""}
              onClick={() => {
                if (location.pathname === "/dashboard") {
                  window.location.reload();
                } else {
                  navigate("/dashboard");
                }
              }}
            >
              Análisis
            </li>

            {userRole === "radiologo" && (
              <li onClick={() => navigate("/resultados")}>Resultados</li>
            )}

            {userRole === "administrador" && (
              <>
                <li onClick={() => navigate("/feedbacks")}>Resultados por Radiólogo</li>
                <li onClick={() => navigate("/usuarios")}>Usuarios</li>
              </>
            )}
          </ul>
        </aside>

        {/* Main Content */}
        <main className="dw-main">
          <h2 className="dw-title">Análisis de Radiografía de Tórax</h2>

          {/* Upload + Form */}
          <section className="dw-grid-2">
            {/* Upload / Preview */}
            <div
              className={`card dw-upload ${!image ? "is-empty" : ""}`}
              onDrop={onDrop}
              onDragOver={preventDefaults}
              onDragEnter={preventDefaults}
              onDragLeave={preventDefaults}
            >
              {image ? (
                <>
                  <img src={image} alt="preview" className="dw-preview" />
                  <div className="dw-uploadActions">
                    <label className="btn ghost" title="Reemplazar imagen">
                      Reemplazar
                      <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                    </label>
                    <button className="btn ghost" onClick={resetAll}>
                      Limpiar
                    </button>
                  </div>
                </>
              ) : (
                <div className="dw-dropzone">
                  <p className="dz-arrow" aria-hidden>⬇️</p>
                  <p>Arrastra y suelta una imagen o</p>
                  <label className="btn primary">
                    Seleccionar imagen
                    <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
                  </label>
                </div>
              )}
            </div>

            {/* Formulario datos */}
            <div className="card dw-form">
              <h3 className="cardTitle">Datos del paciente</h3>

              <div className="formRow">
                <label>
                  Fecha de nacimiento
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Género
                  <select name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Seleccione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
              </div>

              <div className="formRow">
                <label>
                  Ciudad
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Escriba la ciudad"
                  />
                </label>

                <label>
                  Parroquia
                  <input
                    type="text"
                    name="parish"
                    value={formData.parish}
                    onChange={handleInputChange}
                    placeholder="Escriba la parroquia"
                  />
                </label>
              </div>

              <div className="formRow">
                <label>
                  Cantón
                  <input
                    type="text"
                    name="canton"
                    value={formData.canton}
                    onChange={handleInputChange}
                    placeholder="Escriba el cantón"
                  />
                </label>

                <label>
                  Fecha de inferencia
                  <input
                    type="date"
                    name="inferenceDate"
                    value={formData.inferenceDate}
                    readOnly
                    disabled
                  />
                </label>
              </div>

              <div className="dw-actions">
                <button className="btn danger" onClick={resetAll}>Cancelar</button>
                <button className="btn primary" onClick={handleDiagnose} disabled={!image || loading}>
                  {loading ? "Analizando…" : "Analizar imagen"}
                </button>
              </div>
            </div>
          </section>

          {/* Progreso indeterminado (igual a Resultados) */}
          {loading && (
            <section className="card dw-progress" style={{ marginTop: 10 }}>
              <div className="progressRow">
                <progress className="progressBar" />
                <span className="progressLabel">Procesando imagen…</span>
              </div>
            </section>
          )}

          {/* Resultados + Observaciones */}
          {showResults && (
            <section className="dw-grid-2">
              {/* Resultados */}
              <div className="card">
                <h3 className="cardTitle">Resultados</h3>

                {Array.isArray(resultados) && resultados.length > 0 ? (
                  <div className="resultsList">
                    {resultados.map((item, idx) => {
                      const pct = Math.max(0, Math.min(100, (item?.probability || 0) * 100));
                      return (
                        <div className="resultItem" key={`${item?.label}-${idx}`}>
                          <div className="resultRow">
                            <span className="chip">{item?.label}</span>
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
                  <p className="muted">No hay resultados disponibles.</p>
                )}

                {/* precisionPct && (
                  <p className="precision">
                    Precisión general del modelo: <strong>{precisionPct}%</strong>
                  </p>
                )} */}
              </div> 

              {/* Observaciones */}
              <div className="card">
                <h3 className="cardTitle">Observaciones</h3>
                <textarea
                  className="textarea"
                  placeholder="Escriba sus observaciones aquí…"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <div className="dw-actions end">
                  <button className="btn primary" onClick={handleGuardar} disabled={!showResults}>
                    Guardar
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Toast de aviso */}
      {notice && (
        <div className={`toast ${notice.type}`}>
          {notice.text}
        </div>
      )}
    </div>
  );
}
