import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { buildApp } from "./packages/api/src/server.js";

async function startServer() {
  const expressApp = express();
  const PORT = 3000;

  expressApp.use(express.json());

  // Use the modular API router from packages/api
  const apiRouter = buildApp();
  expressApp.use("/api", apiRouter);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);

