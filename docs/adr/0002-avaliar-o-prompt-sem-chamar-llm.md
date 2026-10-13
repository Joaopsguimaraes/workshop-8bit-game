# Avaliar a estrutura do prompt por heurística, sem chamar LLM

Mesmo sendo um jogo sobre prompts para LLMs, a aplicação nunca envia o prompt a uma LLM. A Nota (0–100) vem de Critérios determinísticos aplicados ao texto do próprio prompt (papel, contexto, formato, restrições, exemplos), os mesmos para todos os Desafios. O foco do workshop é ensinar a *estruturar* um prompt; a Nota precisa ser instantânea, gratuita, idêntica para prompts iguais e explicável Critério a Critério.

## Considered Options

- **Gerar a resposta com uma LLM e compará-la a uma Resposta-alvo** (o formato do HTML original da "Atividade 1"): descartado por custo, latência, dependência de chave de API e porque mede o resultado, não a estrutura.
- **Usar uma LLM como juíza da estrutura**: daria feedback mais rico, mas a Nota varia entre execuções iguais, o que é injusto numa competição.
