import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateReviewSchema } from "@/components/StructuredData";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Calendar, User, Eye, Clock, Share2, Facebook, Twitter, Linkedin, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  published_at: string;
  views_count: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  author: {
    id: string;
    full_name: string | null;
    email: string;
  };
  category: {
    name: string;
    slug: string;
  } | null;
  tags: Array<{
    name: string;
    slug: string;
  }>;
}

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);

    // Increment view count
    try {
      await supabase.rpc("increment_blog_post_views", { post_slug: slug });
    } catch (err) {
      console.error("Error incrementing views:", err);
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:profiles!author_id(id, full_name, email),
        category:blog_categories!category_id(name, slug),
        blog_post_tags(
          tag:blog_tags(name, slug)
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !data) {
      console.error("Error fetching post:", error);
      toast.error("Post not found");
      navigate("/blog");
      return;
    }

    const formattedPost = {
      ...data,
      tags: data.blog_post_tags?.map((pt: any) => pt.tag).filter(Boolean) || [],
    };

    setPost(formattedPost);
    
    // Fetch related posts
    if (data.category_id) {
      fetchRelatedPosts(data.category_id, data.id);
    }

    setLoading(false);
  };

  const fetchRelatedPosts = async (categoryId: string, currentPostId: string) => {
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        id, title, slug, excerpt, featured_image, published_at,
        category:blog_categories!category_id(name, slug)
      `)
      .eq("category_id", categoryId)
      .eq("status", "published")
      .neq("id", currentPostId)
      .order("published_at", { ascending: false })
      .limit(3);

    setRelatedPosts(data || []);
  };

  const shareOnSocial = (platform: string) => {
    const url = window.location.href;
    const text = post?.title || "";

    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const readingTime = Math.ceil(post.content.split(" ").length / 200);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        keywords={post.meta_keywords || post.tags.map((t) => t.name).join(", ")}
        ogType="article"
        ogImage={post.featured_image || undefined}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt,
          "image": post.featured_image,
          "datePublished": post.published_at,
          "author": {
            "@type": "Person",
            "name": post.author?.full_name || "Anonymous"
          },
          "publisher": {
            "@type": "Organization",
            "name": "digsandgigs",
            "logo": {
              "@type": "ImageObject",
              "url": "https://digsandgigs.com/logo.png"
            }
          }
        }}
      />

      <article className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Article Header */}
            <header className="mb-8 space-y-6">
              {post.category && (
                <Badge className="mb-4">{post.category.name}</Badge>
              )}
              
              <h1 className="text-4xl md:text-5xl font-bold">{post.title}</h1>
              
              <p className="text-xl text-muted-foreground">{post.excerpt}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {post.author?.full_name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {post.author?.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs">Author</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} min read</span>
                </div>

                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.views_count} views</span>
                </div>
              </div>

              {/* Social Sharing */}
              <div className="flex items-center gap-2 pt-4">
                <Share2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Share:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial("facebook")}
                  className="gap-2"
                >
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial("twitter")}
                  className="gap-2"
                >
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareOnSocial("linkedin")}
                  className="gap-2"
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Featured Image */}
            {post.featured_image && (
              <div className="mb-12 rounded-lg overflow-hidden">
                <OptimizedImage
                  src={post.featured_image}
                  alt={post.title}
                  width={1200}
                  height={630}
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                  className="w-full h-auto"
                />
              </div>
            )}

            {/* Article Content - sanitized for XSS protection */}
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t">
                <h3 className="text-sm font-semibold mb-4">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag.slug}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => navigate(`/blog?tag=${tag.slug}`)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Author Bio */}
            <Card className="mt-12">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl">
                      {post.author?.full_name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-bold mb-2">
                      About {post.author?.full_name || "the Author"}
                    </h3>
                    <p className="text-muted-foreground">
                      Content creator at digsandgigs, passionate about helping service professionals grow their businesses.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Card
                    key={relatedPost.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => navigate(`/blog/${relatedPost.slug}`)}
                  >
                    {relatedPost.featured_image && (
                      <div className="h-40 overflow-hidden">
                        <OptimizedImage
                          src={relatedPost.featured_image}
                          alt={relatedPost.title}
                          width={400}
                          height={300}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-bold line-clamp-2 mb-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
