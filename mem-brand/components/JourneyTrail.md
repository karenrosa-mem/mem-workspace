# JourneyTrail

A trilha da Jornada como mapa: onde a mentorada está, o que já percorreu, onde está o próximo gate.

- Um pilar por vez (**MAPA** ou **NORTE**), rótulo do pilar em `label` `brand`, gate em aberto em `label` `ink-muted`.
- Marcadores (vocabulário fechado): `mem-marker--done` disco oliva; `mem-marker--current` anel `brand`; `mem-marker--next` círculo `icon`; `mem-marker--gate` losango.
- Rotas: `mem-path` sólida (percorrida), `mem-path--current` saindo do gate atravessado, `mem-path--future` tracejada em `route`.
- Cada parada tem estado em palavra ("Concluído", "Você está aqui", "A seguir") e nome da etapa. Use `aria-current="step"` na etapa em curso.

O consumidor fornece a lista de etapas com estado e os gates entre elas.

Retrocesso: um arco tracejado para trás, com destino e razão escritos ("Volta para Hipóteses — nenhuma teve conversa real"). Nunca em vermelho.

Não use porcentagem, barra de progresso que enche, medalhas ou confete. Avanço = critério atendido.

## Marcação de referência

```html
<div class="mem-root" style="padding: 28px 24px">
  <nav class="mem-trail" aria-label="Trilha da jornada">
    <div class="mem-trail__pillar">
      <span class="mem-label" style="color: var(--brand)">Pilar 1 · MAPA</span>
      <span class="mem-label mem-muted">Gate 2 · Hipótese em aberto</span>
    </div>
    <ol class="mem-trail__row" style="list-style: none; margin: 0; padding: 0">
      <li class="mem-stop mem-stop--done">
        <div class="mem-stop__track"><span class="mem-marker mem-marker--done" aria-hidden="true"></span><span class="mem-path"></span></div>
        <span class="mem-stop__state">Concluído</span><span class="mem-stop__name">Diagnóstico</span>
      </li>
      <li class="mem-stop mem-stop--done">
        <div class="mem-stop__track"><span class="mem-marker mem-marker--done" aria-hidden="true"></span><span class="mem-path"></span><span class="mem-marker mem-marker--gate" aria-hidden="true"></span><span class="mem-path mem-path--current"></span></div>
        <span class="mem-stop__state">Concluído · Gate 1</span><span class="mem-stop__name">Ativos</span>
      </li>
      <li class="mem-stop mem-stop--current" aria-current="step">
        <div class="mem-stop__track"><span class="mem-marker mem-marker--current" aria-hidden="true"></span><span class="mem-path mem-path--future"></span><span class="mem-marker mem-marker--gate" aria-hidden="true"></span><span class="mem-path mem-path--future"></span></div>
        <span class="mem-stop__state">Você está aqui</span><span class="mem-stop__name">Hipóteses</span>
      </li>
      <li class="mem-stop">
        <div class="mem-stop__track"><span class="mem-marker mem-marker--next" aria-hidden="true"></span><span class="mem-path mem-path--future"></span></div>
        <span class="mem-stop__state">A seguir</span><span class="mem-stop__name">Pesquisa</span>
      </li>
      <li class="mem-stop">
        <div class="mem-stop__track"><span class="mem-marker mem-marker--next" aria-hidden="true"></span></div>
        <span class="mem-stop__state">A seguir</span><span class="mem-stop__name">Priorização</span>
      </li>
    </ol>
  </nav>
</div>
```
