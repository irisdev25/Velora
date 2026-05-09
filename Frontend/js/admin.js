// Frontend/js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const admins = ['velorasupport883@gmail.com', 'irisdev25@gmail.com', 'iris.dev25@gmail.com', 'iris201922@gmail.com'];
    
    if (!user || !admins.includes(user.email.toLowerCase())) {
        window.location.href = '/pages/dashboard.html'; // Redirigir si no es admin
        return;
    }

    loadAdminData();
});

async function loadAdminData() {
    try {
        const data = await ApiService.get('/admin/stats');
        
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalAppointments').textContent = data.totalAppointments;

        initGrowthChart(data.growthData || []);
        initPlansChart(data.plansDistribution || []);
        renderUserTable(data.users);
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function initGrowthChart(growthData) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: growthData.map(d => d.month),
            datasets: [{
                label: 'Nuevos Usuarios',
                data: growthData.map(d => d.count),
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: '#a855f7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initPlansChart(plansData) {
    const ctx = document.getElementById('plansChart').getContext('2d');
    const labels = plansData.map(d => (d.plan || 'free').toUpperCase());
    const counts = plansData.map(d => d.count);
    
    if (window.plansChartInstance) window.plansChartInstance.destroy();

    window.plansChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: ['#94a3b8', '#a855f7', '#10b981'],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', padding: 20, usePointStyle: true, font: { size: 12, weight: 'bold' } }
                }
            },
            cutout: '75%'
        }
    });
}

function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>
                <div class="user-name">${u.business_name || 'Sin nombre'}</div>
                <div class="user-email">ID: ${u.id}</div>
            </td>
            <td>
                <div class="user-name">${u.name}</div>
                <div class="user-email">${u.email}</div>
            </td>
            <td>
                <span class="plan-pill pill-${u.plan || 'free'}">${(u.plan || 'free').toUpperCase()}</span>
            </td>
            <td>
                <select onchange="updatePlan('${u.email}', this.value)" class="form-input" style="padding: 8px; font-size: 13px; width: auto; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--admin-border);">
                    <option value="free" ${u.plan === 'free' ? 'selected' : ''}>Gratis (5 Serv / 25 Citas)</option>
                    <option value="pro" ${u.plan === 'pro' ? 'selected' : ''}>Pro (10 Serv / ∞ Citas)</option>
                    <option value="business" ${u.plan === 'business' ? 'selected' : ''}>Ultra Pro (∞ Serv / ∞ Citas)</option>
                </select>
            </td>
        </tr>
    `).join('');
}

async function updatePlan(email, newPlan) {
    try {
        await ApiService.post('/subscriptions/admin/update-plan', { userEmail: email, newPlan });
        window.showToast('¡Plan actualizado con éxito!', 'success');
        
        // Recargar solo los datos necesarios
        const data = await ApiService.get('/admin/stats');
        initPlansChart(data.plansDistribution || []);
        renderUserTable(data.users);
    } catch (error) {
        window.showToast('Error al actualizar plan', 'error');
    }
}
