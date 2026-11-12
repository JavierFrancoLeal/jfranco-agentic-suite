// ws-bridge.js (hardened, RFC 6455 compliant, zero-dependency)
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const EMPTY_BUF = Buffer.alloc(0);
const DEFAULT_MAX_PAYLOAD = 16 * 1024 * 1024; // 16 MB hard cap per message
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function encodeFrame(data, opcode = 0x01) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function encodeCloseFrame(code = 1000) {
  const payload = Buffer.allocUnsafe(2);
  payload.writeUInt16BE(code, 0);
  return encodeFrame(payload, 0x08);
}

export function createWsBridge(port, options = {}) {
  const maxPayload = options.maxPayload ?? DEFAULT_MAX_PAYLOAD;
  const allowedExtensionId = options.extensionId ?? null;
  // Ephemeral shared token: the extension fetches it from /token (which only
  // answers chrome-extension:// origins), then connects with ?token=. A web page
  // can neither read /token (its Origin is http(s)) nor guess the 256-bit token.
  const token = options.token ?? randomBytes(32).toString("hex");

  const server = createServer((req, res) => {
    if (req.url && req.url.startsWith("/token")) {
      const origin = req.headers.origin;
      const expectedPrefix = allowedExtensionId ? `chrome-extension://${allowedExtensionId}` : "chrome-extension://";
      if (origin !== undefined && !origin.startsWith(expectedPrefix)) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token }));
      return;
    }
    res.writeHead(426, { "Content-Type": "text/plain" });
    res.end("Upgrade Required");
  });

  let sock = null;
  let seq = 0;
  const pending = new Map();

  function rejectAllPending(reason) {
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      pending.delete(id);
      entry.reject(new Error(reason));
    }
  }

  server.on("upgrade", (req, socket, head) => {
    // 1. CSWSH mitigation: only allow chrome-extension:// origins (web pages
    //    cannot spoof this header; the browser sets it for extensions).
    const origin = req.headers.origin;
    if (origin !== undefined) {
      const expectedPrefix = allowedExtensionId
        ? `chrome-extension://${allowedExtensionId}`
        : "chrome-extension://";
      if (!origin.startsWith(expectedPrefix)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    // Ephemeral token: the extension must present the shared token.
    let providedToken = null;
    try { providedToken = new URL(req.url, "http://localhost").searchParams.get("token"); } catch {}
    if (providedToken !== token) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    // 2. Strict RFC 6455 handshake validation
    const upgrade = req.headers.upgrade;
    const key = req.headers["sec-websocket-key"];
    const version = req.headers["sec-websocket-version"];
    if (!upgrade || upgrade.toLowerCase() !== "websocket" || !key || version !== "13") {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    socket.setNoDelay(true);

    // 3. Safe single-socket replacement: reject orphaned pending from the old socket
    if (sock && sock !== socket) {
      const old = sock;
      sock = null;
      rejectAllPending("extension reconnected (previous connection replaced)");
      try { old.destroy(); } catch {}
    }
    sock = socket;

    let buf = EMPTY_BUF;
    let fragments = [];
    let fragmentsBytes = 0;
    let closing = false;

    function failConnection(code, reason) {
      if (closing) return;
      closing = true;
      buf = EMPTY_BUF;
      fragments = [];
      fragmentsBytes = 0;
      try { socket.end(encodeCloseFrame(code)); } catch {}
      setTimeout(() => { try { if (!socket.destroyed) socket.destroy(); } catch {} }, 250).unref();
      if (sock === socket) {
        sock = null;
        rejectAllPending(reason);
      }
    }

    function onChunk(chunk) {
      if (closing || chunk.length === 0) return;

      // Preliminary flood guard before concatenating
      if (buf.length + chunk.length > maxPayload + 65536) {
        failConnection(1009, "frame buffer exceeded maxPayload");
        return;
      }

      buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk]);

      while (buf.length >= 2 && !closing) {
        const b0 = buf[0];
        const b1 = buf[1];

        // RSV1/2/3 must be 0
        if ((b0 & 0x70) !== 0) {
          failConnection(1002, "non-zero RSV bits");
          return;
        }

        const fin = (b0 & 0x80) !== 0;
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;

        // Client frames MUST be masked
        if (!masked) {
          failConnection(1002, "unmasked client frame");
          return;
        }

        const isControl = (opcode & 0x08) !== 0;

        if (opcode !== 0x00 && opcode !== 0x01 && opcode !== 0x02 && opcode !== 0x08 && opcode !== 0x09 && opcode !== 0x0a) {
          failConnection(1002, `invalid opcode: ${opcode}`);
          return;
        }

        let payloadLen = b1 & 0x7f;
        let headerLen = 2;

        // Control frames: not fragmented, payload <= 125
        if (isControl && (!fin || payloadLen > 125)) {
          failConnection(1002, "invalid control frame");
          return;
        }

        if (payloadLen === 126) {
          if (buf.length < 4) break;
          payloadLen = buf.readUInt16BE(2);
          if (payloadLen < 126) { failConnection(1002, "non-minimal 16-bit payload length"); return; }
          headerLen = 4;
        } else if (payloadLen === 127) {
          if (buf.length < 10) break;
          const rawLen = buf.readBigUInt64BE(2);
          if (rawLen < 65536n) { failConnection(1002, "non-minimal 64-bit payload length"); return; }
          if (rawLen > BigInt(maxPayload)) { failConnection(1009, "frame payload exceeds maxPayload"); return; }
          payloadLen = Number(rawLen);
          headerLen = 10;
        }

        if (payloadLen > maxPayload || (!isControl && fragmentsBytes + payloadLen > maxPayload)) {
          failConnection(1009, "message size exceeds maxPayload");
          return;
        }

        const maskOffset = headerLen;
        headerLen += 4;

        if (buf.length < headerLen + payloadLen) break;

        const payload = Buffer.allocUnsafe(payloadLen);
        const mask = buf.subarray(maskOffset, maskOffset + 4);
        for (let i = 0; i < payloadLen; i++) {
          payload[i] = buf[headerLen + i] ^ mask[i & 3];
        }

        // Advance the buffer without pinning large ArrayBuffers
        const frameEnd = headerLen + payloadLen;
        if (buf.length === frameEnd) {
          buf = EMPTY_BUF;
        } else {
          const remaining = buf.subarray(frameEnd);
          buf = buf.buffer.byteLength > 65536 ? Buffer.from(remaining) : remaining;
        }

        if (opcode === 0x08) {
          if (payloadLen === 1) { failConnection(1002, "invalid 1-byte close payload"); return; }
          let closeCode = 1000;
          if (payloadLen >= 2) {
            closeCode = payload.readUInt16BE(0);
            try { utf8Decoder.decode(payload.subarray(2)); } catch { failConnection(1007, "invalid UTF-8 in close reason"); return; }
          }
          closing = true;
          try { socket.end(encodeCloseFrame(closeCode)); } catch {}
          return;
        }

        if (opcode === 0x09) {
          if (!socket.destroyed && socket.writable) socket.write(encodeFrame(payload, 0x0a));
          continue;
        }
        if (opcode === 0x0a) continue;

        // Fragmentation state machine
        if (opcode === 0x00) {
          if (fragments.length === 0) { failConnection(1002, "unexpected continuation frame"); return; }
        } else if (fragments.length > 0) {
          failConnection(1002, "new data frame started before fragmentation completed");
          return;
        }

        if (!fin) {
          fragments.push(payload);
          fragmentsBytes += payload.length;
          continue;
        }

        const full = fragments.length > 0 ? Buffer.concat([...fragments, payload]) : payload;
        fragments = [];
        fragmentsBytes = 0;

        let text;
        try { text = utf8Decoder.decode(full); } catch { failConnection(1007, "invalid UTF-8 in text frame"); return; }

        let msg;
        try { msg = JSON.parse(text); } catch { continue; }

        if (msg && msg.type === "ping") continue;
        const entry = pending.get(msg && msg.id);
        if (!entry) continue;
        pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error != null) entry.reject(new Error(String(msg.error)));
        else entry.resolve(msg.result);
      }
    }

    socket.on("data", onChunk);

    // Process any bytes that arrived alongside the HTTP upgrade handshake
    if (head && head.length > 0) onChunk(head);

    const disconnect = () => {
      if (sock !== socket) return;
      sock = null;
      rejectAllPending("extension disconnected");
    };
    socket.on("close", disconnect);
    socket.on("error", disconnect);
  });

  server.listen(port, "127.0.0.1");

  return {
    connected: () => sock !== null && !sock.destroyed && sock.writable,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        if (!sock || sock.destroyed || !sock.writable) return reject(new Error("no extension connected"));
        const id = ++seq;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`bridge timeout: ${method}`)); }, 30000);
        pending.set(id, { resolve, reject, timer });

        let frame;
        try { frame = encodeFrame(JSON.stringify({ id, method, params })); }
        catch (e) { clearTimeout(timer); pending.delete(id); return reject(e); }

        sock.write(frame, (err) => {
          if (err && pending.has(id)) {
            clearTimeout(timer);
            pending.delete(id);
            reject(err);
          }
        });
      });
    },
    close() {
      rejectAllPending("bridge closed");
      if (sock) {
        const current = sock;
        sock = null;
        try {
          if (!current.destroyed && current.writable) current.end(encodeCloseFrame(1000));
          else current.destroy();
        } catch {}
      }
      server.close();
    },
  };
}
