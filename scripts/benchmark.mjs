const BASE_URL = process.env.BASE_URL || "https://bakery-and-coffee-eben-ezer.vercel.app";

async function loginUser(username, password) {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [csrfRes.headers.get("set-cookie")];
  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieHeader,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      username,
      password,
      callbackUrl: `${BASE_URL}/order`,
    }),
  });

  const loginCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")];
  return [...cookies, ...loginCookies].map(c => c.split(";")[0]).join("; ");
}

async function measure(name, fn) {
  const start = performance.now();
  const res = await fn();
  const dur = Math.round(performance.now() - start);
  console.log(`⏱️  [${dur.toString().padStart(4, " ")} ms] ${name}`);
  return { dur, res };
}

async function run() {
  console.log("==========================================");
  console.log("📊 BENCHMARK DE RENDIMIENTO (CAFE ANDINO)");
  console.log("==========================================\n");

  await measure("GET /login (HTML estático/edge)", () => fetch(`${BASE_URL}/login`));
  await measure("GET /logo.png (Asset estático CDN)", () => fetch(`${BASE_URL}/logo.png`));

  console.log("\nIniciando sesión para medir rutas dinámicas...");
  const cookie = await loginUser("admin", "admin123");

  console.log("\n--- Mediciones con sesión activa ---");
  await measure("GET /api/auth/session (Verificación de token)", () =>
    fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: cookie } })
  );

  for (let i = 1; i <= 3; i++) {
    await measure(`GET /order (Intento ${i})`, () =>
      fetch(`${BASE_URL}/order`, { headers: { Cookie: cookie } })
    );
  }

  for (let i = 1; i <= 2; i++) {
    await measure(`GET /dashboard (Intento ${i})`, () =>
      fetch(`${BASE_URL}/dashboard`, { headers: { Cookie: cookie } })
    );
  }

  for (let i = 1; i <= 2; i++) {
    await measure(`GET /cash (Intento ${i})`, () =>
      fetch(`${BASE_URL}/cash`, { headers: { Cookie: cookie } })
    );
  }

  for (let i = 1; i <= 2; i++) {
    await measure(`GET /inventory (Intento ${i})`, () =>
      fetch(`${BASE_URL}/inventory`, { headers: { Cookie: cookie } })
    );
  }
}

run().catch(console.error);
