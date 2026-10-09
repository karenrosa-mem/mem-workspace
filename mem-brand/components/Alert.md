# Alert

Faixa de estado: o que aconteceu e o que fazer agora.

- `mem-alert--warn` (ocre `status-warn`): atenção, pendência, amostra insuficiente.
- `mem-alert--danger` (tijolo `status-danger`): erro ou bloqueio.
- `mem-alert--done` (oliva `status-done`): critério atendido.
- Sempre ícone de traço + título curto + uma frase com o próximo passo. A cor nunca comunica sozinha.

O consumidor fornece variante, título e texto.

Nunca: toast piscando, exclamações, "Parabéns!!", vermelho puro, bordô como cor de erro.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: flex; flex-direction: column; gap: 12px">
  <div class="mem-alert mem-alert--warn" role="status">
    <svg class="mem-alert__icon" viewBox="0 0 20 20" fill="none" stroke="var(--status-warn)" stroke-width="1.8" aria-hidden="true"><path d="M10 2.5 18 17H2z"></path><path d="M10 8v4.5M10 14.6v.1"></path></svg>
    <div><p class="mem-alert__title">Amostra insuficiente</p><p class="mem-alert__body">A hipótese 03 tem 2 conversas. O mínimo de trabalho é 3 antes da priorização.</p></div>
  </div>
  <div class="mem-alert mem-alert--danger" role="alert">
    <svg class="mem-alert__icon" viewBox="0 0 20 20" fill="none" stroke="var(--status-danger)" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="8"></circle><path d="M7 7l6 6M13 7l-6 6"></path></svg>
    <div><p class="mem-alert__title">Não foi possível salvar</p><p class="mem-alert__body">Sua conexão caiu. O texto continua aqui; tente salvar de novo.</p></div>
  </div>
  <div class="mem-alert mem-alert--done" role="status">
    <svg class="mem-alert__icon" viewBox="0 0 20 20" fill="none" stroke="var(--status-done)" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="8"></circle><path d="M6.5 10.2 9 12.7l4.6-5"></path></svg>
    <div><p class="mem-alert__title">Critério atendido</p><p class="mem-alert__body">Você tem 3 ativos com evidência. Próxima decisão: quais levar adiante.</p></div>
  </div>
</div>
```
