// @javierfrancoleal/balance — host half (Node).
//
// Live DeepSeek account balance for the Web GUI bottom bar, transported to the
// browser with the Remote/Typert pattern (the same mechanism dsh-goal uses):
//
//   host  : BalanceService extends TypertRemoteService, key "balance",
//           method getSnapshot() → the gateway's SRC discovery exposes the
//           endpoint "balance/getSnapshot" without a generated ./typert
//           artifact (hand-written Remote marker on the prototype).
//   client: ctx.remote.$mount(contribution) → ctx.remote.balance.getSnapshot().
//
// Auth strategy, tried in order on every refresh (never stored):
//   1. DeepSeek API key      → Authorization: Bearer <key>
//      (ctx.get("credentials").resolve("DEEPSEEK_API_KEY"))
//   2. DeepSeek account token → x-dsh-auth-token
//      (ctx.get("deepseekAccount").resolveToken("https://api.deepseek.com"))
//      — live-verified 2026-11-04: /user/balance accepts it.
//
// Response (https://api-docs.deepseek.com/api/get-user-balance):
//   { is_available: boolean, balance_infos: [{ currency: "CNY"|"USD",
//     total_balance, granted_balance, topped_up_balance }] }  // strings
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { fetchBalance } from "./balance-api.js";

const name = "jfranco-balance";

// The decorator-generated build writes this key on the class prototype; a
// link: bundle has no build step, so we write the exact marker the gateway's
// SRC reflection reads. Shape verified against @deepseek-ai/dsh-typert-protocol
// (mark()): { version: 1, methods: [{ method, invocation: { kind: "direct" } }] }.
const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";

const POLL_INTERVAL_MS = 60_000; // host-side API polling
const STALE_MS = 45_000; // serve a cached snapshot for at most this long

/**
 * Remote balance service. Being the bundle's default export (a Cordis
 * Service as plugin), it registers in the composition root where the
 * Typert gateway can discover its `typertRemote` binding.
 */
class BalanceService extends TypertRemoteService {
  snapshot = null;
  lastAttempt = 0;
  inflight = null;

  constructor(ctx, config = {}) {
    super(ctx, "balance");
    void config;
    this.ctx = ctx;
    // Poll the API while the host lives; the client may also trigger a
    // refresh through getSnapshot() when the cached value is stale.
    ctx.effect(() => {
      const timer = setInterval(() => {
        void this.refresh().catch(() => {});
      }, POLL_INTERVAL_MS);
      void this.refresh().catch(() => {});
      return () => clearInterval(timer);
    }, "jfranco-balance: poll");
  }

  /** Resolve a usable credential per refresh; null when none exists. */
  async resolveAuth() {
    const credentials = this.ctx.get("credentials");
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve("DEEPSEEK_API_KEY");
        if (hit !== undefined && typeof hit.value === "string" && hit.value.length > 0) {
          return { kind: "api-key", secret: hit.value };
        }
      } catch {
        /* fall through to the account token */
      }
    }
    const account = this.ctx.get("deepseekAccount");
    if (account !== undefined && typeof account.resolveToken === "function") {
      try {
        const token = await account.resolveToken("https://api.deepseek.com");
        if (typeof token === "string" && token.length > 0) {
          return { kind: "account-token", secret: token };
        }
      } catch {
        /* no usable account token */
      }
    }
    return null;
  }

  /** Refresh the snapshot; concurrent callers share one in-flight request. */
  refresh() {
    if (this.inflight !== null) return this.inflight;
    this.inflight = (async () => {
      const previous = this.snapshot;
      try {
        const auth = await this.resolveAuth();
        if (auth === null) {
          this.snapshot = { state: "no-credential", fetchedAt: new Date().toISOString() };
          return this.snapshot;
        }
        const data = await fetchBalance(auth);
        this.snapshot = { state: "ok", authKind: auth.kind, ...data };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.snapshot = {
          state: "error",
          fetchedAt: new Date().toISOString(),
          error: message,
          // keep the last good rows so the bar can degrade instead of vanish
          ...(previous !== null && previous.state === "ok"
            ? { rows: previous.rows, isAvailable: previous.isAvailable }
            : {}),
        };
      } finally {
        this.lastAttempt = Date.now();
        this.inflight = null;
      }
      const snapshot = this.snapshot;
      if (this.ctx.logger) {
        if (snapshot.state === "error") this.ctx.logger.warn(`[balance] ${snapshot.error}`);
        else if (snapshot.state === "no-credential") {
          this.ctx.logger.info("[balance] no DeepSeek credential available (API key or account sign-in)");
        } else {
          this.ctx.logger.info(`[balance] ${snapshot.rows.length} balance row(s) fetched`);
        }
      }
      return snapshot;
    })();
    return this.inflight;
  }

  /**
   * Remote method → endpoint "balance/getSnapshot". Returns a JSON snapshot:
   *   { state: "ok"|"error"|"no-credential", fetchedAt, isAvailable?, rows?,
   *     authKind?, error? }
   */
  async getSnapshot() {
    if (this.snapshot === null || Date.now() - this.lastAttempt > STALE_MS) {
      await this.refresh();
    }
    return this.snapshot;
  }
}

// Hand-written Remote marker (same record the Remote("getSnapshot") decorator
// would produce): do not rename getSnapshot without updating this marker.
Object.defineProperty(BalanceService.prototype, REMOTE_METHOD_DESCRIPTOR, {
  configurable: true,
  value: Object.freeze({
    version: 1,
    methods: Object.freeze([
      Object.freeze({ method: "getSnapshot", invocation: Object.freeze({ kind: "direct" }) }),
    ]),
  }),
});

export { BalanceService, name };
export default BalanceService;
