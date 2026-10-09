import { createClient } from "@libsql/client";
import { compare } from "bcryptjs";

const client = createClient({
  url: "libsql://cafe-andino-judivoltaire.aws-sa-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MjUxODEsImlkIjoiMDFhMTFmMzctMmMwMS03NzRiLTk1YzItZWZjNDlhZDk4Y2E4Iiwia2lkIjoib3pSaFhqVGlWZW1EamxKa2gzWVY2MlIyaFN4dDdpa0dlZ1Y0N01uQ203TSIsInJpZCI6IjBhYzM5YjExLTg0NTktNDkwMy1iNjMwLTQ1YmMwYmJlMzgwMSJ9._-KCOkQqVd9lgkHBMkMZWegJqBnJwLARNiyBZzMhch2Dgcn64OrXCFcL5mzD2D5tixi04SxAmM1V9myi7JOhDg",
});

async function main() {
  const res = await client.execute("SELECT id, username, name, password, roleId FROM User");
  console.log("Found", res.rows.length, "users:");
  for (const row of res.rows) {
    console.log(`\nUser: [${row.username}] (Name: ${row.name})`);
    console.log(`Hash: ${row.password}`);
    console.log(`Testing passwords:`);
    for (const testPass of ["admin123", "admin", "123456", "cajero123", "mesero123", "ebenezer", "EbenEzer"]) {
      const match = await compare(testPass, row.password);
      if (match) console.log(`  >>> MATCH! Password is "${testPass}"`);
    }
  }
}

main().catch(console.error);
