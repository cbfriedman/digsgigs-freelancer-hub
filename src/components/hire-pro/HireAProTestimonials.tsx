import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "Found an amazing developer in 24 hours. The quality of proposals was incredible.",
    author: "Sarah M.",
    role: "Startup Founder",
    rating: 5,
  },
  {
    quote: "Finally, a platform that doesn't take a huge cut. My freelancers are happier and deliver better work.",
    author: "Michael R.",
    role: "Agency Owner",
    rating: 5,
  },
  {
    quote: "The US-based talent pool is a game changer. No more timezone headaches.",
    author: "Jennifer L.",
    role: "Marketing Director",
    rating: 5,
  },
];

export function HireAProTestimonials() {
  return (
    <section className="section-padding bg-gradient-subtle">
      <div className="container-wide">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
            Trusted by Clients
          </span>
          <h2 className="mb-4">What Clients Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 bg-card border-border/50 shadow-card">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground mb-4 leading-relaxed">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
