import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const IMPERSONATION_TTL_MS = 60_000;

function impersonationKey(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export function createImpersonationToken(userId: string): string {
  const exp = Date.now() + IMPERSONATION_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = crypto
    .createHmac("sha256", impersonationKey())
    .update(payload)
    .digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyImpersonationToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", impersonationKey())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [userId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

export type AppRole = "ADMIN" | "USER" | "CTV";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      preferredLang: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: AppRole;
    preferredLang?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    preferredLang: string;
  }
}

/** Build the provider list lazily so OAuth only mounts when env is set —
 *  keeps dev environments without secrets from crashing at boot. */
const providers: NextAuthConfig["providers"] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (raw) => {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (!user || !user.isActive || !user.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role as AppRole,
        preferredLang: user.preferredLang,
      };
    },
  }),
  Credentials({
    id: "impersonate",
    name: "Impersonate",
    credentials: {
      token: { label: "Token", type: "text" },
    },
    authorize: async (raw) => {
      const token = typeof raw?.token === "string" ? raw.token : "";
      if (!token) return null;
      const userId = verifyImpersonationToken(token);
      if (!userId) return null;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role as AppRole,
        preferredLang: user.preferredLang,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}
// Twitter / X OAuth was scaffolded earlier; temporarily removed. To
// re-enable, re-add `import Twitter from "next-auth/providers/twitter"`,
// a conditional `providers.push(Twitter({...}))` block, and "twitter"
// to the OAuthProvider union + configuredOAuthProviders().

export type OAuthProvider = "google";

/** Which OAuth buttons to render in the UI — driven by env, evaluated
 *  on the server so the client doesn't ship a list of un-configured
 *  providers. */
export function configuredOAuthProviders(): OAuthProvider[] {
  const out: OAuthProvider[] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
    out.push("google");
  return out;
}

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers,
  events: {
    /** Fires when the Prisma adapter creates a User (OAuth first sign-in).
     *  Self-signed-up accounts must respect the admin's approval setting —
     *  the schema default of isActive=true is for admin-created accounts. */
    async createUser({ user }) {
      if (!user?.id) return;
      const s = await prisma.siteSetting.findUnique({
        where: { id: 1 },
        select: { signupRequiresApproval: true, allowSelfSignup: true },
      });
      if (s && !s.allowSelfSignup) {
        // Self-signup is disabled — delete the just-created record and
        // let signIn reject below.
        await prisma.user.delete({ where: { id: user.id } });
        return;
      }
      const requireApproval = s?.signupRequiresApproval ?? true;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "USER",
          isActive: !requireApproval,
          // OAuth implies a verified email at the provider.
          emailVerified: new Date(),
        },
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Credentials & impersonate paths already vetted the user in
      // authorize() — skip the extra DB hop.
      if (
        account?.provider === "credentials" ||
        account?.provider === "impersonate"
      ) {
        return true;
      }
      // OAuth: re-check from DB. createUser hook ran first for new
      // accounts; existing accounts may have been deactivated since.
      if (!user?.id) return false;
      const fresh = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      });
      return fresh?.isActive === true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        if (user.id) token.id = user.id;
        if (user.role) {
          // Credentials path — fields already on the returned user.
          token.role = user.role as AppRole;
          token.preferredLang = user.preferredLang ?? "en";
        } else if (user.id) {
          // OAuth path — adapter user lacks role/preferredLang; pull
          // them from the DB (createUser hook already set them).
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, preferredLang: true },
          });
          token.role = (dbUser?.role ?? "USER") as AppRole;
          token.preferredLang = dbUser?.preferredLang ?? "en";
        }
      }
      // Allow client-side session.update({ preferredLang }) to flow into JWT
      if (trigger === "update" && session?.user?.preferredLang) {
        token.preferredLang = session.user.preferredLang as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.preferredLang = token.preferredLang;
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
export const { GET, POST } = handlers;
