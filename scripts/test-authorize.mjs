import dotenv from "dotenv";
dotenv.config();

// Override with Turso credentials
process.env.TURSO_DATABASE_URL = "libsql://cafe-andino-judivoltaire.aws-sa-east-1.turso.io";
process.env.TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MjUxODEsImlkIjoiMDFhMTFmMzctMmMwMS03NzRiLTk1YzItZWZjNDlhZDk4Y2E4Iiwia2lkIjoib3pSaFhqVGlWZW1EamxKa2gzWVY2MlIyaFN4dDdpa0dlZ1Y0N01uQ203TSIsInJpZCI6IjBhYzM5YjExLTg0NTktNDkwMy1iNjMwLTQ1YmMwYmJlMzgwMSJ9._-KCOkQqVd9lgkHBMkMZWegJqBnJwLARNiyBZzMhch2Dgcn64OrXCFcL5mzD2D5tixi04SxAmM1V9myi7JOhDg";

import { db } from "../src/lib/db.ts";
import { compare } from "bcryptjs";

async function test() {
  console.log("Testing user lookup in Turso via Prisma client...");
  const user = await db.user.findUnique({
    where: { username: "admin" },
    include: { role: true },
  });

  console.log("User found:", user ? { username: user.username, role: user.role.name } : null);
  if (user) {
    const isValid = await compare("admin123", user.password);
    console.log("Password valid:", isValid);
  }
}

test().catch(console.error);
