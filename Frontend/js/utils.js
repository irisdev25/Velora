/**
 * utils.js - Funciones de utilidad comunes para el Frontend
 */

// Crear y añadir el contenedor de Toasts al body si no existe
const createToastContainer = () => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
};

/**
 * Muestra una notificación tipo Toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success', 'error', 'warning', o 'info'
 * @param {number} duration - Duración en milisegundos
 */
const showToast = (message, type = 'info', duration = 3000) => {
  const container = createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icono según el tipo
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';
  if (type === 'warning') icon = 'alert-triangle';

  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${icon}"></i>
    </div>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  
  // Inicializar icono de Lucide si está disponible
  if (window.lucide) {
    window.lucide.createIcons({
        attrs: {
            'stroke-width': 2.5
        }
    });
  }

  // Animación de entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remover después de que pase el tiempo
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, duration);
};

// Gestión de Temas
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return savedTheme;
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    console.log('Theme changed to:', newTheme);
    updateToggleIcons();
    
    return newTheme;
};

const updateToggleIcons = () => {
    // Buscar todos los botones de tema (pueden tener diferentes clases)
    const toggleButtons = document.querySelectorAll('.theme-toggle, .dash-theme-btn');
    
    if (toggleButtons.length > 0 && window.lucide) {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        toggleButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                // Si es light mode, mostrar icono de luna para cambiar a dark
                // Si es dark mode, mostrar icono de sol para cambiar a light
                icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
            }
        });
        
        window.lucide.createIcons();
    }
};

/**
 * Alterna el estado de carga de un botón
 * @param {HTMLElement} button - El elemento botón
 * @param {boolean} isLoading - Si está cargando o no
 * @param {string} originalText - Texto original del botón (opcional)
 */
const toggleButtonLoading = (button, isLoading, originalText = '') => {
  if (!button) return;
  
  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = originalText || button.innerHTML;
    }
    button.classList.add('btn-loading');
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Procesando...';
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    button.innerHTML = button.dataset.originalText;
  }
};

/**
 * Normaliza fechas de entrada a formato ISO YYYY-MM-DD
 */
const normalizeDateToIso = (dateInput) => {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];
    
    let dateStr = String(dateInput).trim();
    if (!dateStr) return null;
    if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
    
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/').map(p => p.trim());
        if (parts.length === 3) {
            const [p0, p1, p2] = parts;
            if (/^\d{1,2}$/.test(p0) && /^\d{1,2}$/.test(p1) && /^\d{4}$/.test(p2)) {
                return `${p2}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
            }
            if (/^\d{4}$/.test(p0) && /^\d{1,2}$/.test(p1) && /^\d{1,2}$/.test(p2)) {
                return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
            }
        }
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : null;
};

/**
 * Formatea fecha ISO a DD/MM/YYYY
 */
const formatDateSpanish = (isoDate) => {
    const normalized = normalizeDateToIso(isoDate);
    if (!normalized) return 'Fecha no disponible';
    const [y, m, d] = normalized.split('-');
    return `${d}/${m}/${y}`;
};

/**
 * Obtiene parámetro de URL (Soporta Hash y Query)
 */
const getUrlParam = (name) => {
    // 1. Intentar desde el Hash (Velora usa esto para evitar redirecciones del servidor)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const fromHash = hashParams.get(name);
    if (fromHash) return fromHash;

    // 2. Intentar desde el Query String normal
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

/**
 * Formatea moneda
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

/**
 * Obtiene un icono de Lucide según el nombre del servicio
 */
const getServiceIcon = (serviceName) => {
    const name = (serviceName || '').toLowerCase();
    if (name.includes('corte') || name.includes('pelo') || name.includes('cabello') || name.includes('barber')) return 'scissors';
    if (name.includes('uñas') || name.includes('mani') || name.includes('pedi') || name.includes('manicura')) return 'sparkles';
    if (name.includes('masaje') || name.includes('spa') || name.includes('relax') || name.includes('relajación')) return 'flower-2';
    if (name.includes('facial') || name.includes('piel') || name.includes('cara') || name.includes('limpieza')) return 'smile';
    if (name.includes('cejas') || name.includes('pestañas') || name.includes('microblading')) return 'eye';
    if (name.includes('tatuaje') || name.includes('tattoo') || name.includes('tatuar')) return 'palette';
    if (name.includes('dental') || name.includes('diente') || name.includes('odonto')) return 'smile';
    if (name.includes('médico') || name.includes('doctor') || name.includes('salud') || name.includes('hospital') || name.includes('clínica')) return 'droplet';
    if (name.includes('gym') || name.includes('pesas') || name.includes('entrenamiento') || name.includes('fitness')) return 'dumbbell';
    if (name.includes('hotel') || name.includes('hospedaje') || name.includes('cuarto') || name.includes('habitación')) return 'building-2';
    if (name.includes('clase') || name.includes('cuaderno') || name.includes('estudio') || name.includes('escuela') || name.includes('curso')) return 'notebook';
    if (name.includes('asesoría') || name.includes('legal') || name.includes('abogado') || name.includes('finanzas') || name.includes('consulta')) return 'briefcase';
    return 'store'; // Icono por defecto
};

/**
 * Obtiene la URL completa de una imagen (soporta Cloudinary y local)
 */
const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = typeof BASE_URL !== 'undefined' ? BASE_URL : '';
    return `${baseUrl}${path}`;
};

// Exportar de forma que funcione tanto si usamos modulos como si lo incluimos cmo script normal
if (typeof window !== 'undefined') {
  window.showToast = showToast;
  window.toggleButtonLoading = toggleButtonLoading;
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
  window.updateToggleIcons = updateToggleIcons;
  window.normalizeDateToIso = normalizeDateToIso;
  window.formatDateSpanish = formatDateSpanish;
  window.getUrlParam = getUrlParam;
  window.formatCurrency = formatCurrency;
  window.getServiceIcon = getServiceIcon;
  window.getFullImageUrl = getFullImageUrl;
  
  // Auto-inicializar tema
  document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      setTimeout(updateToggleIcons, 100); // Dar tiempo a Lucide
  });
}
