// src/services/api.js
const API_BASE_URL = 'https://restdeluxe.bingoamigo.net/api/admin/bingo';

export const checkConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) throw new Error('Error en la conexión');
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const fetchStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) throw new Error('Error al obtener estadísticas');
    const data = await response.json();
    return data.data; // Asumiendo que el backend devuelve { success, data }
  } catch (error) {
    throw error;
  }
};

export const fetchRecentData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/recent-data`);
    if (!response.ok) throw new Error('Error al obtener datos recientes');
    const data = await response.json();
    return data.data;
  } catch (error) {
    throw error;
  }
};

export const searchTables = async (params) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/search?${queryString}`);
    if (!response.ok) throw new Error('Error en la búsqueda');
    const data = await response.json();
    return data.data;
  } catch (error) {
    throw error;
  }
};

// Consulta el rango de tablas entregadas entre dos fechas
export const fetchTableRangeByDate = async ({ fecha_inicio, fecha_fin }) => {
  try {
    const queryString = `fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`;
    const response = await fetch(`${API_BASE_URL}/table-range-by-date?${queryString}`);
    if (!response.ok) throw new Error('Error al consultar el rango de tablas');
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};