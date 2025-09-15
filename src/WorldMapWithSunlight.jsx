import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Lightweight interactive world map with a real-time sunlight (day/night) overlay.
// The overlay updates once a minute to reflect Earth's rotation.

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIB = '© OpenStreetMap contributors';

// Compute subsolar point (lat, lon) given a Date.
// Uses simplified solar position approximations adequate for a day/night terminator.
function getSubsolarPoint(date) {
  // Algorithm adapted from NOAA/USNO approximations; simplified for overlay purposes
  const rad = Math.PI / 180;
  const dayMs = 1000 * 60 * 60 * 24;
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0); // J2000 epoch
  const d = (date.getTime() - J2000) / dayMs; // days since J2000

  // Mean longitude and anomaly (degrees)
  const L = (280.460 + 0.9856474 * d) % 360; // mean longitude
  const g = (357.528 + 0.9856003 * d) % 360; // mean anomaly

  // Ecliptic longitude (degrees)
  const lambda = L + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad);

  // Obliquity of the ecliptic (degrees)
  const epsilon = 23.439 - 0.0000004 * d;

  // Declination (degrees)
  const sinDec = Math.sin(epsilon * rad) * Math.sin(lambda * rad);
  const dec = Math.asin(sinDec) / rad;

  // Right ascension (degrees)
  const y = Math.cos(epsilon * rad) * Math.sin(lambda * rad);
  const x = Math.cos(lambda * rad);
  let ra = Math.atan2(y, x) / rad; // degrees
  if (ra < 0) ra += 360;

  // Greenwich Mean Sidereal Time (degrees)
  const GMST = (280.46061837 + 360.98564736629 * d) % 360;

  // Subsolar longitude (degrees East)
  let lon = (ra - GMST) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;

  // Subsolar latitude is declination
  const lat = dec;
  return { lat, lon };
}

// Draw night mask on a canvas overlay given subsolar point.
function drawSunlightMask(canvas, map, subsolar) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;

  ctx.clearRect(0, 0, width, height);

  // For each pixel, determine if it's in daylight (cosine of solar zenith > 0)
  // We'll draw a semi-transparent night mask (darkens the night side).
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const rad = Math.PI / 180;
  const subLat = subsolar.lat * rad;
  const subLon = subsolar.lon * rad;

  // Sample every n pixels for performance; simple nearest fill.
  const step = 2; // tradeoff detail/perf
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const latlng = map.layerPointToLatLng(L.point(x, y));
      const lat = latlng.lat * rad;
      const lon = latlng.lng * rad;

      // Cosine of angular distance between point and subsolar point
      const cosc = Math.sin(lat) * Math.sin(subLat) + Math.cos(lat) * Math.cos(subLat) * Math.cos(lon - subLon);
      const isDay = cosc > 0; // day if sun above horizon

      const alpha = isDay ? 0 : 90; // 0-255 alpha, 90 ~ 35% opacity night

      for (let yy = 0; yy < step && y + yy < height; yy++) {
        for (let xx = 0; xx < step && x + xx < width; xx++) {
          const idx = ((y + yy) * width + (x + xx)) * 4;
          data[idx] = 0;     // R
          data[idx + 1] = 0; // G
          data[idx + 2] = 0; // B
          data[idx + 3] = alpha; // A
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export default function WorldMapWithSunlight() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Leaflet map
    const map = L.map(mapRef.current, {
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 6,
      zoomControl: true,
    }).setView([20, 0], 2);

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIB }).addTo(map);

    // Create a canvas overlay sitting on top of the map pane
    const overlay = document.createElement('canvas');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.pointerEvents = 'none';

    const overlayPane = map.getPanes().overlayPane;
    overlayPane.appendChild(overlay);

    function render() {
      const subsolar = getSubsolarPoint(new Date());
      drawSunlightMask(overlay, map, subsolar);
    }

    // Re-render on map move/resize to keep mask aligned
    const rerender = () => render();
    map.on('move zoom resize', rerender);

    // Initial draw and interval update every minute
    render();
    const interval = setInterval(render, 60 * 1000);

    mapInstanceRef.current = map;
    overlayRef.current = overlay;

    return () => {
      clearInterval(interval);
      map.off('move zoom resize', rerender);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      map.remove();
    };
  }, []);

  return (
    <div className="backdrop-blur-lg border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px' }}>
      <h2 className="text-lg font-semibold" style={{ color: '#ffffff', marginBottom: '8px' }}>World Map with Sunlight</h2>
      <div ref={mapRef} style={{ width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden' }} />
    </div>
  );
}


