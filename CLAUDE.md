# Workspace · MEM — instruções para quem constrói o front-end

## Marca

O kit oficial está em `mem-brand/` e não é alterado.

Antes de mexer em qualquer tela:

1. Ler `mem-brand/CLAUDE.md`, `mem-brand/README.md` e `mem-brand/BRAND.md` inteiros.
2. Ler o guia em `mem-brand/components/` do componente que vai usar.

Só cores, fontes, espaçamentos, cantos e logos do kit. Nenhum hexadecimal novo, nenhuma outra fonte, logo nunca redesenhado. Ícone do site: `public/favicon.svg` (cópia de `mem-brand/logo/mem-favicon.svg`). Estilos de base: `src/styles/base.css`.

## O kit decide como aparece; as especificações do método decidem o que aparece

Adaptações aprovadas pela Karen em 09/10/2026, onde o kit e o método divergem. O kit não é editado: a adaptação está no uso.

1. **Força da evidência (`EvidenceStrength`):** só em telas da mentora. Nunca na tela da mentorada (decisão do M4: ela vê os fatos, nunca força, nota ou ranking).
2. **Etiqueta "Validado" (`mem-tag--validado`):** só no M10, depois da verificação da Karen, e sempre com a frase completa "validada para continuar sob as condições testadas". Nunca no Gate 7, que classifica a evidência (favorável · parcial ou mista · inconclusiva · desfavorável).
3. **Gates:** o losango continua no mapa da jornada (`JourneyTrail`), mas sem "Gate N" nem "Atravessar gate" para a mentorada. Texto na linguagem dela (por exemplo, "decisão com a Karen"). Nomes internos ficam só nas telas da mentora.
4. **Entregáveis E01–E11 e etapas antigas ("Diagnóstico", "Pesquisa"):** não usar. O `DeliverableCard` é usado com os nomes dos movimentos (M1–M10) e dos registros do modelo por movimento.

O Workspace V1 funciona sem o ExpertIA. Decisão da Karen em 11/10/2026: as mentoradas têm acesso a ele, e entram dicas discretas (`src/componentes/DicaExpertIA.tsx`, texto simples) só onde ele poupa trabalho de verdade: lembrar situações (M1), outros públicos (M3), pesquisa de mercado (M4) e, mais à frente, a oferta. O componente `ExpertIANote` do kit continua fora da V1.

## Fontes de verdade do produto

Índice canônico, especificações M1–M10, núcleo comum e modelo por movimento: ver o índice canônico do Projeto MEM — Workspace & Produto.
