# PisomDay · kit do participante

Cinco princípios para pedir, conferir e decidir com IA. Site estático em PT-BR,
feito com HTML, CSS, TypeScript e Bun, sem dependências de runtime ou tracking.
O certificado é gerado na memória do navegador; o nome não é enviado nem salvo.

## Rodar localmente

Requer Bun 1.4.2.

```sh
bun install --frozen-lockfile
bun run dev
```

Abra http://127.0.0.1:4173/. Após editar, rode `bun run build` e atualize a página.
`bun run preview` serve um build existente. Para outra porta: `PORT=4174 bun run dev`.

## Conferir a entrega

Na máquina de trabalho, use a fila de memória para a suíte completa:

```sh
pesado timeout 180 bun run check
pesado timeout 180 bun test --coverage
```

Em um runner isolado, sem o utilitário `pesado`, rode `bun run check`.
O comando executa lint, typecheck, testes e build. Um teste individual pode rodar
diretamente: `bun test tests/certificate.test.ts`.
O build falha quando os arquivos publicados somam 300.000 bytes ou mais, sem vídeos.
A cobertura unitária mede os módulos puros importados pelos testes.

Com o servidor ativo e Google Chrome instalado:

```sh
bun run test:browser
CHROME_PATH=/usr/bin/google-chrome bunx lighthouse@13.5.0 http://127.0.0.1:4173/ --chrome-flags='--headless' --only-categories=performance,accessibility
```

O teste do navegador confere celular, teclado, cópia, certificado PNG, impressão,
nomes longos, erros de entrada, conteúdo sem JS e ausência de pedidos externos.
Capturas e PNG de teste ficam em `.qa/`, ignorado pelo Git. Defina `CHROME_PATH`
para usar outro executável ou `KIT_URL` para conferir outro endereço local.

## Onde alterar

- `public/index.html`: conteúdo estático e pontos de entrada de cada seção.
- `public/styles.css`: tema responsivo; fonte do sistema, sem download externo.
- `src/lib/`: validação, formatação, layout de nomes e montagem do pedido.
- `src/certificado.ts`: função curta `formatarNome`, usada pelo certificado e pelas demos.
- `src/certificate.ts`: canvas, download e impressão.
- `scripts/`: build, servidor local e verificação dos fluxos no navegador.
- `tests/`: testes unitários com entradas sintéticas.

O conteúdo editorial foi integrado a partir dos arquivos revisados da equipe:
3 exemplos, 24 prompts por função, desafio de 7 dias e 15 perguntas frequentes.
As notas de teste reproduzem os relatos do material; não são promessa de resultado.
Os princípios vêm da SPEC do evento. Preserve os avisos de dados fictícios.
As demos têm poster e controles, mas nenhum arquivo fictício ou URL quebrada.
Quando os MP4 chegarem, adicione os arquivos a `public/demos/`, defina o `src`
relativo em cada vídeo e atualize título, duração e disponibilidade. A numeração
é DEV1–DEV4, depois DD1–DD4 (por exemplo, `01-pedido-vago-x-completo.mp4`).
O atributo `data-video-file` de cada player registra o nome esperado no roteiro.
Use legendas queimadas nos vídeos silenciosos; DD1 tem duração prevista de 1:00.

Para as gravações, `#challenge-content` contém sete itens com `data-day="1"` a `"7"`.
A ação de marcar/limpar e a persistência do desafio serão implementadas na DEV2.
O nome é normalizado em `formatarNome`; o canvas atual quebra linhas por largura.
A regra explícita de duas linhas acima de 28 caracteres é o critério novo da DEV1.

## Publicação preparada

A criação do repositório público e a publicação dependem do OK do Cainan.
O workflow de CI verifica push/PR. Pages é manual e só prossegue com a variável
de repositório `PAGES_APPROVED=true`, depois das verificações passarem.

Comando reservado para execução **apenas depois da autorização**:

```sh
gh repo create CainanAraujo/pisomday-kit --public --source . --push
```

Depois, configure Pages para GitHub Actions, habilite a variável autorizada e execute
o workflow `Publicar no Pages (manual)`. Os assets usam caminhos relativos,
compatíveis com uma subpasta como `/pisomday-kit/`.
O CI remoto e o deploy não foram executados nesta fase local.
