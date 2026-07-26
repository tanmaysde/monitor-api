import { FormEvent } from "react";
import { Monitor } from "../types";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";

type MonitorFormState = {
  name: string;
  url: string;
  method: Monitor["method"];
  interval: number;
  retries: number;
  retryInterval: number;
};

type MonitorFormProps = {
  form: MonitorFormState;
  editing: boolean;
  busy: boolean;
  onChange: (next: MonitorFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function MonitorForm({
  form,
  editing,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: MonitorFormProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {editing ? "Edit Monitor Properties" : "Create New Monitor"}
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
            label="Monitor Name"
            value={form.name}
            onChange={(event) =>
              onChange({ ...form, name: event.target.value })
            }
            placeholder="e.g. Primary Production API"
            required
            disabled={busy}
            description="A descriptive nickname to identify this checker."
          />
        </div>
        <div>
          <Select
            label="HTTP Method"
            value={form.method}
            onChange={(event) =>
              onChange({
                ...form,
                method: event.target.value as Monitor["method"],
              })
            }
            disabled={busy}
            description="Method used for check request."
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Endpoint URL"
            type="url"
            value={form.url}
            onChange={(event) =>
              onChange({ ...form, url: event.target.value })
            }
            placeholder="https://api.yourdomain.com/health"
            required
            disabled={busy}
            description="The full HTTP/HTTPS URL path to check."
          />
        </div>
        <div>
          <Input
            label="Interval (seconds)"
            type="number"
            min={1}
            value={form.interval}
            onChange={(event) =>
              onChange({ ...form, interval: Number(event.target.value) })
            }
            required
            disabled={busy}
            description="Seconds between automatic checks."
          />
        </div>
      </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Retry Attempts"
            type="number"
            min={0}
            max={5}
            value={form.retries}
            onChange={(event) =>
              onChange({ ...form, retries: Number(event.target.value) })
            }
            required
            disabled={busy}
            description="Failed checks will be retried this many times before declaring DOWN."
          />
        </div>
        <div>
          <Input
            label="Retry Interval (seconds)"
            type="number"
            min={5}
            max={60}
            value={form.retryInterval}
            onChange={(event) =>
              onChange({ ...form, retryInterval: Number(event.target.value) })
            }
            required
            disabled={busy}
            description="Wait time in seconds between retry attempts."
          />
        </div>
      </div>


      <div className="flex justify-end gap-3 pt-3">
        <Button
          variant="primary"
          type="submit"
          loading={busy}
          className="w-full sm:w-auto text-xs"
        >
          {editing ? "Save Monitor" : "Create Checker"}
        </Button>
      </div>
    </form>
  );
}
