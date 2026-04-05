// mockMapData.js - Generador de coordenadas de prueba para Sonora
// Coordenadas base principales:
const centers = {
  hermosillo: [29.0892, -110.9613],
  obregon: [27.4828, -109.9304],
  nogales: [31.3086, -110.9422],
  navojoa: [27.0728, -109.4437],
  guaymas: [27.9179, -110.9089],
  slrc: [32.4519, -114.7651]
};

const activityTypes = [
  { type: 'lona', label: 'Lona Pegada', color: '#10b981' }, // Verde
  { type: 'brigada', label: 'Brigada Periódicos', color: '#800000' }, // Guinda
  { type: 'asamblea', label: 'Asamblea', color: '#38bdf8' } // Azul Claro
];

const generateRandomPoints = (count) => {
  const points = [];
  const cities = Object.keys(centers);

  for (let i = 0; i < count; i++) {
    // Escoger ciudad aleatoria base
    const city = cities[Math.floor(Math.random() * cities.length)];
    const [baseLat, baseLng] = centers[city];
    
    // Rango de dispersión aproximada a la mancha urbana (0.05 a 0.08 grados según la ciudad)
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lngOffset = (Math.random() - 0.5) * 0.08;

    const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)];

    points.push({
      id: `task-map-${i}`,
      lat: baseLat + latOffset,
      lng: baseLng + lngOffset,
      type: activity.type,
      label: activity.label,
      color: activity.color,
      assignee: `Brigada ${Math.floor(Math.random() * 50) + 1}`,
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toLocaleString()
    });
  }
  return points;
};

// Generamos 150 pines repartidos en sonora
export const mockActivities = generateRandomPoints(150);
