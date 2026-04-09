/**
 * Official Territorial Data for Sonora - MovilizaSon CRM
 * Mapping of Federal and Local Districts to their respective sections.
 */

export const FEDERAL_DISTRICTS = [
  { id: 'fed-1', name: 'Distrito Federal 1 (San Luis Río Colorado)' },
  { id: 'fed-2', name: 'Distrito Federal 2 (Nogales)' },
  { id: 'fed-3', name: 'Distrito Federal 3 (Hermosillo Norte)' },
  { id: 'fed-4', name: 'Distrito Federal 4 (Guaymas)' },
  { id: 'fed-5', name: 'Distrito Federal 5 (Hermosillo Sur)' },
  { id: 'fed-6', name: 'Distrito Federal 6 (Cajeme)' },
  { id: 'fed-7', name: 'Distrito Federal 7 (Navojoa)' }
];

export const LOCAL_DISTRICTS = Array.from({ length: 21 }, (_, i) => ({
  id: `loc-${i + 1}`,
  name: `Distrito Local ${i + 1}`
}));

// Initial mapping of sections to districts (expanded as needed)
export const DISTRICT_SECTIONS = {
  // Sample mapping for Demo
  'fed-1': ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008'],
  'fed-3': ['0395', '0396', '0397', '0440', '0441', '0442', '0443', '0444'],
  'fed-5': ['0445', '0446', '0448', '0450', '0451', '0452', '0453', '0454'],
  'loc-1': ['0001', '0002', '0003', '0004'],
  'loc-15': ['0450', '0451', '0452', '0453'],
  // Fallback for all other districts
};

export const getSectionsForDistrict = (districtId) => {
  return DISTRICT_SECTIONS[districtId] || [];
};
