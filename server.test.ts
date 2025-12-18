import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn, type Subprocess } from "bun";

describe("server", () => {
  let serverProcess: Subprocess<"ignore", "pipe", "pipe">;
  const port = 3001; // Use different port to avoid conflicts

  beforeAll(async () => {
    // Start the server on a different port for testing
    serverProcess = spawn({
      cmd: ["bun", "run", "server.ts"],
      env: { ...process.env, PORT: String(port) },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    serverProcess?.kill();
  });

  test("serves index.html at root", async () => {
    const response = await fetch("http://localhost:3000/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });

  test("serves index.html at /index.html", async () => {
    const response = await fetch("http://localhost:3000/index.html");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });

  test("serves JavaScript bundle", async () => {
    const response = await fetch("http://localhost:3000/dist/index.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/javascript");
  });

  test("serves CSS file", async () => {
    const response = await fetch("http://localhost:3000/dist/styles.css");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/css");
  });

  test("returns 404 for unknown paths", async () => {
    const response = await fetch("http://localhost:3000/nonexistent");
    expect(response.status).toBe(404);
  });
});
