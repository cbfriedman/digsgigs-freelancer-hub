import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  items: Array<{
    id: string;
    location_lat?: number | null;
    location_lng?: number | null;
    title?: string;
  }>;
  onMarkerClick?: (id: string) => void;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

export const MapView = ({ 
  items, 
  onMarkerClick,
  centerLat = 39.8283,
  centerLng = -98.5795,
  zoom = 4
}: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const validItems = items.filter(item => 
      item.location_lat != null && 
      item.location_lng != null
    );

    validItems.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="hsl(var(--primary))" stroke="white" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`;
      
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(item.id);
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([item.location_lng!, item.location_lat!])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    if (validItems.length > 0 && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      validItems.forEach(item => {
        bounds.extend([item.location_lng!, item.location_lat!]);
      });
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [items, onMarkerClick]);

  useEffect(() => {
    if (mapRef.current && centerLat && centerLng) {
      mapRef.current.flyTo({
        center: [centerLng, centerLat],
        zoom: zoom,
      });
    }
  }, [centerLat, centerLng, zoom]);

  if (!mapboxToken) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Map functionality requires Mapbox configuration. Please add your MAPBOX_PUBLIC_KEY.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-[600px]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </Card>
  );
};
