import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Shield, UserCog, Users, RefreshCw, MoreVertical, UserX, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
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

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  user_type: string;
  created_at: string;
  roles: string[];
  is_suspended: boolean;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<"add" | "remove" | "suspend" | "unsuspend" | "delete">("add");

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

      // Get all user app roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_app_roles")
        .select("user_id, app_role");

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        user_type: profile.user_type,
        created_at: profile.created_at,
        roles: userRoles
          ?.filter(ur => ur.user_id === profile.id)
          .map(ur => ur.app_role) || [],
        is_suspended: profile.is_suspended ?? false,
      }));

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
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "suspend", userId: selectedUser },
      });
      if (error) throw error;
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
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "unsuspend", userId: selectedUser },
      });
      if (error) throw error;
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
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete", userId: selectedUser },
      });
      if (error) throw error;
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

  const confirmAction = () => {
    if (actionType === "add") handleAddRole();
    else if (actionType === "remove") handleRemoveRole();
    else if (actionType === "suspend") handleSuspendUser();
    else if (actionType === "unsuspend") handleUnsuspendUser();
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
      <Navigation />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>
                  View and manage roles for all registered users
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
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Roles</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "—"}
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
                                  setActionType("delete");
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
      <Footer />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "add" && "Add Role"}
              {actionType === "remove" && "Remove Role"}
              {actionType === "suspend" && "Suspend User"}
              {actionType === "unsuspend" && "Unsuspend User"}
              {actionType === "delete" && "Delete User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "add" && `Are you sure you want to add the "${selectedRole}" role to this user?`}
              {actionType === "remove" && `Are you sure you want to remove the "${selectedRole}" role from this user?`}
              {actionType === "suspend" && "The user will be blocked from signing in until unsuspended. Continue?"}
              {actionType === "unsuspend" && "The user will be able to sign in again. Continue?"}
              {actionType === "delete" && "This will permanently delete the user account. This action cannot be undone. Continue?"}
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
              className={actionType === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {actionType === "delete" ? "Delete" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
