import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { provisionOrganizationForUser } from "./organizations";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: "LeadFlow AI",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    disableSignUp: process.env.ALLOW_SIGNUP === "false",
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 300, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: "leadflow",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await provisionOrganizationForUser(user.id, user.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
