import React, { useState } from "react";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import logoEspol from "./assets/logoToraxView.png";
import { useAuth } from "./context/AuthContext";
import { API_URL } from "./config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) throw new Error("Credenciales incorrectas");

      const data = await response.json();
      login(data.access_token, data.role, { remember });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="lp-wrap">
      <header className="lp-header">
        <div className="lp-brand">
          <div className="logo-badge">
            <img src={logoEspol} alt="ESPOL" className="lp-logo" />
          </div>

          {/* Wrapper con tooltip */}
          <div className="lp-tooltipWrapper">
            <span className="lp-brandName">ToraxVIEW</span>

            {/* Tooltip (antes estaba al final) */}
            <div id="about" className="lp-about">
              <h3>¿Qué es ToraxVIEW?</h3>
              <p>
                ToraxView es una plataforma de apoyo al diagnóstico para una evaluación temprana y no
                invasiva de alteraciones torácicas en contextos de salud preventiva. Sube un estudio,
                completa los datos del paciente y obtén una predicción clara y ordenada por probabilidad.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="lp-grid">
        <div className="lp-hero">
          <h1 className="lp-title">
            Análisis de radiografías de tórax asistido por IA
          </h1>
        </div>

        {/* Login Card */}
        <div className="lp-authCol">
          <div id="login" className="lp-card" aria-live="polite">
            <h2 className="lp-cardTitle">Inicia sesión</h2>
            <p className="lp-cardHint">
              Accede para analizar estudios y gestionar resultados.
            </p>

            <form className="lp-form" onSubmit={handleSubmit}>
              <label className="lp-label">
                Usuario
                <input
                  type="text"
                  className="lp-input"
                  placeholder="usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="lp-label">
                Contraseña
                <input
                  type="password"
                  className="lp-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && <div className="lp-error">{error}</div>}

              <button className="lp-submit" type="submit" disabled={loading}>
                {loading ? (
                  <span className="lp-spinner" aria-label="Cargando…" />
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <small>
          © {new Date().getFullYear()} ToraxVIEW · Todos los derechos reservados
        </small>
      </footer>
    </main>
  );
}
