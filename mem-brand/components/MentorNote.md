# MentorNote

A voz humana da mentora (devolutivas, leituras estratégicas) e a citação literal.

- **Devolutiva** (`mem-mentor`): fio de 2px `ink` no topo, rótulo do contexto em `label`, texto em `reading` (serif), assinatura em serif itálico `brand`.
- **Citação literal** (`mem-quote`): `quote` com fio de 2px `brand` à esquerda e a fonte em `label` abaixo. Sem fonte, não é citação.

O consumidor fornece contexto, texto e autoria.

A serif é reservada a quem pensa e fala como pessoa: a mentora e as falas reais. O método e o ExpertIA falam em sans.

## Marcação de referência

```html
<div class="mem-root" style="padding: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px">
  <section class="mem-mentor">
    <span class="mem-label mem-muted">Devolutiva · Call 1</span>
    <p class="mem-mentor__text">O que eu enxerguei que talvez você não estivesse enxergando: em quatro situações diferentes, você entrou num cenário desorganizado e saiu com um processo funcionando.</p>
    <span class="mem-mentor__sig">— Karen, mentora</span>
  </section>
  <figure class="mem-quote">
    <blockquote class="mem-quote__text" style="margin: 0">“Eu vivo apagando incêndio.”</blockquote>
    <figcaption class="mem-label mem-muted">Fala literal · conversa 03</figcaption>
  </figure>
</div>
```
