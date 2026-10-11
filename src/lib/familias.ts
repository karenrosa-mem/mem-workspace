// Famílias de ativo: lentes para a mentora lembrar o que procurar ao nomear um
// padrão. Nunca são o nome final: o nome é o que ELA faz + o efeito, com as
// palavras da história dela. Rascunho de 11/10/2026, a revisar com as
// primeiras mentoradas reais.

export type Familia = {
  nome: string;
  verbos: string;
  exemplo: string; // um nome de padrão bem formado
  ondeAparece: string; // trajetórias em que costuma aparecer
};

export const FAMILIAS_ATIVO: Familia[] = [
  {
    nome: "Organizar o caos",
    verbos: "estruturar, padronizar, mapear, pôr ordem",
    exemplo: "Organizar processos que ninguém entende",
    ondeAparece: "operações, administrativo, secretariado executivo, qualidade",
  },
  {
    nome: "Destravar conflitos",
    verbos: "mediar, negociar, reaproximar",
    exemplo: "Mediar conflitos que ameaçam perder gente",
    ondeAparece: "RH, gestão de equipes, atendimento, escola",
  },
  {
    nome: "Traduzir o complexo",
    verbos: "explicar, simplificar, fazer a ponte entre áreas",
    exemplo: "Explicar números para quem não é da área",
    ondeAparece: "finanças, TI, dados, jurídico, saúde",
  },
  {
    nome: "Preparar pessoas",
    verbos: "formar, orientar, integrar quem chega",
    exemplo: "Preparar gestores de primeira viagem",
    ondeAparece: "RH, liderança, educação, enfermagem",
  },
  {
    nome: "Escolher e avaliar",
    verbos: "selecionar, entrevistar, comparar opções",
    exemplo: "Contratar para vagas que ninguém consegue preencher",
    ondeAparece: "recrutamento, compras, gestão",
  },
  {
    nome: "Recuperar o que deu errado",
    verbos: "consertar, reverter, salvar",
    exemplo: "Recuperar clientes à beira de cancelar",
    ondeAparece: "sucesso do cliente, vendas, projetos",
  },
  {
    nome: "Começar do zero",
    verbos: "implantar, lançar, abrir",
    exemplo: "Implantar uma área onde não existia nada",
    ondeAparece: "projetos, marketing, expansão, empreendedoras",
  },
  {
    nome: "Coordenar até a entrega",
    verbos: "alinhar áreas, cobrar, fazer acontecer no prazo",
    exemplo: "Entregar projetos com muitas áreas sem estourar o prazo",
    ondeAparece: "gestão de projetos, eventos, TI, engenharia",
  },
  {
    nome: "Convencer",
    verbos: "persuadir, vender, conseguir aprovação",
    exemplo: "Aprovar projetos com uma diretoria cética",
    ondeAparece: "vendas, comercial, liderança, captação",
  },
  {
    nome: "Fazer ser visto",
    verbos: "comunicar, posicionar, contar a história",
    exemplo: "Fazer uma marca pequena parecer referência",
    ondeAparece: "marketing, comunicação, comercial",
  },
  {
    nome: "Diagnosticar",
    verbos: "achar a causa, priorizar, decidir com dados",
    exemplo: "Achar a causa real de um problema crônico",
    ondeAparece: "dados, qualidade, consultoria, saúde",
  },
  {
    nome: "Cuidar do dinheiro",
    verbos: "planejar, controlar, prever, cortar desperdício",
    exemplo: "Cortar custo sem cortar gente",
    ondeAparece: "finanças, controladoria, compras, pequenos negócios",
  },
  {
    nome: "Navegar regras e exigências",
    verbos: "adequar, cumprir norma, passar em auditoria",
    exemplo: "Passar em auditorias sem parar a operação",
    ondeAparece: "jurídico, compliance, contabilidade, saúde, qualidade",
  },
  {
    nome: "Conduzir momentos difíceis",
    verbos: "acolher, conduzir transições, dar más notícias",
    exemplo: "Conduzir desligamentos sem deixar feridas",
    ondeAparece: "RH, saúde, atendimento, liderança",
  },
  {
    nome: "Transformar experiência em ferramenta",
    verbos: "criar modelo, checklist, método, treinamento",
    exemplo: "Transformar o jeito de fazer em um manual que o time segue",
    ondeAparece: "quem sempre acaba criando planilhas, modelos e treinamentos",
  },
];

export const TESTE_CLASSIFICACAO: { pergunta: string; seNao: string }[] = [
  { pergunta: "Já fez isso na prática, mais de uma vez?", seNao: "Conhecimento ou Experiência" },
  { pergunta: "Houve resultado, para ela ou para alguém?", seNao: "Habilidade" },
  { pergunta: "Há evidência desse resultado, mesmo informal?", seNao: "Ativo hipotético (buscar evidência depois)" },
  { pergunta: "Há alguém do outro lado com um problema que isso resolve?", seNao: "Não avança para hipóteses no M3" },
];
