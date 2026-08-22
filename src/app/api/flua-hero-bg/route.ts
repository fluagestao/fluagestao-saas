import heroBg from "@/lib/hero-bg/tiny";

export const dynamic = "force-static";

export async function GET() {
  const body = Buffer.from(heroBg, "base64");

  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
