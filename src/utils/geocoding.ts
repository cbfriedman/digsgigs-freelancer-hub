/**
 * Geocoding utility using Mapbox Geocoding API
 */

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocodes an address string to latitude/longitude coordinates
 * @param address The address string to geocode
 * @returns Promise with coordinates and formatted address, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;
  
  if (!mapboxToken) {
    console.warn('Mapbox API key not configured. Skipping geocoding.');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results found for address:', address);
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;
    const formattedAddress = feature.place_name;

    return {
      latitude,
      longitude,
      formattedAddress
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Reverse geocodes coordinates to an address
 * @param latitude The latitude
 * @param longitude The longitude
 * @returns Promise with formatted address, or null if reverse geocoding fails
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;
  
  if (!mapboxToken) {
    console.warn('Mapbox API key not configured. Skipping reverse geocoding.');
    return null;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&limit=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Reverse geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.warn('No reverse geocoding results found');
      return null;
    }

    return data.features[0].place_name;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
