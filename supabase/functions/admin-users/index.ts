// Supabase Edge Function: admin-users
//
// Handles privileged user-management actions that require the
// service-role key (creating auth users, resetting passwords).
// This key NEVER reaches the frontend — it only exists in this
// function's server-side environment (set automatically by Supabase
// as SUPABASE_SERVICE_ROLE_KEY, or configure it as a function secret).
//
// The caller's JWT is verified and their profile role is checked
// against the `profiles` table before any privileged action runs.
//
// Deploy with:
//   supabase functions deploy admin-users
//
// Invoke from the frontend with:
//   supabase.functions.invoke('admin-users', { body: { action: 'create_user', ... } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function serviceNumberToEmail(serviceNumber: string): string {
  const cleaned = serviceNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${cleaned}@veymandoo-police.local`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client scoped to the caller, used only to verify identity.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'Invalid session.' }, 401)
    }

    // Admin client with the service role, used only after verifying the caller is an administrator.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, active')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'administrator' || !callerProfile.active) {
      return json({ error: 'You do not have permission to perform this action.' }, 403)
    }

    const body = await req.json()
    const { action } = body

    if (action === 'create_user') {
      const { full_name, service_number, password, role } = body
      if (!full_name || !service_number || !password || !role) {
        return json({ error: 'Missing required fields.' }, 400)
      }
      const email = serviceNumberToEmail(service_number)

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (createError || !created.user) {
        return json({ error: createError?.message ?? 'Could not create user.' }, 400)
      }

      const { error: insertError } = await adminClient.from('profiles').insert({
        id: created.user.id,
        service_number,
        full_name,
        role,
        active: true
      })
      if (insertError) {
        // Roll back the auth user if the profile insert fails.
        await adminClient.auth.admin.deleteUser(created.user.id)
        return json({ error: 'Could not create profile: ' + insertError.message }, 400)
      }

      return json({ success: true, user_id: created.user.id })
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = body
      if (!user_id || !new_password) {
        return json({ error: 'Missing required fields.' }, 400)
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password })
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (action === 'delete_user') {
      const { user_id } = body
      if (!user_id) return json({ error: 'Missing user_id.' }, 400)
      if (user_id === userData.user.id) {
        return json({ error: 'You cannot delete your own account.' }, 400)
      }
      const { error } = await adminClient.auth.admin.deleteUser(user_id)
      if (error) return json({ error: error.message }, 400)
      await adminClient.from('profiles').delete().eq('id', user_id)
      return json({ success: true })
    }

    return json({ error: 'Unknown action.' }, 400)
  } catch (err) {
    return json({ error: 'Unexpected server error.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
