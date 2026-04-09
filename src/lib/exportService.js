/**
 * Export information to CSV format
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Desired name for the file
 * @param {Object} headersMap - Optional mapping for display names (e.g. { 'displayName': 'Nombre', 'uid': 'ID' })
 */
export const exportToCSV = (data, fileName = 'export', headersMap = null) => {
  if (!data || !data.length) {
    console.error('No data provided for export');
    return;
  }

  // 1. Determine headers
  const keys = headersMap ? Object.keys(headersMap) : Object.keys(data[0]);
  const headerRow = headersMap 
    ? Object.values(headersMap).join(',') 
    : keys.join(',');

  // 2. Format rows
  const csvRows = data.map(row => {
    return keys.map(key => {
      let value = row[key] === undefined || row[key] === null ? '' : row[key];
      
      // Handle objects/arrays (convert to string)
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }

      // Escape quotes and wrap in quotes for fields containing commas or quotes
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // 3. Combine header and rows with BOM for Excel UTF-8 support
  const csvString = '\uFEFF' + [headerRow, ...csvRows].join('\n');
  
  // 4. Create Blob and Trigger Download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
