# DeliverableCard

Um entregável do método (E01–E11) no Workspace: número, título, completude em frase e estatuto.

- Fundo `surface-raised`, fio `line`, canto `radius-2`, sem sombra.
- Topo: número e nome curto em `label` `ink-muted` + uma `StatusTag`.
- Título em `h3`. Completude como frase verificável ("2 de 3 a 5 formuladas"), nunca porcentagem.
- Rodapé: data em `data` e uma ação discreta.

O consumidor fornece número, título, frase de completude, estatuto, data e destino.

Não faça: ícone grande decorativo, barra de progresso, sombra, cor de fundo diferente por card.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">
  <article class="mem-card">
    <div class="mem-card__head"><span class="mem-label mem-muted">E03 · Hipóteses</span><span class="mem-tag mem-tag--pendencia">Pendência</span></div>
    <h3 class="mem-card__title">Hipóteses de oportunidade</h3>
    <p class="mem-card__meta" style="margin: 0">2 de 3 a 5 formuladas. A hipótese 03 ainda não tem ativo de origem.</p>
    <div class="mem-card__foot"><span class="mem-data mem-muted">Atualizado na semana 3</span><a class="mem-btn mem-btn--quiet" href="#">Abrir</a></div>
  </article>
  <article class="mem-card">
    <div class="mem-card__head"><span class="mem-label mem-muted">E02 · Ativos</span><span class="mem-tag mem-tag--decisao">Decisão</span></div>
    <h3 class="mem-card__title">Shortlist de ativos</h3>
    <p class="mem-card__meta" style="margin: 0">3 ativos com ficha completa. Gate 1 atravessado com a mentora.</p>
    <div class="mem-card__foot"><span class="mem-data mem-muted">Fechado na semana 2</span><a class="mem-btn mem-btn--quiet" href="#">Abrir</a></div>
  </article>
</div>
```
