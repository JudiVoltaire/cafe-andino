import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { authConfig } from "./auth.config";
import "./auth-types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { username, password } = credentials as {
            username: string;
            password: string;
          };

          if (!username || !password) {
            console.warn("[AUTH] Missing username or password");
            return null;
          }

          const user = await db.user.findUnique({
            where: { username },
            include: { role: true },
          });

          if (!user) {
            console.warn(`[AUTH] User not found: ${username}`);
            return null;
          }

          const isValid = await compare(password, user.password);
          if (!isValid) {
            console.warn(`[AUTH] Invalid password for: ${username}`);
            return null;
          }

          console.log(`[AUTH] Login success: ${username} (${user.role?.name})`);

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role.name,
            permissions: user.role.permissions,
            scopes: user.role.scopes || "[]",
          };
        } catch (err) {
          console.error("[AUTH] Error in authorize:", err);
          return null;
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      try {
        await db.loginLog.create({
          data: { userId: user.id, username: user.username || user.name || "unknown", success: true },
        });
      } catch { /* silent */ }
    },
  },
});
