"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SettingsForm({
  settings,
}: {
  settings: {
    organizationName: string;
    defaultModel: string;
    timezone: string;
    notifications?: {
      emailOnRunFailure?: boolean;
      emailOnApprovalRequest?: boolean;
      telegramEnabled?: boolean;
      telegramChatId?: string;
      discordEnabled?: boolean;
      discordWebhookUrl?: string;
      slackWebhookUrl?: string;
    };
    api?: {
      anthropicApiKeyMasked?: string;
      webhookSecretMasked?: string;
    };
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    organizationName: settings.organizationName || "",
    defaultModel: settings.defaultModel || "",
    timezone: settings.timezone || "UTC",
    emailOnRunFailure: settings.notifications?.emailOnRunFailure ?? true,
    emailOnApprovalRequest: settings.notifications?.emailOnApprovalRequest ?? true,
    telegramEnabled: settings.notifications?.telegramEnabled ?? false,
    telegramChatId: settings.notifications?.telegramChatId || "",
    discordEnabled: settings.notifications?.discordEnabled ?? false,
    discordWebhookUrl: settings.notifications?.discordWebhookUrl || "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/v1/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationName: form.organizationName,
            defaultModel: form.defaultModel,
            timezone: form.timezone,
            notifications: {
              emailOnRunFailure: form.emailOnRunFailure,
              emailOnApprovalRequest: form.emailOnApprovalRequest,
              telegramEnabled: form.telegramEnabled,
              telegramChatId: form.telegramChatId,
              discordEnabled: form.discordEnabled,
              discordWebhookUrl: form.discordWebhookUrl,
            },
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error || "Failed to update settings");
          return;
        }
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Organization name</label>
          <input
            value={form.organizationName}
            onChange={(event) => setForm({ ...form, organizationName: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Default model</label>
          <input
            value={form.defaultModel}
            onChange={(event) => setForm({ ...form, defaultModel: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Timezone</label>
          <input
            value={form.timezone}
            onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Operator Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">Telegram is the primary command channel. Discord mirrors operational updates.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-300">
            <span className="block text-xs text-slate-500">Telegram chat ID</span>
            <input
              value={form.telegramChatId}
              onChange={(event) => setForm({ ...form, telegramChatId: event.target.value })}
              placeholder="123456789"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <span className="block text-xs text-slate-500">Discord webhook URL</span>
            <input
              value={form.discordWebhookUrl}
              onChange={(event) => setForm({ ...form, discordWebhookUrl: event.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.telegramEnabled}
              onChange={(event) => setForm({ ...form, telegramEnabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Enable Telegram
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.discordEnabled}
              onChange={(event) => setForm({ ...form, discordEnabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Enable Discord
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.emailOnRunFailure}
              onChange={(event) => setForm({ ...form, emailOnRunFailure: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Email on run failure
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.emailOnApprovalRequest}
              onChange={(event) => setForm({ ...form, emailOnApprovalRequest: event.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
            />
            Email on approval request
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
