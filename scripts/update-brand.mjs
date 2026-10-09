import { createClient } from "@libsql/client";

const TURSO_URL = "libsql://cafe-andino-judivoltaire.aws-sa-east-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE1MjUxODEsImlkIjoiMDFhMTFmMzctMmMwMS03NzRiLTk1YzItZWZjNDlhZDk4Y2E4Iiwia2lkIjoib3pSaFhqVGlWZW1EamxKa2gzWVY2MlIyaFN4dDdpa0dlZ1Y0N01uQ203TSIsInJpZCI6IjBhYzM5YjExLTg0NTktNDkwMy1iNjMwLTQ1YmMwYmJlMzgwMSJ9._-KCOkQqVd9lgkHBMkMZWegJqBnJwLARNiyBZzMhch2Dgcn64OrXCFcL5mzD2D5tixi04SxAmM1V9myi7JOhDg";

async function main() {
  const newName = "Bakery And Coffee Eben Ezer";
  const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const local = createClient({ url: "file:./prisma/dev.db" });

  await remote.execute({
    sql: "UPDATE GeneralConfig SET restaurantName = ? WHERE id = 'default'",
    args: [newName],
  });
  await local.execute({
    sql: "UPDATE GeneralConfig SET restaurantName = ? WHERE id = 'default'",
    args: [newName],
  });

  console.log(`✅ Nombre de restaurante actualizado a: "${newName}" en Turso y Local.`);
}

main().catch(console.error);
