// frontend/js/settings.js
console.log('settings.js cargado correctamente');

let currentSettings = {};
let activeTab = 'general';
let previewMode = 'mobile';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

// Cargar configuraciones actuales
const loadSettings = async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = '/pages/login.html';
            return;
        }
        
        const settings = await ApiService.get(`/settings/business/${user.id}`);
        currentSettings = settings;
        
        console.log('--- DEBUG ADMIN ---');
        console.log('Email detectado:', currentSettings.email);
        
        const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris201922@gmail.com'];
        if (currentSettings.email && admins.includes(currentSettings.email.toLowerCase())) {
            console.log('¡Acceso ADMIN confirmado!');
            const adminBtn = document.getElementById('adminTabBtn');
            if (adminBtn) adminBtn.style.display = 'inline-block';
        }

        renderSettingsTabs();
        updatePreview();
    } catch (error) {
        console.error('Error loading settings:', error);
        document.getElementById('settings-form-container').innerHTML = '<p>Error al cargar la configuración</p>';
    }
};

const renderSettingsTabs = () => {
    const container = document.getElementById('settings-form-container');
    
    container.innerHTML = `
        <div id="tab-general" class="settings-tab-content ${activeTab === 'general' ? 'active' : ''}">
            <div class="settings-section">
                <h2 class="section-title">Información General</h2>
                <div class="form-group">
                    <label for="businessNameInput" class="form-label">Nombre del negocio</label>
                    <input type="text" id="businessNameInput" name="business_name" class="form-input" value="${currentSettings.business_name || ''}">
                </div>
                <div class="form-group">
                    <label for="businessDescription" class="form-label">Eslogan o descripción corta</label>
                    <textarea id="businessDescription" name="business_description" class="form-input" rows="2" placeholder="Ej: Las mejores burgers de la ciudad">${currentSettings.business_description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="bio" class="form-label">Biografía extendida</label>
                    <textarea id="bio" name="bio" class="form-input" rows="4" placeholder="Cuéntale a tus clientes acerca de tu historia...">${currentSettings.bio || ''}</textarea>
                </div>
            </div>
        </div>

        <div id="tab-branding" class="settings-tab-content ${activeTab === 'branding' ? 'active' : ''}">
            <div class="settings-section">
                <h2 class="section-title">Identidad Visual</h2>
                <div class="color-picker-group">
                    <div class="color-item">
                        <label for="primaryColor">Color de Acento</label>
                        <input type="color" id="primaryColor" name="primary_color" class="color-input" value="${currentSettings.primary_color || '#a855f7'}">
                    </div>
                    <div class="color-item">
                        <label for="backgroundColor">Fondo de Página</label>
                        <input type="color" id="backgroundColor" name="background_color" class="color-input" value="${currentSettings.background_color || '#0b090a'}">
                    </div>
                </div>

                <div class="form-grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px;">
                    <div class="form-group">
                        <label class="form-label" for="logoFile">Logo Sugerido (Circundante)</label>
                        <input type="file" id="logoFile" class="form-input" accept="image/*">
                        <input type="hidden" id="logoUrl" value="${currentSettings.logo_url || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="bannerFile">Imagen de Banner</label>
                        <input type="file" id="bannerFile" class="form-input" accept="image/*">
                        <input type="hidden" id="bannerUrl" value="${currentSettings.banner_image || ''}">
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2 class="section-title">Presencia en Redes</h2>
                <div class="form-grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div class="form-group">
                        <label for="instagramUrl" class="form-label">Perfil de Instagram</label>
                        <input type="url" id="instagramUrl" class="form-input" placeholder="https://instagram.com/usuario" value="${currentSettings.instagram_url || ''}">
                    </div>
                    <div class="form-group">
                        <label for="whatsappNumber" class="form-label">WhatsApp (con código de país)</label>
                        <input type="text" id="whatsappNumber" class="form-input" placeholder="+58414..." value="${currentSettings.whatsapp_number || ''}">
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-payments" class="settings-tab-content ${activeTab === 'payments' ? 'active' : ''}">
             <div class="settings-section">
                <h2 class="section-title">Horario de Atención</h2>
                <div class="form-grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                    <div class="form-group">
                        <label for="openingTime">Apertura</label>
                        <input type="time" id="openingTime" class="form-input" value="${currentSettings.opening_time || '09:00'}">
                    </div>
                    <div class="form-group">
                        <label for="closingTime">Cierre</label>
                        <input type="time" id="closingTime" class="form-input" value="${currentSettings.closing_time || '17:00'}">
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h2 class="section-title">Métodos de Pago Manual</h2>
                <p class="form-label" style="margin-bottom: 20px; font-style: italic;">Configura los datos que verán tus clientes para pagar el adelanto.</p>
                
                <!-- Pago Móvil -->
                <h3 style="font-size: 14px; color: var(--color-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="smartphone"></i> Pago Móvil
                </h3>
                <div class="form-grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label for="pmBank" class="form-label">Banco</label>
                        <input type="text" id="pmBank" class="form-input" placeholder="Ej: Mercantil" value="${currentSettings.manual_payment_info?.pago_movil?.bank || ''}">
                    </div>
                    <div class="form-group">
                        <label for="pmId" class="form-label">Cédula / RIF</label>
                        <input type="text" id="pmId" class="form-input" value="${currentSettings.manual_payment_info?.pago_movil?.id_number || ''}">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label for="pmPhone" class="form-label">Teléfono</label>
                        <input type="text" id="pmPhone" class="form-input" value="${currentSettings.manual_payment_info?.pago_movil?.phone || ''}">
                    </div>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">

                <!-- Zelle -->
                <h3 style="font-size: 14px; color: var(--accent-cyan); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="zap"></i> Zelle
                </h3>
                <div class="form-grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label for="zelleEmail" class="form-label">Correo electrónico</label>
                        <input type="email" id="zelleEmail" class="form-input" value="${currentSettings.manual_payment_info?.zelle?.email || ''}">
                    </div>
                    <div class="form-group">
                        <label for="zelleName" class="form-label">Nombre del titular</label>
                        <input type="text" id="zelleName" class="form-input" value="${currentSettings.manual_payment_info?.zelle?.name || ''}">
                    </div>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 24px 0;">

                <!-- PayPal -->
                <h3 style="font-size: 14px; color: #0070ba; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="send"></i> PayPal
                </h3>
                <div class="form-group">
                    <label for="paypalEmail" class="form-label">Correo o Link de PayPal.me</label>
                    <input type="text" id="paypalEmail" class="form-input" placeholder="tu@email.com o paypal.me/usuario" value="${currentSettings.manual_payment_info?.paypal?.email || ''}">
                </div>
            </div>
        </div>

        <div id="tab-resources" class="settings-tab-content ${activeTab === 'resources' ? 'active' : ''}">
            <div class="settings-section">
                <h2 class="section-title">Gestión de Personal y Equipos</h2>
                <p class="form-label">Configura recursos globales que tus servicios pueden compartir.</p>
                <div class="resource-form-inline">
                    <input type="text" id="newResName" class="form-input" placeholder="Nombre (ej: Juan, Cabina 1)">
                    <select id="newResType" class="form-input">
                        <option value="Personal">Personal</option>
                        <option value="Equipo">Equipo</option>
                        <option value="Espacio">Espacio</option>
                    </select>
                    <button onclick="handleAddResource()" class="btn-primary" style="padding: 10px 20px;">Añadir</button>
                </div>
                <div id="resourceAdminList" class="resource-list">
                    <p>Cargando lista...</p>
                </div>
            </div>
        </div>

        <div id="tab-billing" class="settings-tab-content ${activeTab === 'billing' ? 'active' : ''}">
            <div class="settings-section">
                <h2 class="section-title">Tu Plan Actual: <span id="currentPlanBadge" class="plan-badge">${(currentSettings.plan || 'Free').toUpperCase()}</span></h2>
                <div id="plansContainer" class="plans-grid">
                    <p>Cargando planes...</p>
                </div>
                <div id="billingActions" class="billing-footer-actions" style="margin-top: 30px; display: none;">
                    <button onclick="handleManageBilling()" class="btn-secondary">
                        <i data-lucide="external-link"></i> Gestionar suscripción y facturas
                    </button>
                </div>
            </div>
        </div>

        <div class="settings-footer">
            <button id="saveSettingsBtn" class="save-button" onclick="saveSettings()">Guardar Todos los Cambios</button>
        </div>
    `;

    // Attach listeners for real-time preview
    attachPreviewListeners();
    if (activeTab === 'resources') loadResourcesAdmin();
    if (activeTab === 'billing') loadBillingPlans();
    if (window.lucide) window.lucide.createIcons();
};

window.switchTab = (tabId) => {
    activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabId));
    });
    
    if (tabId === 'admin') {
        loadAdminTab();
    } else {
        renderSettingsTabs();
    }
};

window.setPreviewMode = (mode) => {
    previewMode = mode;
    const mockup = document.getElementById('device-mockup');
    mockup.className = `device-mockup ${mode}`;
    
    document.getElementById('toggleMobile').classList.toggle('active', mode === 'mobile');
    document.getElementById('toggleDesktop').classList.toggle('active', mode === 'desktop');
};

const attachPreviewListeners = () => {
    const inputs = ['primaryColor', 'backgroundColor', 'businessNameInput', 'businessDescription'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
    });

    const files = ['logoFile', 'bannerFile'];
    files.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', id === 'logoFile' ? handleLogoFile : handleBannerFile);
    });
};

const updatePreview = () => {
    const previewContainer = document.getElementById('booking-preview-iframe');
    
    // Get current form values or fall back to stored settings
    const name = document.getElementById('businessNameInput')?.value || currentSettings.business_name || 'Mi Negocio';
    const primary = document.getElementById('primaryColor')?.value || currentSettings.primary_color || '#a855f7';
    const bg = document.getElementById('backgroundColor')?.value || currentSettings.background_color || '#0b090a';
    const desc = document.getElementById('businessDescription')?.value || currentSettings.business_description || '';
    const logoUrl = document.getElementById('logoUrl')?.value || currentSettings.logo_url;
    const bannerUrl = document.getElementById('bannerUrl')?.value || currentSettings.banner_image;

    previewContainer.innerHTML = `
        <div class="mockup-page" style="background-color: ${bg}; color: #f8fafc; min-height: 100%; border-radius: inherit;">
            ${bannerUrl ? `<div style="height: 100px; width:100%; background: url('${window.getFullImageUrl(bannerUrl)}') center/cover no-repeat;"></div>` : `<div style="height: 60px; background: ${primary}22;"></div>`}
            
            <div style="padding: 20px; text-align: center; margin-top: ${bannerUrl ? '-40px' : '10px'}">
                <div style="width: 80px; height: 80px; background: white; border-radius: 50%; border: 3px solid ${primary}; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    ${logoUrl ? `<img src="${window.getFullImageUrl(logoUrl)}" style="max-width: 80%;">` : '<span style="color:#000; font-weight:bold;">LOGO</span>'}
                </div>
                <h1 style="font-size: 1.2rem; margin:0;">${name}</h1>
                <p style="font-size: 0.8rem; color: #94a3b8; margin: 5px 0;">${desc}</p>
                
                <div style="margin-top: 25px; background: #161622; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); text-align: left;">
                    <div style="font-size: 0.7rem; color: #94A3B8; margin-bottom: 10px;">SERVICIOS</div>
                    <div style="background: rgba(168, 85, 247, 0.05); border: 1px solid ${primary}; border-radius: 10px; padding: 10px; display:flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem;">Servicio de Prueba</span>
                        <span style="color: ${primary}; font-weight: bold; font-size: 0.8rem;">$25.00</span>
                    </div>
                </div>

                <button style="width: 100%; margin-top: 20px; padding: 12px; background: ${primary}; color: white; border: none; border-radius: 50px; font-weight: bold; font-size: 0.9rem; box-shadow: 0 10px 20px ${primary}33;">
                    Continuar Reserva
                </button>
            </div>
        </div>
    `;
};

const handleLogoFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
        const data = await ApiService.post('/settings/upload-logo', formData);
        document.getElementById('logoUrl').value = data.logoUrl;
        updatePreview();
        window.showToast('Logo listo en vista previa');
    } catch (error) {
        window.showToast('Error al procesar logo', 'error');
    }
};

const handleBannerFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('banner', file);
    try {
        const data = await ApiService.post('/settings/upload-banner', formData);
        document.getElementById('bannerUrl').value = data.bannerUrl;
        updatePreview();
        window.showToast('Banner listo en vista previa');
    } catch (error) {
        window.showToast('Error al procesar banner', 'error');
    }
};

const saveSettings = async () => {
    const saveBtn = document.getElementById('saveSettingsBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const settings = {
        business_name: document.getElementById('businessNameInput')?.value,
        business_description: document.getElementById('businessDescription')?.value,
        bio: document.getElementById('bio')?.value,
        primary_color: document.getElementById('primaryColor')?.value,
        background_color: document.getElementById('backgroundColor')?.value,
        logo_url: document.getElementById('logoUrl')?.value,
        banner_image: document.getElementById('bannerUrl')?.value,
        instagram_url: document.getElementById('instagramUrl')?.value,
        whatsapp_number: document.getElementById('whatsappNumber')?.value,
        opening_time: document.getElementById('openingTime')?.value,
        closing_time: document.getElementById('closingTime')?.value,
        manual_payment_info: {
            pago_movil: {
                bank: document.getElementById('pmBank')?.value,
                id_number: document.getElementById('pmId')?.value,
                phone: document.getElementById('pmPhone')?.value
            },
            zelle: {
                email: document.getElementById('zelleEmail')?.value,
                name: document.getElementById('zelleName')?.value
            },
            paypal: {
                email: document.getElementById('paypalEmail')?.value
            }
        }
    };

    try {
        await ApiService.put('/settings', settings);
        currentSettings = { ...currentSettings, ...settings };
        window.showToast('¡Configuración actualizada con éxito!', 'success');
    } catch (error) {
        window.showToast(error.message || 'Error al guardar', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Todos los Cambios';
    }
};

// --- Resource Admin ---
const loadResourcesAdmin = async () => {
    const list = document.getElementById('resourceAdminList');
    try {
        const resources = await ApiService.get('/resources');
        if (resources.length === 0) {
            list.innerHTML = '<p class="upload-hint">No hay recursos configurados.</p>';
            return;
        }
        list.innerHTML = resources.map(r => `
            <div class="resource-item-admin">
                <div class="res-info-main">
                    <span class="res-name-text">${r.name}</span>
                    <span class="res-type-badge">${r.type}</span>
                </div>
                <button onclick="handleDeleteResource(${r.id})" class="btn-icon-danger">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        list.innerHTML = '<p>Error al cargar recursos</p>';
    }
};

window.handleAddResource = async () => {
    const name = document.getElementById('newResName').value.trim();
    const type = document.getElementById('newResType').value;
    if (!name) return window.showToast('Ingresa un nombre', 'warning');
    try {
        await ApiService.post('/resources', { name, type, capacity: 1 });
        window.showToast('Recurso añadido');
        document.getElementById('newResName').value = '';
        loadResourcesAdmin();
    } catch (e) {
        window.showToast('Error al añadir recurso', 'error');
    }
};

window.handleDeleteResource = async (id) => {
    if (!confirm('¿Eliminar este recurso?')) return;
    try {
        await ApiService.delete(`/resources/${id}`);
        window.showToast('Recurso eliminado');
        loadResourcesAdmin();
    } catch (e) {
        window.showToast('Error al eliminar', 'error');
    }
};

// --- Billing Logic ---
const loadBillingPlans = async () => {
    const container = document.getElementById('plansContainer');
    
    try {
        const plans = await ApiService.get('/subscriptions/plans');
        const currentPlan = currentSettings.plan || 'free';

        container.innerHTML = plans.map(p => {
            const isCurrent = p.id === currentPlan;
            const features = p.features || {};
            
            return `
                <div class="plan-card ${isCurrent ? 'active' : ''}">
                    ${isCurrent ? '<span class="current-label">Plan Actual</span>' : ''}
                    <h3 class="plan-name">${p.name}</h3>
                    <div class="plan-price">$${parseFloat(p.price).toFixed(0)}<span>/mes</span></div>
                    <ul class="plan-features">
                        <li><i data-lucide="check"></i> ${features.max_appointments === -1 ? 'Citas ilimitadas' : `Hasta ${features.max_appointments} citas/mes`}</li>
                        <li><i data-lucide="check"></i> Analíticas ${features.analytics === 'advanced' ? 'Avanzadas' : 'Básicas'}</li>
                        <li><i data-lucide="${features.crm === 'full' ? 'check' : 'x'}"></i> CRM ${features.crm === 'full' ? 'Completo' : 'Limitado'}</li>
                        ${features.support === 'priority' ? '<li><i data-lucide="check"></i> Soporte Prioritario</li>' : ''}
                    </ul>
                    ${!isCurrent ? `
                        <button onclick="handleUpgrade('${p.id}')" class="btn-primary plan-btn">
                            ${p.price > 0 ? 'Mejorar ahora' : 'Cambiar a este plan'}
                        </button>
                    ` : `
                        <button disabled class="btn-secondary plan-btn">Tu Plan Actual</button>
                    `}
                </div>
            `;
        }).join('');
        
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        container.innerHTML = '<p>Error al cargar los planes.</p>';
    }
};

const loadAdminTab = async () => {
    const container = document.getElementById('settings-form-container');
    container.innerHTML = `
        <div class="settings-section">
            <h2 class="section-title">Panel de Administración Velora</h2>
            <p class="form-label" style="margin-bottom: 24px;">Desde aquí puedes gestionar manualmente los planes de tus usuarios después de recibir sus pagos.</p>
            
            <div style="background: var(--bg-secondary); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div class="form-group">
                    <label class="form-label">Correo del Usuario</label>
                    <input type="email" id="adminUserEmail" class="form-input" placeholder="usuario@ejemplo.com">
                </div>
                
                <div class="form-group" style="margin-top: 20px;">
                    <label class="form-label">Asignar Plan</label>
                    <select id="adminNewPlan" class="form-input">
                        <option value="free">Gratis (Básico)</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business / Ultra Pro</option>
                    </select>
                </div>
                
                <button onclick="handleAdminUpdatePlan()" class="btn-primary" style="margin-top: 24px; width: 100%;">
                    <i data-lucide="refresh-cw"></i> Actualizar Plan del Usuario
                </button>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
};

window.handleAdminUpdatePlan = async () => {
    const userEmail = document.getElementById('adminUserEmail').value.trim();
    const newPlan = document.getElementById('adminNewPlan').value;
    
    if (!userEmail) return window.showToast('Ingresa el correo del usuario', 'warning');
    
    try {
        await ApiService.post('/subscriptions/admin/update-plan', { userEmail, newPlan });
        window.showToast('Plan actualizado con éxito', 'success');
        document.getElementById('adminUserEmail').value = '';
    } catch (e) {
        window.showToast(e.message || 'Error al actualizar plan', 'error');
    }
};

window.handleUpgrade = async (planId) => {
    try {
        window.showToast('Obteniendo instrucciones...');
        const data = await ApiService.post('/subscriptions/create-checkout-session', { planId });
        
        if (data.type === 'manual') {
            document.getElementById('subscriptionModal').style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();
        } else if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        window.showToast('Error al procesar la suscripción', 'error');
    }
};

window.handleManageBilling = async () => {
    try {
        const data = await ApiService.post('/subscriptions/create-portal-session');
        if (data.url) {
            window.location.href = data.url;
        }
    } catch (error) {
        window.showToast('Error al abrir el portal de facturación', 'error');
    }
};