import { spawn } from "bun";

// Build JS
const jsBuild = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  minify: false,
});

if (!jsBuild.success) {
  console.error("JS Build failed:", jsBuild.logs);
  process.exit(1);
}

// Build CSS with Tailwind
const cssBuild = spawn({
  cmd: ["bunx", "@tailwindcss/cli", "-i", "./src/styles.css", "-o", "./dist/styles.css"],
  stdout: "inherit",
  stderr: "inherit",
});

await cssBuild.exited;

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file("index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (path === "/dist/index.js") {
      return new Response(Bun.file("./dist/index.js"), {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    if (path === "/dist/styles.css") {
      return new Response(Bun.file("./dist/styles.css"), {
        headers: { "Content-Type": "text/css" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
