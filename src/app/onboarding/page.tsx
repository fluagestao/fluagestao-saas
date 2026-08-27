"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (!ativo) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const metadata = user.user_metadata ?? {};
      const fullName =
        typeof metadata.full_name === "string" && metadata.full_name.trim()
          ? metadata.full_name.trim()
          : user.email?.split("@")[0] || "Usuário";
      const storeName =
        typeof metadata.store_name === "string" && metadata.store_name.trim()
          ? metadata.store_name.trim()
          : "Minha empresa";
      const document = typeof metadata.document === "string" ? metadata.document : "";
      const documentType = metadata.document_type === "cpf" ? "cpf" : "cnpj";
      const phone = typeof metadata.phone === "string" ? metadata.phone : null;

      const { error: onboardingError } = await supabase.rpc("complete_onboarding", {
        p_full_name: fullName,
        p_cpf: "",
        p_store_name: storeName,
        p_document_type: documentType,
        p_document: document,
        p_email: user.email ?? "",
        p_phone: phone,
        p_postal_code: null,
        p_street: null,
        p_address_number: null,
        p_complement: null,
        p_district: null,
        p_city: null,
        p_state: null,
      });

      if (!ativo) return;

      if (onboardingError) {
        router.replace("/login?erro=preparacao-conta");
        return;
      }

      router.replace("/inicio");
      router.refresh();
    })();

    return () => {
      ativo = false;
    };
  }, [router, supabase]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F1E8]">
      <Loader2 className="h-7 w-7 animate-spin text-[#A94F45]" />
    </main>
  );
}
