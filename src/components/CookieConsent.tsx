"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

const CONSENT_VERSION = 1;
const STORAGE_KEY = "flua_cookie_consent";
const COOKIE_NAME = "flua_cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

type CookiePreferences = {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

type View = "closed" | "banner" | "settings";

function isPreference(value: unknown): value is CookiePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CookiePreferences>;
  return (
    candidate.version === CONSENT_VERSION &&
    candidate.necessary === true &&
    typeof candidate.analytics === "boolean" &&
    typeof candidate.marketing === "boolean"
  );
}

function readPreferences(): CookiePreferences | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPreference(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function applyPreferences(preferences: CookiePreferences) {
  document.documentElement.dataset.cookieAnalytics = String(preferences.analytics);
  document.documentElement.dataset.cookieMarketing = String(preferences.marketing);

  window.dispatchEvent(
    new CustomEvent<CookiePreferences>("flua:cookie-consent", {
      detail: preferences,
    }),
  );
}

function persistPreferences(
  input: Pick<CookiePreferences, "analytics" | "marketing">,
): CookiePreferences {
  const preferences: CookiePreferences = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${COOKIE_NAME}=v${CONSENT_VERSION}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;

  applyPreferences(preferences);
  return preferences;
}

export function CookieConsent() {
  const [view, setView] = useState<View>("closed");
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = readPreferences();
    const hydrationTimer = window.setTimeout(() => {
      if (saved) {
        setAnalytics(saved.analytics);
        setMarketing(saved.marketing);
        applyPreferences(saved);
      } else {
        setView("banner");
      }
    }, 0);

    const openSettings = () => {
      const current = readPreferences();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setView("settings");
    };

    window.addEventListener("flua:open-cookie-settings", openSettings);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("flua:open-cookie-settings", openSettings);
    };
  }, []);

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    const saved = persistPreferences({
      analytics: nextAnalytics,
      marketing: nextMarketing,
    });
    setAnalytics(saved.analytics);
    setMarketing(saved.marketing);
    setView("closed");
  }

  if (view === "closed") return null;

  return (
    <div className="flua-cookie-layer" aria-live="polite">
      {view === "banner" ? (
        <section
          className="flua-cookie-banner"
          aria-label="Preferências de cookies"
        >
          <div className="flua-cookie-icon" aria-hidden="true">
            <Cookie size={22} />
          </div>

          <div className="flua-cookie-copy">
            <strong>Sua privacidade importa</strong>
            <p>
              Usamos cookies necessários para o site funcionar. Com sua
              permissão, também podemos usar cookies de análise e marketing.
              Você pode mudar sua escolha quando quiser.{" "}
              <Link href="/documentos/termos-de-uso/cookies">
                Política de Cookies
              </Link>
            </p>
          </div>

          <div className="flua-cookie-actions">
            <button
              type="button"
              className="flua-cookie-button flua-cookie-button-reject"
              onClick={() => save(false, false)}
            >
              Recusar opcionais
            </button>
            <button
              type="button"
              className="flua-cookie-button flua-cookie-button-secondary"
              onClick={() => setView("settings")}
            >
              Configurar
            </button>
            <button
              type="button"
              className="flua-cookie-button flua-cookie-button-primary"
              onClick={() => save(true, true)}
            >
              Aceitar todos
            </button>
          </div>
        </section>
      ) : (
        <>
          <button
            type="button"
            className="flua-cookie-backdrop"
            aria-label="Fechar preferências de cookies"
            onClick={() => setView(readPreferences() ? "closed" : "banner")}
          />

          <section
            className="flua-cookie-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flua-cookie-title"
          >
            <div className="flua-cookie-dialog-header">
              <div>
                <span className="flua-cookie-kicker">
                  <SlidersHorizontal size={15} />
                  PRIVACIDADE
                </span>
                <h2 id="flua-cookie-title">Preferências de cookies</h2>
                <p>
                  Escolha quais categorias opcionais a Flua pode utilizar neste
                  navegador.
                </p>
              </div>
              <button
                type="button"
                className="flua-cookie-close"
                aria-label="Fechar"
                onClick={() =>
                  setView(readPreferences() ? "closed" : "banner")
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="flua-cookie-options">
              <div className="flua-cookie-option">
                <div>
                  <strong>
                    <ShieldCheck size={18} /> Necessários
                  </strong>
                  <p>
                    Autenticação, segurança, navegação e registro das suas
                    preferências. Não podem ser desativados.
                  </p>
                </div>
                <span className="flua-cookie-always">Sempre ativos</span>
              </div>

              <label className="flua-cookie-option">
                <div>
                  <strong>Análise e desempenho</strong>
                  <p>
                    Ajudam a entender, de forma agregada, como o site é usado e
                    onde podemos melhorar.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                />
                <span className="flua-cookie-switch" aria-hidden="true" />
              </label>

              <label className="flua-cookie-option">
                <div>
                  <strong>Marketing</strong>
                  <p>
                    Permitem medir campanhas e tornar comunicações mais
                    relevantes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(event) => setMarketing(event.target.checked)}
                />
                <span className="flua-cookie-switch" aria-hidden="true" />
              </label>
            </div>

            <div className="flua-cookie-dialog-footer">
              <Link href="/documentos/termos-de-uso/cookies">
                Ler a Política de Cookies
              </Link>
              <div>
                <button
                  type="button"
                  className="flua-cookie-button flua-cookie-button-secondary"
                  onClick={() => save(false, false)}
                >
                  Recusar opcionais
                </button>
                <button
                  type="button"
                  className="flua-cookie-button flua-cookie-button-primary"
                  onClick={() => save(analytics, marketing)}
                >
                  Salvar preferências
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("flua:open-cookie-settings"));
}
