import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://kspraznekysiwyelcpmf.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJhem5la3lzaXd5ZWxjcG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkwNzI4MSwiZXhwIjoyMDY3NDgzMjgxfQ.Q0h8AYnIP_J1HMUDl9sLCxNhIFEAugkRRGrggf-a0lo'

const supabase = createClient(SUPA_URL, SERVICE_ROLE_KEY)

async function createAdmin() {
  // 1) Crea el usuario en Auth y marca el email como confirmado
  const { user, error: err1 } = await supabase.auth.admin.createUser({
    email:          'admin@dragondorado.com',
    password:       'Admin123!',    // pon aquí la contraseña que quieras
    email_confirm:  true
  })
  if (err1) throw err1
  console.log('Auth user creado:', user.id)

  // 2) Inserta o actualiza su perfil en tu tabla "usuarios"
  const { error: err2 } = await supabase
    .from('usuarios')
    .upsert({
      id:       user.id,
      nombre:   'Administrador',
      correo:   user.email,
      role:     'admin',
      telefono: '0000000000'
    }, { onConflict: 'id' })
  if (err2) throw err2
  console.log('Perfil en tabla usuarios OK')
}

createAdmin()
  .then(() => console.log('🎉 Admin listo para hacer login'))
  .catch(console.error)
