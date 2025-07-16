// carrito.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPA_URL = 'https://kspraznekysiwyelcpmf.supabase.co'
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJhem5la3lzaXd5ZWxjcG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDcyODEsImV4cCI6MjA2NzQ4MzI4MX0.LaWu00R5uHIW8spHJQX--gAJ1uOIoRz2wvQGFI5C4Lk'  // tu clave completa
const supabase = createClient(SUPA_URL, SUPA_KEY)

/**
 * Estructura en memoria solo para renderizar,
 * siempre sobreescribida al recargar desde BD.
 */
let carrito = []

window.addEventListener('DOMContentLoaded', initCarrito)

async function initCarrito() {
  const user = JSON.parse(localStorage.getItem('usuario'))
  if (!user) {
    alert('🔒 Debes iniciar sesión.')
    return window.location.href = 'login.html'
  }

  // Botones de navegación
  document.querySelector('.btn-volver').onclick   = () => window.history.back()
  document.querySelector('.btn-seguir').onclick   = () => window.location.href = 'menu.html'
  document.querySelector('.btn-vaciar').onclick   = onVaciarCarrito
  document.querySelector('.btn-confirmar').onclick = confirmarPedido

  // Delegación de eventos para + / –
  document.body.addEventListener('click', e => {
    if (e.target.classList.contains('btn-mas')) {
      modificarCantidadDb(e.target.dataset.id, +1)
    }
    if (e.target.classList.contains('btn-menos')) {
      modificarCantidadDb(e.target.dataset.id, -1)
    }
  })

  // Carga inicial
  await recargarCarritoDesdeDb(user.id)
  renderizarCarrito()
  actualizarContador()
}

async function recargarCarritoDesdeDb(userId) {
  const { data: lineas, error } = await supabase
    .from('carrito')
    .select(`id, cantidad, producto:productos(id,nombre,precio,imagen,stock)`)
    .eq('user_id', userId)

  if (error) {
    console.error('Error al cargar carrito:', error)
    alert('❌ No se pudo cargar el carrito.')
    carrito = []
    return
  }

  carrito = lineas
}

function renderizarCarrito() {
  const cont = document.querySelector('.contenedor-carrito')
  const tot  = document.querySelector('.carrito-total')
  cont.innerHTML = ''
  tot.innerHTML  = ''

  if (carrito.length === 0) {
    cont.innerHTML = '<p>Tu carrito está vacío.</p>'
    return
  }

  let subtotal = 0
  for (let lin of carrito) {
    const p   = lin.producto
    const sub = p.precio * lin.cantidad
    subtotal += sub

    cont.insertAdjacentHTML('beforeend', `
      <div class="item-carrito">
        <div class="producto-img">
          <img src="${p.imagen}" alt="${p.nombre}"
               onerror="this.src='https://via.placeholder.com/150'">
        </div>
        <div class="producto-info">
          <h4>${p.nombre}</h4>
          <p>Precio: $${p.precio.toFixed(2)}</p>
          <div class="cantidad-controles">
            <button class="btn-menos" data-id="${lin.id}">−</button>
            <span>${lin.cantidad}</span>
            <button class="btn-mas"  data-id="${lin.id}">+</button>
          </div>
          <p>Subtotal: $${sub.toFixed(2)}</p>
        </div>
      </div>
    `)
  }

  const iva      = subtotal * 0.15
  const totalIVA = subtotal + iva
  tot.innerHTML = `
    <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
    <p><strong>IVA (15%):</strong> $${iva.toFixed(2)}</p>
    <p><strong>Total:</strong> $${totalIVA.toFixed(2)}</p>
  `
}

async function modificarCantidadDb(lineaId, delta) {
  // Busca la línea en memoria
  const idx = carrito.findIndex(l => l.id == lineaId)
  if (idx === -1) return

  const nueva = carrito[idx].cantidad + delta

  if (nueva < 1) {
    // Borrar en BD
    await supabase
      .from('carrito')
      .delete()
      .eq('id', lineaId)
  } else {
    // Update cantidad en BD
    await supabase
      .from('carrito')
      .update({ cantidad: nueva })
      .eq('id', lineaId)
  }

  // Recargo todo para quedarme con datos frescos
  const user = JSON.parse(localStorage.getItem('usuario'))
  await recargarCarritoDesdeDb(user.id)

  renderizarCarrito()
  actualizarContador()
}

function actualizarContador() {
  const count = carrito.reduce((sum, l) => sum + l.cantidad, 0)
  const span  = document.querySelector('.cart-count')
  if (!span) return
  span.textContent = count > 0 ? `(${count})` : ''
}

async function onVaciarCarrito() {
  if (carrito.length === 0) {
    return alert('⚠️ Su carrito ya está vacío.')
  }
  if (!confirm('¿Seguro que desea vaciar todo el carrito?')) return

  const user = JSON.parse(localStorage.getItem('usuario'))

  // Borro todo en BD
  await supabase
    .from('carrito')
    .delete()
    .eq('user_id', user.id)

  // Recargo
  carrito = []
  renderizarCarrito()
  actualizarContador()

  alert('🗑️ Carrito vaciado completamente.')
}

async function confirmarPedido() {
  const user = JSON.parse(localStorage.getItem('usuario'))
  if (carrito.length === 0) {
    return alert('⚠️ Tu carrito está vacío.')
  }

  // 1) Validar stock
  for (let lin of carrito) {
    const { data: prod, error } = await supabase
      .from('productos')
      .select('stock')
      .eq('id', lin.producto.id)
      .single()
    if (error || prod.stock < lin.cantidad) {
      return alert(`😔 No hay suficiente stock de "${lin.producto.nombre}".`)
    }
  }

  // 2) Calcular total
  const total = carrito.reduce((sum, l) => sum + l.cantidad * l.producto.precio, 0)

  // 3) Crear factura
  const { data: fac, error: errFac } = await supabase
    .from('facturas')
    .insert({ user_id: user.id, total })
    .select('id')
    .single()
  if (errFac || !fac) {
    return alert('❌ Falló al crear la factura.')
  }

  // 4) Detalles
  const detalles = carrito.map(l => ({
    factura_id:      fac.id,
    producto_id:     l.producto.id,
    cantidad:        l.cantidad,
    precio_unitario: l.producto.precio,
    subtotal:        l.cantidad * l.producto.precio
  }))
  const { error: errDet } = await supabase
    .from('detalle_factura')
    .insert(detalles)
  if (errDet) {
    return alert('❌ Falló al crear los detalles.')
  }

  // 5) Actualizar stock
  for (let l of carrito) {
    await supabase
      .from('productos')
      .update({ stock: l.producto.stock - l.cantidad })
      .eq('id', l.producto.id)
  }

  // 6) Vaciar carrito en BD
  await supabase
    .from('carrito')
    .delete()
    .eq('user_id', user.id)

  alert('✅ Pedido confirmado correctamente.')

  // 7) Refrescar UI
  carrito = []
  renderizarCarrito()
  actualizarContador()
}
