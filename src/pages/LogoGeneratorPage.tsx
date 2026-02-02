import { LogoGenerator } from "@/components/LogoGenerator";
import { Footer } from "@/components/Footer";

const LogoGeneratorPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Logo Generator</h1>
          <p className="text-muted-foreground">Generate a professional logo for Digs and Gigs</p>
        </div>
        <LogoGenerator />
      </main>
      <Footer />
    </div>
  );
};

export default LogoGeneratorPage;
