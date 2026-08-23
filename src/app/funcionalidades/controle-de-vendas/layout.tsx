export default function ControleDeVendasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <style>{`
        .cv-sales-preview {
          aspect-ratio: 1672 / 941;
          min-height: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,.82) !important;
          border-radius: 24px !important;
          background-color: #fff !important;
          background-image: url('/controle-vendas-pedidos-demo.jpg') !important;
          background-repeat: no-repeat !important;
          background-position: center center !important;
          background-size: 100% 100% !important;
          box-shadow: 0 34px 90px rgba(49,42,32,.28) !important;
        }

        .cv-sales-preview > * {
          display: none !important;
        }

        @media (max-width: 680px) {
          .cv-sales-preview {
            border-radius: 18px !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
