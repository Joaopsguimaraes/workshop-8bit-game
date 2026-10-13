import { cn } from "@/lib/utils";

type Props = {
  iniciais: string;
  tamanho?: "pequeno" | "grande";
  className?: string;
};

// Avatar pixelado: as iniciais em caixa com borda de 8-bit.
export function Avatar({ iniciais, tamanho = "pequeno", className }: Props) {
  const grande = tamanho === "grande";
  return (
    <div
      aria-label={`Avatar ${iniciais || "vazio"}`}
      className={cn(
        "font-pixel flex shrink-0 items-center justify-center bg-dos-azul-escuro text-dos-amarelo",
        "border-dos-branco border-4 [box-shadow:4px_4px_0_0_#000]",
        grande ? "size-28 text-2xl" : "size-10 text-[10px]",
        className,
      )}
    >
      {iniciais || "??"}
    </div>
  );
}
