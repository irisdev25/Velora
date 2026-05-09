let currentStep = 1;
let selectedTypeId = null;
let businessTypes = [];
let availableResources = [];
let selectedResources = [];
let isEditing = false;
let editingServiceId = null;
let servicesData = [];

// El token es manejado automáticamente por ApiService

// --- Initialization ---
window.initWizard = () => {
    const modal = document.getElementById('serviceWizard');
    const openBtn = document.getElementById('openWizardBtn');
    const closeBtn = document.querySelector('.close-modal');
    const nextBtn = document.getElementById('nextStepBtn');
    const prevBtn = document.getElementById('prevStepBtn');
    const saveBtn = document.getElementById('saveServiceBtn');

    if (openBtn) {
        openBtn.onclick = () => {
            resetWizard();
            modal.classList.add('active');
            document.getElementById('wizardTitle').textContent = 'Crear Nuevo Servicio';
        };
    }

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    if (nextBtn) {
        nextBtn.onclick = () => {
            if (validateStep(currentStep)) {
                currentStep++;
                updateWizardUI();
            }
        };
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            currentStep--;
            updateWizardUI();
        };
    }

    if (saveBtn) saveBtn.onclick = saveService;
};

document.addEventListener('DOMContentLoaded', () => {
    fetchServices();
    initWizard();
    loadBusinessTypes();
    loadResources();
});
window.fetchServices = async () => {
    try {
        servicesData = await ApiService.get('/services');
        displayServices(servicesData);
    } catch (error) {
        console.error('Error fetching services:', error);
        document.getElementById('servicesList').innerHTML = '<p>Error al cargar los servicios</p>';
    }
};

window.displayServices = (services) => {
    const container = document.getElementById('servicesList');
    if (!services || services.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay servicios creados aún.</p>';
        return;
    }

    container.innerHTML = services.map(service => `
        <div class="service-card" style="--accent-color: ${service.color || '#7c3aed'}">
            <div class="service-icon-container">
                <i data-lucide="${window.getServiceIcon(service.name)}"></i>
            </div>
            <div class="service-info">
                <h3>${service.name}</h3>
                <p>Base: $${parseFloat(service.base_price || service.price).toFixed(2)}</p>
                <p>Duración: ${parseFloat(service.duration).toFixed(1)} horas</p>
                ${service.requires_advance ? `<p style="font-size: 0.8rem; color: var(--text-secondary);"><i data-lucide="info" style="width:12px; height:12px;"></i> Adelanto: ${service.advance_percentage}%</p>` : ''}
            </div>
            <div class="card-actions">
                <button onclick="editService(${service.id})" class="btn-icon" title="Editar">
                    <i data-lucide="edit-3"></i>
                </button>
                <button onclick="deleteService(${service.id})" class="btn-icon-danger" title="Eliminar">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
};

// Wizard functions defined as function declarations to support hoisting or on window
window.resetWizard = () => {
    currentStep = 1;
    selectedTypeId = null;
    selectedResources = [];
    isEditing = false;
    editingServiceId = null;
    document.querySelectorAll('.business-type-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('sw-name').value = '';
    document.getElementById('sw-price').value = '';
    document.getElementById('sw-duration').value = '1';
    document.getElementById('sw-capacity').value = '1';
    document.getElementById('sw-description').value = '';
    document.getElementById('sw-color').value = '#7c3aed';
    const advanceCheckbox = document.getElementById('sw-requires-advance');
    if(advanceCheckbox) {
        advanceCheckbox.checked = false;
        document.getElementById('advance-fields').style.display = 'none';
        document.getElementById('sw-advance-percentage').value = '';
        document.querySelectorAll('input[name="payment_option"]').forEach(cb => cb.checked = false);
    }
    window.savedAvailability = null; // To clear custom edits
    updateWizardUI();
};

window.updateWizardUI = () => {
    // Update Indicators
    document.querySelectorAll('.step-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx + 1 === currentStep);
    });

    // Update Steps visibility
    document.querySelectorAll('.wizard-step').forEach((step, idx) => {
        step.classList.toggle('active', idx + 1 === currentStep);
    });

    // Update Buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const saveBtn = document.getElementById('saveServiceBtn');

    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    
    if (currentStep === 5) {
        nextBtn.style.display = 'none';
        saveBtn.style.display = 'block';
        renderSummary();
    } else {
        nextBtn.style.display = 'block';
        saveBtn.style.display = 'none';
    }

    // Dynamic loads
    if (currentStep === 3) renderAvailability();
    if (currentStep === 4) renderResources();
};

window.loadBusinessTypes = async () => {
    try {
        businessTypes = await ApiService.get('/business-types');
        const grid = document.getElementById('businessTypeGrid');
        
        grid.innerHTML = businessTypes.map(type => `
            <div class="business-type-card" onclick="selectType(${type.id})">
                <i data-lucide="${type.icon || 'star'}"></i>
                <span>${type.display_name}</span>
            </div>
        `).join('');
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading business types:', error);
    }
};

window.loadResources = async () => {
    try {
        availableResources = await ApiService.get('/resources');
    } catch (error) {
        console.error('Error loading resources:', error);
    }
};

window.selectType = (id) => {
    selectedTypeId = id;
    document.querySelectorAll('.business-type-card').forEach((card) => {
        const cardText = card.querySelector('span').textContent;
        const selectedType = businessTypes.find(t => t.id === id);
        card.classList.toggle('selected', cardText === selectedType.display_name);
    });
};

window.renderAvailability = () => {
    const container = document.getElementById('availabilityContainer');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    container.innerHTML = days.map((day, idx) => {
        let startTime = "09:00";
        let endTime = "17:00";
        let isChecked = true;

        if (window.savedAvailability) {
            const dayAvail = window.savedAvailability.find(a => a.day_of_week === idx);
            if (dayAvail) {
                startTime = dayAvail.start_time.substring(0, 5);
                endTime = dayAvail.end_time.substring(0, 5);
            } else {
                isChecked = false;
            }
        }

        return `
            <div class="day-config-row" data-day="${idx}">
                <label class="day-label">
                    <input type="checkbox" ${isChecked ? 'checked' : ''}> ${day}
                </label>
                <div class="time-inputs">
                    <input type="time" class="form-input" value="${startTime}">
                    <span>a</span>
                    <input type="time" class="form-input" value="${endTime}">
                </div>
            </div>
        `;
    }).join('');
};

window.renderResources = () => {
    const container = document.getElementById('resourcesContainer');
    if (availableResources.length === 0) {
        container.innerHTML = `
            <div class="empty-resources">
                <p>No tienes recursos globales creados.</p>
                <a href="/pages/settings.html" class="btn-outline-small" style="margin-top: 10px; display: inline-block;">Configurar Recursos</a>
            </div>
        `;
        return;
    }

    container.innerHTML = availableResources.map(r => `
        <div class="resource-item ${selectedResources.includes(r.id) ? 'selected' : ''}" onclick="toggleResource(${r.id})">
            <i data-lucide="package"></i>
            <div>
                <div class="res-name">${r.name}</div>
                <div class="res-type">${r.type}</div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
};

window.toggleResource = (id) => {
    const index = selectedResources.indexOf(id);
    if (index > -1) selectedResources.splice(index, 1);
    else selectedResources.push(id);
    renderResources();
};

window.validateStep = (step) => {
    if (step === 1 && !selectedTypeId) {
        window.showToast('Selecciona un tipo de negocio', 'warning');
        return false;
    }
    if (step === 2) {
        const name = document.getElementById('sw-name').value;
        const price = document.getElementById('sw-price').value;
        if (!name || !price) {
            window.showToast('Completa nombre y precio', 'warning');
            return false;
        }
    }
    return true;
};

window.renderSummary = () => {
    const summary = document.getElementById('wizardSummary');
    const name = document.getElementById('sw-name').value;
    const price = document.getElementById('sw-price').value;
    const type = businessTypes.find(t => t.id === selectedTypeId).display_name;

    summary.innerHTML = `
        <div class="summary-item">
            <div class="summary-label">Servicio</div>
            <div class="summary-value">${name}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Categoría</div>
            <div class="summary-value">${type}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Precio</div>
            <div class="summary-value">$${parseFloat(price).toFixed(2)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">Horarios y Recursos</div>
            <div class="summary-value">Configurados y listos.</div>
        </div>
    `;
};

window.saveService = async () => {
    // Collect availability
    const availability = [];
    document.querySelectorAll('.day-config-row').forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            const times = row.querySelectorAll('input[type="time"]');
            availability.push({
                day_of_week: parseInt(row.dataset.day),
                start_time: times[0].value,
                end_time: times[1].value,
                max_capacity: parseInt(document.getElementById('sw-capacity').value) || 1
            });
        }
    });

    const requiresAdvance = document.getElementById('sw-requires-advance') ? document.getElementById('sw-requires-advance').checked : false;
    const paymentOptions = [];
    document.querySelectorAll('input[name="payment_option"]:checked').forEach(cb => {
        paymentOptions.push(cb.value);
    });

    const serviceData = {
        name: document.getElementById('sw-name').value,
        description: document.getElementById('sw-description').value,
        duration: parseFloat(document.getElementById('sw-duration').value) || 1,
        base_price: parseFloat(document.getElementById('sw-price').value),
        color: document.getElementById('sw-color').value,
        business_type_id: selectedTypeId,
        availability: availability,
        resources: selectedResources.map(rid => ({ resource_id: rid, quantity_required: 1 })),
        requires_advance: requiresAdvance,
        advance_percentage: parseFloat(document.getElementById('sw-advance-percentage')?.value) || 0,
        max_capacity: parseInt(document.getElementById('sw-capacity').value) || 1,
        payment_options: paymentOptions,
        custom_fields: []
    };

    try {
        if (isEditing) {
            await ApiService.patch(`/services/${editingServiceId}`, serviceData);
            window.showToast('¡Servicio actualizado con éxito!', 'success');
        } else {
            await ApiService.post('/services', serviceData);
            window.showToast('¡Servicio creado con éxito!', 'success');
        }
        document.getElementById('serviceWizard').classList.remove('active');
        fetchServices();
        resetWizard();
    } catch (error) {
        console.error('Save error:', error);
        window.showToast(error.message || 'Error al guardar el servicio', 'error');
    }
};

window.editService = async (id) => {
    try {
        resetWizard();
        isEditing = true;
        editingServiceId = id;

        // Fetch deep details
        const service = await ApiService.get(`/services/${id}`);
        
        // Populate Step 1: Type
        selectType(service.business_type_id);

        // Populate Step 2: Basic Info
        document.getElementById('sw-name').value = service.name;
        document.getElementById('sw-price').value = service.base_price || service.price;
        document.getElementById('sw-duration').value = service.duration;
        document.getElementById('sw-capacity').value = service.max_capacity || 1;
        document.getElementById('sw-description').value = service.description || '';
        document.getElementById('sw-color').value = service.color || '#7c3aed';
        
        // Advance Payment
        if (service.requires_advance) {
            const advanceCheckbox = document.getElementById('sw-requires-advance');
            advanceCheckbox.checked = true;
            document.getElementById('advance-fields').style.display = 'block';
            document.getElementById('sw-advance-percentage').value = service.advance_percentage;
            
            const pOptions = typeof service.payment_options === 'string' ? JSON.parse(service.payment_options) : (service.payment_options || []);
            document.querySelectorAll('input[name="payment_option"]').forEach(cb => {
                cb.checked = pOptions.includes(cb.value);
            });
        }

        // Availability (Store for step 3)
        window.savedAvailability = service.availability;

        // Resources
        selectedResources = service.resources ? service.resources.map(r => r.resource_id) : [];

        // UI Updates
        document.getElementById('wizardTitle').textContent = 'Editar Servicio';
        document.getElementById('serviceWizard').classList.add('active');
        updateWizardUI();

    } catch (error) {
        console.error('Edit error:', error);
        window.showToast('Error al cargar datos del servicio', 'error');
    }
};

window.deleteService = (id) => {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    modal.classList.add('active');
    
    confirmBtn.onclick = async () => {
        try {
            await ApiService.delete(`/services/${id}`);
            fetchServices();
            window.showToast('Servicio eliminado exitosamente', 'success');
            closeDeleteModal();
        } catch (error) {
            console.error('Delete error:', error);
            window.showToast(error.message || 'Error al eliminar', 'error');
            closeDeleteModal();
        }
    };
};

window.closeDeleteModal = () => {
    document.getElementById('deleteModal').classList.remove('active');
};