import { FormEvent } from "react";
import { EventType } from "../types";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";

type WorkflowFormState = {
  name: string;
  trigger: EventType;
  enabled: boolean;
  actionType: "EMAIL" | "WEBHOOK" | "SLACK" | "TEAMS";
  // Email configs
  to: string;
  subject: string;
  text: string;
  // Webhook configs
  webhookUrl: string;
  webhookHeadersJson: string;
  // Slack configs
  slackWebhookUrl: string;
  // Teams configs
  teamsWebhookUrl: string;
};

type WorkflowFormProps = {
  form: WorkflowFormState;
  editing: boolean;
  busy: boolean;
  onChange: (next: WorkflowFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function WorkflowForm({
  form,
  editing,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: WorkflowFormProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {editing ? "Modify Workflow Properties" : "Create New Workflow"}
        </h4>
        {editing && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onCancel}
            className="text-[10px] h-7 px-2.5"
          >
            Cancel Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Workflow Name"
            value={form.name}
            onChange={(event) =>
              onChange({ ...form, name: event.target.value })
            }
            placeholder="e.g. Slack alert on Auth API down"
            required
            disabled={busy}
            description="Give this workflow a descriptive label."
          />
        </div>
        <div>
          <Select
            label="Trigger Event"
            value={form.trigger}
            onChange={(event) =>
              onChange({
                ...form,
                trigger: event.target.value as EventType,
              })
            }
            disabled={busy}
            description="Event type that executes this workflow."
          >
            <option value="API_DOWN">API_DOWN</option>
            <option value="API_UP">API_UP</option>
            <option value="SLOW_RESPONSE">SLOW_RESPONSE</option>
          </Select>
        </div>
      </div>

      {/* Action Type Selector */}
      <div>
        <Select
          label="Action Channel Type"
          value={form.actionType}
          onChange={(event) =>
            onChange({
              ...form,
              actionType: event.target.value as any,
            })
          }
          disabled={busy}
          description="How alerts should be sent when triggered."
        >
          <option value="EMAIL">📧 Email Warning</option>
          <option value="WEBHOOK">🔗 Webhook HTTP POST Alert</option>
          <option value="SLACK">💬 Slack Channel Message</option>
          <option value="TEAMS">👥 Microsoft Teams Message</option>
        </Select>
      </div>

      {/* Conditional Inputs based on Action Type */}
      {form.actionType === "EMAIL" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Recipient Email (To)"
              type="email"
              value={form.to}
              onChange={(event) =>
                onChange({ ...form, to: event.target.value })
              }
              placeholder="admin@example.com"
              required={form.actionType === "EMAIL"}
              disabled={busy}
              description="Email address to send alert notifications to."
            />
            <Input
              label="Subject Template"
              value={form.subject}
              onChange={(event) =>
                onChange({ ...form, subject: event.target.value })
              }
              placeholder="Incident Alert: API is offline"
              required={form.actionType === "EMAIL"}
              disabled={busy}
              description="Subject line for email alert."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-450">
              Email Body Template
            </label>
            <textarea
              value={form.text}
              onChange={(event) =>
                onChange({ ...form, text: event.target.value })
              }
              placeholder="Write email markdown or plain text template here."
              rows={4}
              disabled={busy}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-150 placeholder:text-slate-450 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/50"
            />
            <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-normal">
              Plain text body template sent in alert container.
            </p>
          </div>
        </>
      )}

      {form.actionType === "WEBHOOK" && (
        <>
          <div>
            <Input
              label="Webhook Destination URL"
              type="url"
              value={form.webhookUrl}
              onChange={(event) =>
                onChange({ ...form, webhookUrl: event.target.value })
              }
              placeholder="https://api.mycompany.com/v1/monitor-alerts"
              required={form.actionType === "WEBHOOK"}
              disabled={busy}
              description="The destination endpoint where we will send a POST request with error payload."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-450">
              Custom HTTP Headers (JSON format)
            </label>
            <textarea
              value={form.webhookHeadersJson}
              onChange={(event) =>
                onChange({ ...form, webhookHeadersJson: event.target.value })
              }
              placeholder='e.g. { "Authorization": "Bearer custom-key", "X-Custom-Source": "api-monitor" }'
              rows={3}
              disabled={busy}
              className="w-full px-3 py-2 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-150 placeholder:text-slate-450 dark:placeholder:text-slate-600 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Pass authorization tokens or tracking headers. Set as empty object `{}` if none required.
            </p>
          </div>
        </>
      )}

      {form.actionType === "SLACK" && (
        <div>
          <Input
            label="Slack Incoming Webhook URL"
            type="url"
            value={form.slackWebhookUrl}
            onChange={(event) =>
              onChange({ ...form, slackWebhookUrl: event.target.value })
            }
            placeholder="https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_TOKEN"
            required={form.actionType === "SLACK"}
            disabled={busy}
            description="Create an Incoming Webhook in your Slack channel and paste the URL here."
          />
        </div>
      )}

      {form.actionType === "TEAMS" && (
        <div>
          <Input
            label="Microsoft Teams Connector Webhook URL"
            type="url"
            value={form.teamsWebhookUrl}
            onChange={(event) =>
              onChange({ ...form, teamsWebhookUrl: event.target.value })
            }
            placeholder="https://mycompany.webhook.office.com/webhookb2/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX@XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/IncomingWebhook/XXXXXXXXXXXXXXXX/XXXXXXXXXXXXXXXX"
            required={form.actionType === "TEAMS"}
            disabled={busy}
            description="Create an Incoming Webhook connector in MS Teams and paste the URL here."
          />
        </div>
      )}

      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id="workflow-enabled-checkbox"
          checked={form.enabled}
          onChange={(event) =>
            onChange({ ...form, enabled: event.target.checked })
          }
          disabled={busy}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-800 text-brand-500 focus:ring-brand-500 bg-white dark:bg-slate-900"
        />
        <label
          htmlFor="workflow-enabled-checkbox"
          className="text-xs font-semibold text-slate-650 dark:text-slate-350 cursor-pointer"
        >
          Enable automatic scheduling for this workflow
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-3">
        <Button
          variant="primary"
          type="submit"
          loading={busy}
          className="w-full sm:w-auto text-xs"
        >
          {editing ? "Save Workflow" : "Create Automator"}
        </Button>
      </div>
    </form>
  );
}
