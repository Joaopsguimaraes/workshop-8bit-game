import { cn } from "@/lib/utils";

type Props = {
  iniciais: string;
  tamanho?: "pequeno" | "medio" | "grande";
  className?: string;
};

const TAMANHOS = {
  pequeno: "size-10 text-[10px]",
  medio: "size-16 text-base",
  grande: "size-28 text-2xl",
};

// Avatar pixelado: as iniciais em caixa com borda de 8-bit.
export function Avatar({ iniciais, tamanho = "pequeno", className }: Props) {
  return (
    <div
      aria-label={`Avatar ${iniciais || "vazio"}`}
      className={cn(
        "font-pixel flex shrink-0 items-center justify-center bg-card text-primary",
        "border-foreground border-4 [box-shadow:4px_4px_0_0_#000]",
        TAMANHOS[tamanho],
        className,
      )}
    >
      {iniciais || "??"}
    </div>
  );
}
