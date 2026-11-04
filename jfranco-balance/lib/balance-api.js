// @javierfrancoleal/balance — balance API client (host half, Node).
//
// Queries GET https://api.deepseek.com/user/balance, documented at
// https://api-docs.deepseek.com/api/get-user-balance (verified 2026-11-04):
//
//   {
//     "is_available": true,
//     "balance_infos": [
//       { "currency": "USD", "total_balance": "24.59",
//         "granted_balance": "0.00", "topped_up_balance": "24.59" }
//     ]
//   }
//
// Balances arrive as strings (decimal, e.g. "24.59"); we keep the raw string
// for display fidelity and add a parsed numeric form. Two auth strategies,
// tried in order by the caller (see lib/index.js):
//   - API key  → header "Authorization: Bearer <key>"
//   - account token → header "x-dsh-auth-token" (live-verified 2026-11-04)

const BALANCE_URL = "https://api.deepseek.com/user/balance";
const USER_AGENT = "jfranco-balance/1.0";

/** One balance row, normalized from the API response. */
function normalizeRow(row) {
  const num = (s) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    currency: typeof row?.currency === "string" ? row.currency : null,
    totalBalance: typeof row?.total_balance === "string" ? row.total_balance : null,
    grantedBalance: typeof row?.granted_balance === "string" ? row.granted_balance : null,
    toppedUpBalance: typeof row?.topped_up_balance === "string" ? row.topped_up_balance : null,
    total: num(row?.total_balance),
    granted: num(row?.granted_balance),
    toppedUp: num(row?.topped_up_balance),
  };
}

/**
 * Fetch and normalize the balance.
 * @param {object} auth - { kind: "api-key", secret } | { kind: "account-token", secret }
 * @returns normalized snapshot; throws on network/HTTP errors.
 */
export async function fetchBalance(auth, { timeoutMs = 15000 } = {}) {
  const headers = {
    "user-agent": USER_AGENT,
    accept: "application/json",
  };
  if (auth?.kind === "api-key") headers.authorization = `Bearer ${auth.secret}`;
  else if (auth?.kind === "account-token") headers["x-dsh-auth-token"] = auth.secret;
  else throw new Error("balance: no usable credential");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(BALANCE_URL, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      const err = new Error(`balance: HTTP ${res.status} (unauthorized)`);
      err.code = "UNAUTHORIZED";
      throw err;
    }
    throw new Error(`balance: HTTP ${res.status}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data?.balance_infos) ? data.balance_infos.map(normalizeRow) : [];
  return {
    fetchedAt: new Date().toISOString(),
    isAvailable: data?.is_available === true,
    rows,
  };
}
