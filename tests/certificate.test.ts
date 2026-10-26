import { describe, expect, test } from "bun:test";
import {
  EVENT_DATE,
  formatEventDate,
  formatParticipantName,
  layoutParticipantName,
  validateParticipantName,
} from "../src/lib/certificate";

describe("participant names", () => {
  test("preserves accents, capitalization, hyphens and apostrophes", () => {
    for (const name of [
      "João Gonçalves",
      "MARIA DA CONCEIÇÃO",
      "Ana-Luísa D'Ávila",
      "O’Connor",
      "李",
      "أحمد",
      "Nguyễn Thị Mai",
    ]) {
      expect(validateParticipantName(name)).toBeNull();
      expect(formatParticipantName(name)).toBe(name);
    }
  });

  test("normalizes equivalent accents and extra spaces without title-casing", () => {
    expect(formatParticipantName("  Joa\u0303o\u00a0  d’Ávila  ")).toBe("João d’Ávila");
    expect(validateParticipantName("  Joa\u0303o\u00a0  d’Ávila  ")).toBeNull();
  });

  test("rejects blank names, punctuation without letters, markup and controls", () => {
    for (const name of [
      "",
      "   ",
      "-'",
      "<img src=x onerror=alert(1)>",
      "Ana123",
      "Ana\nSilva",
      "Ana\tSilva",
      "Ana\u202eSilva",
      "Ana\u0000Silva",
    ]) {
      expect(validateParticipantName(name)).toBeString();
    }
  });

  test("accepts 120 Unicode characters but rejects longer names", () => {
    expect(validateParticipantName("Á".repeat(120))).toBeNull();
    expect(validateParticipantName("Á".repeat(121))).toBeString();
    expect(validateParticipantName("𐐀".repeat(120))).toBeNull();
  });
});

describe("calendar dates", () => {
  test("renders the fixed event date independent of locale or timezone", () => {
    expect(EVENT_DATE).toBe("2026-10-28");
    expect(formatEventDate(EVENT_DATE)).toBe("28 de outubro de 2026");
    expect(formatEventDate("2024-02-29")).toBe("29 de fevereiro de 2024");
    expect(formatEventDate("2026-01-01")).toBe("1 de janeiro de 2026");
  });

  test("rejects dates that a JavaScript Date would silently roll forward", () => {
    for (const date of [
      "2026-02-29",
      "1900-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-00-01",
      "2026-01-00",
      "0000-01-01",
      "2026-10-28T00:00:00Z",
      "28/10/2026",
    ]) {
      expect(() => formatEventDate(date)).toThrow(RangeError);
    }
    expect(formatEventDate("2000-02-29")).toBe("29 de fevereiro de 2000");
  });
});

describe("certificate name layout", () => {
  const measure = (text: string, fontSize: number) => Array.from(text).length * fontSize * 0.6;

  test("keeps a short name on one line at the largest font", () => {
    expect(layoutParticipantName("João Silva", 1256, measure)).toEqual({
      lines: ["João Silva"],
      fontSize: 74,
    });
  });

  test("balances a long name across at most two lines within the canvas", () => {
    const name = "Maria da Conceição Albuquerque de Oliveira e Silva";
    const result = layoutParticipantName(name, 1256, measure);
    expect(result.lines).toHaveLength(2);
    expect(result.lines.join(" ")).toBe(name);
    for (const line of result.lines)
      expect(measure(line, result.fontSize)).toBeLessThanOrEqual(1256);
  });

  test("reduces the font when two lines at the largest size do not fit", () => {
    const name = "Maria da Conceição Albuquerque de Oliveira e Silva dos Santos Pereira de Souza";
    const result = layoutParticipantName(name, 1256, measure);
    expect(result.fontSize).toBeLessThan(74);
    expect(result.lines.length).toBeLessThanOrEqual(2);
    expect(result.lines.join(" ")).toBe(name);
    for (const line of result.lines)
      expect(measure(line, result.fontSize)).toBeLessThanOrEqual(1256);
  });

  test("fits an unbroken 120-character name without losing characters", () => {
    const name = "Á".repeat(120);
    const result = layoutParticipantName(name, 1256, measure);
    expect(result.lines.join("")).toBe(name);
    expect(result.lines.length).toBeLessThanOrEqual(2);
    for (const line of result.lines)
      expect(measure(line, result.fontSize)).toBeLessThanOrEqual(1256);
  });

  test("does not split combining sequences when a long word must wrap", () => {
    const name = "q\u0301".repeat(60);
    const result = layoutParticipantName(name, 1256, measure);
    expect(result.lines.join("")).toBe(name);
    for (const line of result.lines) expect(line.startsWith("\u0301")).toBe(false);
  });

  test("reports unsupported names and impossible layouts explicitly", () => {
    expect(() => layoutParticipantName("<script>", 1256, measure)).toThrow();
    expect(() => layoutParticipantName("Ana", 0, measure)).toThrow(RangeError);
    expect(() => layoutParticipantName("Ana", 1256, () => Number.NaN)).toThrow(RangeError);
    expect(() => layoutParticipantName("Ana", 1, () => 5000)).toThrow(RangeError);
  });
});
