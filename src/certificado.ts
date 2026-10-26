// Recording entry point: keep name normalization small and independent of canvas.
export function formatarNome(name: string): string {
  return name
    .normalize("NFC")
    .replace(/\p{Zs}+/gu, " ")
    .replace(/^ +| +$/g, "");
}
