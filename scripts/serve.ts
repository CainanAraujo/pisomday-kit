import { realpath, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const root = await realpath(resolve(import.meta.dir, "../dist"));
const port = Number(process.env.PORT ?? "4173");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("PORT precisa ser um inteiro entre 1024 e 65535.");
}

function isInsideRoot(path: string): boolean {
  const relativePath = relative(root, path);
  return (
    relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !relativePath.startsWith(sep)
  );
}

async function findFile(requestUrl: string): Promise<string | null> {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0") || pathname.includes("\\")) return null;
  const requestedPath = resolve(root, `.${pathname}`);
  if (!isInsideRoot(requestedPath)) return null;

  try {
    const resolvedPath = await realpath(
      pathname.endsWith("/") ? join(requestedPath, "index.html") : requestedPath,
    );
    if (!isInsideRoot(resolvedPath) || !(await stat(resolvedPath)).isFile()) return null;
    return resolvedPath;
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
    }
    throw error;
  }
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Método não permitido.", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }
    try {
      const filePath = await findFile(request.url);
      if (!filePath) return new Response("Arquivo não encontrado.", { status: 404 });
      const file = Bun.file(filePath);
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "Content-Type": file.type,
          "Content-Length": String(file.size),
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("Falha ao servir arquivo local:", error);
      return new Response("Não foi possível abrir o arquivo.", { status: 500 });
    }
  },
});

console.log(`Kit local: ${server.url}`);
