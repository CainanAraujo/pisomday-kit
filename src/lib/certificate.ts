export const EVENT_DATE = "2026-10-28";
export const MAX_NAME_LENGTH = 120;

const months = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function formatParticipantName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/\p{Zs}+/gu, " ")
    .replace(/^ +| +$/g, "");
}

export function validateParticipantName(name: string): string | null {
  const formatted = formatParticipantName(name);
  if (!formatted) return "Digite seu nome para gerar o certificado.";
  if (!/^[\p{L}\p{M} '\u2019\u02bc-]+$/u.test(formatted) || !/\p{L}/u.test(formatted)) {
    return "Use somente letras, espaços, hífen ou apóstrofo no nome.";
  }
  if (Array.from(formatted).length > MAX_NAME_LENGTH) {
    return `Use um nome com até ${MAX_NAME_LENGTH} caracteres.`;
  }
  return null;
}

export function formatEventDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new RangeError("Data inválida.");
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lastDay = days[month - 1];
  if (year < 1 || lastDay === undefined || day < 1 || day > lastDay) {
    throw new RangeError("Data inválida.");
  }
  return `${day} de ${months[month - 1]} de ${year}`;
}

export type MeasureName = (text: string, fontSize: number) => number;
export type NameLayout = { readonly lines: readonly string[]; readonly fontSize: number };
type NameBreak = readonly [string, string];

function measureSafely(measure: MeasureName, text: string, fontSize: number): number {
  const width = measure(text, fontSize);
  if (!Number.isFinite(width) || width < 0) throw new RangeError("Medida de texto inválida.");
  return width;
}

function balancedBreak(
  breaks: readonly NameBreak[],
  maxWidth: number,
  fontSize: number,
  measure: MeasureName,
): NameBreak | undefined {
  const candidates = breaks.map((lines) => ({
    lines,
    width: Math.max(...lines.map((line) => measureSafely(measure, line, fontSize))),
  }));
  return candidates.reduce<{ lines: NameBreak | undefined; width: number }>(
    (best, candidate) =>
      candidate.width <= maxWidth && candidate.width < best.width ? candidate : best,
    { lines: undefined, width: Number.POSITIVE_INFINITY },
  ).lines;
}

function fitAtSize(
  name: string,
  breaks: readonly NameBreak[],
  maxWidth: number,
  measure: MeasureName,
): NameLayout | undefined {
  for (let fontSize = 74; fontSize >= 18; fontSize -= 2) {
    if (measureSafely(measure, name, fontSize) <= maxWidth) return { lines: [name], fontSize };
    const lines = balancedBreak(breaks, maxWidth, fontSize, measure);
    if (lines) return { lines, fontSize };
  }
  return undefined;
}

export function layoutParticipantName(
  input: string,
  maxWidth: number,
  measure: MeasureName,
): NameLayout {
  const error = validateParticipantName(input);
  if (error) throw new RangeError(error);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) throw new RangeError("Largura inválida.");
  const name = formatParticipantName(input);
  const words = name.split(" ");
  const wordBreaks: NameBreak[] = words
    .slice(1)
    .map((_, index) => [words.slice(0, index + 1).join(" "), words.slice(index + 1).join(" ")]);
  const wordLayout = fitAtSize(name, wordBreaks, maxWidth, measure);
  if (wordLayout) return wordLayout;

  // Only break inside a word when shrinking at word boundaries cannot fit it.
  const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });
  const letters = Array.from(segmenter.segment(name), ({ segment }) => segment);
  const letterBreaks: NameBreak[] = letters.slice(1).map((_, index) => [
    letters
      .slice(0, index + 1)
      .join("")
      .trimEnd(),
    letters
      .slice(index + 1)
      .join("")
      .trimStart(),
  ]);
  const letterLayout = fitAtSize(name, letterBreaks, maxWidth, measure);
  if (letterLayout) return letterLayout;
  throw new RangeError("Não foi possível acomodar o nome. Use uma forma mais curta do seu nome.");
}
