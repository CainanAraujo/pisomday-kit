import { describe, expect, test } from "bun:test";
import { buildPrompt } from "../src/lib/prompt";

describe("buildPrompt", () => {
  test("keeps the four labels and user content in the agreed order", () => {
    expect(
      buildPrompt({
        objective: "  Resumir  ",
        context: "Exemplo\nSintético",
        format: "Tabela",
        criteria: "Sem inventar",
      }),
    ).toBe(
      "Objetivo: Resumir\n\nContexto: Exemplo\nSintético\n\nFormato: Tabela\n\nCritério de pronto: Sem inventar",
    );
  });
  test("shows explicit fill-in instructions for blank fields", () => {
    const text = buildPrompt({ objective: "", context: "  ", format: "", criteria: "" });
    expect(text).toContain("Objetivo: [o que você quer alcançar]");
    expect(text).toContain("Contexto: [informações permitidas e limites]");
    expect(text).toContain("Formato: [como a resposta deve ser entregue]");
    expect(text).toContain("Critério de pronto: [o que você vai conferir]");
  });
  test("does not interpret markup in user text", () => {
    const text = buildPrompt({
      objective: "<script>exemplo</script>",
      context: "",
      format: "",
      criteria: "",
    });
    expect(text).toContain("<script>exemplo</script>");
  });
});
