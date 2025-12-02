import { useState } from "react";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, Plus, ChevronDown, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Pricing() {
  const navigate = useNavigate();
  const [createProfileDialog, setCreateProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const handleConfirmCreateProfile = () => {
    if (!newProfileName.trim()) {
      toast.error("Please enter a profile name");
      return;
    }
    sessionStorage.setItem('newProfileName', newProfileName.trim());
    setCreateProfileDialog(false);
    setNewProfileName('');
    // Stay on /pricing but scroll to top to show the profile name in the category browser
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Reload to pick up the sessionStorage value
    window.location.reload();
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Industry-Specific Lead Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Fair, transparent pricing based on real market value. Compare our exclusive and non-exclusive 
              lead costs to industry benchmarks—no hidden fees, no surprises.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Note: Prices fluctuate daily and are subject to change
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="mt-4" size="lg">
                  <Users className="mr-2 h-5 w-5" />
                  Add or View My Profiles
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-background">
                <DropdownMenuItem 
                  onClick={() => {
                    setNewProfileName('');
                    setCreateProfileDialog(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate("/my-profiles")}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View My Profiles
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <CategoryBrowserWithDescription />
        </div>
      </div>
    </div>

      {/* Create New Profile Dialog */}
      <Dialog open={createProfileDialog} onOpenChange={setCreateProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Enter a name for your new profile. This helps you identify different service offerings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pricing-new-profile-name">
                Profile Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pricing-new-profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g., Plumbing Services, Legal Consulting"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Examples: "Commercial Electrical", "Residential Plumbing", "Tax Services"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateProfileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateProfile} disabled={!newProfileName.trim()}>
              Continue to Browse Categories
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
