import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://kspraznekysiwyelcpmf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJhem5la3lzaXd5ZWxjcG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDcyODEsImV4cCI6MjA2NzQ4MzI4MX0.LaWu00R5uHIW8spHJQX--gAJ1uOIoRz2wvQGFI5C4Lk'
);

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const facturaId = params.get('id');
  if (!facturaId) {
    alert("ID de factura no especificado");
    return;
  }

  // Obtener la factura
  const { data: factura, error: errorFactura } = await supabase
    .from('facturas')
    .select('*')
    .eq('id', facturaId)
    .single();

  if (errorFactura || !factura) {
    alert("Factura no encontrada");
    return;
  }

  // Obtener usuario
  const { data: cliente, error: errorCliente } = await supabase
  .from('usuarios')
  .select('nombre, correo, telefono')
  .eq('id', factura.user_id)
  .maybeSingle(); // NO lanza error si no encuentra

  if (errorCliente || !cliente) {
  console.error('⚠️ Error al obtener datos del cliente:', errorCliente);
  console.warn('🕵️ ID buscado:', factura.user_id);
  }

  // Obtener detalles con producto
  const { data: detalles, error: errorDetalle } = await supabase
    .from('detalle_factura')
    .select('cantidad, precio_unitario, subtotal, productos(nombre)')
    .eq('factura_id', facturaId);

  // Rellenar datos en el DOM
  document.getElementById('factura-id').textContent = factura.id;
  document.getElementById('cliente-nombre').textContent = cliente?.nombre || '(sin nombre)';
  document.getElementById('cliente-telefono').textContent = cliente?.telefono || '(sin teléfono)';
  document.getElementById('cliente-correo').textContent = cliente?.correo || '(sin correo)';
  document.getElementById('factura-fecha').textContent = new Date(factura.created_at).toLocaleString();

  let subtotal = 0;
  const tbody = document.getElementById('detalle-tabla');

  if (!detalles || detalles.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4">No hay productos en esta factura</td>`;
    tbody.appendChild(tr);
  } else {
    detalles.forEach(item => {
      subtotal += item.subtotal;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.cantidad}</td>
        <td>${item.productos?.nombre || 'Producto desconocido'}</td>
        <td>$${item.precio_unitario.toFixed(2)}</td>
        <td>$${item.subtotal.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  const iva = subtotal * 0.15;
  const total = subtotal + iva;

  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('iva').textContent = iva.toFixed(2);
  document.getElementById('total').textContent = total.toFixed(2);
});
