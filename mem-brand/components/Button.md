# Button

Botões do MEM: um primário por tela, verbos concretos, sem entusiasmo.

- **Primário** (`mem-btn--primary`): `brand` com texto `on-brand`; hover `brand-strong`. Uma ação principal por tela.
- **Secundário** (`mem-btn--secondary`): contorno `brand`; hover `brand-tint`.
- **Discreto** (`mem-btn--quiet`): texto sublinhado em `ink`, para ações de baixo peso.
- **Inverso** (`mem-btn--inverse`): `on-inverse` sobre `surface-inverse` (hero, navegação, capas).
- **Desativado**: `surface-sunken` com texto `ink-muted`; ao lado, diga por que está desativado ("Falta 1 conversa real para atravessar o gate").

O consumidor fornece o rótulo. Altura mínima 44px, canto `radius-1`, foco com `focus`.

Faça: "Começar o diagnóstico", "Registrar evidência", "Atravessar gate".
Não faça: "Quero transformar minha vida!", botões em pílula, ícone de foguete, degradê, botão maior que o título.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: flex; flex-direction: column; gap: 16px">
  <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center">
    <button type="button" class="mem-btn mem-btn--primary">Começar o diagnóstico</button>
    <button type="button" class="mem-btn mem-btn--secondary">Ver mapa de ativos</button>
    <button type="button" class="mem-btn mem-btn--quiet">Registrar depois</button>
    <button type="button" class="mem-btn mem-btn--primary" disabled>Atravessar gate</button>
  </div>
  <div style="background: var(--surface-inverse); padding: 16px; display: flex; gap: 16px; align-items: center">
    <button type="button" class="mem-btn mem-btn--inverse">Conhecer o método</button>
    <span class="mem-label" style="color: var(--on-inverse-muted)">Sobre surface-inverse</span>
  </div>
</div>
```
