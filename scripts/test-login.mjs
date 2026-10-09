const BASE_URL = "https://cafe-andino-virid.vercel.app";

async function test() {
  console.log("1. Fetching CSRF token from", BASE_URL);
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  console.log("CSRF Data:", csrfData);
  const cookies = csrfRes.headers.getSetCookie ? csrfRes.headers.getSetCookie() : [csrfRes.headers.get("set-cookie")];
  console.log("Cookies after CSRF:", cookies);

  const cookieHeader = cookies.map(c => c.split(";")[0]).join("; ");

  console.log("\n2. Sending credentials login for user: admin");
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookieHeader,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      username: "admin",
      password: "admin123",
      callbackUrl: `${BASE_URL}/order`,
    }),
  });

  console.log("Login status:", loginRes.status);
  const loginBody = await loginRes.text();
  console.log("Login body:", loginBody);
  const loginCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")];
  console.log("Login set-cookies:", loginCookies);

  const allCookies = [...cookies, ...loginCookies].map(c => c.split(";")[0]).join("; ");

  console.log("\n3. Testing GET /api/auth/session with session cookies");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: allCookies },
  });
  console.log("Session status:", sessionRes.status);
  console.log("Session data:", await sessionRes.text());

  console.log("\n4. Testing GET /order with session cookies (redirect test)");
  const orderRes = await fetch(`${BASE_URL}/order`, {
    headers: { Cookie: allCookies },
    redirect: "manual",
  });
  console.log("Order status:", orderRes.status);
  console.log("Order location:", orderRes.headers.get("location"));
}

test().catch(console.error);
