// Janela PROMPT.EXE. Sem Rodada aberta, mostra a espera do Facilitador.
export function PromptExe() {
  return (
    <div className="flex min-h-40 flex-col gap-3">
      <p className="uppercase">
        AGUARDANDO O FACILITADOR...
        <span aria-hidden="true" className="cursor-piscante">
          _
        </span>
      </p>
    </div>
  );
}
