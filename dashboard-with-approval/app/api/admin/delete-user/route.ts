import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl || serviceRoleKey === 'MASUKKAN_SERVICE_ROLE_KEY_ANDA_DI_SINI') {
      return NextResponse.json(
        { error: 'Service role key belum dikonfigurasi. Tambahkan SUPABASE_SERVICE_ROLE_KEY di .env.local' },
        { status: 500 }
      )
    }

    // Create admin client using service role (bypasses RLS & auth restrictions)
    const cookieStore = await cookies()
    const adminSupabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    })

    // Verify caller is admin using their JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Create a regular client to verify the caller's token
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const callerSupabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    const { data: { user: callerUser }, error: authErr } = await callerSupabase.auth.getUser(token)

    if (authErr || !callerUser) {
      return NextResponse.json({ error: 'Token tidak valid.' }, { status: 401 })
    }

    // Check caller is admin using admin client (bypasses RLS)
    const { data: callerProfile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat menghapus akun.' }, { status: 403 })
    }

    // Get target user ID from request body
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID diperlukan.' }, { status: 400 })
    }

    // Prevent admin from deleting themselves
    if (userId === callerUser.id) {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri.' }, { status: 400 })
    }

    // Delete profile first (cascades activity_records etc via foreign keys)
    await adminSupabase.from('profiles').delete().eq('id', userId)

    // Delete from auth.users using admin API
    const { error: deleteErr } = await adminSupabase.auth.admin.deleteUser(userId)

    if (deleteErr) {
      console.error('Error deleting auth user:', deleteErr)
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete user error:', err)
    return NextResponse.json({ error: err.message || 'Gagal menghapus akun.' }, { status: 500 })
  }
}
