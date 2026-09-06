"use client";

import { useEffect, useState } from "react";

/* FERRAMENTA TEMPORÁRIA, LIGADA SÓ POR ?diag=1.
   Existe porque a página dá saltos verticais no Safari (Mac e iPhone) e não
   reproduz em nenhum navegador que eu consiga instrumentar daqui. Em vez de
   chutar a causa, a própria página passa a relatar quem se mexeu: a altura do
   documento, a posição da rolagem e a altura de cada bloco.

   Some do site inteiro quando a causa for encontrada — não é feature. */

type Evento = { t: string; texto: string };

function rotulo(el: Element) {
  const classe = typeof el.className === "string" ? el.className.split(" ")[0] : "";
  return (el.tagName.toLowerCase() + (classe ? "." + classe : "")).slice(0, 34);
}

export default function DiagnosticoLayout() {
  const [ligado, setLigado] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [agora, setAgora] = useState({ y: 0, docH: 0, vh: 0, vw: 0 });

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("diag")) return;
    setLigado(true);

    const registrar = (texto: string) =>
      setEventos((lista) => {
        const t = new Date().toLocaleTimeString("pt-BR", { hour12: false });
        return [{ t, texto }, ...lista].slice(0, 9);
      });

    const blocos = [...document.querySelectorAll("section, header, footer, main > div")];
    const alturas = new Map<Element, number>(
      blocos.map((el) => [el, Math.round(el.getBoundingClientRect().height)]),
    );

    let docH = document.documentElement.scrollHeight;
    let y = Math.round(window.scrollY);
    let vh = window.innerHeight;
    let vw = window.innerWidth;

    const observador = new ResizeObserver((entradas) => {
      for (const entrada of entradas) {
        const antes = alturas.get(entrada.target) ?? 0;
        const depois = Math.round(entrada.target.getBoundingClientRect().height);
        if (Math.abs(depois - antes) < 1) continue;
        alturas.set(entrada.target, depois);
        registrar(`${rotulo(entrada.target)}  ${antes} → ${depois}`);
      }
    });
    blocos.forEach((el) => observador.observe(el));

    /* A altura do documento e a rolagem podem mudar sem nenhum bloco mudar de
       tamanho — é justamente o caso que separa "algo cresceu" de "o Safari
       mexeu na rolagem sozinho". Por isso os dois são vigiados à parte. */
    const relogio = window.setInterval(() => {
      const novoY = Math.round(window.scrollY);
      const novoDoc = document.documentElement.scrollHeight;
      const novoVh = window.innerHeight;
      const novoVw = window.innerWidth;

      if (novoDoc !== docH) {
        registrar(`DOCUMENTO  ${docH} → ${novoDoc}`);
        docH = novoDoc;
      }
      if (Math.abs(novoY - y) >= 2) {
        registrar(`ROLAGEM  ${y} → ${novoY}`);
        y = novoY;
      }
      if (novoVh !== vh || novoVw !== vw) {
        registrar(`JANELA  ${vw}x${vh} → ${novoVw}x${novoVh}`);
        vh = novoVh;
        vw = novoVw;
      }
      setAgora({ y: novoY, docH: novoDoc, vh: novoVh, vw: novoVw });
    }, 250);

    return () => {
      observador.disconnect();
      window.clearInterval(relogio);
    };
  }, []);

  if (!ligado) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 99999,
        maxWidth: "min(420px, calc(100vw - 16px))",
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(20,14,12,.92)",
        color: "#fff",
        font: "600 11px/1.45 ui-monospace, Menlo, monospace",
        pointerEvents: "none",
      }}
    >
      <div style={{ color: "#ffd9a8" }}>
        rolagem {agora.y} · documento {agora.docH} · janela {agora.vw}x{agora.vh}
      </div>
      {eventos.length === 0 ? (
        <div style={{ marginTop: 6, opacity: 0.65 }}>nada mudou ainda</div>
      ) : (
        eventos.map((e, i) => (
          <div key={i} style={{ marginTop: 4, opacity: i === 0 ? 1 : 0.62 }}>
            {e.t} · {e.texto}
          </div>
        ))
      )}
    </div>
  );
}
