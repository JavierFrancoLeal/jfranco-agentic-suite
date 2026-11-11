// Zero-dependency WebSocket server (RFC 6455) — the cockpit extension bridge.
// The DSH host listens on 127.0.0.1:<port>; the Chrome extension connects and
// answers host commands. No npm dependencies: node:http + node:crypto.
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encodeFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function parseFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let i = offset + 2;
    if (len === 126) {
      if (i + 2 > buffer.length) break;
      len = buffer.readUInt16BE(i);
      i += 2;
    } else if (len === 127) {
      if (i + 8 > buffer.length) break;
      len = Number(buffer.readBigUInt64BE(i));
      i += 8;
    }
    let maskKey = null;
    if (masked) {
      if (i + 4 > buffer.length) break;
      maskKey = buffer.subarray(i, i + 4);
      i += 4;
    }
    if (i + len > buffer.length) break;
    let payload = buffer.subarray(i, i + len);
    if (masked && maskKey) {
      const unmasked = Buffer.alloc(len);
      for (let j = 0; j < len; j++) unmasked[j] = payload[j] ^ maskKey[j % 4];
      payload = unmasked;
    }
    i += len;
    offset = i;
    if (opcode === 0x1 || opcode === 0x0) messages.push(payload.toString("utf8"));
  }
  return { messages, rest: buffer.subarray(offset) };
}

/**
 * Start the bridge. Returns an object with `connected()`, `send(method, params)`
 * (a Promise resolving to the extension's `result`), and `close()`.
 */
export function createWsBridge(port) {
  const server = createServer();
  let sock = null;
  let seq = 0;
  const pending = new Map();
  let buffer = Buffer.alloc(0);

  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) { socket.destroy(); return; }
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    sock = socket;
    buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const { messages, rest } = parseFrames(buffer);
      buffer = rest;
      for (const raw of messages) {
        let msg;
        try { msg = JSON.parse(raw); } catch { continue; }
        if (msg && typeof msg.id === "number" && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) p.reject(new Error(String(msg.error)));
          else p.resolve(msg.result);
        }
      }
    });
    socket.on("close", () => {
      sock = null;
      buffer = Buffer.alloc(0);
      for (const p of pending.values()) p.reject(new Error("extension disconnected"));
      pending.clear();
    });
    socket.on("error", () => {});
  });

  server.listen(port, "127.0.0.1");

  return {
    connected: () => sock !== null,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        if (!sock) return reject(new Error("no extension connected"));
        const id = ++seq;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`bridge timeout: ${method}`)); }, 30000);
        pending.set(id, {
          resolve: (v) => { clearTimeout(timer); resolve(v); },
          reject: (e) => { clearTimeout(timer); reject(e); },
        });
        try {
          sock.write(encodeFrame(JSON.stringify({ id, method, params })));
        } catch (e) {
          clearTimeout(timer);
          pending.delete(id);
          reject(e);
        }
      });
    },
    close() {
      try { if (sock) sock.destroy(); } catch {}
      server.close();
    },
  };
}
