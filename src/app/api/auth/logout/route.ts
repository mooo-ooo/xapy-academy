import { signOut } from "@/lib/auth";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";
  await signOut({ redirect: false });
  return Response.redirect(new URL(redirectTo, url.origin));
}
