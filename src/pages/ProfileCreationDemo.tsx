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

export default function ProfileCreationDemo() {
  const [photoUrl, setPhotoUrl] = useState("");
  const [companyName, setCompanyName] = useState("Elite Home Services");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState("Los Angeles, CA");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["Kitchen Remodeling", "Bathroom Renovation", "Custom Cabinets"]);
  const [profession, setProfession] = useState("Home Remodeling Contractor");

  return (
    <>
      <Helmet>
        <title>Profile Creation Demo - DigsandGigs</title>
        <meta name="description" content="See how to create your professional digger profile with AI-powered suggestions" />
      </Helmet>

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
                  <div className="space-y-2">
                    <Label>Specialties</Label>
                    <IndustryMultiSelector
                      selectedIndustries={selectedIndustries}
                      onIndustriesChange={setSelectedIndustries}
                    />
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
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
