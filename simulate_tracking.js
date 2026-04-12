/**
 * MOVILIZASON CRM - MÓDULO DE SIMULACIÓN TÁCTICA
 * Este script simula el movimiento de un brigadista en tiempo real 
 * actualizando la colección 'active_locations' en Firestore.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvf6SWDYxdUyvNm4xqR0R7yc5i8RvMhGs",
  authDomain: "movilizason-crm-ubaldo.firebaseapp.com",
  projectId: "movilizason-crm-ubaldo",
  storageBucket: "movilizason-crm-ubaldo.firebasestorage.app",
  messagingSenderId: "1007940051790",
  appId: "1:1007940051790:web:e13b7ace132438df3c741f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuración de la ruta (Simulamos una patrulla por Hermosillo Centro)
const baseLat = 29.0825;
const baseLng = -110.9625;
const steps = 60; // 5 minutos aprox (60 * 5 segundos)
const name = "Unidad Bravo-01 (Simulado)";
const brigade = "Brigada Hermosillo Norte";
const color = "#00f2ff"; // Cyan táctico

console.log("🚀 Iniciando Simulación de Rastreo Táctico...");
console.log(`📍 Punto de inicio: ${baseLat}, ${baseLng}`);
console.log("📡 Conectando con Nodo Central...");

async function updateLocation(step) {
  // Simular movimiento zig-zag suave
  const offsetLat = (step * 0.0001) + (Math.sin(step * 0.5) * 0.00005);
  const offsetLng = (step * 0.00015) + (Math.cos(step * 0.5) * 0.00005);
  
  const currentLat = baseLat + offsetLat;
  const currentLng = baseLng + offsetLng;

  try {
    await setDoc(doc(db, "active_locations", "sim_001"), {
      userId: "sim_001",
      displayName: name,
      brigadeName: brigade,
      color: color,
      role: "Brigadista",
      lat: currentLat,
      lng: currentLng,
      timestamp: serverTimestamp(),
      accuracy: 10,
      active: true,
      lastUpdate: new Date().toISOString()
    });
    
    console.log(`[PASO ${step}/${steps}] ✅ Ubicación transmitida: ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`);
  } catch (err) {
    console.error("❌ Error en telemetría:", err);
  }
}

let currentStep = 0;
const interval = setInterval(async () => {
  if (currentStep >= steps) {
    console.log("🏁 Simulación completada satisfactoriamente.");
    clearInterval(interval);
    process.exit(0);
  }
  await updateLocation(currentStep);
  currentStep++;
}, 5000); // Intervalo de 5 segundos para demo fluida
