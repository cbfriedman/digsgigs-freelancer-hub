import { Shield, Star, Clock, Users } from "lucide-react";

const PostGigTrustBanner = () => {
  return (
    <div className="mb-8">
      {/* Hero Section */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Let Contractors Compete for <span className="text-primary">Your Project</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Takes less than 60 seconds • Completely free
        </p>
      </div>

      {/* Trust Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col items-center p-3 bg-primary/5 rounded-lg">
          <Users className="h-5 w-5 text-primary mb-1" />
          <span className="text-xl font-bold">847+</span>
          <span className="text-xs text-muted-foreground text-center">Projects Posted</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-primary/5 rounded-lg">
          <Clock className="h-5 w-5 text-primary mb-1" />
          <span className="text-xl font-bold">4 hrs</span>
          <span className="text-xs text-muted-foreground text-center">Avg Response Time</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-primary/5 rounded-lg">
          <Star className="h-5 w-5 text-primary mb-1" />
          <span className="text-xl font-bold">4.8/5</span>
          <span className="text-xs text-muted-foreground text-center">Client Satisfaction</span>
        </div>
        <div className="flex flex-col items-center p-3 bg-primary/5 rounded-lg">
          <Shield className="h-5 w-5 text-primary mb-1" />
          <span className="text-xl font-bold">100%</span>
          <span className="text-xs text-muted-foreground text-center">Verified Pros</span>
        </div>
      </div>

      {/* Testimonial */}
      <div className="bg-muted/50 border rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">SK</span>
            </div>
          </div>
          <div>
            <p className="text-sm italic text-muted-foreground">
              "Posted my kitchen remodel and got 5 quotes within 24 hours. Saved over $3,000 by comparing bids!"
            </p>
            <p className="text-xs font-medium mt-1">— Sarah K., Denver, CO</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGigTrustBanner;
