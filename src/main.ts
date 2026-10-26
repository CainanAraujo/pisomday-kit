import { mountCertificate } from "./certificate";
import { buildPrompt } from "./lib/prompt";

function mountPrompt(): void {
  const form = document.querySelector<HTMLFormElement>("#prompt-form");
  const button = document.querySelector<HTMLButtonElement>("#copy-prompt");
  const output = document.querySelector<HTMLElement>("#prompt-output");
  const status = document.querySelector<HTMLElement>("#copy-status");
  if (!form || !button || !output || !status) return;

  const updatePrompt = (): string => {
    const data = new FormData(form);
    const prompt = buildPrompt({
      objective: String(data.get("objective") ?? ""),
      context: String(data.get("context") ?? ""),
      format: String(data.get("format") ?? ""),
      criteria: String(data.get("criteria") ?? ""),
    });
    output.textContent = prompt;
    return prompt;
  };
  button.hidden = false;
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", () => {
    updatePrompt();
    status.textContent = "";
  });
  button.addEventListener("click", async () => {
    const text = updatePrompt();
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Pedido copiado. Confira antes de enviar para sua IA.";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(output);
      selection?.removeAllRanges();
      selection?.addRange(range);
      output.focus();
      status.textContent =
        "Selecione e copie o modelo ao lado. A cópia automática não está disponível neste navegador.";
    }
  });
}

mountPrompt();
mountCertificate();
const generateButton = document.querySelector<HTMLButtonElement>("#generate-certificate");
if (generateButton) generateButton.disabled = false;
