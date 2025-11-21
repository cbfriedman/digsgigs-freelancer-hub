import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ProfileTitleTaglineEditor } from "@/components/ProfileTitleTaglineEditor";
import { DiggerProfileCard } from "@/components/DiggerProfileCard";
import { IndustryMultiSelector } from "@/components/IndustryMultiSelector";
import { Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";

export default function ProfileCreationDemo() {
  const [photoUrl, setPhotoUrl] = useState("");
  const [companyName, setCompanyName] = useState("Elite Home Services");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState("Los Angeles, CA");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["Kitchen Remodeling", "Bathroom Renovation", "Custom Cabinets"]);
  const [profession, setProfession] = useState("Home Remodeling Contractor");
  const [offersFreEstimates, setOffersFreEstimates] = useState(false);

  return (
    <>
      <Helmet>
        <title>Profile Creation Demo - DigsandGigs</title>
        <meta name="description" content="See how to create your professional digger profile with AI-powered suggestions" />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Briefcase className="h-8 w-8 text-primary" />
              Create Your Digs Profile
            </h1>
            <p className="text-muted-foreground">
              Build a professional profile with AI-powered suggestions
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Fill in your details and let AI help you craft the perfect profile
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Photo Upload */}
                  <ProfilePhotoUpload
                    currentPhotoUrl={photoUrl}
                    onPhotoChange={setPhotoUrl}
                    companyName={companyName}
                  />

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your Business Name"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State"
                    />
                  </div>

                  {/* Profession */}
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <Input
                      id="profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Your Profession"
                    />
                  </div>

                  {/* Keywords/Specialties */}
                  <div className="space-y-3">
                    <Label>Specialties</Label>
                    
                    <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        ⚠️ Important: Lead Matching Criteria
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>You will only receive leads that contain your selected specialties.</strong> To maximize your lead opportunities, we recommend selecting all available specialty keywords related to your profession or creating your own custom keywords.
                      </p>
                    </div>
                    
                    <IndustryMultiSelector
                      selectedIndustries={selectedIndustries}
                      onIndustriesChange={setSelectedIndustries}
                    />
                  </div>

                  {/* Free Estimates Option */}
                  <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <Checkbox 
                      id="free_estimates" 
                      checked={offersFreEstimates}
                      onCheckedChange={(checked) => setOffersFreEstimates(checked === true)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="free_estimates" className="font-semibold cursor-pointer flex items-center gap-2">
                        Offer Free Estimates
                        <Badge variant="secondary" className="text-xs">Priority Placement</Badge>
                      </Label>
                      <div className="space-y-2 mt-2">
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          ⚠️ $50 charge per free estimate request (both exclusive & non-exclusive leads)
                        </p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">Benefits:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Priority placement in exclusive lead rotations</li>
                            <li>Higher conversion rates with clients</li>
                            <li>Build trust and credibility</li>
                            <li>Competitive advantage</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Title & Tagline</CardTitle>
                  <CardDescription>
                    Use AI to generate compelling titles and taglines
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileTitleTaglineEditor
                    title={title}
                    tagline={tagline}
                    onTitleChange={setTitle}
                    onTaglineChange={setTagline}
                    companyName={companyName}
                    profession={profession}
                    keywords={selectedIndustries}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className="lg:sticky lg:top-8 h-fit">
            <DiggerProfileCard
              photoUrl={photoUrl}
              title={title}
              tagline={tagline}
              companyName={companyName}
              location={location}
              keywords={selectedIndustries}
              profession={profession}
              offersFreEstimates={offersFreEstimates}
            />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
