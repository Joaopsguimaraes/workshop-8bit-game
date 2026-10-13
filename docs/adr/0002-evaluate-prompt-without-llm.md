# Evaluate the prompt structure with heuristics, without calling an LLM

Even though this is a game about prompts for LLMs, the application never sends the prompt to an LLM. The Score (0–100) comes from deterministic Criteria applied to the text of the prompt itself (role, context, format, constraints, examples), the same for all Challenges. The focus of the workshop is to teach how to *structure* a prompt; the Score needs to be instant, free, identical for identical prompts, and explainable Criterion by Criterion.

## Considered Options

- **Generate the answer with an LLM and compare it to a Target answer** (the format of the original HTML of "Atividade 1"): rejected for cost, latency, dependency on an API key and because it measures the result, not the structure.
- **Use an LLM as a judge of the structure**: would give richer feedback, but the Score varies between identical runs, which is unfair in a competition.
