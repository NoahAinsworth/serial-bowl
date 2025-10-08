/**
 * TheTVDB v4 API client with token caching and auto-refresh
 */

const BASE = "https://api4.thetvdb.com/v4";

type TVDBToken = { token: string; issuedAt: number };

function readToken(): TVDBToken | null {
  const raw = localStorage.getItem("tvdb.token");
  return raw ? JSON.parse(raw) : null;
}

function saveToken(t: TVDBToken) {
  localStorage.setItem("tvdb.token", JSON.stringify(t));
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      apikey: import.meta.env.VITE_TVDB_API_KEY,
      ...(import.meta.env.VITE_TVDB_PIN ? { pin: import.meta.env.VITE_TVDB_PIN } : {})
    })
  });
  
  if (!res.ok) {
    throw new Error(`TVDB login failed ${res.status}`);
  }
  
  const data = await res.json();
  const token = data?.data?.token as string;
  saveToken({ token, issuedAt: Date.now() });
  return token;
}

async function getToken(): Promise<string> {
  const cached = readToken();
  // TVDB tokens are valid ~1 month; refresh proactively after ~27 days
  if (cached && Date.now() - cached.issuedAt < 27 * 24 * 60 * 60 * 1000) {
    return cached.token;
  }
  return login();
}

export async function tvdbFetch(path: string, init?: RequestInit) {
  let token = await getToken();
  let res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 
      ...(init?.headers || {}), 
      Authorization: `Bearer ${token}`, 
      Accept: "application/json" 
    }
  });
  
  // Retry once if token expired
  if (res.status === 401) {
    token = await login();
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 
        ...(init?.headers || {}), 
        Authorization: `Bearer ${token}`, 
        Accept: "application/json" 
      }
    });
  }
  
  if (!res.ok) {
    throw new Error(`TVDB ${path} -> ${res.status}`);
  }
  
  const json = await res.json();
  return json?.data ?? json;
}
