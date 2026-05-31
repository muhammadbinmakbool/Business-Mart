"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  listUsersAction, 
  createUserAction, 
  updateUserAction, 
  disableUserAction, 
  enableUserAction 
} from "@/modules/auth/controllers/userActions";
import { toast } from "sonner";
import { Plus, User, Shield, Check, X, Pencil, UserX, UserCheck, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { USER_ROLES } from "@/lib/constants";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(USER_ROLES.USER);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await listUsersAction();
    if (res?.success) {
      setUsers(res.users);
    } else {
      toast.error(res?.error || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole(USER_ROLES.USER);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    startTransition(async () => {
      const res = await createUserAction(formData);
      if (res?.success) {
        toast.success("User created successfully");
        setIsCreateOpen(false);
        fetchUsers();
      } else {
        toast.error(res?.error || "Failed to create user");
      }
    });
  };

  const handleOpenEdit = (user) => {
    setActiveUser(user);
    setName(user.name || "");
    setEmail(user.email || "");
    setPassword(""); // Keep blank to not modify
    setRole(user.role || USER_ROLES.USER);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and Email are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    if (password) {
      formData.append("password", password);
    }
    formData.append("role", role);

    startTransition(async () => {
      const res = await updateUserAction(activeUser.id, formData);
      if (res?.success) {
        toast.success("User updated successfully");
        setIsEditOpen(false);
        fetchUsers();
      } else {
        toast.error(res?.error || "Failed to update user");
      }
    });
  };

  const handleToggleStatus = (user) => {
    const action = user.isActive ? disableUserAction : enableUserAction;
    const actionText = user.isActive ? "disabled" : "enabled";

    startTransition(async () => {
      const res = await action(user.id);
      if (res?.success) {
        toast.success(`User ${user.email} successfully ${actionText}`);
        fetchUsers();
      } else {
        toast.error(res?.error || `Failed to change status`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Security & Users</h3>
          <p className="text-sm text-muted-foreground">
            Manage authenticated operators, passwords, roles, and status levels.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/95 shadow transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* User Listing Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Fetching user records...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No users registered. Add your first operator to get started.
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Operator</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-foreground font-bold shrink-0 text-sm">
                          {u.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                        </div>
                        <div className="font-semibold text-foreground">{u.name || "Unnamed"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === "ADMIN" 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-muted text-muted-foreground border"
                      }`}>
                        <Shield className="h-3.5 w-3.5" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <Check className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <X className="h-3.5 w-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isPending}
                          className={`p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer ${
                            u.isActive 
                              ? "text-rose-600 hover:text-rose-500" 
                              : "text-emerald-600 hover:text-emerald-500"
                          }`}
                          title={u.isActive ? "Disable User" : "Enable User"}
                        >
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add System Operator"
        type="info"
        size="md"
        confirmLabel="Add Operator"
        loading={isPending}
        onConfirm={handleCreateSubmit}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <input
              type="text"
              placeholder="E.g. Muhammad Ahmad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
            <input
              type="email"
              placeholder="operator@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Access Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={USER_ROLES.USER}>User (Standard Access)</option>
              <option value={USER_ROLES.ADMIN}>Admin (Full System Config Access)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit System Operator"
        type="info"
        size="md"
        confirmLabel="Save Changes"
        loading={isPending}
        onConfirm={handleEditSubmit}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">New Password (Leave blank to keep current)</label>
            <input
              type="password"
              placeholder="Enter new password if changing"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Access Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value={USER_ROLES.USER}>User (Standard Access)</option>
              <option value={USER_ROLES.ADMIN}>Admin (Full System Config Access)</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
