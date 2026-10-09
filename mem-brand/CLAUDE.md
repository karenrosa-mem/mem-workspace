# Marca MEM no front-end — instruções para o agente

A identidade visual e verbal do MEM está fechada e mora em `mem-brand/`. Não redefina cores, fontes, cantos, sombras ou o logo.

## Antes de construir qualquer tela

1. Leia `mem-brand/BRAND.md` inteiro.
2. Leia o guia em `mem-brand/components/` do componente que vai usar.

## Regras obrigatórias

- Cores, fontes, espaçamentos e cantos vêm só dos tokens (`var(--…)` ou classes do Tailwind ligadas a eles). Nenhum hexadecimal novo.
- Use os componentes existentes: Button, StatusTag, EvidenceStrength, JourneyTrail, DeliverableCard, ExpertIANote, MentorNote, Alert, Field, DataTable. Precisou de um componente que não existe? Construa com os tokens, siga o vocabulário do `BRAND.md` e avise.
- Vozes: o método fala em sans; a mentora fala em serif e assina; o ExpertIA fala em sans, com rótulo mono "EXPERTIA · MEM", sem avatar de robô, sem faísca, sem degradê.
- Jornada = mapa (marcadores: disco = concluído, anel bordô = em curso, círculo vazio = próxima, losango = gate). Workspace = caderno (entregáveis, tabelas, campos).
- Progresso é "critério atendido", nunca porcentagem, barra que enche, medalha ou confete.
- Todo estado leva palavra e ícone. "Validado" só depois do Gate 7.
- Cantos de no máximo 4px (`radius-2`). Sem sombra em cards; separação por fio (`--line`).
- Contraste mínimo de 4,5:1 para texto; foco visível com `--focus`.
- Logo: use os arquivos de `mem-brand/logo/`. Em fundo escuro (tema Noite, navegação lateral, capas bordô) use as versões `-fundo-escuro` ou `currentcolor`. Abaixo de 48px, use `mem-monograma-reduzido`. Nunca redesenhe, recolora fora da paleta ou aplique efeitos.
- Textos de interface: diretos, sem coachês, sem exclamações, sem emoji. Botões com verbos concretos ("Registrar evidência", "Atravessar gate").
