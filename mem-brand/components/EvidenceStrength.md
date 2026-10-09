# EvidenceStrength

Mostra a força de uma evidência na escala do método: forte, médio, fraco, nulo.

- Três pontos (`mem-dot`, preenchido `mem-dot--on` em `status-done`) + a palavra + o critério em poucas palavras.
- Forte: comportamento com dinheiro ou tempo investido. Médio: busca ativa sem pagamento. Fraco: reconhece o problema sem agir. Nulo: opinião, elogio, "eu compraria".
- O consumidor fornece o nível e o critério curto.

Sempre ao lado de uma evidência registrada (tabela, Mapa de Evidências, card). Nunca como nota de qualidade da mentorada, nunca como "score".

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 32px">
  <div class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span></span>Forte · já pagou</div>
  <div class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span><span class="mem-dot"></span></span>Médio · buscou solução</div>
  <div class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot"></span><span class="mem-dot"></span></span>Fraco · só reconhece</div>
  <div class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot"></span><span class="mem-dot"></span><span class="mem-dot"></span></span>Nulo · opinião</div>
</div>
```
