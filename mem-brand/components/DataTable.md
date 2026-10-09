# DataTable

Tabela tipográfica para entregáveis (Mapa de Ativos, Mapa de Evidências, Matriz de Priorização, registro comercial).

- Cabeçalho em `label` `ink-muted` sobre `surface-sunken`; linhas separadas por fio `line`; sem zebra, sem bordas verticais.
- Números em `data`, alinhados à direita. Falas literais entre aspas. Força com `EvidenceStrength`.
- Em telas estreitas a tabela rola dentro de `mem-table-wrap`.

O consumidor fornece colunas e linhas.

Na Matriz de Priorização, a média nunca aparece sozinha como resultado: mostre-a junto com as tensões e o critério eliminatório.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px">
  <div class="mem-table-wrap">
    <table class="mem-table">
      <thead><tr><th>Hipótese</th><th>Fala literal</th><th>Força</th><th class="num">Conversas</th></tr></thead>
      <tbody>
        <tr><td>H01</td><td>“Já paguei um curso e não resolveu.”</td><td><span class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span></span>Forte</span></td><td class="num">5</td></tr>
        <tr><td>H02</td><td>“Já tentei três coisas, nada funcionou.”</td><td><span class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot mem-dot--on"></span><span class="mem-dot"></span></span>Médio</span></td><td class="num">3</td></tr>
        <tr><td>H03</td><td>“É, isso é chato mesmo.”</td><td><span class="mem-strength"><span class="mem-strength__dots"><span class="mem-dot mem-dot--on"></span><span class="mem-dot"></span><span class="mem-dot"></span></span>Fraco</span></td><td class="num">2</td></tr>
      </tbody>
    </table>
  </div>
</div>
```
