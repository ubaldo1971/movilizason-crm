/**
 * Geocoding service using OpenStreetMap Nominatim (Free)
 * Note: For production use with high volume, consider a paid service like Google Maps or Mapbox.
 */

export async function geocodeAddress(address, colonia = '', state = 'Sonora', country = 'México') {
  try {
    console.log(`🔍 Geocoding attempt: ${address}, ${colonia}`);
    
    // Attempt 1: Full specificity
    const queries = [
      `${address}, ${colonia}, ${state}, ${country}`,
      `${address}, ${state}, ${country}`,
      `${colonia}, ${state}, ${country}`
    ];

    for (const q of queries) {
      if (!q || q.startsWith(', ')) continue;
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'MovilizaSon-CRM-App'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          console.log(`✅ Geocoding success for: "${q}"`);
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
            success: true
          };
        }
      }
      // Wait a bit between retries to be nice to Nominatim
      await new Promise(r => setTimeout(r, 500));
    }

    console.warn('❌ Geocoding failed for all attempts');
    return { success: false, error: 'Address not found' };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { success: false, error: error.message };
  }
}
