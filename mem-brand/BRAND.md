O sistema de identidade do MEM — Método Expertise Monetizada. Público central nesta fase: mulheres com trajetória profissional que querem transformar conhecimento e experiência em um negócio digital. Posicionamento de referência: mentoria estruturada de R$ 2.997 (o visual nunca se ajusta para a faixa de validação).

## 1. Princípio visual

**Mapa com lastro.** Toda peça do MEM mostra duas coisas: *onde a pessoa está* (cartografia) e *qual é o estatuto do que está dito* (caderno de investigação). A sofisticação vem da inteligência da organização, nunca de ornamento, brilho ou luxo.

Teste rápido de qualquer peça: tire as palavras. Ainda dá para ver uma estrutura (posição, sequência, hierarquia, estatuto)? Se sobrou só decoração, não é MEM.

## 2. Papel de cada território no sistema

| Camada | Território de origem | O que governa | Onde aparece mais |
| --- | --- | --- | --- |
| Estrutura | T2 Cartografia | Grid, navegação, planos de cor, trilha, marcos, progresso, gates | Jornada, Workspace, site, capas |
| Linguagem | T1 Caderno de Investigação | Títulos editoriais, citações literais, rótulos de estatuto, fios, numeração, notas | Conteúdo, materiais, entregáveis, mensagens do ExpertIA |
| Temperatura | T3 Ateliê | Fotografia, tom humano, presença da mentora | Fotos, depoimentos, página de vendas, devolutivas |

Regra de convivência: **a estrutura vem da cartografia, a voz vem do caderno, o calor vem da fotografia.** T3 nunca define forma: sem cantos grandes, sem argila como plano dominante, sem cards "macios".

## 3. Paleta

Tema principal: **Papel** (claro). Tema secundário: **Noite** (escuro, para Workspace e leitura noturna).

**Núcleo de marca**
- `brand` — bordô MEM (#641F2B). Ações principais, links, marca "você está aqui", títulos de destaque. Nunca como fundo de área grande no tema Papel; para planos use `brand-strong`.
- `brand-strong` — bordô profundo (#43151E). Planos de impacto: hero, navegação lateral, capas, faixas de pilar. Hover de `brand`.
- `surface` — creme papel (#F8F4EC). Fundo padrão de tudo.
- `surface-sunken` — bege (#EDE3D3). Painéis, notas, áreas de apoio, células de cabeçalho.
- `ink` — marrom tinta (#292321). Todo texto corrido.

**Apoio**
- `ink-muted` — taupe escuro (#6F6153). Texto secundário, legendas, metadados. Substitui o taupe original em qualquer texto.
- `icon` — taupe (#8B7B6B). Ícones, bordas de campo, marcadores. Nunca para texto comum.
- `line` — fio (#DCCFBC). Divisórias e fios editoriais. Decorativo: não carrega sentido sozinho.
- `route` — argila (#C9A99A). Rotas ainda não percorridas, curvas de nível. Só linhas; nunca texto, nunca plano.

**Funcionais (só estado, nunca decoração)**
- `status-done` — oliva (#4F5A36): concluído, evidência forte.
- `status-warn` — ocre (#875A12): atenção, pendência, amostra insuficiente.
- `status-danger` — tijolo (#A0381A): erro, bloqueio. É deliberadamente mais alaranjado que o bordô para não ser confundido com a marca.
- Cada um tem `-tint` para fundo. **Todo estado leva palavra e marcador**; cor sozinha nunca comunica (oliva e tijolo têm luminância parecida).

**Proporção no tema Papel:** `surface` ~60%, `surface-sunken` ~15%, `ink` ~12%, `brand-strong` ~8%, `brand` ~4%, funcionais ~1%.

**Combinações proibidas:** `brand` sobre `brand-strong` ou sobre `ink` (contraste 1,3); `route` ou `line` como cor de texto; dourado em qualquer quantidade; azul estrutural; degradês.

Contraste verificado (WCAG 2): todo token de texto passa 4,5:1 sobre `surface`, `surface-sunken` e `surface-raised`, nos dois temas. Anel de foco: `focus` (2px sólido, 2px de afastamento); sobre `surface-inverse` usar `on-inverse`.

## 4. Tipografia

Três famílias, cada uma com um papel fixo:

- **Newsreader** (`serif`) — a voz editorial. Títulos de peso, citações literais, falas da mentora, leitura longa.
- **Schibsted Grotesk** (`sans`) — a estrutura. Interface, texto corrido de produto, botões, títulos funcionais.
- **IBM Plex Mono** (`mono`) — o registro. Rótulos de estatuto, numeração de calls e gates, dados, datas, a assinatura do ExpertIA.

Nada de uma quarta família. Nada de script, caligrafia ou serifa "fashion".

## 5. Hierarquia tipográfica

| Estilo | Família | Uso |
| --- | --- | --- |
| `display` | serif 500, 64/64 | Um por tela: hero do site, capa de material |
| `h1` | serif 500, 44/48 | Título de página, título de entregável |
| `h2` | serif 500, 32/38 | Seções editoriais |
| `h3` | sans 700, 22/28 | Títulos funcionais: cards, painéis |
| `h4` | sans 600, 18/24 | Subtítulos de interface |
| `body-lg` | sans 400, 18/28 | Introduções, texto de destaque |
| `body` | sans 400, 16/24 | Texto padrão de produto |
| `body-sm` | sans 400, 14/20 | Metadados, ajuda de campo |
| `reading` | serif 400, 19/30 | Leitura longa: devolutivas, materiais, relatórios |
| `quote` | serif itálico 24/32 | Fala literal (de campo ou da mentorada) |
| `label` | mono 500, 12/16, caixa alta, +0,08em | Rótulos de estatuto, numeração, chips |
| `data` | mono 400, 14/20 | Números, datas, notas da matriz |

Regras: títulos em caixa normal (nunca tudo maiúsculo, exceto `label`); no máximo dois níveis de título por bloco; serif para *o que se pensa*, sans para *o que se faz*, mono para *o que se registra*.

## 6. Grid e composição

- Base de 8px (`space-*`). Grid de 12 colunas, `gutter` 24px, `margin-desktop` 80px, `margin-mobile` 16px, largura máxima `max-width` 1200px.
- Composição cartográfica: **planos retos de cor** (`brand-strong`, `surface-sunken`) dividem a página como regiões de um mapa. Sem sobreposições decorativas, sem blocos inclinados.
- Margem é parte do desenho: blocos de leitura com no máximo 68 caracteres por linha; notas e metadados podem ocupar uma coluna de margem (2–3 colunas), como num caderno.
- Respiro: entre seções `space-8` (64px) ou mais; dentro de cards `space-5` (24px).
- Cantos: `radius-0` em planos e imagens, `radius-1` (2px) em botões e campos, `radius-2` (4px) no máximo em cards. `radius-pill` só para marcadores circulares, nunca para botões.
- Sombras: não. Separação por fio (`line`) ou mudança de plano. Única exceção: `shadow-overlay` em menus e diálogos flutuantes.

## 7. Formas, linhas, marcadores e elementos cartográficos

Um vocabulário fechado. Não inventar novos marcadores.

| Marcador | Forma | Significado |
| --- | --- | --- |
| Etapa concluída | Disco cheio, `status-done` | Critério da etapa atendido |
| Você está aqui | Anel grosso, `brand` | Etapa em curso |
| Próxima etapa | Círculo vazio, `icon` | Ainda não iniciada |
| Gate de decisão | Losango | Ponto de decisão (os 8 Decision Gates) |
| Rota percorrida | Linha sólida 2px | Caminho já feito |
| Rota futura | Linha tracejada `route` | Caminho previsto |
| Retrocesso / loop | Arco tracejado com seta para trás | Volta legítima com destino e razão |

- **Curvas de nível** (linhas finas em `route`, poucas, espaçadas) só em capas, heros e fundos de seção sem texto denso. Nunca atrás de tabela ou formulário.
- **Fios editoriais** (`line`, 1px) separam seções; fio de 2px em `ink` fecha cabeçalhos e rodapés.
- **Numeração** (mono, `label`) acompanha seções, calls, gates e entregáveis: "CALL 03", "GATE 4", "E05".
- Setas finas e retas. Nada de ícones 3D, foguetes, alvos, troféus, lâmpadas.

## 8. Linguagem de evidência e investigação

O estatuto da informação é sempre visível. Tags (`StatusTag`):

- **Hipótese** — contorno tracejado `ink-muted`.
- **Evidência** — contorno sólido `status-done`, com força ao lado.
- **Decisão** — preenchido `brand`, texto `on-brand`.
- **Pendência** — contorno tracejado `status-warn`.
- **Relato / Percepção** — texto `ink-muted` em `surface-sunken`, sem contorno.
- **Validado** — preenchido `status-done`. Só pode aparecer depois do Gate 7; antes disso, nunca.

Força da evidência (`EvidenceStrength`) por **forma**, não só cor: ●●● forte, ●●○ médio, ●○○ fraco, ○○○ nulo, sempre com a palavra ao lado.

Citação literal: estilo `quote`, fio de 2px `brand` à esquerda **e** a fonte em `label` logo abaixo ("FALA LITERAL · CONVERSA 03 · 12 OUT"). Sem fonte, não é citação.

## 9. Tratamento de imagens (a temperatura do Ateliê)

- **Fotografia documental, nunca encenada.** Mulheres reais trabalhando: escrevendo, organizando, conversando, olhando para o próprio material. Mãos, cadernos, telas com trabalho real, mesas de trabalho com uso.
- **Luz natural, lateral.** Tons quentes, saturação levemente reduzida, pretos com um pouco de marrom.
- **Enquadramento com respiro**: a pessoa ocupa parte do quadro; o espaço restante é contexto.
- **Duotone sistêmico** (`brand-strong` nas sombras, `surface-sunken` nas luzes) para fotos de ambiente em capas, heros e conteúdos em série.
- **Karen** aparece como mentora em ação: conduzindo, anotando, explicando. Nunca em pose de autoridade de palco, braços cruzados, ou "bastidores de luxo".
- Nunca: banco de imagem genérico, mulher sorrindo para o notebook, flores, taças, café cenográfico, cama, roupão, dourado, notas de dinheiro, celular mostrando faturamento.

## 10. Aplicação em conteúdos

- **Carrossel e post:** fundo `surface` ou `brand-strong`; título em `h1`/`display` serif; numeração em `label`; um único elemento cartográfico por peça (um marcador, uma rota ou curvas de nível — não os três).
- **Série de conteúdo:** cada série tem nome e número em mono ("SÉRIE · 02/05"), na mesma posição em todas as peças.
- **Capa de Reels:** foto documental (ou duotone) + até 6 palavras em serif. Nada de emoji, seta vermelha, "ARRASTA".
- **Citação de cliente ou de campo:** sempre no formato de citação literal com fonte (seção 8).
- **Materiais educacionais e PDFs:** tema Papel, `reading` para texto, margens largas, notas em coluna lateral, numeração de seção — como um caderno de método.

## 11. Aplicação no Workspace

O Workspace é **o caderno**: onde a jornada vira material.

- Fundo `surface`; navegação lateral em `brand-strong` com texto `on-inverse`; item ativo em `brand` com marcador.
- Cada entregável (E01–E11) é um `DeliverableCard`: número em `label`, título `h3`, completude como frase ("2 de 3 a 5 hipóteses") e estatuto em tag.
- Tabelas (`DataTable`) tipográficas: cabeçalho em `label` sobre `surface-sunken`, fios horizontais `line`, sem zebra, sem bordas verticais; números em `data`.
- Formulários (`Field`): rótulo em sans 600, ajuda em `body-sm` `ink-muted`, borda `icon`, foco `focus`. Campo vazio aparece como lacuna nomeada, nunca preenchido com exemplo que pareça resposta.
- Alertas (`Alert`): faixa com marcador, título curto e o que fazer. Sem toasts piscando.

## 12. Aplicação na Jornada

A Jornada é **o mapa**: onde a pessoa vê onde está.

- `JourneyTrail` mostra os dois pilares (**MAPA** e **NORTE**) com as etapas em sequência, usando o vocabulário de marcadores da seção 7.
- Gates aparecem como losangos entre etapas; ao atravessar, o gate registra a decisão (texto curto) — progresso é condicional, não uma barra que enche.
- Retrocesso aparece como arco tracejado para trás, com destino e razão escritos. Visualmente é um movimento legítimo, nunca uma marca de erro.
- Sem porcentagem de conclusão, sem confete, sem medalhas. O sinal de avanço é "critério atendido".

## 13. MEM, Karen, ExpertIA, Workspace e Jornada

Uma marca, cinco papéis. Nenhum componente compete com o MEM: todos usam a mesma paleta, o mesmo grid e as mesmas fontes.

| Elemento | Papel | Assinatura visual |
| --- | --- | --- |
| **MEM** | O método | O nome em destaque; planos `brand-strong`; estrutura cartográfica |
| **Karen** | A mentora que conduz | Voz humana em serif (`reading`, `quote`), devolutivas assinadas pelo nome, fotografia documental |
| **ExpertIA** | Inteligência aplicada ao método | Rótulo `label` "EXPERTIA" + marcador de anel; mensagens como **nota de margem** em `surface-sunken` (`ExpertIANote`). Sem avatar de robô, sem brilho, sem degradê, sem ícone de faísca |
| **Workspace** | Ambiente de organização e materialização | O caderno: `surface-raised`, tabelas e entregáveis |
| **Jornada** | Experiência de percurso | O mapa: `JourneyTrail`, marcos, gates |

Escrita dos nomes: "MEM" sempre em caixa alta; "ExpertIA" com I e A maiúsculos; "Workspace" e "Jornada" como substantivos comuns com inicial maiúscula, nunca com logotipo próprio. Assinatura padrão: "ExpertIA · MEM", "Workspace · MEM".

Distinção de vozes na interface: **método** fala em sans (instrução, estrutura); **mentora** fala em serif e assina (`MentorNote`); **ExpertIA** fala em sans com rótulo mono e nunca assina como pessoa.

## 14. O que fazer e o que não fazer

**Para não parecer SaaS corporativo**
- Faça: serif editorial nos títulos de peso; papel creme como fundo; fios em vez de sombras; linguagem de caderno.
- Não faça: cards brancos com sombra suave e canto 12px; ícones de linha genéricos em cada card; dashboards com KPIs grandes e gráficos decorativos; azul; degradê; ilustração isométrica; "Bem-vindo de volta! 👋".

**Para não parecer coaching**
- Faça: mostrar critério, estatuto e o próximo passo concreto.
- Não faça: frases motivacionais em destaque; foto em palco; setas para cima, montanhas, foguetes, troféus; contagem regressiva; "transformação" sem o que muda de fato.

**Para não parecer "mentoria feminina premium" genérica**
- Faça: tratar a mulher como profissional adulta; fotografia de trabalho real; bordô como cor de densidade, não de romance.
- Não faça: dourado, rosa, flores, folhagens, aquarela, script caligráfico, cantos muito arredondados, texturas de mármore, taças, laços, "rainha", "poderosa", "deusa".

**Para não parecer infoproduto**
- Não faça: mockups 3D de e-book, prints de faturamento, selos "garantia", carimbos "vagas limitadas", fundos pretos com neon.

**Regra final:** na dúvida, remova. O MEM fica mais forte com menos elementos e mais critério.
