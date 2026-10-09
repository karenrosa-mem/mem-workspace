// Tailwind v3: em tailwind.config.js, use presets: [require("./mem-brand/tokens/tailwind.preset.js")]
module.exports = {
  theme: {
    extend: {
      colors: {
        "surface": "var(--surface)",
        "surface-sunken": "var(--surface-sunken)",
        "surface-raised": "var(--surface-raised)",
        "surface-inverse": "var(--surface-inverse)",
        "ink": "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "icon": "var(--icon)",
        "line": "var(--line)",
        "route": "var(--route)",
        "brand": "var(--brand)",
        "brand-strong": "var(--brand-strong)",
        "brand-tint": "var(--brand-tint)",
        "on-brand": "var(--on-brand)",
        "on-inverse": "var(--on-inverse)",
        "on-inverse-muted": "var(--on-inverse-muted)",
        "focus": "var(--focus)",
        "status-done": "var(--status-done)",
        "status-done-tint": "var(--status-done-tint)",
        "status-warn": "var(--status-warn)",
        "status-warn-tint": "var(--status-warn-tint)",
        "status-danger": "var(--status-danger)",
        "status-danger-tint": "var(--status-danger-tint)",
      },
      fontFamily: {
        serif: "var(--font-serif)",
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        "0": "var(--radius-0)",
        "1": "var(--radius-1)",
        "2": "var(--radius-2)",
        "pill": "var(--radius-pill)",
      },
      boxShadow: { overlay: "var(--shadow-overlay)" },
      maxWidth: { content: "var(--max-width)", measure: "var(--measure)" },
    },
  },
};
