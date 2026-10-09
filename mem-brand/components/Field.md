# Field

Campo de formulário do Workspace: rótulo claro, ajuda que explica o critério, erro que diz o que falta.

- Rótulo em sans 600 `ink`; campo em `surface-raised` com borda `icon` (≥3:1) e canto `radius-1`; foco `focus`.
- Ajuda em `body-sm` `ink-muted`. Erro: borda e ajuda em `status-danger`, explicando o critério ("Sem fonte, a evidência não entra no mapa").
- Placeholder nomeia o tipo de conteúdo ("Fala literal"), nunca um exemplo que pareça resposta.

O consumidor fornece rótulo, ajuda, valor e estado.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px">
  <div class="mem-field">
    <label class="mem-field__label" for="f1">O que a pessoa disse, com as palavras dela</label>
    <textarea class="mem-input" id="f1" placeholder="Fala literal"></textarea>
    <span class="mem-field__help">Copie a frase como foi dita. A sua interpretação vai no campo seguinte.</span>
  </div>
  <div class="mem-field mem-field--error">
    <label class="mem-field__label" for="f2">Fonte</label>
    <input class="mem-input" id="f2" value="">
    <span class="mem-field__help">Sem fonte, a evidência não entra no mapa.</span>
  </div>
</div>
```
