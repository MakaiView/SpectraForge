"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface AiStatus {
  configured: boolean;
  provider: string;
  model: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
};
function providerLabel(p: string) {
  return PROVIDER_LABEL[p] || (p ? p[0].toUpperCase() + p.slice(1) : "AI");
}

type Health = "off" | "checking" | "ok" | "error";

const DOT: Record<Health, string> = {
  off: "var(--sf-text-3)",
  checking: "var(--sf-warn)",
  ok: "var(--sf-success)",
  error: "var(--sf-danger)",
};

// Cache the liveness result briefly so a hard refresh doesn't re-ping the model
// every single time (the check costs a tiny round-trip to the provider).
const CACHE_MS = 5 * 60 * 1000;

/**
 * Footer AI indicator: provider · model with a status dot. Green = the model
 * answered a ping, red = configured but unreachable, amber = checking, grey =
 * not set up (links to Settings to configure it). BUILD_SPEC §5.
 */
export function AiStatusPill({ ai }: { ai: AiStatus }) {
  const [health, setHealth] = useState<Health>(ai.configured ? "checking" : "off");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ai.configured) {
      setHealth("off");
      return;
    }
    const cacheKey = `sf-ai-health:${ai.provider}:${ai.model}`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { at: number; ok: boolean; message: string };
        if (Date.now() - c.at < CACHE_MS) {
          setHealth(c.ok ? "ok" : "error");
          setMessage(c.message);
          return;
        }
      }
    } catch {
      /* ignore cache errors */
    }

    let cancelled = false;
    setHealth("checking");
    fetch("/api/ai/health")
      .then((r) => r.json())
      .then((d: { configured?: boolean; ok?: boolean; message?: string }) => {
        if (cancelled) return;
        if (!d.configured) {
          setHealth("off");
          return;
        }
        setHealth(d.ok ? "ok" : "error");
        setMessage(d.message || "");
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), ok: !!d.ok, message: d.message || "" }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (!cancelled) setHealth("error");
      });
    return () => {
      cancelled = true;
    };
  }, [ai.configured, ai.provider, ai.model]);

  const title =
    health === "off"
      ? "AI is not set up — click to configure"
      : `${providerLabel(ai.provider)} · ${ai.model}${message ? ` — ${message}` : ""}`;

  const secondary = ai.configured ? `${providerLabel(ai.provider)} · ${ai.model}` : "Set up AI";

  return (
    <Link
      href="/settings"
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 11px",
        borderRadius: 10,
        border: "1px solid var(--sf-line)",
        background: "var(--sf-surface-2)",
        color: "var(--sf-text)",
        textDecoration: "none",
        boxSizing: "border-box",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: DOT[health],
          flex: "none",
          boxShadow: health === "ok" ? "0 0 0 3px var(--sf-success-soft)" : health === "error" ? "0 0 0 3px var(--sf-danger-soft)" : "none",
          animation: health === "checking" ? "sfPulse 1s ease-in-out infinite" : undefined,
        }}
      />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="font-mono" style={{ display: "block", fontSize: 8, letterSpacing: ".16em", color: "var(--sf-text-3)" }}>AI ASSISTANT</span>
        <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{secondary}</span>
      </span>
      <style>{`@keyframes sfPulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </Link>
  );
}
