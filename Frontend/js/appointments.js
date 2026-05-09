// frontend/js/appointments.js
const fetchAppointments = async () => {
  try {
    const appointments = await ApiService.get('/appointments');
    displayAppointments(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
  }
};

// Display appointments in table
const displayAppointments = (appointments) => {
  const container = document.getElementById('appointmentsTable');
  
  if (appointments.length === 0) {
    container.innerHTML = '<p>No hay citas</p>';
    return;
  }

  let html = '<table class="appointments-table">' +
    '<thead><tr><th>Cliente</th><th>Servicio</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th></tr></thead>' +
    '<tbody>';
  
  appointments.forEach(apt => {
    const fechaFormateada = window.formatDateSpanish(apt.appointment_date);
    
    // Texto del estado
    let estadoTexto = apt.status;
    if (estadoTexto === 'confirmed') estadoTexto = 'Confirmada';
    else if (estadoTexto === 'pending_payment') estadoTexto = 'Verificar pago';
    else if (estadoTexto === 'pending') estadoTexto = 'Por confirmar';
    else if (estadoTexto === 'pending_verification') estadoTexto = 'Verificar pago';
    else if (estadoTexto === 'cancelled') estadoTexto = 'Cancelada';
    else if (estadoTexto === 'completed') estadoTexto = 'Completada';
    
    const hasProof = apt.proof_of_payment_url;
    
    html += '<tr>' +
      '<td>' + (apt.client_name || '') + '</td>' +
      '<td><div style="display:flex; align-items:center; gap:8px;"><i data-lucide="' + window.getServiceIcon(apt.service_name) + '" style="width:16px; height:16px; opacity:0.7;"></i>' + (apt.service_name || 'Servicio') + '</div></td>' +
      '<td>' + fechaFormateada + '</td>' +
      '<td>' + (apt.appointment_time || '') + '</td>' +
      '<td>' +
        '<span class="status-badge status-' + apt.status + '">' + estadoTexto + '</span>' +
        (hasProof ? '<br><a href="' + BASE_URL + apt.proof_of_payment_url + '" target="_blank" class="proof-link" style="font-size:0.75rem; color:var(--accent-lime);">Ver Comprobante</a>' : '') +
      '</td>' +
      '<td>' +
      '<select onchange="updateStatus(' + apt.id + ', this.value)" class="status-select">' +
      '<option value="pending" ' + (apt.status === 'pending' ? 'selected' : '') + '>Por confirmar</option>' +
      '<option value="pending_payment" ' + (apt.status === 'pending_payment' || apt.status === 'pending_verification' ? 'selected' : '') + '>Verificar pago</option>' +
      '<option value="confirmed" ' + (apt.status === 'confirmed' ? 'selected' : '') + '>Confirmada</option>' +
      '<option value="completed" ' + (apt.status === 'completed' ? 'selected' : '') + '>Completada</option>' +
      '<option value="cancelled" ' + (apt.status === 'cancelled' ? 'selected' : '') + '>Cancelada</option>' +
      '</select>' +
      '</td>' +
      '</tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

// Update appointment status
const updateStatus = async (id, status) => {
  let rejectionReason = null;
  if (status === 'cancelled') {
    rejectionReason = prompt('¿Cuál es el motivo de la cancelación/rechazo? (Este motivo se enviará al cliente por correo)');
    if (rejectionReason === null) {
      // Revert select if possible, or just refresh
      fetchAppointments();
      return;
    }
    if (!rejectionReason.trim()) {
      alert('Debes ingresar un motivo para poder rechazar la cita.');
      fetchAppointments();
      return;
    }
  }

  try {
    const updateData = { status };
    if (status === 'confirmed') {
        updateData.payment_status = 'paid';
    }
    if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
    }
    await ApiService.patch(`/appointments/${id}`, updateData);
    fetchAppointments();
    if (window.showToast) window.showToast(status === 'cancelled' ? 'Cita rechazada' : 'Estado actualizado', 'success');
  } catch (error) {
    console.error('Error:', error);
    window.showToast(error.message || 'Error al actualizar el estado', 'error');
    fetchAppointments();
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', fetchAppointments);