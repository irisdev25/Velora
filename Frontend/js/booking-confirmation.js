// Función para formatear fecha en español
const formatDateSpanish = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    
    // Si ya viene formateada DD/MM/YYYY, la devolvemos
    if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Si viene en formato YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Cargar los detalles de la reserva
const loadBookingDetails = () => {
    const lastBooking = JSON.parse(localStorage.getItem('lastBooking'));
    const urlParams = new URLSearchParams(window.location.search);
    const businessId = urlParams.get('business') || '1';
    
    if (lastBooking) {
        document.getElementById('detailService').textContent = lastBooking.service_name || 'Servicio seleccionado';
        document.getElementById('detailDate').textContent = formatDateSpanish(lastBooking.appointment_date);
        document.getElementById('detailTime').textContent = lastBooking.appointment_time || 'Hora seleccionada';
        document.getElementById('detailName').textContent = lastBooking.client_name || 'Nombre del cliente';
        document.getElementById('detailEmail').textContent = lastBooking.client_email || 'Email del cliente';
        
        if (lastBooking.business_name) {
            document.getElementById('businessInfo').textContent = lastBooking.business_name + ' - Velora';
        }
        
        // Opcional: limpiar localStorage después de mostrar
        // setTimeout(() => {
        //     localStorage.removeItem('lastBooking');
        // }, 5000);
        
    } else {
        // Si no hay datos, redirigir a booking después de 3 segundos
        setTimeout(() => {
            window.location.href = `/pages/booking.html?business=${businessId}`;
        }, 3000);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    loadBookingDetails();
    
    // Botón para realizar otra reserva
    const returnBtn = document.getElementById('returnBtn');
    if (returnBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('business') || '1';
        returnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `/pages/booking.html#business=${businessId}`;
        });
    }
});
