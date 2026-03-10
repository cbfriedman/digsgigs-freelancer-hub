import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { ArrowLeft, Shield, UserCog, Users, RefreshCw, MoreVertical, UserX, Trash2, UserCheck, Search, ExternalLink, CreditCard, Wallet, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCanonicalDiggerProfilePath, getCanonicalGiggerProfilePath } from "@/lib/profileUrls";

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "email_asc" | "email_desc" | "role";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  created_at: string;
  roles: string[];
  is_suspended: boolean;
  avatar_url: string | null;
  /** From digger_profiles when user has a digger profile */
  digger_handle: string | null;
  digger_id: string | null;
  /** Profile: has at least one payment method (card/bank) for paying */
  payment_verified: boolean | null;
  /** Digger only: Stripe Connect payout account connected and charges enabled */
  payout_connected: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<"add" | "remove" | "suspend" | "unsuspend" | "delete_profile" | "delete">("add");
  // Filters & sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to access this page");
        navigate("/register");
        return;
      }

      // Use get_user_app_roles_safe RPC function to check admin status
      const { data: rolesData, error: adminError } = await (supabase.rpc as any)('get_user_app_roles_safe', { _user_id: user.id });

      if (adminError) {
        console.error("Error checking admin status:", adminError);
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      // Check if user has admin role
      const hasAdmin = rolesData && Array.isArray(rolesData) && rolesData.some((r: any) => r.app_role === 'admin');
      
      if (!hasAdmin) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const profileIds = (profiles || []).map((p: { id: string }) => p.id);

      // Get all user app roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_app_roles")
        .select("user_id, app_role");

      if (rolesError) throw rolesError;

      // Get digger profiles for profile URL and payout status
      const { data: diggerProfiles } = profileIds.length > 0
        ? await supabase
            .from("digger_profiles")
            .select("id, handle, user_id, stripe_connect_account_id, stripe_connect_charges_enabled")
            .in("user_id", profileIds)
        : { data: [] };
      const diggerByUserId = new Map(
        (diggerProfiles || []).map((d: {
          id: string;
          handle: string | null;
          user_id: string;
          stripe_connect_account_id: string | null;
          stripe_connect_charges_enabled: boolean | null;
        }) => [d.user_id, d])
      );

      // Combine profiles with their roles, digger profile info, and payment/payout status
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile: any) => {
        const digger = diggerByUserId.get(profile.id);
        const payoutConnected = !!(
          digger?.stripe_connect_account_id &&
          digger?.stripe_connect_charges_enabled
        );
        return {
          id: profile.id,
          email: profile.email ?? "",
          full_name: profile.full_name,
          user_type: profile.user_type ?? "",
          created_at: profile.created_at,
          roles: userRoles
            ?.filter((ur: { user_id: string }) => ur.user_id === profile.id)
            .map((ur: { app_role: string }) => ur.app_role) || [],
          is_suspended: profile.is_suspended ?? false,
          avatar_url: profile.avatar_url ?? null,
          digger_handle: digger?.handle ?? null,
          digger_id: digger?.id ?? null,
          payment_verified: profile.payment_verified ?? null,
          payout_connected: payoutConnected,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const { error } = await supabase
        .from("user_app_roles")
        .insert({
          user_id: selectedUser,
          app_role: selectedRole as any,
          is_active: true,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("User already has this role");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Successfully added ${selectedRole} role`);
      await loadUsers();
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error("Failed to add role");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const { error } = await supabase
        .from("user_app_roles")
        .delete()
        .eq("user_id", selectedUser)
        .eq("app_role", selectedRole as any);

      if (error) throw error;

      toast.success(`Successfully removed ${selectedRole} role`);
      await loadUsers();
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    try {
      const data = await invokeEdgeFunction<{ error?: string }>(supabase, "admin-manage-user", {
        body: { action: "suspend", userId: selectedUser },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("User suspended successfully");
      await loadUsers();
    } catch (err) {
      console.error("Error suspending user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to suspend user");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
    }
  };

  const handleUnsuspendUser = async () => {
    if (!selectedUser) return;
    try {
      const data = await invokeEdgeFunction<{ error?: string }>(supabase, "admin-manage-user", {
        body: { action: "unsuspend", userId: selectedUser },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("User unsuspended successfully");
      await loadUsers();
    } catch (err) {
      console.error("Error unsuspending user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to unsuspend user");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const data = await invokeEdgeFunction<{ error?: string }>(supabase, "admin-manage-user", {
        body: { action: "delete", userId: selectedUser, confirmFullUserDeletion: true },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("User deleted successfully");
      await loadUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedUser) return;
    try {
      const data = await invokeEdgeFunction<{ error?: string }>(supabase, "admin-manage-user", {
        body: { action: "delete_profile", userId: selectedUser },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("Profile deleted successfully");
      await loadUsers();
    } catch (err) {
      console.error("Error deleting profile:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete profile");
    } finally {
      setShowConfirmDialog(false);
      setSelectedUser(null);
    }
  };

  const confirmAction = () => {
    if (actionType === "add") handleAddRole();
    else if (actionType === "remove") handleRemoveRole();
    else if (actionType === "suspend") handleSuspendUser();
    else if (actionType === "unsuspend") handleUnsuspendUser();
    else if (actionType === "delete_profile") handleDeleteProfile();
    else if (actionType === "delete") handleDeleteUser();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
  };

  /** Digger profile URL, or null if user has no digger profile. */
  const getDiggerProfileUrl = (user: UserWithRoles): string | null =>
    getCanonicalDiggerProfilePath({ handle: user.digger_handle, diggerId: user.digger_id });

  /** Gigger profile URL (always available per user id). */
  const getGiggerProfileUrl = (userId: string): string => getCanonicalGiggerProfilePath(userId);

  // Filter, sort, and paginate users
  const { filteredUsers, totalFiltered, totalPages, paginatedUsers, startIndex } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = users.filter((u) => {
      const matchSearch =
        !q ||
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" || u.roles.includes(roleFilter);
      return matchSearch && matchRole;
    });

    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return (a.full_name ?? "").localeCompare(b.full_name ?? "");
        case "name_desc":
          return (b.full_name ?? "").localeCompare(a.full_name ?? "");
        case "email_asc":
          return (a.email ?? "").localeCompare(b.email ?? "");
        case "email_desc":
          return (b.email ?? "").localeCompare(a.email ?? "");
        case "role": {
          const aRoles = a.roles.join(",");
          const bRoles = b.roles.join(",");
          return aRoles.localeCompare(bRoles) || (a.email ?? "").localeCompare(b.email ?? "");
        }
        default:
          return 0;
      }
    });

    const total = sorted.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(Math.max(1, page), pages);
    const start = (currentPage - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);

    return {
      filteredUsers: sorted,
      totalFiltered: total,
      totalPages: pages,
      paginatedUsers: paginated,
      startIndex: start,
    };
  }, [users, searchQuery, roleFilter, sortBy, page, pageSize]);

  // Keep page in bounds when filters change
  useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 w-full max-w-[1920px] mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  All Users
                  <Badge variant="secondary" className="font-normal">
                    Total: {users.length} user{users.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  View and manage roles for all registered users. Payment = method connected (can pay); Payout = Stripe Connect connected (Diggers can receive). Use filters and pagination to find users quickly.
                </CardDescription>
              </div>
              <Button
                onClick={loadUsers}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t mt-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="digger">Digger</SelectItem>
                  <SelectItem value="gigger">Gigger</SelectItem>
                  <SelectItem value="telemarketer">Telemarketer</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setPage(1); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Newest first</SelectItem>
                  <SelectItem value="date_asc">Oldest first</SelectItem>
                  <SelectItem value="name_asc">Name A → Z</SelectItem>
                  <SelectItem value="name_desc">Name Z → A</SelectItem>
                  <SelectItem value="email_asc">Email A → Z</SelectItem>
                  <SelectItem value="email_desc">Email Z → A</SelectItem>
                  <SelectItem value="role">By role</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-14">Photo</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="h-4 w-4" aria-hidden />
                        Payment
                      </span>
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Wallet className="h-4 w-4" aria-hidden />
                        Payout
                      </span>
                    </TableHead>
                    <TableHead>Current Roles</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        {totalFiltered === 0 && users.length > 0
                          ? "No users match the current filters."
                          : users.length === 0
                            ? "No users yet."
                            : "No users on this page."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {startIndex + index + 1}
                      </TableCell>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? user.email} />
                          <AvatarFallback className="bg-muted text-xs">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{user.full_name || user.email || "—"}</span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {((): React.ReactNode => {
                              const diggerUrl = getDiggerProfileUrl(user);
                              return diggerUrl ? (
                                <a
                                  href={diggerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                                >
                                  Digger profile
                                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                                </a>
                              ) : null;
                            })()}
                            <a
                              href={getGiggerProfileUrl(user.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                            >
                              Gigger profile
                              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.user_type || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center" title="Payment method connected (can pay for gigs)">
                        {user.payment_verified ? (
                          <span className="inline-flex items-center justify-center gap-1 text-emerald-600" aria-label="Payment method connected">
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Yes</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-muted-foreground" aria-label="No payment method">
                            <X className="h-4 w-4" />
                            <span className="sr-only">No</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center" title="Payout account connected (can receive payouts)">
                        {user.digger_id ? (
                          user.payout_connected ? (
                            <span className="inline-flex items-center justify-center gap-1 text-emerald-600" aria-label="Payout account connected">
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Yes</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1 text-muted-foreground" aria-label="Payout not set up">
                              <X className="h-4 w-4" />
                              <span className="sr-only">No</span>
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={getRoleBadgeVariant(role)}
                                className="cursor-pointer hover:opacity-80"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setSelectedRole(role);
                                  setActionType("remove");
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value=""
                            onValueChange={(value) => {
                              setSelectedUser(user.id);
                              setSelectedRole(value);
                              setActionType("add");
                              setShowConfirmDialog(true);
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Add role..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="digger">Digger</SelectItem>
                              <SelectItem value="gigger">Gigger</SelectItem>
                              <SelectItem value="telemarketer">Telemarketer</SelectItem>
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.digger_id && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const data = await invokeEdgeFunction(supabase, "admin-get-connect-balance", {
                                        body: { digger_id: user.digger_id },
                                      });
                                      if (data?.error) {
                                        toast.error(data.error === "No Connect account" ? "No payout account connected" : data.error);
                                        return;
                                      }
                                      const avail = (data as { available_usd?: number })?.available_usd ?? 0;
                                      const pend = (data as { pending_usd?: number })?.pending_usd ?? 0;
                                      const mode = (data as { mode?: string })?.mode ?? "test";
                                      toast.success(
                                        `Payout balance (${mode}): Available $${avail.toFixed(2)}, Pending $${pend.toFixed(2)}`,
                                        { duration: 6000 }
                                      );
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : "Failed to load balance");
                                    }
                                  }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  View payout balance
                                </DropdownMenuItem>
                              )}
                              {user.digger_id && <DropdownMenuSeparator />}
                              {user.is_suspended ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user.id);
                                    setActionType("unsuspend");
                                    setShowConfirmDialog(true);
                                  }}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Unsuspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user.id);
                                    setActionType("suspend");
                                    setShowConfirmDialog(true);
                                  }}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setActionType("delete_profile");
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete profile (keep account)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedUser(user.id);
                                  setActionType("delete");
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete user (entire account)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {totalFiltered > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalFiltered)} of {totalFiltered} user{totalFiltered !== 1 ? "s" : ""}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => { e.preventDefault(); if (page > 1) handlePageChange(page - 1); }}
                        className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        href="#"
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - page) <= 1) return true;
                        return false;
                      })
                      .map((p, i, arr) => (
                        <PaginationItem key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <PaginationEllipsis />
                          )}
                          <PaginationLink
                            onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
                            isActive={page === p}
                            href="#"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => { e.preventDefault(); if (page < totalPages) handlePageChange(page + 1); }}
                        className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        href="#"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-semibold">About Role Management</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Admin:</strong> Full access to all admin features, including user management, keyword requests, and system settings.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Moderator:</strong> Can manage content and moderate user activity, but cannot manage user roles.
                </p>
                <p className="text-sm text-muted-foreground">
                  Click on a role badge to remove it from a user. Use the "Add role" dropdown to assign new roles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "add" && "Add Role"}
              {actionType === "remove" && "Remove Role"}
              {actionType === "suspend" && "Suspend User"}
              {actionType === "unsuspend" && "Unsuspend User"}
              {actionType === "delete_profile" && "Delete Profile"}
              {actionType === "delete" && "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "add" && `Are you sure you want to add the "${selectedRole}" role to this user?`}
              {actionType === "remove" && `Are you sure you want to remove the "${selectedRole}" role from this user?`}
              {actionType === "suspend" && "The user will be blocked from signing in until unsuspended. Continue?"}
              {actionType === "unsuspend" && "The user will be able to sign in again. Continue?"}
              {actionType === "delete_profile" && "This will remove digger/gigger/telemarketer profile records and related role assignments, but keep the login account. This action cannot be undone. Continue?"}
              {actionType === "delete" && "This will permanently delete the user account (auth, profile, roles, and all data). This action cannot be undone. If deletion fails with only roles removed, run: supabase db push, then supabase functions deploy admin-manage-user. Continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setSelectedUser(null);
              setSelectedRole("");
              setActionType("add");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === "delete" || actionType === "delete_profile" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {actionType === "delete" || actionType === "delete_profile" ? "Delete" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
