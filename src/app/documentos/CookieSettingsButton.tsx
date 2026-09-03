"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="legal-cookie-settings"
      onClick={() =>
        window.dispatchEvent(new Event("flua:open-cookie-settings"))
      }
    >
      Configurar cookies
    </button>
  );
}
