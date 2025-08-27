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

  // Modales
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);         // Analizar
  const [showIncompleteSaveModal, setShowIncompleteSaveModal] = useState(false); // Guardar
  const [saveModalMsg, setSaveModalMsg] = useState("");                          // Mensaje dinámico modal Guardar
  const MIN_FEEDBACK = 10;

  const [formData, setFormData] = useState({
    key: crypto.randomUUID(),
    birthDate: "",
    gender: "",
    city: "",
    parish: "",
    provincia: "",
    inferenceDate: new Date().toISOString().split("T")[0],
  });

  // --- validación: todos los campos requeridos deben estar llenos ---
  const isFormComplete = useMemo(() => {
    const requiredKeys = ["birthDate", "gender", "provincia", "city", "parish"];
    return requiredKeys.every((k) => String(formData[k] ?? "").trim() !== "");
  }, [formData]);

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
      provincia: "",
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

  // ---------- predict (bloquea si el form está incompleto) ----------
  const handleDiagnose = async () => {
    // Si faltan datos, mostramos modal y cortamos
    if (!isFormComplete) {
      setShowIncompleteModal(true);
      return;
    }
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

  // ---------- save (bloquea si no hay resultados o feedback insuficiente) ----------

const handleGuardar = async () => {
  // solo pedimos que se haya realizado el análisis (mostrar resultados)
  if (!showResults) {
    setSaveModalMsg("Debes generar resultados con “Analizar imagen” antes de guardar el análisis.");
    setShowIncompleteSaveModal(true);
    return;
  }
  // pedimos feedback mínimo
  if (feedback.trim().length < MIN_FEEDBACK) {
    setSaveModalMsg(`Agrega observaciones (mínimo ${MIN_FEEDBACK} caracteres).`);
    setShowIncompleteSaveModal(true);
    return;
  }

  const nuevoRegistro = {
    key: formData.key,
    inference_date: formData.inferenceDate,
    birth_date: formData.birthDate,
    gender: formData.gender,
    city: formData.city,
    parish: formData.parish,
    provincia: formData.provincia,
    precision,
    resultados: JSON.stringify(resultados), // puede estar vacío, y está OK
    feedback,
    image, // dataURL
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

  // helpers: llevar al usuario a la sección correspondiente
  const goToForm = () => {
    setShowIncompleteModal(false);
    const el = document.querySelector(".dw-form");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goToAnalyze = () => {
    setShowIncompleteSaveModal(false);
    const el = document.querySelector(".dw-upload");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
                  <p>Formatos aceptados .png / .jpg / .jpeg</p>
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
                    required
                  />
                </label>

                <label>
                  Género
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </label>
              </div>

              <div className="formRow">
                <label>
                 {/* Provincia se guarda en la estructura como tal, pero para resultados se lee y en el back se guarda como canton para evitar tener que cambiar el back y migrar la base de nuevo :D*/}  
                  Provincia
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleInputChange}
                    placeholder="Escriba la provincia"
                    required
                  />
                </label>

                <label>
                  Ciudad
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Escriba la ciudad"
                    required
                  />
                </label>
              </div>

              <div className="formRow">
                <label>
                  Parroquia
                  <input
                    type="text"
                    name="parish"
                    value={formData.parish}
                    onChange={handleInputChange}
                    placeholder="Escriba la parroquia"
                    required
                  />
                </label>

                <label>
                  <input
                    type="hidden"
                    name="inferenceDate"
                    value={formData.inferenceDate}
                    readOnly
                    disabled
                  />
                </label>
              </div>

              <div className="dw-actions">
                <button className="btn danger" onClick={resetAll}>Cancelar</button>
                <button
                  className="btn primary"
                  onClick={handleDiagnose}
                  disabled={!image || loading} // sólo bloquea si no hay imagen o está cargando
                  aria-disabled={!isFormComplete}
                  title={!isFormComplete ? "Completa todos los datos del paciente" : ""}
                >
                  {loading ? "Analizando…" : "Analizar imagen"}
                </button>
              </div>
            </div>
          </section>

          {/* Progreso indeterminado */}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="cardTitle">Resultados</h3>
                  <span className="cardTitle">Probabilidades</span>
                </div>

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
              </div> 

              {/* Observaciones */}
              <div className="card">
                <h3 className="cardTitle">Observaciones</h3>
                <textarea
                  className="textarea"
                  placeholder="Escriba sus observaciones aquí…"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={300}
                />
                <div className={`char-counter ${
                  feedback.trim().length >= 280 ? "warn" :
                  feedback.trim().length < MIN_FEEDBACK ? "error" : ""
                }`}>
                  {feedback.length}/300
                </div>
                {feedback.trim().length < MIN_FEEDBACK && (
                  <div className="form-hint error">Mínimo {MIN_FEEDBACK} caracteres.</div>
                )}

                <div className="dw-actions end">
                  <button
                    className="btn primary"
                    onClick={handleGuardar} // pop-up si no hay resultados o feedback < MIN_FEEDBACK
                    title={
                      !showResults
                        ? "Genera resultados antes de guardar"
                        : feedback.trim().length < MIN_FEEDBACK
                        ? `Agrega observaciones (mínimo ${MIN_FEEDBACK} caracteres)`
                        : ""
                    }
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modal: formulario incompleto (Analizar) */}
      {showIncompleteModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-incomplete-title"
          style={{ zIndex: 99999 }}  // fuerza que se vea encima
        >
          <div className="modal-card">
            <h3 id="modal-incomplete-title" className="cardTitle">Faltan datos</h3>
            <p className="muted">Completa todos los datos del paciente antes de analizar la imagen.</p>
            <div className="dw-actions" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setShowIncompleteModal(false)}>
                Cerrar
              </button>
              <button className="btn primary" onClick={goToForm}>
                Completar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: guardar incompleto (sin resultados o feedback corto) */}
      {showIncompleteSaveModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-save-title"
          style={{ zIndex: 99999 }}  // fuerza que se vea encima
        >
          <div className="modal-card">
            <h3 id="modal-save-title" className="cardTitle">No se puede guardar</h3>
            <p className="muted">{saveModalMsg || "Debes generar resultados antes de guardar."}</p>
            <div className="dw-actions" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setShowIncompleteSaveModal(false)}>
                Cerrar
              </button>
              {!showResults ? (
                <button className="btn primary" onClick={goToAnalyze}>
                  Ir a analizar
                </button>
              ) : (
                <button className="btn primary" onClick={() => setShowIncompleteSaveModal(false)}>
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast de aviso */}
      {notice && (
        <div className={`toast ${notice.type}`}>
          {notice.text}
        </div>
      )}
    </div>
  );
}
