import type { Desafio } from "./tipos";

// Seed versionado dos Desafios. Edite os textos aqui antes do workshop (história 66).
// Os Desafios 2 a 5 entram no ticket 03.
export const DESAFIOS_SEED: Desafio[] = [
  {
    id: "trabalho-remoto",
    ordem: 1,
    titulo: "Vantagens e desvantagens do trabalho remoto",
    cenario: [
      "Sua empresa está decidindo se mantém o trabalho remoto ou volta a trabalhar",
      "todo dia no escritório. Um colega de RH precisa de um resumo para apresentar",
      "à diretoria.",
      "",
      "Escreva um prompt que peça à LLM as vantagens e as desvantagens do trabalho remoto.",
    ].join("\n"),
    palavrasChave: [
      ["trabalho remoto", "home office", "remote work"],
      ["vantagens", "prós", "pros", "advantages"],
      ["desvantagens", "contras", "cons", "disadvantages"],
    ],
    promptReferencia: [
      "Papel: Você é um consultor de gestão de pessoas com experiência em modelos de trabalho.",
      "Contexto: Estamos decidindo se mantemos o trabalho remoto. O público é a diretoria, que quer uma visão equilibrada.",
      "Tarefa: Liste as vantagens e as desvantagens do trabalho remoto para a empresa e para as pessoas.",
      "Formato: Duas listas com títulos, uma para vantagens e outra para desvantagens, com no máximo 5 itens cada.",
      "Restrições: Não use jargão técnico e evite opiniões pessoais; apenas fatos e exemplos práticos.",
      "Exemplo: Vantagem: economia com escritório, por exemplo, com aluguel e deslocamento.",
    ].join("\n"),
  },
];
