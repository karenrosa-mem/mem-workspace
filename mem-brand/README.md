# mem-brand — pacote de marca do MEM para o front-end

Tudo o que a interface do MEM precisa da identidade, num só lugar. A fonte de verdade é o Design System do MEM; este pacote é uma cópia pronta para código.

## O que tem aqui

| Pasta / arquivo | Para que serve |
| --- | --- |
| `BRAND.md` | Regras da marca: princípio visual, paleta, tipografia, componentes, o que fazer e não fazer |
| `tokens/tokens.css` | Variáveis CSS (cores dos temas Papel e Noite, fontes, espaçamentos, cantos) + classes de texto `.mem-*` |
| `tokens/tokens.json` | Os mesmos tokens em JSON, para scripts ou outras ferramentas |
| `tokens/tailwind-v4.css` | Liga os tokens ao Tailwind v4 (`bg-surface`, `text-ink`, `font-serif`...) |
| `tokens/tailwind.preset.js` | O mesmo para Tailwind v3 |
| `styles/fonts.css` | Importa Newsreader, Schibsted Grotesk e IBM Plex Mono |
| `styles/components.css` | Estilos prontos dos componentes (`.mem-btn`, `.mem-tag`, `.mem-card`...) |
| `components/*.md` | Um guia por componente: quando usar, regras e marcação HTML de referência |
| `logo/` | As 6 versões do logo, versões `-fundo-escuro` (bege, para o tema Noite e planos bordô) e versões `currentcolor` (herdam a cor do texto) |
| `CLAUDE.md` | Instruções para o agente que vai construir o front-end |

## Ordem de importação

```css
@import "./mem-brand/styles/fonts.css";
@import "./mem-brand/tokens/tokens.css";
@import "./mem-brand/tokens/tailwind-v4.css";   /* só se usar Tailwind v4 */
@import "./mem-brand/styles/components.css";     /* opcional se os componentes forem reescritos */
```

## Tema

O tema Papel (claro) é o padrão. Para o tema Noite, coloque `data-theme="noite"` no `<html>`. No tema Noite e sobre `--surface-inverse`, use os logos `-fundo-escuro` ou os `currentcolor` com `color: var(--on-inverse)`: o logo colorido some sobre fundo escuro.

## Regras rápidas

- Nunca use um hexadecimal solto no código: sempre `var(--token)` ou a classe do Tailwind ligada ao token.
- Serif (`--font-serif`) = voz da mentora e títulos editoriais. Sans = interface. Mono = rótulos, numeração, dados e a assinatura do ExpertIA.
- Todo estado (concluído, atenção, erro) leva palavra e ícone, nunca só cor.
- "Validado" só aparece depois do Gate 7.
- Cantos: no máximo 4px. Sem sombra em cards.
