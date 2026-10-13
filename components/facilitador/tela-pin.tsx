"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";

// Entrada do Facilitador: pede o PIN e, se estiver certo, recarrega a página já autenticada.
export function TelaPinFacilitador() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/facilitador/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível entrar. Tente de novo.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Não foi possível conectar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        aria-labelledby="titulo-facilitador"
        className="flex w-full max-w-xl flex-col gap-6 border-4 border-ring bg-background p-6 text-foreground [box-shadow:4px_4px_0_0_#000]"
      >
        <h1 id="titulo-facilitador" className="font-pixel text-base leading-relaxed text-primary">
          FACILITADOR
        </h1>
        <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin" className="font-pixel text-[10px] text-muted-foreground">
              PIN
            </Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(evento) => setPin(evento.target.value)}
            />
          </div>
          {erro && (
            <p role="alert" className="text-destructive">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={enviando || pin.length === 0} className="font-pixel text-[12px]">
            ENTRAR
          </Button>
        </form>
      </section>
    </main>
  );
}
