import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

// The human test script (roteiro de testes) lives in .scratch and is served at /help.
// It is read on each request, so edits show up without a rebuild.
const ROTEIRO_DIR = path.join(process.cwd(), ".scratch", "workshop-game", "roteiro-testes");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

// Only the page and the screenshots folder are public; any other path is a 404.
function publicFileName(segments: string[]): string | null {
  if (segments.length === 0) return "index.html";
  if (segments.length === 2 && segments[0] === "screenshots") return `screenshots/${segments[1]}`;
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ file?: string[] }> }) {
  await connection();

  const { file = [] } = await params;
  const name = publicFileName(file);
  const contentType = name && CONTENT_TYPES[path.extname(name).toLowerCase()];
  // Plain names only: no dots-only segments, no separators, no traversal.
  if (!name || !contentType || !/^[\w.\-/]+$/.test(name) || name.includes("..")) {
    return new Response("Não encontrado.", { status: 404 });
  }

  let body: string | Blob;
  try {
    const data = await readFile(path.join(ROTEIRO_DIR, name));
    body = name === "index.html" ? data.toString("utf8") : new Blob([data]);
  } catch {
    return new Response("Não encontrado.", { status: 404 });
  }

  // Relative links in the page (screenshots/…) resolve against /help/, whatever the URL typed.
  if (typeof body === "string") {
    body = body.replace("<head>", '<head>\n<base href="/help/">');
  }

  return new Response(body, { headers: { "Content-Type": contentType } });
}
