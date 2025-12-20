import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Blog topic templates for SEO-focused content
const BLOG_TOPICS = [
  // Cost Guides
  "How Much Does {service} Cost in 2025? Complete Pricing Guide",
  "Average {service} Prices: What to Expect in Your Area",
  "{service} Cost Breakdown: Labor, Materials, and Hidden Fees",
  
  // Hiring Guides
  "How to Hire the Best {service} Professional: A Complete Guide",
  "10 Questions to Ask Before Hiring a {service} Expert",
  "What to Look for When Hiring a {service} Contractor",
  "Red Flags to Avoid When Hiring {service} Services",
  
  // DIY vs Pro
  "{service}: When to DIY vs Hire a Professional",
  "Can You DIY {service}? Pros, Cons, and Expert Tips",
  
  // Seasonal
  "Best Time of Year to Hire {service} Services",
  "Preparing Your Home for {service} Season",
  
  // Tips & Advice
  "Top 10 {service} Tips Every Homeowner Should Know",
  "Common {service} Mistakes and How to Avoid Them",
  "{service} Maintenance: A Homeowner's Complete Guide",
  
  // Comparisons
  "{service} vs Related Services: Which Do You Need?",
  "Local vs National {service} Companies: Pros and Cons",
  
  // Industry Trends
  "{service} Industry Trends for 2025",
  "New Technologies Changing {service} Services",
  "Sustainable {service}: Eco-Friendly Options for Your Home"
];

const INDUSTRIES_AND_SERVICES = {
  "Construction & Home Services": ["Plumbing", "HVAC", "Roofing", "Electrical", "Landscaping", "Painting", "Flooring", "Handyman Services"],
  "Cleaning & Maintenance": ["House Cleaning", "Carpet Cleaning", "Window Cleaning", "Pressure Washing", "Pool Cleaning"],
  "Legal Services": ["Personal Injury", "Family Law", "Estate Planning", "Real Estate Law"],
  "Financial Services & Accounting": ["Tax Preparation", "Bookkeeping", "Financial Planning"],
  "Technology Services": ["Web Development", "IT Support", "SEO Services", "Digital Marketing"],
  "Automotive Services": ["Auto Repair", "Oil Change", "Auto Detailing"],
  "Pet Care": ["Dog Walking", "Pet Grooming", "Pet Sitting"],
  "Moving & Storage": ["Local Moving", "Long Distance Moving", "Junk Removal"]
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automated blog generation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pick random industry and service
    const industries = Object.keys(INDUSTRIES_AND_SERVICES);
    const randomIndustry = industries[Math.floor(Math.random() * industries.length)];
    const services = INDUSTRIES_AND_SERVICES[randomIndustry as keyof typeof INDUSTRIES_AND_SERVICES];
    const randomService = services[Math.floor(Math.random() * services.length)];
    
    // Pick random topic template
    const topicTemplate = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];
    const topic = topicTemplate.replace(/{service}/g, randomService);
    
    console.log(`Generating blog post: ${topic}`);

    // Generate blog content using Lovable AI
    const systemPrompt = `You are an expert SEO content writer for DigsandGigs, a platform connecting homeowners with local service professionals. 
    
Write engaging, informative blog posts that:
- Are optimized for search engines (include relevant keywords naturally)
- Provide genuine value to readers
- Include actionable tips and advice
- Reference the benefits of using DigsandGigs to find professionals
- Use a friendly, professional tone
- Include relevant statistics when possible

Always return your response in this exact JSON format:
{
  "title": "SEO-optimized title under 60 characters",
  "slug": "url-friendly-slug",
  "excerpt": "Compelling excerpt under 160 characters",
  "content": "Full blog post content in Markdown format (1000-1500 words)",
  "meta_title": "SEO meta title",
  "meta_description": "SEO meta description under 160 characters",
  "meta_keywords": "comma, separated, keywords"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write a comprehensive blog post about: "${topic}". The post should be informative, engaging, and optimized for search engines. Include practical tips, cost ranges if applicable, and encourage readers to use DigsandGigs to find trusted professionals.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content generated from AI');
    }

    // Parse the JSON response
    let blogData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        blogData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Create fallback blog data
      blogData = {
        title: topic,
        slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
        excerpt: `Learn everything you need to know about ${randomService.toLowerCase()} services.`,
        content: content,
        meta_title: topic,
        meta_description: `Complete guide to ${randomService.toLowerCase()} services and costs.`,
        meta_keywords: `${randomService.toLowerCase()}, home services, professionals, hiring guide`
      };
    }

    // Get or create a "General" category
    let categoryId = null;
    const { data: existingCategory } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('name', randomIndustry)
      .single();
    
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory } = await supabase
        .from('blog_categories')
        .insert({
          name: randomIndustry,
          slug: randomIndustry.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: `Articles about ${randomIndustry}`
        })
        .select('id')
        .single();
      
      if (newCategory) {
        categoryId = newCategory.id;
      }
    }

    // Create unique slug with timestamp
    const timestamp = Date.now();
    const uniqueSlug = `${blogData.slug}-${timestamp}`;

    // Insert the blog post
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: blogData.title,
        slug: uniqueSlug,
        excerpt: blogData.excerpt,
        content: blogData.content,
        meta_title: blogData.meta_title,
        meta_description: blogData.meta_description,
        meta_keywords: blogData.meta_keywords,
        category_id: categoryId,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id, title, slug')
      .single();

    if (insertError) {
      console.error('Error inserting blog post:', insertError);
      throw insertError;
    }

    console.log(`Successfully created blog post: ${newPost.title}`);

    // Log to generation history
    await supabase
      .from('blog_generation_history')
      .insert({
        topic: topic,
        post_id: newPost.id,
        status: 'success',
        settings_snapshot: { industry: randomIndustry, service: randomService }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        post: newPost,
        message: `Generated blog post: ${newPost.title}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-generate-blog:', error);
    
    // Log failure
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('blog_generation_history')
      .insert({
        topic: 'auto-generation',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
