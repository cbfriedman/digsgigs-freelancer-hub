// Structured Data Generators for Schema.org JSON-LD

interface LocalBusinessData {
  name?: string;
  description?: string;
  url?: string;
  telephone?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceRange?: string;
  image?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

interface ServiceData {
  name: string;
  description: string;
  provider: {
    name: string;
    url?: string;
  };
  areaServed?: string;
  serviceType?: string;
  priceRange?: string;
}

interface ReviewData {
  itemReviewed: {
    name: string;
    type: string;
  };
  author: {
    name: string;
  };
  reviewRating: {
    ratingValue: number;
    bestRating?: number;
  };
  reviewBody?: string;
  datePublished?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "digsandgigs",
    "url": "https://digsandgigs.com",
    "logo": "https://digsandgigs.com/logo.png",
    "description": "Connect skilled service professionals (diggers) with clients seeking local services. Post gigs, browse qualified diggers, and grow your business.",
    "sameAs": [
      "https://facebook.com/digsandgigs",
      "https://twitter.com/digsandgigs",
      "https://linkedin.com/company/digsandgigs"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "email": "support@digsandgigs.com",
      "availableLanguage": "English"
    }
  };
};

export const generateWebsiteSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "digsandgigs",
    "url": "https://digsandgigs.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://digsandgigs.com/browse-gigs?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
};

export const generateLocalBusinessSchema = (data: LocalBusinessData) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": data.url,
    "name": data.name,
    "description": data.description,
    "url": data.url,
  };

  if (data.telephone) schema.telephone = data.telephone;
  if (data.priceRange) schema.priceRange = data.priceRange;
  if (data.image) {
    schema.image = data.image;
    schema.logo = data.image;
  }

  if (data.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...data.address
    };
  }

  if (data.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: data.geo.latitude,
      longitude: data.geo.longitude
    };
  }

  if (data.aggregateRating && data.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: data.aggregateRating.ratingValue,
      reviewCount: data.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1
    };
  }

  return schema;
};

export const generateServiceSchema = (data: ServiceData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": data.name,
    "description": data.description,
    "provider": {
      "@type": "Organization",
      "name": data.provider.name,
      "url": data.provider.url
    },
    "areaServed": data.areaServed,
    "serviceType": data.serviceType,
    "priceRange": data.priceRange
  };
};

export const generateReviewSchema = (data: ReviewData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": data.itemReviewed.type,
      "name": data.itemReviewed.name
    },
    "author": {
      "@type": "Person",
      "name": data.author.name
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": data.reviewRating.ratingValue,
      "bestRating": data.reviewRating.bestRating || 5
    },
    "reviewBody": data.reviewBody,
    "datePublished": data.datePublished
  };
};

export const generateBreadcrumbSchema = (items: BreadcrumbItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
};

export const generateJobPostingSchema = (data: {
  title: string;
  description: string;
  location: string;
  datePosted: string;
  validThrough?: string;
  baseSalary?: {
    value: number;
    currency: string;
    unitText: string;
  };
}) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": data.title,
    "description": data.description,
    "datePosted": data.datePosted,
    "hiringOrganization": {
      "@type": "Organization",
      "name": "digsandgigs"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": data.location
      }
    }
  };

  if (data.validThrough) schema.validThrough = data.validThrough;
  
  if (data.baseSalary) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      "currency": data.baseSalary.currency,
      "value": {
        "@type": "QuantitativeValue",
        "value": data.baseSalary.value,
        "unitText": data.baseSalary.unitText
      }
    };
  }

  return schema;
};

export const generateFAQSchema = (questions: Array<{ question: string; answer: string }>) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map(q => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer
      }
    }))
  };
};
