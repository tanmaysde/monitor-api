import { FormEvent } from "react";
import { Monitor, IAssertion } from "../types";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { Plus, Trash2, Globe, Activity, ShieldAlert, Server, Edit3, Target, Clock, Settings, HelpCircle } from "lucide-react";

export type MonitorFormState = {
  name: string;
  url: string;
  method: Monitor["method"];
  interval: number;
  retries: number;
  retryInterval: number;
  type: "HTTP" | "TCP" | "PING" | "DNS";
  port?: number;
  dnsRecordType?: "A" | "AAAA" | "CNAME" | "MX" | "TXT";
  assertions: IAssertion[];
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
  const addAssertion = () => {
    const defaultType = form.type === "HTTP" ? "STATUS_CODE" : "RESPONSE_TIME";
    const defaultOperator = defaultType === "STATUS_CODE" ? "EQUALS" : "LESS_THAN";
    const defaultValue = defaultType === "STATUS_CODE" ? "200" : "1000";

    const newAssertion: IAssertion = {
      type: defaultType,
      operator: defaultOperator,
      value: defaultValue,
    };
    onChange({
      ...form,
      assertions: [...form.assertions, newAssertion],
    });
  };

  const removeAssertion = (index: number) => {
    const updated = [...form.assertions];
    updated.splice(index, 1);
    onChange({
      ...form,
      assertions: updated,
    });
  };

  const updateAssertion = (index: number, key: keyof IAssertion, val: string) => {
    const updated = [...form.assertions];
    updated[index] = {
      ...updated[index],
      [key]: val,
    };
    onChange({
      ...form,
      assertions: updated,
    });
  };

  const getUrlLabel = () => {
    switch (form.type) {
      case "TCP":
      case "PING":
        return "Host / IP Address";
      case "DNS":
        return "Domain Name";
      case "HTTP":
      default:
        return "Endpoint URL";
    }
  };

  const getUrlPlaceholder = () => {
    switch (form.type) {
      case "TCP":
      case "PING":
        return "e.g. 192.168.1.10 or db.company.internal";
      case "DNS":
        return "e.g. myapi.com";
      case "HTTP":
      default:
        return "https://api.yourdomain.com/health";
    }
  };

  return (
    <form className="space-y-6 max-h-[75vh] overflow-y-auto pr-2" onSubmit={onSubmit}>
      
      {/* SECTION 1: IDENTITY & TYPE */}
      <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Identity & Protocol
            </h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
              Give your monitor a descriptive nickname and select the protocol type.
            </p>
          </div>
        </div>

        <div>
          <Input
            label="Monitor Name"
            value={form.name}
            onChange={(event) =>
              onChange({ ...form, name: event.target.value })
            }
            placeholder="e.g. Primary Production API"
            required
            disabled={busy}
            description="A clear nickname to help recognize this checker endpoint."
          />
        </div>

        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Monitoring Protocol
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "HTTP", label: "HTTP / HTTPS", icon: Globe, desc: "Websites & JSON APIs" },
              { id: "TCP", label: "TCP Port Probe", icon: ShieldAlert, desc: "Databases & services" },
              { id: "PING", label: "ICMP Ping Check", icon: Activity, desc: "Network responsiveness" },
              { id: "DNS", label: "DNS Resolver", icon: Server, desc: "Domain lookup integrity" },
            ].map((typeItem) => {
              const Icon = typeItem.icon;
              const isSelected = form.type === typeItem.id;
              return (
                <button
                  key={typeItem.id}
                  type="button"
                  onClick={() => {
                    const nextType = typeItem.id as any;
                    onChange({
                      ...form,
                      type: nextType,
                      port: nextType === "TCP" ? 80 : undefined,
                      dnsRecordType: nextType === "DNS" ? "A" : undefined,
                      assertions: nextType === "HTTP" ? form.assertions : form.assertions.filter(a => a.type !== "STATUS_CODE" && a.type !== "JSON_PATH")
                    });
                  }}
                  disabled={busy}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 ${
                    isSelected
                      ? "bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 shadow-md shadow-brand-500/5 scale-[1.01]"
                      : "bg-white dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-800"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                    </span>
                  )}
                  <Icon className={`w-4 h-4 mb-2 ${isSelected ? "text-brand-500" : "text-slate-400"}`} />
                  <span className="text-[11px] font-bold block">{typeItem.label}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1 leading-snug">{typeItem.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: CONNECTION CONFIG */}
      <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Connection Parameters
            </h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
              Specify the connection destination path and protocol parameters.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label={getUrlLabel()}
              value={form.url}
              onChange={(event) =>
                onChange({ ...form, url: event.target.value })
              }
              placeholder={getUrlPlaceholder()}
              required
              disabled={busy}
              description="Do not include ports or query paths if using Ping or DNS."
            />
          </div>
          
          {form.type === "HTTP" && (
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
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </Select>
            </div>
          )}

          {form.type === "TCP" && (
            <div>
              <Input
                label="TCP Connection Port"
                type="number"
                min={1}
                max={65535}
                value={form.port || 80}
                onChange={(event) =>
                  onChange({ ...form, port: Number(event.target.value) })
                }
                required
                disabled={busy}
              />
            </div>
          )}

          {form.type === "DNS" && (
            <div>
              <Select
                label="DNS Query Record"
                value={form.dnsRecordType || "A"}
                onChange={(event) =>
                  onChange({
                    ...form,
                    dnsRecordType: event.target.value as any,
                  })
                }
                disabled={busy}
              >
                <option value="A">A (IPv4 record)</option>
                <option value="AAAA">AAAA (IPv6 record)</option>
                <option value="CNAME">CNAME (Alias record)</option>
                <option value="MX">MX (Mail routing)</option>
                <option value="TXT">TXT (Text metadata)</option>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: SCHEDULING */}
      <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Timing & Schedule Configuration
            </h4>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
              Control the polling intervals and configure target failure retries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input
              label="Check Interval (minutes)"
              type="number"
              min={1}
              value={form.interval}
              onChange={(event) =>
                onChange({ ...form, interval: Number(event.target.value) })
              }
              required
              disabled={busy}
              description="Interval between automatic runs."
            />
          </div>
          <div>
            <Input
              label="Failure Retry Limit"
              type="number"
              min={0}
              max={5}
              value={form.retries}
              onChange={(event) =>
                onChange({ ...form, retries: Number(event.target.value) })
              }
              required
              disabled={busy}
              description="Failed attempts before reporting DOWN."
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
              description="Cool-off time between retries."
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: CONDITIONS & ASSERTIONS */}
      <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                SLA Validation Assertions
              </h4>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">
                Set custom validation check rules for status codes, payloads, or latency.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={addAssertion}
            disabled={busy}
            className="text-[10px] h-7 px-2.5 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add Condition
          </Button>
        </div>

        {form.assertions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-450 text-center space-y-1">
            <HelpCircle className="w-6 h-6 text-slate-300 dark:text-slate-700" />
            <span className="text-xs font-medium text-slate-650 dark:text-slate-400">No assertion conditions active</span>
            <span className="text-[10px] text-slate-450 dark:text-slate-500">Defaults to standard protocol reachability.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {form.assertions.map((assertion, index) => (
              <div key={index} className="group relative flex flex-col sm:flex-row gap-2.5 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 hover:shadow-sm transition-all duration-150">
                
                <div className="absolute -left-2 -top-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-750">
                  Rule #{index + 1}
                </div>

                <div className="w-full sm:w-1/4">
                  <Select
                    value={assertion.type}
                    onChange={(e) => updateAssertion(index, "type", e.target.value as any)}
                    disabled={busy}
                    className="text-[11px] py-1 bg-slate-50 dark:bg-slate-950"
                  >
                    {form.type === "HTTP" && <option value="STATUS_CODE">HTTP Status Code</option>}
                    <option value="RESPONSE_TIME">Response Time Latency</option>
                    <option value="TEXT_BODY">Text Substring Match</option>
                    {form.type === "HTTP" && <option value="JSON_PATH">JSONPath Field Value</option>}
                  </Select>
                </div>

                {assertion.type === "JSON_PATH" && (
                  <div className="w-full sm:w-1/4">
                    <Input
                      value={assertion.target || ""}
                      onChange={(e) => updateAssertion(index, "target", e.target.value)}
                      placeholder="JSONPath e.g. $.success"
                      required
                      disabled={busy}
                      className="text-[11px] py-1 bg-slate-50 dark:bg-slate-950 placeholder:text-slate-400"
                    />
                  </div>
                )}

                <div className="w-full sm:flex-1">
                  <Select
                    value={assertion.operator}
                    onChange={(e) => updateAssertion(index, "operator", e.target.value as any)}
                    disabled={busy}
                    className="text-[11px] py-1 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="EQUALS">Equals</option>
                    <option value="NOT_EQUALS">Not Equals</option>
                    <option value="CONTAINS">Contains</option>
                    <option value="NOT_CONTAINS">Doesn't Contain</option>
                    {(assertion.type === "STATUS_CODE" || assertion.type === "RESPONSE_TIME") && (
                      <>
                        <option value="LESS_THAN">Less Than (&lt;)</option>
                        <option value="GREATER_THAN">Greater Than (&gt;)</option>
                      </>
                    )}
                  </Select>
                </div>

                <div className="w-full sm:w-1/4">
                  <Input
                    value={assertion.value}
                    onChange={(e) => updateAssertion(index, "value", e.target.value)}
                    placeholder={
                      assertion.type === "RESPONSE_TIME" 
                        ? "Timeout in ms" 
                        : assertion.type === "STATUS_CODE" 
                        ? "e.g. 200" 
                        : "Expected Value"
                    }
                    required
                    disabled={busy}
                    className="text-[11px] py-1 bg-slate-50 dark:bg-slate-950 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeAssertion(index)}
                  disabled={busy}
                  className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="primary"
          type="submit"
          loading={busy}
          className="w-full sm:w-auto text-xs font-semibold shadow-md shadow-brand-500/10"
        >
          {editing ? "Save Monitor Changes" : "Deploy Checker Endpoint"}
        </Button>
      </div>
    </form>
  );
}
