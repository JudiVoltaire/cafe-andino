const BASE_URL = "https://cafe-andino-virid.vercel.app";

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

async function runAudit() {
  console.log("==========================================");
  console.log("🔍 AUDITORÍA COMPLETA DE SISTEMAS EN VERCEL");
  console.log("📡 URL:", BASE_URL);
  console.log("==========================================\n");

  // 1. Auditoría de usuarios
  console.log("--- 1. AUDITORÍA DE INICIO DE SESIÓN ---");
  const testAccounts = [
    { username: "admin", pass: "admin123", role: "Admin" },
    { username: "cajero", pass: "admin123", role: "Cajero" },
    { username: "mesero", pass: "admin123", role: "Mesero" },
    { username: "Eben Ezer", pass: "Cuandomirasalabismo", role: "Admin" },
  ];

  let adminCookie = "";

  for (const acc of testAccounts) {
    const cookie = await loginUser(acc.username, acc.pass);
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, { headers: { Cookie: cookie } });
    const session = await sessionRes.json();
    if (session?.user?.username === acc.username) {
      console.log(`✅ [OK] Login exitoso: ${acc.username} (${session.user.role})`);
      if (acc.username === "admin") adminCookie = cookie;
    } else {
      console.error(`❌ [ERROR] Falló login: ${acc.username}`, session);
    }
  }

  // 2. Auditoría de rutas del sistema
  console.log("\n--- 2. AUDITORÍA DE MÓDULOS Y VISTAS (con sesión activa) ---");
  const routes = [
    "/order",
    "/cash",
    "/inventory",
    "/dashboard",
    "/reports",
    "/settings",
    "/settings/products",
    "/settings/categories",
    "/settings/ingredients",
    "/settings/areas",
    "/settings/currencies",
    "/settings/vat",
    "/settings/excise-tax",
    "/settings/holidays",
    "/settings/users",
    "/settings/modules",
    "/settings/payment-methods",
    "/settings/service-charges",
  ];

  for (const path of routes) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: adminCookie },
      redirect: "manual",
    });
    if (res.status === 200) {
      console.log(`✅ [200 OK] Ruta accesible: ${path}`);
    } else if (res.status === 307 || res.status === 302) {
      console.warn(`⚠️ [${res.status} Redirect] ${path} -> ${res.headers.get("location")}`);
    } else {
      console.error(`❌ [${res.status} Error] ${path}`);
    }
  }

  // 3. Auditoría de APIs
  console.log("\n--- 3. AUDITORÍA DE APIS Y SERVICIOS ---");
  const apiRoutes = [
    "/api/auth/csrf",
    "/api/auth/providers",
    "/api/reports?type=sales",
  ];

  for (const api of apiRoutes) {
    const res = await fetch(`${BASE_URL}${api}`, {
      headers: { Cookie: adminCookie },
    });
    console.log(`Status [${res.status}]: ${api}`);
  }

  console.log("\n==========================================");
  console.log("🏁 AUDITORÍA FINALIZADA");
  console.log("==========================================");
}

runAudit().catch(console.error);
