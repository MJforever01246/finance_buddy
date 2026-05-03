import { WebSocketServer } from "ws";

const PORT = 3456;
const wss = new WebSocketServer({ port: PORT });

console.log(`[finance-buddy-demo] WebSocket demo listening on ws://127.0.0.1:${PORT}`);

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", t: Date.now() }));

  const iv = setInterval(() => {
    const symbols = ["VNM", "FPT", "VCB", "HPG"];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    ws.send(
      JSON.stringify({
        type: "tick",
        symbol,
        price: +(40 + Math.random() * 90).toFixed(2),
        t: Date.now(),
      }),
    );
  }, 3200);

  ws.on("close", () => clearInterval(iv));
});
