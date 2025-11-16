import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
// @ts-ignore - react-map-gl types
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapViewProps {
  items: Array<{
    id: string;
    location_lat?: number;
    location_lng?: number;
    title?: string;
    handle?: string;
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
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: centerLng,
    latitude: centerLat,
    zoom: zoom
  });

  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_KEY;

  useEffect(() => {
    // Update map center when center coordinates change
    if (centerLat && centerLng) {
      setViewState(prev => ({
        ...prev,
        latitude: centerLat,
        longitude: centerLng
      }));
    }
  }, [centerLat, centerLng]);

  if (!mapboxToken) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Map view requires Mapbox configuration. Please add your Mapbox public key.
        </p>
      </Card>
    );
  }

  const validItems = items.filter(item => 
    item.location_lat && 
    item.location_lng &&
    !isNaN(item.location_lat) && 
    !isNaN(item.location_lng)
  );

  return (
    <Card className="overflow-hidden h-[600px]">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
      >
        <NavigationControl position="top-right" />
        
        {validItems.map((item) => (
          <Marker
            key={item.id}
            longitude={item.location_lng!}
            latitude={item.location_lat!}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick?.(item.id);
            }}
          >
            <div className="cursor-pointer transform hover:scale-110 transition-transform">
              <MapPin className="h-8 w-8 text-primary fill-primary/20" />
            </div>
          </Marker>
        ))}
      </Map>
    </Card>
  );
};
