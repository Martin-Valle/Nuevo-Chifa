// create-admin.js
import { createClient } from '@supabase/supabase-js'

const SUPA_URL         = 'https://kspraznekysiwyelcpmf.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJhem5la3lzaXd5ZWxjcG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkwNzI4MSwiZXhwIjoyMDY3NDgzMjgxfQ.Q0h8AYnIP_J1HMUDl9sLCxNhIFEAugkRRGrggf-a0lo' // ¡Pon aquí tu SERVICE_ROLE_KEY!

const supabase = createClient(SUPA_URL, SERVICE_ROLE_KEY)

async function createOrUpdateAdmin() {
  const email    = 'admin@dragondorado.com'
  const password = 'Admin123!'  // <- tu contraseña de administrador

  let userId

  // 1) Intentar crear el usuario
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (createErr) {
    // Si ya existía, fetch para recuperarlo
    if (createErr.status === 422 && createErr.code === 'email_exists') {
      console.log('⚠️ El admin ya existe, recuperando UID…')
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ email })
      if (listErr || !listData.users?.length) {
        throw listErr || new Error('No pude recuperar el admin existente')
      }
      userId = listData.users[0].id
      // Actualizar contraseña y confirmar email
      const { data: updData, error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true
      })
      if (updErr) throw updErr
      console.log('🔄 Admin existente actualizado:', updData.user.id)
    } else {
      throw createErr
    }
  } else {
    // Creación exitosa
    userId = createData.user.id
    console.log('✅ Admin creado:', userId)
  }

  // 2) Upsert en tu tabla "usuarios"
  const { error: upsertErr } = await supabase
    .from('usuarios')
    .upsert(
      {
        id:       userId,
        nombre:   'Administrador',
        correo:   email,
        role:     'admin',
        telefono: '0000000000'
      },
      { onConflict: 'id' }
    )
  if (upsertErr) throw upsertErr

  console.log('🎉 Perfil de admin OK en tabla "usuarios"')
}

createOrUpdateAdmin()
  .then(() => console.log('🎉 ¡Admin listo para hacer login!'))
  .catch(err => {
    console.error('❌ Error durante create-admin:', err.message || err)
    process.exit(1)
  })
