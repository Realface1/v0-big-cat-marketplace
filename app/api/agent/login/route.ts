import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { access_code } = await request.json()
    if (!access_code || typeof access_code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('access_code', access_code.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        region: agent.region,
        role: 'agent',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
