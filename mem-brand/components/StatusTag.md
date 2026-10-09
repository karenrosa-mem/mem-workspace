# StatusTag

Rótulo do estatuto epistemológico de uma informação — a linguagem visual do caderno de investigação.

| Variante | Classe | Quando |
| --- | --- | --- |
| Relato / Percepção | `mem-tag--relato` | O que a mentorada contou, sem verificação externa |
| Hipótese | `mem-tag--hipotese` | Afirmação testável ainda não testada (contorno tracejado) |
| Evidência | `mem-tag--evidencia` | Dado externo com fonte; acompanhe com `EvidenceStrength` |
| Pendência | `mem-tag--pendencia` | Falta evidência, decisão ou informação |
| Decisão | `mem-tag--decisao` | Escolha registrada com razão |
| Validado | `mem-tag--validado` | Somente depois do Gate 7 (Call 9). Nunca antes |

O consumidor fornece o texto (sempre a palavra do estatuto; complementos depois de " · "). Texto em `label`, canto `radius-1`.

Não use a tag como enfeite ou categoria de conteúdo. Não invente estatutos novos. Nunca escreva "Validado" fora do Gate 7.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
  <span class="mem-tag mem-tag--relato">Relato</span>
  <span class="mem-tag mem-tag--hipotese">Hipótese</span>
  <span class="mem-tag mem-tag--evidencia">Evidência · forte</span>
  <span class="mem-tag mem-tag--pendencia">Pendência</span>
  <span class="mem-tag mem-tag--decisao">Decisão</span>
  <span class="mem-tag mem-tag--validado">Validado · Gate 7</span>
</div>
```
