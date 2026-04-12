/**
 * INE Scanner Service — Firebase AI Logic (Gemini Vision)
 * Scans Mexican INE voter ID cards and extracts structured data.
 */
import { app } from '../firebaseConfig';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

// Initialize Firebase AI
const ai = getAI(app, { backend: new GoogleAIBackend() });

const model = getGenerativeModel(ai, {
  model: 'gemini-2.0-flash',
});

const INE_PROMPT = `Analiza esta imagen de una credencial INE (Instituto Nacional Electoral) de México.

Extrae los siguientes campos de la credencial. Si un campo no es legible o no existe, déjalo vacío "".

Responde ÚNICAMENTE con un objeto JSON válido, sin markdown, sin backticks, sin explicaciones. Solo el JSON:

{
  "nombre": "nombre(s) del titular",
  "apellidos": "apellido paterno y materno",
  "domicilio": "calle y número",
  "colonia": "colonia o localidad",
  "seccion": "número de sección electoral (4 dígitos)",
  "curp": "CURP si es visible",
  "claveElector": "clave de elector si es visible",
  "fechaNacimiento": "fecha de nacimiento si es visible",
  "sexo": "H o M si es visible",
  "estado": "estado de la república si es visible",
  "municipio": "municipio si es visible"
}`;

/**
 * Scans an INE image (base64 data URL) and returns extracted fields.
 * @param {string} base64DataUrl - The image as a data URL (data:image/jpeg;base64,...)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function scanINE(base64DataUrl) {
  try {
    // Extract the base64 data and MIME type from the data URL
    const [header, base64Data] = base64DataUrl.split(',');
    const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };

    const result = await model.generateContent([INE_PROMPT, imagePart]);
    const response = result.response;
    const text = response.text().trim();

    // Parse JSON response — strip any accidental markdown fences
    let cleanText = text;
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(cleanText);

    return {
      success: true,
      data: {
        displayName: data.nombre || '',
        surname: data.apellidos || '',
        address: data.domicilio || '',
        colonia: data.colonia || '',
        sectionNumber: data.seccion || '',
        curp: data.curp || '',
        claveElector: data.claveElector || '',
        fechaNacimiento: data.fechaNacimiento || '',
        sexo: data.sexo || '',
        estado: data.estado || '',
        municipio: data.municipio || '',
      },
      raw: data,
    };
  } catch (err) {
    console.error('INE scan error:', err);

    // Specific error handling for Quota/Auth
    if (err.message?.includes('429') || err.message?.includes('Quota')) {
      return { success: false, error: '[ERR-IA-429] Límite de cuota excedido en Google Cloud. Usa captura manual.' };
    }
    if (err.message?.includes('403') || err.message?.includes('permission')) {
      return { success: false, error: '[ERR-IA-403] Permisos denegados. Revisa la consola de Google Cloud.' };
    }
    if (err.message?.includes('JSON')) {
      return { success: false, error: '[ERR-IA-JSON] No se pudo leer la respuesta de la IA. Intenta otra foto.' };
    }
    if (err.message?.includes('network') || err.message?.includes('fetch')) {
      return { success: false, error: '[ERR-IA-NET] Error de comunicación con el servidor de IA.' };
    }

    return { success: false, error: '[ERR-IA-UNK] Error desconocido: ' + (err.message?.slice(0, 50) || 'no-info') };
  }
}

/**
 * Checks if the device has an active internet connection
 */
export function isOnline() {
  return navigator.onLine;
}
