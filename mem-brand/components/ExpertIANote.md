# ExpertIANote

A voz do ExpertIA: uma nota de margem do caderno, não um chatbot.

- Fundo `surface-sunken`, canto `radius-2`.
- Assinatura: anel (`mem-ai__ring`) + "ExpertIA · MEM" em `label` `brand`.
- Texto em `body` `ink`: primeira frase = o ponto; termina com uma pergunta ou próximo passo.
- Linha de base (`mem-ai__basis`) diz de onde vem a leitura (memória, conversas, entregável).

O consumidor fornece o texto e a base.

Nunca: avatar de robô, ícone de faísca/estrela, degradê, brilho, "Olá! 😊", assinar como pessoa, falar em serif (serif é a voz da mentora).

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px">
  <aside class="mem-ai" aria-label="Nota do ExpertIA">
    <div class="mem-ai__sig"><span class="mem-ai__ring" aria-hidden="true"></span><span class="mem-label">ExpertIA · MEM</span></div>
    <p class="mem-ai__text">Três pessoas concordaram que o problema existe. Nenhuma delas tentou resolver. No MEM, isso é sinal fraco. Quem, na sua lista, já procurou uma solução?</p>
    <span class="mem-ai__basis">Base: 3 conversas de campo · hipótese 02</span>
  </aside>
</div>
```
