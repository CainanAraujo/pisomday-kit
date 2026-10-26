import { cp, lstat, readdir, rm, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dir, "..");
const sourceDirectory = join(projectRoot, "public");
const outputDirectory = join(projectRoot, "dist");
const assetLimitBytes = 300_000;
const videoExtensions = new Set([".mp4", ".webm", ".mov"]);

async function measureAssets(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Link simbólico não permitido no site: ${path}`);
      }
      if (entry.isDirectory()) return measureAssets(path);
      if (videoExtensions.has(extname(entry.name).toLowerCase())) return 0;
      return (await stat(path)).size;
    }),
  );
  return sizes.reduce((total, size) => total + size, 0);
}

// Valida antes de copiar ou escrever o bundle, inclusive public/app.js.
if (!(await lstat(sourceDirectory)).isDirectory()) {
  throw new Error("public precisa ser um diretório local, sem link simbólico.");
}
await measureAssets(sourceDirectory);

// A limpeza fica restrita ao diretório de saída fixo deste projeto.
await rm(outputDirectory, { recursive: true, force: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(projectRoot, "src/main.ts")],
  outdir: outputDirectory,
  naming: "app.js",
  target: "browser",
  format: "esm",
  minify: true,
  sourcemap: "none",
});

if (!result.success) {
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

const totalBytes = await measureAssets(outputDirectory);
if (totalBytes >= assetLimitBytes) {
  throw new Error(`Site com ${totalBytes} bytes; limite: menos de ${assetLimitBytes}, sem vídeos.`);
}

console.log(`Build pronto em dist/: ${totalBytes} bytes sem vídeos (limite: ${assetLimitBytes}).`);
