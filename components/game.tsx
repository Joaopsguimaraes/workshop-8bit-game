"use client";

import { useCallback, useEffect, useState } from "react";
import { Desktop } from "./desktop";
import { LoginScreen } from "./login-screen";
import { Button } from "@/components/ui/8bit/button";
import { clearToken, readToken, saveToken } from "@/lib/client/session";

type Session = { token: string; nickname: string; initials: string };

type State =
  | { type: "loading" }
  | { type: "login" }
  | { type: "error" }
  | { type: "desktop"; session: Session };

// Network or server error: the token stays saved, only the check failed.
class TransientFailure extends Error {}

// Decides the screen: resumes the Player saved in the browser or shows the login.
export function Game() {
  const [state, setState] = useState<State>({ type: "loading" });
  const [retry, setRetry] = useState(0);

  const backToLogin = useCallback(() => {
    clearToken();
    setState({ type: "login" });
  }, []);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      // localStorage only exists on the client, so the decision can only be made after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ type: "login" });
      return;
    }

    let cancelled = false;
    fetch("/api/session", { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          // Only a token the server refused goes back to the login.
          if (!cancelled) backToLogin();
          return;
        }
        if (!response.ok) throw new TransientFailure();

        const data = await response.json().catch(() => {
          throw new TransientFailure();
        });
        if (cancelled) return;
        setState({
          type: "desktop",
          session: {
            token,
            nickname: data.player.nickname,
            initials: data.player.initials,
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ type: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [backToLogin, retry]);

  if (state.type === "loading") {
    return (
      <main className="font-pixel flex min-h-dvh items-center justify-center text-[12px] text-primary">
        CARREGANDO...
      </main>
    );
  }

  if (state.type === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <section className="flex max-w-xl flex-col gap-6 border-4 border-ring bg-background p-6 text-foreground">
          <p className="text-2xl">Não foi possível conectar. Sua sessão continua salva.</p>
          <Button
            type="button"
            className="font-pixel text-[12px]"
            onClick={() => {
              setState({ type: "loading" });
              setRetry((current) => current + 1);
            }}
          >
            TENTAR DE NOVO
          </Button>
        </section>
      </main>
    );
  }

  if (state.type === "login") {
    return (
      <LoginScreen
        onEntered={({ token, player }) => {
          saveToken(token);
          setState({
            type: "desktop",
            session: { token, nickname: player.nickname, initials: player.initials },
          });
        }}
      />
    );
  }

  return (
    <Desktop
      key={state.session.token}
      token={state.session.token}
      nickname={state.session.nickname}
      initials={state.session.initials}
      onSessionInvalid={backToLogin}
    />
  );
}
