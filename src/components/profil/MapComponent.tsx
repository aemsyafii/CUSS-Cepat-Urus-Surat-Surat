'use client';
import { useEffect, useRef, useState } from 'react';

// Koordinat default: Istana Negara IKN
const IKN_POS = { lat: -0.9730, lng: 116.7029 };

export default function MapComponent({
  initialPos,
  onConfirm,
  onCancel,
  previewOnly = false,
}: {
  initialPos?: { lat: number; lng: number } | null;
  onConfirm?: (pos: { lat: number; lng: number }) => void;
  onCancel?: () => void;
  previewOnly?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // Store the leaflet map instance so we can destroy it on unmount
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [pickedPos, setPickedPos] = useState<{ lat: number; lng: number } | null>(
    initialPos ?? null
  );

  // Re-center and update marker when initialPos changes (for previews)
  useEffect(() => {
    // Only proceed if map is ready and container is still in DOM
    if (leafletMapRef.current && initialPos && mapRef.current) {
      const { lat, lng } = initialPos;
      try {
        leafletMapRef.current.flyTo([lat, lng], 15);
      } catch (err) {
        console.warn('Map flyTo failed (likely unmounted):', err);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        import('leaflet').then((L) => {
          markerRef.current = L.marker([lat, lng]).addTo(leafletMapRef.current);
        });
      }
    }
  }, [initialPos]);

  useEffect(() => {
    if (!mapRef.current) return;
    // Prevent double-init in StrictMode
    if (leafletMapRef.current) return;

    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Guard again in case the component unmounted while importing
      if (!mapRef.current || leafletMapRef.current) return;

      // Fix missing icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const center = initialPos ?? IKN_POS;

      const map = L.map(mapRef.current!, {
        center: [center.lat, center.lng],
        zoom: 15,
        zoomControl: !previewOnly,
        dragging: !previewOnly,
        scrollWheelZoom: !previewOnly,
        doubleClickZoom: !previewOnly,
        touchZoom: !previewOnly,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OSM' }
      ).addTo(map);

      // Pasang marker awal (jika tidak ada, default ke IKN)
      const markerPos = initialPos ?? IKN_POS;
      markerRef.current = L.marker([markerPos.lat, markerPos.lng]).addTo(map);

      // Tambah marker jika klik (hanya mode interaktif)
      if (!previewOnly) {
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map);
          }

          setPickedPos({ lat, lng });
        });

        // Coba GPS jika belum ada titik
        if (!initialPos && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // Guard: Check if map still exists and isn't removed before flying
              if (leafletMapRef.current && mapRef.current) {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                try {
                  map.flyTo([p.lat, p.lng], 16, { animate: true });
                } catch (e) {
                  console.warn('Geolocation flyTo failed:', e);
                }
              }
            },
            (err) => console.warn('GPS Denied:', err),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      }

      leafletMapRef.current = map;
    });

    return () => {
      // Cleanup saat unmount — kunci pencegah crash StrictMode
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOnly]);

  return (
    <div className={`flex flex-col w-full h-full ${previewOnly ? 'pointer-events-none' : ''}`}>
      {/* Import CSS leaflet secara inline agar tidak ada server-side mismatch */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />

      <div
        ref={mapRef}
        style={{
          height: previewOnly ? '100%' : '350px',
          width: '100%',
          zIndex: 10,
          minHeight: previewOnly ? undefined : '350px',
        }}
      />

      {!previewOnly && onCancel && onConfirm && (
        <div className="p-4 bg-white border-t border-gray-100 flex gap-3 relative z-20">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-[14px] hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!pickedPos}
            onClick={() => pickedPos && onConfirm(pickedPos)}
            className="flex-1 py-3 bg-[#23C16B] text-white font-bold rounded-xl text-[14px] hover:bg-[#1fa95d] transition-colors shadow-[0_4px_14px_0_rgba(34,197,94,0.3)] disabled:opacity-50"
          >
            Konfirmasi Lokasi
          </button>
        </div>
      )}
    </div>
  );
}
