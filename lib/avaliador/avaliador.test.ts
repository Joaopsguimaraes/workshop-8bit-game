import { describe, expect, it } from "vitest";
import { avaliar, veredictoDaNota } from "./avaliador";
import type { Desafio } from "../desafios/tipos";

const desafio: Desafio = {
  id: "teste",
  ordem: 1,
  titulo: "Trabalho remoto",
  cenario: "Cenário de teste.",
  palavrasChave: [
    ["trabalho remoto", "home office", "remote work"],
    ["vantagens", "prós", "pros", "advantages"],
    ["desvantagens", "contras", "cons", "disadvantages"],
  ],
  promptReferencia: "Referência de teste.",
};

function criterio(prompt: string, id: string) {
  const resultado = avaliar(prompt, desafio);
  const encontrado = resultado.criterios.find((c) => c.id === id);
  if (!encontrado) throw new Error(`critério ${id} ausente`);
  return encontrado;
}

describe("Critério Papel", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    const papel = criterio(
      "Papel: você é um consultor de RH experiente em trabalho remoto.",
      "papel",
    );

    expect(papel).toMatchObject({ atendido: true, pontos: 15, maximo: 15 });
    expect(papel.trecho).toContain("consultor de RH");
  });

  it("é atendido por frase natural em português", () => {
    expect(
      criterio("Atue como um consultor de RH experiente em trabalho remoto.", "papel"),
    ).toMatchObject({ atendido: true, pontos: 15 });
  });

  it("é atendido por frase natural em inglês", () => {
    expect(
      criterio("You are an experienced HR consultant who knows remote work.", "papel"),
    ).toMatchObject({ atendido: true, pontos: 15 });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    const papel = criterio("Papel: x. Contexto: sou de uma empresa grande.", "papel");

    expect(papel).toMatchObject({ atendido: false, pontos: 0, maximo: 15 });
    expect(papel.dica).toEqual(expect.any(String));
    expect(papel.trecho).toBeUndefined();
  });
});

describe("rótulos de Papel", () => {
  it("não toma uma frase comum que começa com a palavra como rótulo", () => {
    expect(criterio("Papel do RH é cuidar das pessoas e da cultura da empresa.", "papel")).toMatchObject({
      atendido: false,
    });
  });

  it("aceita rótulo em markdown, como ## Papel", () => {
    expect(
      criterio("## Papel\nVocê é um consultor de RH experiente em trabalho remoto.", "papel"),
    ).toMatchObject({ atendido: true });
  });
});

describe("Critério Contexto", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    const contexto = criterio(
      "Contexto: estamos decidindo se mantemos o trabalho remoto em toda a empresa.",
      "contexto",
    );

    expect(contexto).toMatchObject({ atendido: true, pontos: 20, maximo: 20 });
  });

  it("é atendido por público, situação e objetivo em português", () => {
    expect(criterio("O público é a diretoria, que quer uma visão equilibrada.", "contexto")).toMatchObject({ atendido: true });
    expect(criterio("Estamos decidindo se mantemos o modelo híbrido da equipe.", "contexto")).toMatchObject({ atendido: true });
    expect(criterio("O objetivo é apoiar a decisão sobre o escritório.", "contexto")).toMatchObject({ atendido: true });
  });

  it("é atendido por frase natural em inglês", () => {
    expect(criterio("The audience is the board, which wants a balanced view.", "contexto")).toMatchObject({ atendido: true });
    expect(criterio("We are deciding whether to keep remote work this year.", "contexto")).toMatchObject({ atendido: true });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    expect(criterio("Contexto: x. Papel: x.", "contexto")).toMatchObject({ atendido: false, pontos: 0 });
  });
});

describe("Critério Formato", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    expect(criterio("Formato: duas listas com títulos, uma para cada lado.", "formato")).toMatchObject({ atendido: true, pontos: 20, maximo: 20 });
  });

  it("é atendido por frase natural em português e em inglês", () => {
    expect(criterio("Responda em tópicos curtos sobre o assunto do Desafio.", "formato")).toMatchObject({ atendido: true });
    expect(criterio("Devolva a resposta em JSON com os campos pedidos.", "formato")).toMatchObject({ atendido: true });
    expect(criterio("Answer in a table with three columns for each item.", "formato")).toMatchObject({ atendido: true });
  });

  it("é atendido por quantidade de itens ou tamanho em palavras", () => {
    expect(criterio("Liste 3 itens de cada lado sobre o tema escolhido.", "formato")).toMatchObject({ atendido: true });
    expect(criterio("Escreva o resumo com no máximo 80 palavras no total.", "formato")).toMatchObject({ atendido: true });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    expect(criterio("Formato: x. Contexto: x.", "formato")).toMatchObject({ atendido: false, pontos: 0 });
  });
});

describe("Critério Restrições", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    expect(criterio("Restrições: não use jargão técnico nem opiniões pessoais.", "restricoes")).toMatchObject({ atendido: true, pontos: 15, maximo: 15 });
  });

  it("é atendido por negativas e limites em português e em inglês", () => {
    expect(criterio("Não inclua opiniões pessoais na resposta final.", "restricoes")).toMatchObject({ atendido: true });
    expect(criterio("Evite jargão técnico e use frases curtas e claras.", "restricoes")).toMatchObject({ atendido: true });
    expect(criterio("Use apenas fatos verificáveis sobre o assunto.", "restricoes")).toMatchObject({ atendido: true });
    expect(criterio("Don't include personal opinions in the answer.", "restricoes")).toMatchObject({ atendido: true });
    expect(criterio("Avoid technical jargon and keep the sentences short.", "restricoes")).toMatchObject({ atendido: true });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    expect(criterio("Restrições: x. Exemplo: x.", "restricoes")).toMatchObject({ atendido: false, pontos: 0 });
  });
});

describe("Critério Exemplos", () => {
  it("é atendido por rótulo com conteúdo de verdade", () => {
    expect(criterio("Exemplo: vantagem é a economia com aluguel e deslocamento.", "exemplos")).toMatchObject({ atendido: true, pontos: 10, maximo: 10 });
  });

  it("é atendido por frase natural em português e em inglês", () => {
    expect(criterio("Dê um caso real, por exemplo, uma empresa que economizou aluguel.", "exemplos")).toMatchObject({ atendido: true });
    expect(criterio("Ex.: vantagem é a economia com aluguel e deslocamento.", "exemplos")).toMatchObject({ atendido: true });
    expect(criterio("Give a real case, for example a company that saved on rent.", "exemplos")).toMatchObject({ atendido: true });
  });

  it("é atendido por trecho entre aspas com pelo menos 4 palavras", () => {
    expect(criterio("Responda no tom do cliente, como \"Olá, tudo bem com você?\"", "exemplos")).toMatchObject({ atendido: true });
    expect(criterio("Responda assim: “Prezada equipe, segue a pauta da reunião.”", "exemplos")).toMatchObject({ atendido: true });
  });

  it("não pontua quando o rótulo vem sem conteúdo", () => {
    expect(criterio("Exemplo: x. Papel: x.", "exemplos")).toMatchObject({ atendido: false, pontos: 0 });
  });
});

describe("Critério Tarefa", () => {
  it("é atendida com verbo de ação e pelo menos 2 grupos de Palavras-chave", () => {
    const tarefa = criterio(
      "Liste as vantagens e desvantagens do trabalho remoto.",
      "tarefa",
    );

    expect(tarefa).toMatchObject({ atendido: true, pontos: 20, maximo: 20 });
    expect(tarefa.trecho).toContain("Liste");
  });

  it("aceita verbo em inglês", () => {
    expect(
      criterio("Write the pros and cons of remote work.", "tarefa"),
    ).toMatchObject({ atendido: true });
  });

  it("não é atendida só com um grupo de Palavras-chave", () => {
    expect(criterio("Liste as vantagens de um modelo qualquer.", "tarefa")).toMatchObject({
      atendido: false,
      pontos: 0,
    });
  });

  it("não é atendida sem verbo de ação", () => {
    expect(criterio("Vantagens e desvantagens do trabalho remoto.", "tarefa")).toMatchObject({
      atendido: false,
    });
  });

  it("não conta a palavra 'contrato' como 'contra' do grupo de desvantagens", () => {
    expect(
      criterio("Liste o contrato de trabalho remoto e as vantagens dele.", "tarefa"),
    ).toMatchObject({ atendido: true });
    expect(
      criterio("Liste o contrato de trabalho remoto e os pontos dele.", "tarefa"),
    ).toMatchObject({ atendido: false });
  });
});

describe("formas de rótulo", () => {
  const conteudo = "Este trecho tem conteúdo suficiente para contar.";
  const formas = (rotulo: string) => [
    `${rotulo}: ${conteudo}`,
    `## ${rotulo}\n${conteudo}`,
    `**${rotulo}**\n${conteudo}`,
    `<${rotulo.toLowerCase()}>${conteudo}</${rotulo.toLowerCase()}>`,
  ];
  const rotulos: [string, string][] = [
    ["papel", "Papel"],
    ["papel", "Role"],
    ["contexto", "Contexto"],
    ["contexto", "Context"],
    ["formato", "Formato"],
    ["formato", "Format"],
    ["restricoes", "Restrições"],
    ["restricoes", "Constraints"],
    ["exemplos", "Exemplo"],
    ["exemplos", "Examples"],
  ];

  it("um rótulo cujo conteúdo tem dois pontos continua valendo", () => {
    expect(criterio("Papel: Consultor: experiente em gestão de pessoas da empresa.", "papel")).toMatchObject({ atendido: true });
    expect(criterio("Contexto: Empresa: grande e multinacional com equipes espalhadas.", "contexto")).toMatchObject({ atendido: true });
  });

  it.each(
    rotulos.flatMap(([id, rotulo]) => formas(rotulo).map((prompt, forma) => [id, rotulo, forma, prompt] as const)),
  )("reconhece o Critério %s pelo rótulo '%s' na forma %i", (id, _rotulo, _forma, prompt) => {
    expect(criterio(prompt, id)).toMatchObject({ atendido: true });
  });
});

describe("estrutura da Avaliação", () => {
  it("tem os seis Critérios com os pesos 15, 20, 20, 20, 15 e 10, somando 100", () => {
    const criterios = avaliar("oi", desafio).criterios;

    expect(criterios.map((c) => [c.id, c.maximo])).toEqual([
      ["papel", 15],
      ["contexto", 20],
      ["tarefa", 20],
      ["formato", 20],
      ["restricoes", 15],
      ["exemplos", 10],
    ]);
    expect(criterios.reduce((soma, c) => soma + c.maximo, 0)).toBe(100);
  });

  it("reconhece rótulos e marcadores sem diferenciar maiúscula nem acento", () => {
    expect(criterio("PAPEL: você é um consultor de RH experiente.", "papel")).toMatchObject({ atendido: true });
    expect(criterio("restricoes: nao use jargao tecnico nem opinioes pessoais.", "restricoes")).toMatchObject({ atendido: true });
  });

  it("dá uma dica com mini-exemplo em pt-BR para cada Critério", () => {
    const dicas = avaliar("oi", desafio).criterios.map((c) => c.dica ?? "");

    expect(dicas).toHaveLength(6);
    dicas.forEach((dica) => expect(dica).toMatch(/Ex(emplo)?[.:]/));
  });

  it("um mesmo trecho pode pontuar em Formato e em Restrições", () => {
    const formato = criterio("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "formato");
    const restricoes = criterio("Liste as vantagens do trabalho remoto com no máximo 6 palavras por item.", "restricoes");

    expect(formato).toMatchObject({ atendido: true });
    expect(restricoes).toMatchObject({ atendido: true });
    expect(formato.trecho).toBe(restricoes.trecho);
  });

  it("um prompt de uma linha, sem estrutura, tira nota baixa", () => {
    expect(avaliar("Liste as vantagens do trabalho remoto.", desafio).nota).toBeLessThan(50);
  });

  it("rótulos com 1 palavra de conteúdo, em todos os Critérios, somam menos de 20", () => {
    const rotulosVazios = "Papel: x. Contexto: x. Formato: x. Restrições: x. Exemplo: x.";

    expect(avaliar(rotulosVazios, desafio).nota).toBeLessThan(20);
  });
});

describe("nota e veredito", () => {
  const otimo = "Papel: você é um consultor de RH experiente. Liste as vantagens e desvantagens do trabalho remoto.";

  it("soma os pontos dos Critérios atendidos", () => {
    expect(avaliar(otimo, desafio)).toMatchObject({ nota: 35 });
  });

  it("zera a Nota quando nenhum Critério é atendido, com dica em cada um", () => {
    const avaliacao = avaliar("oi", desafio);

    expect(avaliacao.nota).toBe(0);
    expect(avaliacao.criterios.every((c) => !c.atendido && c.dica)).toBe(true);
  });

  it("mostra trecho só nos Critérios atendidos e dica só nos que falharam", () => {
    const tarefa = avaliar(otimo, desafio).criterios.find((c) => c.id === "tarefa");

    expect(tarefa?.trecho).toBeDefined();
    expect(tarefa?.dica).toBeUndefined();
  });

  it.each([
    [100, "Na mosca!"],
    [99, "Quase lá"],
    [80, "Quase lá"],
    [79, "No caminho certo"],
    [50, "No caminho certo"],
    [49, "Longe do alvo"],
    [0, "Longe do alvo"],
  ])("nota %i tem o veredito '%s'", (nota, titulo) => {
    expect(veredictoDaNota(nota).titulo).toBe(titulo);
  });
});
