import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const root = resolve("dist"),
  port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      if (!(await stat(path)).isFile()) path = resolve(root, "index.html");
    } catch {
      path = resolve(root, "index.html");
    }
    response.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(await readFile(path));
  } catch {
    response.writeHead(500).end("Build the web app first: npm run export:web");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`PlayTheDay preview: http://localhost:${port}`),
);
