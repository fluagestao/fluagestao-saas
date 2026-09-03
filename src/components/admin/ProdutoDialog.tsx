"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type {
  CatalogoRow,
  CategoriaRow,
  EtiquetaRow,
  ProdutoRow,
} from "./tipos";

export function ProdutoDialog({
  produto,
  categorias,
  catalogos,
  onClose,
  onSaved,
}: {
  produto: ProdutoRow | null;
  categorias: CategoriaRow[];
  catalogos: CatalogoRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    void categorias;
    void catalogos;
    void onClose;
    void onSaved;

    if (produto?.id) {
      router.push(`/admin/cadastros/produtos/${produto.id}/editar`);
      return;
    }

    router.push("/admin/cadastros/produtos/novo");
  }, [produto, categorias, catalogos, onClose, onSaved, router]);

  return null;
}
