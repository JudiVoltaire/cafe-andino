import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = user.username!;
        token.role = user.role!;
        token.permissions = user.permissions!;
        token.scopes = user.scopes!;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string;
        session.user.scopes = token.scopes as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "b7e2c9f1a3d5486c8e5f0b2d4a6c7e9f1a3b5c7d8e9f0a2b4c6d8e0f2a4b6c8d9e",
  trustHost: true,
  providers: [],
};
