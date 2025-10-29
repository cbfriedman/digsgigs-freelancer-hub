import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";

const Contact = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    // Simulate form submission (you can replace this with actual API call)
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Get in Touch</CardTitle>
                <CardDescription>
                  Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="What is this regarding?"
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us more about your inquiry..."
                      required
                      rows={6}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {formData.message.length}/1000
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">Contact Information</h2>
              <p className="text-muted-foreground mb-8">
                We're here to help! Whether you're a digger looking to grow your business or a client seeking the perfect freelancer, our team is ready to assist you.
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email Us</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        For general inquiries and support
                      </p>
                      <a href="mailto:support@digsandgiggs.com" className="text-primary hover:underline">
                        support@digsandgiggs.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Call Us</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Monday - Friday, 9am - 6pm EST
                      </p>
                      <a href="tel:+15551234567" className="text-primary hover:underline">
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Live Chat</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Get instant help from our support team
                      </p>
                      <Button variant="link" className="p-0 h-auto text-primary">
                        Start a conversation →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-secondary/30 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Before reaching out, check our FAQ section for quick answers to common questions.
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                View FAQs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;