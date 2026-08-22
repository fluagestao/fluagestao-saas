import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function slugify(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export default async function GerarCatalogoPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) redirect("/login");

  const { data: membro } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membro?.company_id) redirect("/onboarding");

  const { data: empresa, error: empresaError } = await supabase
    .from("companies")
    .select("id,name,catalog_slug")
    .eq("id", membro.company_id)
    .maybeSingle();

  if (empresaError || !empresa) redirect("/produtos");

  const slugBase = slugify(empresa.name || "loja") || "loja";
  const slug = empresa.catalog_slug || `${slugBase}-${empresa.id.slice(0, 6)}`;

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      catalog_public: true,
      catalog_slug: slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", empresa.id);

  if (updateError) throw updateError;

  redirect(`/catalogo/${slug}`);
}
