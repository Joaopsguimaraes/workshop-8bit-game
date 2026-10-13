"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";

// Facilitator entry: asks for the PIN and, if it is right, reloads the page already authenticated.
export function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/facilitator/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível entrar. Tente de novo.");
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        aria-labelledby="facilitator-title"
        className="flex w-full max-w-xl flex-col gap-6 border-4 border-ring bg-background p-6 text-foreground [box-shadow:4px_4px_0_0_#000]"
      >
        <h1 id="facilitator-title" className="font-pixel text-base leading-relaxed text-primary">
          FACILITADOR
        </h1>
        <form onSubmit={enter} className="flex flex-col gap-4" noValidate>
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
              onChange={(event) => setPin(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={sending || pin.length === 0} className="font-pixel text-[12px]">
            ENTRAR
          </Button>
        </form>
      </section>
    </main>
  );
}
