import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Trash2, UserPlus, Shield } from "lucide-react";

export function TeamSettingsPage() {
  const { token } = useAuth();
  const { activeWorkspace, userRole } = useWorkspace();
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAuthorized = userRole === "OWNER" || userRole === "ADMIN";

  const fetchMembers = async () => {
    if (!token || !activeWorkspace) return;
    try {
      const data = await api.getWorkspaceMembers(token, activeWorkspace._id);
      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message || "Failed to load team members");
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeWorkspace, token]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeWorkspace) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api.inviteWorkspaceMember(token, activeWorkspace._id, inviteEmail, inviteRole);
      setInviteEmail("");
      setSuccess("Member added successfully!");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to invite member");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token || !activeWorkspace || !confirm("Are you sure you want to remove this member?")) return;

    setError("");
    setSuccess("");
    try {
      await api.removeWorkspaceMember(token, activeWorkspace._id, userId);
      setSuccess("Member removed successfully!");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Team Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage member permissions and roles for **{activeWorkspace?.name || "this Workspace"}**.
        </p>
      </div>

      {error && <div className="p-3 text-xs text-danger-700 bg-danger-50 dark:bg-danger-950/20 rounded-md">{error}</div>}
      {success && <div className="p-3 text-xs text-brand-700 bg-brand-50 dark:bg-brand-950/20 rounded-md">{success}</div>}

      {/* Invite Member form (Admins/Owners only) */}
      {isAuthorized && (
        <div className="p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Team Member
          </h3>
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <Input
                label="Member Registered Email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            <div>
              <Select
                label="Role Permission"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={busy}
              >
                <option value="ADMIN">ADMIN (Write + Manage Members)</option>
                <option value="MEMBER">MEMBER (Write Access)</option>
                <option value="VIEWER">VIEWER (Read Only)</option>
              </Select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" loading={busy} variant="primary" size="sm" className="text-xs">
                Invite Member
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-855">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Active Members ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-855">
          {members.map((member: any) => {
            const profile = member.userId;
            if (!profile) return null;
            return (
              <div key={profile._id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-350">
                    {profile.name?.slice(0, 2).toUpperCase() || "TM"}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{profile.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide ${
                    member.role === "OWNER"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                      : member.role === "ADMIN"
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-450"
                      : member.role === "MEMBER"
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350"
                      : "bg-danger-50 text-danger-600 dark:bg-danger-950/20 dark:text-danger-400"
                  }`}>
                    {member.role}
                  </span>
                  
                  {/* Delete button (only show for admins/owners, and never allow deleting OWNER) */}
                  {isAuthorized && member.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemove(profile._id)}
                      className="p-1 rounded-md text-slate-400 hover:text-danger-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
