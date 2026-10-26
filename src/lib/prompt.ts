export interface PromptFields {
  objective: string;
  context: string;
  format: string;
  criteria: string;
}

export function buildPrompt(fields: PromptFields): string {
  return [
    `Objetivo: ${fields.objective.trim() || "[o que você quer alcançar]"}`,
    `Contexto: ${fields.context.trim() || "[informações permitidas e limites]"}`,
    `Formato: ${fields.format.trim() || "[como a resposta deve ser entregue]"}`,
    `Critério de pronto: ${fields.criteria.trim() || "[o que você vai conferir]"}`,
  ].join("\n\n");
}
