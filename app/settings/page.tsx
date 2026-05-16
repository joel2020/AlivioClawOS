import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/clawbot-data";
import { getAzureOpenAIConfig } from "@/lib/azure-openai";
import type { AppSettings } from "@/lib/clawbot-service";

export default async function SettingsPage() {
  const { settings } = await getSettings();
  const azure = getAzureOpenAIConfig();
  const data: AppSettings = settings || {
    organizationName: "Clawbot Inc.",
    defaultModel: "claude-sonnet-4-6",
    timezone: "UTC",
    notifications: {
      emailOnRunFailure: true,
      emailOnApprovalRequest: true,
      telegramEnabled: false,
      telegramChatId: "",
      discordEnabled: false,
      discordWebhookUrl: "",
      slackWebhookUrl: "",
    },
    api: {
      anthropicApiKeyMasked: "sk-ant-••••••••",
      webhookSecretMasked: "••••••••",
    },
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure organization defaults and operator integrations.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <SettingsForm settings={data} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:col-span-2">
          <p className="text-xs text-slate-500">Azure OpenAI</p>
          <p className="mt-1 text-sm text-slate-100">{azure?.endpoint || "Not configured"}</p>
          <p className="mt-1 text-xs text-slate-500">Deployment: {azure?.deploymentName || "Not configured"} · API version: {azure?.apiVersion || "Not configured"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Webhook secret</p>
          <p className="mt-1 text-sm text-slate-100">{data.api?.webhookSecretMasked || "Not configured"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Telegram chat ID</p>
          <p className="mt-1 text-sm text-slate-100">{data.notifications.telegramChatId || "Not configured"}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Discord webhook</p>
          <p className="mt-1 text-sm text-slate-100">{data.notifications.discordWebhookUrl ? "Configured" : "Not configured"}</p>
        </div>
      </div>
    </div>
  );
}
