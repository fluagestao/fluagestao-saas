import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNext(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = next;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/login";
  errorUrl.search = "";
  errorUrl.searchParams.set("erro", "link-invalido");

  return NextResponse.redirect(errorUrl);
}
