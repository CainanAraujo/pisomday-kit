import { formatarNome } from "./certificado";
import {
  EVENT_DATE,
  formatEventDate,
  layoutParticipantName,
  validateParticipantName,
} from "./lib/certificate";

const fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function drawCertificate(canvas: HTMLCanvasElement, name: string): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu criar a imagem do certificado.");
  canvas.width = 1600;
  canvas.height = 1131;
  context.fillStyle = "#06101c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#009aff";
  context.lineWidth = 3;
  context.strokeRect(58, 58, 1484, 1015);
  context.textAlign = "center";
  context.textBaseline = "middle";

  const text = (value: string, y: number, size: number, color: string, weight = 400) => {
    context.fillStyle = color;
    context.font = `${weight} ${size}px ${fontFamily}`;
    context.fillText(value, 800, y);
  };
  text("Certificado de participação", 178, 36, "#c6d8e7");
  text("PisomDay", 310, 106, "#fdfbfc", 700);
  text("Aceleração de desenvolvimento com IA", 416, 43, "#fdfbfc");
  text("Certificamos a participação de", 528, 28, "#c6d8e7");
  const layout = layoutParticipantName(name, 1256, (value, size) => {
    context.font = `700 ${size}px ${fontFamily}`;
    return context.measureText(value).width;
  });
  const firstLine = layout.lines.length === 1 ? 661 : 617;
  layout.lines.forEach((line, index) => {
    text(line, firstLine + index * 88, layout.fontSize, "#fdfbfc", 700);
  });
  text(formatEventDate(EVENT_DATE), 840, 34, "#fdfbfc");
  text("Carga horária: 1h15", 897, 28, "#c6d8e7");
  text("Cainan Araujo · PisomTech", 987, 30, "#fdfbfc", 700);
}

function createPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar o PNG. Tente novamente."));
    }, "image/png");
  });
}

function openPrintView(imageUrl: string, description: string): boolean {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return false;
  printWindow.opener = null;
  const printDocument = printWindow.document;
  printDocument.documentElement.lang = "pt-BR";
  printDocument.title = "Certificado de participação — PisomDay";
  const style = printDocument.createElement("style");
  style.textContent = `
    @page { size: A4 landscape; margin: 0; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #06101c; }
    header { padding: 1rem; }
    button { padding: .7rem 1rem; font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #055787; outline-offset: 3px; }
    img { display: block; width: 100%; height: auto; }
    @media print { header { display: none; } img { width: 297mm; height: 210mm; object-fit: contain; } }
  `;
  printDocument.head.append(style);
  const header = printDocument.createElement("header");
  const heading = printDocument.createElement("h1");
  heading.textContent = "Certificado de participação — PisomDay";
  const button = printDocument.createElement("button");
  button.type = "button";
  button.textContent = "Imprimir ou salvar PDF";
  button.addEventListener("click", () => printWindow.print());
  header.append(heading, button);
  const certificate = printDocument.createElement("img");
  certificate.alt = description;
  certificate.addEventListener(
    "load",
    () => {
      printWindow.focus();
      printWindow.print();
    },
    { once: true },
  );
  certificate.src = imageUrl;
  printDocument.body.append(header, certificate);
  return true;
}

function getCertificateElements() {
  const form = document.querySelector<HTMLFormElement>("#certificate-form");
  const input = document.querySelector<HTMLInputElement>("#participant-name");
  const error = document.querySelector<HTMLElement>("#certificate-error");
  const status = document.querySelector<HTMLElement>("#certificate-status");
  const canvas = document.querySelector<HTMLCanvasElement>("#certificate-canvas");
  const preview = document.querySelector<HTMLImageElement>("#certificate-preview");
  const download = document.querySelector<HTMLButtonElement>("#download-certificate");
  const print = document.querySelector<HTMLButtonElement>("#print-certificate");
  if (!form || !input || !error || !status || !canvas || !preview || !download || !print)
    return null;
  return { form, input, error, status, canvas, preview, download, print };
}

type CertificateElements = NonNullable<ReturnType<typeof getCertificateElements>>;
type CertificateState = { readonly url: string | undefined; readonly generation: number };
type CertificateController = ReturnType<typeof createCertificateController>;

function showError(elements: CertificateElements, message: string): void {
  elements.error.textContent = message;
  elements.error.hidden = false;
  elements.status.textContent = "";
}

function displayCertificate(elements: CertificateElements, name: string, url: string): void {
  elements.preview.alt = `Certificado de participação de ${name} no PisomDay — Aceleração de desenvolvimento com IA, ${formatEventDate(EVENT_DATE)}, carga horária de 1h15. Cainan Araujo · PisomTech.`;
  elements.preview.src = url;
  elements.preview.hidden = false;
  elements.download.disabled = false;
  elements.print.disabled = false;
  elements.status.textContent =
    "Certificado gerado. Confira o nome na prévia e baixe o PNG ou imprima para salvar em PDF.";
}

function createCertificateController(elements: CertificateElements) {
  let state: CertificateState = { url: undefined, generation: 0 };
  return {
    getState: () => state,
    reset: () => {
      if (state.url) URL.revokeObjectURL(state.url);
      state = { url: undefined, generation: state.generation + 1 };
      elements.preview.hidden = true;
      elements.preview.removeAttribute("src");
      elements.download.disabled = true;
      elements.print.disabled = true;
      elements.error.hidden = true;
      elements.input.removeAttribute("aria-invalid");
    },
    publish: (name: string, blob: Blob) => {
      const url = URL.createObjectURL(blob);
      state = { ...state, url };
      displayCertificate(elements, name, url);
    },
  };
}

async function submitCertificate(
  event: Event,
  elements: CertificateElements,
  controller: CertificateController,
): Promise<void> {
  event.preventDefault();
  controller.reset();
  const validationError = validateParticipantName(elements.input.value);
  if (validationError) {
    showError(elements, validationError);
    elements.input.setAttribute("aria-invalid", "true");
    elements.input.focus();
    return;
  }
  elements.status.textContent = "Gerando seu certificado neste navegador…";
  const request = controller.getState().generation;
  try {
    const name = formatarNome(elements.input.value);
    drawCertificate(elements.canvas, name);
    const blob = await createPng(elements.canvas);
    if (request !== controller.getState().generation) return;
    controller.publish(name, blob);
  } catch (cause) {
    if (request !== controller.getState().generation) return;
    showError(
      elements,
      cause instanceof Error
        ? cause.message
        : "Não foi possível gerar o certificado. Tente novamente.",
    );
  }
}

function bindCertificateOutput(
  elements: CertificateElements,
  controller: CertificateController,
): void {
  elements.download.addEventListener("click", () => {
    const { url } = controller.getState();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = "pisomday-certificado.png";
    link.click();
    elements.status.textContent =
      "Download do PNG solicitado. Confira o arquivo na pasta de downloads do navegador.";
  });

  elements.print.addEventListener("click", () => {
    const { url } = controller.getState();
    if (!url) return;
    const opened = openPrintView(url, elements.preview.alt);
    elements.status.textContent = opened
      ? "Impressão aberta em outra janela. Escolha sua impressora ou a opção de salvar em PDF."
      : "O navegador bloqueou a janela de impressão. Permita pop-ups para este site ou baixe o PNG.";
  });
}

export function mountCertificate(): void {
  const elements = getCertificateElements();
  if (!elements) return;
  const controller = createCertificateController(elements);
  elements.input.addEventListener("input", () => {
    const hadCertificate = Boolean(controller.getState().url);
    controller.reset();
    elements.status.textContent = hadCertificate
      ? "O nome mudou. Gere o certificado novamente."
      : "";
  });
  elements.form.addEventListener("submit", (event) => {
    void submitCertificate(event, elements, controller);
  });
  bindCertificateOutput(elements, controller);
}
