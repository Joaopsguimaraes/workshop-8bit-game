"use client";

import { useState, type FormEvent } from "react";
import { Avatar } from "./avatar";
import { Button } from "@/components/ui/8bit/button";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import { avatarInitials, validateNickname } from "@/lib/nickname";

type Props = {
  onEntered: (data: { token: string; player: { nickname: string; initials: string } }) => void;
};

// Login with a Nickname only. The Avatar preview follows the typing.
export function LoginScreen({ onEntered }: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const initials = avatarInitials(nickname);

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validateNickname(nickname);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await response.json();
      if (!data.ok) {
        setError(data.error);
        return;
      }
      onEntered({ token: data.token, player: data.player });
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section
        aria-labelledby="login-title"
        className="flex w-full max-w-xl flex-col gap-6 border-4 border-ring bg-background p-6 text-foreground [box-shadow:4px_4px_0_0_#000]"
      >
        <header className="flex flex-col gap-3">
          <h1 id="login-title" className="font-pixel text-base leading-relaxed text-primary">
            WORKSHOP DE PROMPTS
          </h1>
          <p className="text-2xl">
            Entre com um Nickname. Seu Avatar usa as duas primeiras letras dele, sem acento e em
            maiúsculo.
          </p>
        </header>

        <form onSubmit={enter} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname" className="font-pixel text-[10px] text-muted-foreground">
              NICKNAME
            </Label>
            <Input
              id="nickname"
              name="nickname"
              autoComplete="off"
              maxLength={40}
              placeholder="Digite seu nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              aria-invalid={error !== null}
              aria-describedby={error ? "error-nickname" : undefined}
              className="text-2xl"
            />
            {error && (
              <p id="error-nickname" role="alert" className="text-2xl text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 border-2 border-border p-3">
            <Avatar initials={initials} size="large" />
            <div className="flex flex-col gap-1">
              <span className="font-pixel text-[10px] text-muted-foreground">PREVIEW DO AVATAR</span>
              <span className="text-xl text-muted-foreground">
                Ele muda enquanto você digita.
              </span>
            </div>
          </div>

          <Button type="submit" disabled={sending} className="font-pixel text-[12px]">
            {sending ? "ENTRANDO..." : "ENTRAR"}
          </Button>
        </form>
      </section>
    </main>
  );
}
