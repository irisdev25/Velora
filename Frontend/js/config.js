// frontend/js/config.js
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : '';
const API_URL = `${BASE_URL}/api`;

// Función helper para obtener el token
const getToken = () => localStorage.getItem('token');

// Función para hacer fetch con autenticación
const fetchWithAuth = async (url, options = {}) => {
    const token = getToken();
    
    return fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    });
};