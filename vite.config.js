import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, `/api/*` é atendido pelos mesmos handlers das Vercel Functions.
function localApi() {
  return {
    name: "biblioteca-local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const { default: handle } = await server.ssrLoadModule("/server/app.js");
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
          });
          const response = await handle(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) { next(error); }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), localApi()],
    build: { outDir: "dist", sourcemap: false },
  };
});
