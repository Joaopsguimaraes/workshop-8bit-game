import type { Desafio } from "../desafios/tipos";
import { buscarMarcador, conteudoDoRotulo, contarPalavras, fraseDoIndice, chaveDeBusca } from "./texto";

export type Reconhecimento = { trecho: string } | null;

export type Criterio = {
  id: string;
  nome: string;
  maximo: number;
  dica: string;
  verificar: (prompt: string, desafio: Desafio) => Reconhecimento;
};

// Um marcador natural só conta com pelo menos 4 palavras além dele na mesma frase.
const MINIMO_PALAVRAS = 4;

// Frase natural: o marcador precisa vir numa frase com pelo menos 4 palavras além dele.
function reconhecerFrase(prompt: string, padrao: RegExp): Reconhecimento {
  for (const { indice, marcador } of buscarMarcador(prompt, padrao)) {
    const { inicio, fim } = fraseDoIndice(prompt, indice);
    const frase = prompt.slice(inicio, fim);
    if (contarPalavras(chaveDeBusca(frase).replace(marcador, " ")) >= MINIMO_PALAVRAS) {
      return { trecho: frase.trim() };
    }
  }
  return null;
}

// Rótulo com pelo menos 4 palavras de conteúdo.
function reconhecerRotulo(prompt: string, rotulos: string[]): Reconhecimento {
  const rotulo = conteudoDoRotulo(prompt, rotulos);
  return rotulo && rotulo.palavras >= MINIMO_PALAVRAS ? { trecho: rotulo.trecho } : null;
}

const PAPEL_NATURAL = /(?<![a-z])(voce e|atue como|aja como|seu papel e|you are|act as)(?![a-z])/g;

export const PAPEL: Criterio = {
  id: "papel",
  nome: "Papel",
  maximo: 15,
  dica: "Diga quem o modelo deve ser. Ex.: \"Você é um consultor de RH experiente.\"",
  verificar(prompt) {
    return reconhecerRotulo(prompt, ["papel", "persona", "role"]) ?? reconhecerFrase(prompt, PAPEL_NATURAL);
  },
};

// Verbos de ação no imperativo, sem acento e em minúsculo, em pt-BR e inglês.
const VERBOS_DE_ACAO =
  /(?<![a-z])(liste|escreva|redija|resuma|extraia|gere|identifique|crie|analise|list|write|summarize|extract|generate|identify|create|analyze)(?![a-z])/g;

const MINIMO_GRUPOS = 2;

function mencionaTermo(textoNormalizado: string, termo: string): boolean {
  const escapado = chaveDeBusca(termo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escapado}(?![a-z0-9])`).test(textoNormalizado);
}

export const TAREFA: Criterio = {
  id: "tarefa",
  nome: "Tarefa",
  maximo: 20,
  dica:
    "Comece com um verbo de ação (liste, escreva, resuma) e fale do assunto do Desafio. Ex.: \"Liste as vantagens e desvantagens do trabalho remoto.\"",
  verificar(prompt, desafio) {
    const busca = chaveDeBusca(prompt);
    const verbo = buscarMarcador(prompt, VERBOS_DE_ACAO)[0];
    if (!verbo) return null;

    const gruposMencionados = desafio.palavrasChave.filter((grupo) =>
      grupo.some((termo) => mencionaTermo(busca, termo)),
    );
    if (gruposMencionados.length < MINIMO_GRUPOS) return null;

    const { inicio, fim } = fraseDoIndice(prompt, verbo.indice);
    return { trecho: prompt.slice(inicio, fim).trim() };
  },
};

const CONTEXTO_NATURAL =
  /(?<![a-z])(o publico e|a audiencia e|o objetivo e|the audience is|the goal is|the objective is|estamos|estou|we are|i am|para a diretoria|para o time|para a equipe|for the board|for the team)(?![a-z])/g;

export const CONTEXTO: Criterio = {
  id: "contexto",
  nome: "Contexto",
  maximo: 20,
  dica: "Diga para quem é e em que situação está. Ex.: \"Estamos decidindo o modelo de trabalho. O público é a diretoria.\"",
  verificar(prompt) {
    return reconhecerRotulo(prompt, ["contexto", "context"]) ?? reconhecerFrase(prompt, CONTEXTO_NATURAL);
  },
};

const FORMATO_NATURAL =
  /(?<![a-z])(formato|format|topicos|em lista|numerad[oa]|numbered|bullet|bulleted|tabela|table|json|markdown|titulos|\d+ (itens|items|palavras|words))(?![a-z])/g;

export const FORMATO: Criterio = {
  id: "formato",
  nome: "Formato",
  maximo: 20,
  dica: "Diga como a resposta deve ser organizada. Ex.: \"Responda em 3 itens, em tópicos curtos.\"",
  verificar(prompt) {
    return reconhecerRotulo(prompt, ["formato", "format"]) ?? reconhecerFrase(prompt, FORMATO_NATURAL);
  },
};

const RESTRICOES_NATURAL =
  /(?<![a-z])(nao (inclua|use|escreva|invente|adicione|mencione|faca|traga|cite|repita|fale)|evite|sem|apenas|somente|no maximo|nunca|don't|do not|avoid|only|never)(?![a-z])/g;

export const RESTRICOES: Criterio = {
  id: "restricoes",
  nome: "Restrições",
  maximo: 15,
  dica: "Diga o que não deve aparecer ou quais limites seguir. Ex.: \"Não inclua opiniões pessoais.\"",
  verificar(prompt) {
    return (
      reconhecerRotulo(prompt, ["restricoes", "restriction", "restrictions", "constraints"]) ??
      reconhecerFrase(prompt, RESTRICOES_NATURAL)
    );
  },
};

// Trecho entre aspas com pelo menos 4 palavras.
function reconhecerAspas(prompt: string): Reconhecimento {
  for (const [trecho, conteudo] of prompt.matchAll(/["“]([^"”]+)["”]/g)) {
    if (contarPalavras(conteudo) >= MINIMO_PALAVRAS) return { trecho };
  }
  return null;
}

const EXEMPLOS_NATURAL =
  /(?<![a-z])(por exemplo|exemplo:|ex\.:|for example|example:|such as)(?![a-z])/g;

export const EXEMPLOS: Criterio = {
  id: "exemplos",
  nome: "Exemplos",
  maximo: 10,
  dica: "Mostre um exemplo do que espera na resposta. Ex.: \"Exemplo: Vantagem: economia com aluguel.\"",
  verificar(prompt) {
    return (
      reconhecerRotulo(prompt, ["exemplo", "exemplos", "example", "examples"]) ??
      reconhecerFrase(prompt, EXEMPLOS_NATURAL) ??
      reconhecerAspas(prompt)
    );
  },
};
