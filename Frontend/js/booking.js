const businessId = window.getUrlParam('business') || '1';

let servicesData = [];
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let businessSettings = {};
let currentViewMonth = new Date().getMonth();
let currentViewYear = new Date().getFullYear();
let occupiedSlots = []; // From backend

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadBusinessSettings();
    loadServices();
    initCalendarNav();
    
    document.getElementById('confirmBookingBtn').addEventListener('click', confirmBooking);
    document.getElementById('lockDateBtn').addEventListener('click', lockDate);
    
    // Auto-update summary on changes
    ['clientName', 'clientEmail', 'clientPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSummary);
    });
});

const initCalendarNav = () => {
    // We'll call updateCalendar() after service is selected
};

window.renderCalendar = async () => {
    const container = document.getElementById('bookingCalendar');
    if (!selectedService) return;

    // Fetch occupation for this month
    try {
        const res = await ApiService.get(`/appointments/occupied?service_id=${selectedService.id}&month=${currentViewMonth + 1}&year=${currentViewYear}`);
        occupiedSlots = res;
    } catch (e) {
        console.error("Error fetching occupation", e);
        occupiedSlots = [];
    }

    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    let html = `
        <div class="calendar-nav" style="grid-column: span 7;">
            <button class="cal-nav-btn" onclick="changeMonth(-1)"><i data-lucide="chevron-left"></i></button>
            <div class="cal-month-title">${monthNames[currentViewMonth]} ${currentViewYear}</div>
            <button class="cal-nav-btn" onclick="changeMonth(1)"><i data-lucide="chevron-right"></i></button>
        </div>
    `;

    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    dayLabels.forEach(d => html += `<div class="cal-header">${d}</div>`);

    // Empty spaces
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="cal-day empty"></div>`;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(currentViewYear, currentViewMonth, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const isPast = dateObj < today;
        
        // Verificar si el negocio abre este día de la semana
        const dayOfWeek = dateObj.getUTCDay();
        const serviceDayAvail = selectedService.availability && selectedService.availability.find(a => a.day_of_week === dayOfWeek);
        const isClosed = !serviceDayAvail;

        // Check if fully booked
        let isFullyBooked = false;
        if (!isClosed && !isPast) {
            const dayOccupancy = occupiedSlots.filter(o => o.appointment_date.split('T')[0] === dateStr);
            // Calcular total slots posibles
            const opening = serviceDayAvail.start_time;
            const closing = serviceDayAvail.end_time;
            const [oh, om] = opening.split(':').map(Number);
            const [ch, cm] = closing.split(':').map(Number);
            const totalMinutes = (ch * 60 + cm) - (oh * 60 + om);
            const totalSlots = Math.floor(totalMinutes / 30);
            
            const fullSlotsCount = dayOccupancy.filter(o => parseInt(o.booked_count) >= (selectedService.max_capacity || 1)).length;
            if (fullSlotsCount >= totalSlots && totalSlots > 0) {
                isFullyBooked = true;
            }
        }

        let className = "cal-day available";
        const unavailable = isPast || isClosed || isFullyBooked;
        if (unavailable) className = "cal-day unavailable";
        if (selectedDate === dateStr) className += " selected";
        if (window.dateLocked && selectedDate === dateStr) className = "cal-day confirmed";

        html += `<div class="${className}" onclick="handleDayClick('${dateStr}', ${unavailable})">${d}</div>`;
    }

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
};

window.changeMonth = (dir) => {
    currentViewMonth += dir;
    if (currentViewMonth < 0) { currentViewMonth = 11; currentViewYear--; }
    if (currentViewMonth > 11) { currentViewMonth = 0; currentViewYear++; }
    renderCalendar();
};

window.handleDayClick = (date, isUnavailable) => {
    if (isUnavailable) return;
    
    selectedDate = date;
    window.dateLocked = false;
    selectedTime = null;
    
    document.getElementById('appointmentDate').value = date;
    document.getElementById('lockDateBtn').style.display = 'block';
    
    renderCalendar();
    renderTimeSlots();
    updateSummary();
};

window.lockDate = () => {
    if (!selectedDate) return;
    window.dateLocked = true;
    document.getElementById('lockDateBtn').style.display = 'none';
    renderCalendar();
    renderTimeSlots();
    // Scroll to time slots
    document.getElementById('timeSlots').scrollIntoView({ behavior: 'smooth' });
};

window.loadBusinessSettings = async () => {
    try {
        businessSettings = await ApiService.get(`/settings/business/${businessId}`);
        
        document.getElementById('pageTitle').textContent = `${businessSettings.business_name || 'Negocio'} - Reservar Cita`;
        document.getElementById('businessName').textContent = businessSettings.business_name || 'Negocio';
        
        applyBusinessColors(businessSettings);
        
        if (businessSettings.logo_url) {
            const logo = document.getElementById('logoContainer');
            logo.innerHTML = `<img src="${window.getFullImageUrl(businessSettings.logo_url)}" alt="Logo">`;
            logo.style.display = 'flex';
        }
        
        if (businessSettings.banner_image) {
            const header = document.getElementById('bookingHeader');
            header.classList.add('booking-header-with-banner');
            header.style.backgroundImage = `url("${window.getFullImageUrl(businessSettings.banner_image)}")`;
            // Add a slight tint overlays to ensure text readability is handled by css ::before
        }

        if (businessSettings.bio) {
            const bioContainer = document.getElementById('bioContainer');
            bioContainer.textContent = businessSettings.bio;
            bioContainer.style.display = 'block';
        }

        const socialContainer = document.getElementById('socialContainer');
        let hasSocials = false;
        let socialHTML = '';

        if (businessSettings.instagram_url) {
            socialHTML += `<a href="${businessSettings.instagram_url}" target="_blank" class="social-link" title="Instagram"><i data-lucide="instagram"></i></a>`;
            hasSocials = true;
        }
        
        if (businessSettings.whatsapp_number) {
            // Limpiar número (remover + y espacios)
            const cleanNumber = businessSettings.whatsapp_number.replace(/\D/g, '');
            socialHTML += `<a href="https://wa.me/${cleanNumber}" target="_blank" class="social-link" title="WhatsApp"><i data-lucide="message-circle"></i></a>`;
            hasSocials = true;
        }

        if (hasSocials) {
            socialContainer.innerHTML = socialHTML;
            socialContainer.style.display = 'flex';
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
        
    } catch (error) {
        console.error('Settings error:', error);
    }
};

window.loadServices = async () => {
    try {
        servicesData = await ApiService.get(`/services/public?user_id=${businessId}`);
        
        const container = document.getElementById('serviceList');
        if (servicesData.length === 0) {
            container.innerHTML = '<p>No hay servicios disponibles por el momento.</p>';
            return;
        }

        container.innerHTML = servicesData.map(s => `
            <div class="service-option" onclick="selectService(${s.id}, this)">
                <div style="display:flex; align-items:center; gap:12px;">
                    <i data-lucide="${window.getServiceIcon(s.name)}" style="width:24px; height:24px; color:var(--accent);"></i>
                    <div class="service-name">${s.name}</div>
                </div>
                <div class="service-duration">${parseFloat(s.duration).toFixed(1)} horas</div>
                <div class="service-price">${window.formatCurrency(s.price)}</div>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Services error:', error);
    }
};

window.selectService = (id, element) => {
    document.querySelectorAll('.service-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    selectedDate = null;
    window.dateLocked = false;
    selectedTime = null;
    selectedService = servicesData.find(s => s.id === id);
    renderCalendar();
    renderTimeSlots();
    updateSummary();
};

window.renderTimeSlots = () => {
    const container = document.getElementById('timeSlots');
    const lockBtn = document.getElementById('lockDateBtn');

    if (!selectedDate || !selectedService) {
        container.innerHTML = '<p class="muted-text">Selecciona un servicio y fecha.</p>';
        return;
    }

    if (!window.dateLocked) {
        container.innerHTML = '<p class="muted-text">Confirma la fecha para ver los horarios.</p>';
        return;
    }

    // Determine availability (Service-specific or Business-wide)
    const dayOfWeek = new Date(selectedDate).getUTCDay(); // Use UTC to match backend and avoid zone shifts
    const serviceDayAvail = selectedService.availability ? selectedService.availability.find(a => a.day_of_week === dayOfWeek) : null;
    
    const opening = serviceDayAvail ? serviceDayAvail.start_time : (businessSettings.opening_time || '09:00');
    const closing = serviceDayAvail ? serviceDayAvail.end_time : (businessSettings.closing_time || '17:00');

    // Generate 30min slots
    const slots = [];
    let [h, m] = opening.split(':').map(Number);
    let [eh, em] = closing.split(':').map(Number);
    
    while (h < eh || (h === eh && m < em)) {
        const slot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        // Check capacity
        const occ = occupiedSlots.find(o => {
            const oDate = new Date(o.appointment_date).toISOString().split('T')[0];
            return oDate === selectedDate && o.appointment_time.substring(0, 5) === slot;
        });
        
        const isFull = occ && parseInt(occ.booked_count) >= (selectedService.max_capacity || 1);

        if (!isFull) {
            slots.push(slot);
        }
        
        m += 30;
        if (m >= 60) { h++; m -= 60; }
    }

    if (slots.length === 0) {
        container.innerHTML = '<p class="muted-text">No hay horarios disponibles para este día.</p>';
        return;
    }

    container.innerHTML = slots.map(slot => `
        <div class="time-slot ${selectedTime === slot ? 'selected' : ''}" onclick="selectTime('${slot}', this)">
            ${slot}
        </div>
    `).join('');
};

window.selectTime = (time, element) => {
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedTime = time;
    updateSummary();
};

window.updateSummary = () => {
    const summaryCard = document.getElementById('bookingSummary');
    const detailsContainer = document.getElementById('summaryDetails');
    
    if (!selectedService || !selectedDate || !selectedTime) {
        summaryCard.style.display = 'none';
        return;
    }

    summaryCard.style.display = 'block';
    detailsContainer.innerHTML = `
        <p><strong>Servicio:</strong> <i data-lucide="${window.getServiceIcon(selectedService.name)}" style="width:14px; height:14px; vertical-align:middle; margin-right:5px;"></i> ${selectedService.name}</p>
        <p><strong>Fecha:</strong> ${window.formatDateSpanish(selectedDate)}</p>
        <p><strong>Hora:</strong> ${selectedTime}</p>
        <p><strong>Inversión Total:</strong> ${window.formatCurrency(selectedService.price)}</p>
    `;
    if (window.lucide) window.lucide.createIcons();

    const advanceNote = document.getElementById('advancePaymentNote');
    if (selectedService.requires_advance) {
        const advanceAmount = selectedService.price * (selectedService.advance_percentage / 100);
        let optionsHtml = '';
        if (selectedService.payment_options && selectedService.payment_options.length > 0) {
            let parsedOptions = [];
            try {
                parsedOptions = typeof selectedService.payment_options === 'string' ? JSON.parse(selectedService.payment_options) : selectedService.payment_options;
            } catch(e) { parsedOptions = []; }
            optionsHtml = `<p><strong>Opciones Aceptadas:</strong> ${parsedOptions.join(', ')}</p>`;
        }
        
        advanceNote.innerHTML = `
            <p style="color: var(--accent); font-weight: 500;"><i data-lucide="alert-circle" style="width:16px; height:16px; vertical-align:middle; margin-right:5px;"></i>Requiere Adelanto: ${selectedService.advance_percentage}% (${window.formatCurrency(advanceAmount)})</p>
            ${optionsHtml}
        `;
        advanceNote.style.display = 'block';
        if(window.lucide) window.lucide.createIcons();
    } else {
        advanceNote.style.display = 'none';
    }
};

window.confirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
        return window.showToast('Por favor completa los pasos anteriores', 'warning');
    }

    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const phone = document.getElementById('clientPhone')?.value.trim();
    
    if (!name || !email || !phone) {
        return window.showToast('Nombre, email y teléfono son obligatorios', 'warning');
    }

    const bookingData = {
        user_id: parseInt(businessId),
        service_id: selectedService.id,
        client_name: name,
        client_email: email,
        client_phone: phone,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        total_price: selectedService.price,
        custom_data: {}
    };

    const confirmBtn = document.getElementById('confirmBookingBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Procesando...';

    try {
        const res = await ApiService.post('/appointments', bookingData);
        
        // Si el servicio NO requiere adelanto, ya terminamos
        if (!selectedService.requires_advance) {
            window.showToast('¡Reserva enviada! Tu cita está siendo revisada.', 'success');
            setTimeout(() => {
                window.location.href = `/pages/booking-success.html?id=${res.id}&review=true&business=${businessId}`;
            }, 2000);
            return;
        }

        // Si requiere adelanto, iniciar flujo de pago
        confirmBtn.textContent = 'Cargando pago...';
        
        const paymentRes = await ApiService.post('/payments/create-checkout-session', {
            appointmentId: res.id
        });

        if (paymentRes.type === 'stripe' && paymentRes.url) {
            window.location.href = paymentRes.url;
        } else if (paymentRes.type === 'manual') {
            showManualPaymentModal(res.id, paymentRes.instructions);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Finalizar Reserva';
        } else {
            throw new Error('Metodo de pago no reconocido');
        }
    } catch (e) {
        console.error(e);
        window.showToast(e.message || 'Error al procesar reserva', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Finalizar Reserva';
    }
};

let currentAppointmentId = null;

const showManualPaymentModal = (appointmentId, instr) => {
    currentAppointmentId = appointmentId;
    
    // Pago Movil
    if (instr.pago_movil?.bank) {
        document.getElementById('methodPM').style.display = 'block';
        document.getElementById('pmBankText').textContent = instr.pago_movil.bank;
        document.getElementById('pmIdText').textContent = instr.pago_movil.id_number;
        document.getElementById('pmPhoneText').textContent = instr.pago_movil.phone;
    } else if (instr.bank && !instr.pago_movil) { 
        // Compatibilidad con datos antiguos (si los hay)
        document.getElementById('methodPM').style.display = 'block';
        document.getElementById('pmBankText').textContent = instr.bank;
        document.getElementById('pmIdText').textContent = instr.id_number || '';
        document.getElementById('pmPhoneText').textContent = instr.phone || '';
    } else {
        document.getElementById('methodPM').style.display = 'none';
    }

    // Zelle
    if (instr.zelle?.email) {
        document.getElementById('methodZelle').style.display = 'block';
        document.getElementById('zelleEmailText').textContent = instr.zelle.email;
        document.getElementById('zelleNameText').textContent = instr.zelle.name;
    } else {
        document.getElementById('methodZelle').style.display = 'none';
    }

    // PayPal
    if (instr.paypal?.email) {
        document.getElementById('methodPaypal').style.display = 'block';
        document.getElementById('paypalEmailText').textContent = instr.paypal.email;
    } else {
        document.getElementById('methodPaypal').style.display = 'none';
    }
    
    document.getElementById('manualPaymentModal').style.display = 'flex';
    
    // Refresh icons for copy buttons
    if (window.lucide) window.lucide.createIcons();
    
    // Configurar el botón de envío
    document.getElementById('submitProofBtn').onclick = submitProofPayment;
};

window.copyToClipboard = (elementId) => {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        window.showToast('¡Copiado al portapapeles!', 'success');
        
        // Efecto visual en el botón
        const btn = document.querySelector(`[onclick="copyToClipboard('${elementId}')"]`);
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check" style="color:#10b981"></i>';
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            if (window.lucide) window.lucide.createIcons();
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar:', err);
        window.showToast('No se pudo copiar automáticamente', 'error');
    });
};

window.closePaymentModal = () => {
    document.getElementById('manualPaymentModal').style.display = 'none';
};

const submitProofPayment = async () => {
    const fileInput = document.getElementById('proofFile');
    const file = fileInput.files[0];
    if (!file) return window.showToast('Por favor sube una captura del pago', 'warning');

    const submitBtn = document.getElementById('submitProofBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const formData = new FormData();
    formData.append('proof', file);
    formData.append('appointmentId', currentAppointmentId);

    try {
        await ApiService.post('/payments/upload-proof', formData);
        window.showToast('¡Pago enviado! El negocio verificará tu cita pronto.', 'success');
        setTimeout(() => {
            window.location.href = `/pages/booking-success.html?manual=true&business=${businessId}`;
        }, 2000);
    } catch (e) {
        console.error(e);
        window.showToast('Error al subir comprobante', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Comprobante';
    }
};

const applyBusinessColors = (s) => {
    const styles = document.getElementById('businessStyles');
    styles.textContent = `
        :root { 
            --accent: ${s.primary_color || '#a855f7'};
            --booking-bg: ${s.background_color || '#0b090a'};
        }
        .logo-circle-container { border-color: ${s.primary_color}; }
        #businessName { color: ${s.primary_color}; }
        .btn-primary { background-color: ${s.primary_color}; box-shadow: 0 10px 20px ${s.primary_color}33; }
        .btn-primary:hover { box-shadow: 0 15px 30px ${s.primary_color}4d; }
        .time-slot.selected { background-color: ${s.primary_color}; box-shadow: 0 8px 16px ${s.primary_color}4d; }
        .service-option.selected { border-color: ${s.primary_color}; background-color: ${s.primary_color}0d; }
        .service-price { color: ${s.primary_color}; }
        .booking-summary { border-color: ${s.primary_color}; background: linear-gradient(135deg, ${s.primary_color}1a 0%, ${s.primary_color}0d 100%); }
    `;
};