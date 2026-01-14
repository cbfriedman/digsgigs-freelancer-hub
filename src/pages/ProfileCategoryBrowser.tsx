import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";

export default function ProfileCategoryBrowser() {
  return (
    <>
      <Helmet>
        <title>Create Your Profile — Select Categories | Digs & Gigs</title>
        <meta
          name="description"
          content="Select your professions and specialties to create your Digger profile"
        />
      </Helmet>

      <Navigation />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <CategoryBrowserWithDescription />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
