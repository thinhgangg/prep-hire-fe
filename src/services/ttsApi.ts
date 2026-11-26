import { getAuthHeaders, notifyUnauthorized } from "./authStorage";

const TTS_API_BASE = (
  import.meta.env.VITE_BE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let activeController: AbortController | null = null;

export function stopQuestionSpeech() {
  activeController?.abort();
  activeController = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

export async function speakQuestion(
  text: string,
  onEnded?: () => void,
): Promise<void> {
  stopQuestionSpeech();
  const normalized = text.replace(/[`*_#>]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return;

  const controller = new AbortController();
  activeController = controller;
  const response = await fetch(`${TTS_API_BASE}/api/v1/tts/speech`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text: normalized }),
    signal: controller.signal,
  });
  if (response.status === 401) {
    notifyUnauthorized();
  }
  if (!response.ok) {
    let message = `TTS HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = typeof body.detail === "string" ? body.detail : message;
    } catch {}
    throw new Error(message);
  }

  const blob = await response.blob();
  if (controller.signal.aborted) return;
  activeUrl = URL.createObjectURL(blob);
  activeAudio = new Audio(activeUrl);
  activeAudio.addEventListener(
    "ended",
    () => {
      stopQuestionSpeech();
      onEnded?.();
    },
    { once: true },
  );
  activeAudio.addEventListener(
    "error",
    () => {
      stopQuestionSpeech();
      onEnded?.();
    },
    { once: true },
  );
  await activeAudio.play();
}
