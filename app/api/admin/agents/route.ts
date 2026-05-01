import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

function generateAccessCode(): string {
  // e.g. AGENT-A3F8-K2P1
  const part1 = randomBytes(2).toString('hex').toUpperCase()
  const part2 = randomBytes(2).toString('hex').toUpperCase()
  return `AGENT-${part1}-${part2}`
}

// GET /api/admin/agents — list all agents
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ success: true, agents: data || [] })
  } catch (error: any) {
    const msg = error.message || 'Unknown error'
    if (msg.includes("Could not find the table 'public.agents'")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agents table is missing. Run scripts/008-create-agents-table.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/admin/agents — create agent
export async function POST(request: NextRequest) {
  try {
    const { name, email, region } = await request.json()
    if (!name || !email || !region) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and region are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Ensure access code is unique (retry on collision)
    let access_code = ''
    let attempts = 0
    while (attempts < 5) {
      const candidate = generateAccessCode()
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('access_code', candidate)
        .maybeSingle()
      if (!existing) {
        access_code = candidate
        break
      }
      attempts++
    }
    if (!access_code) {
      return NextResponse.json({ success: false, error: 'Could not generate unique code' }, { status: 500 })
    }

    const id = `agent_${Date.now()}_${randomBytes(4).toString('hex')}`
    const { data, error } = await supabase
      .from('agents')
      .insert({ id, name, email, region, access_code, role: 'agent' })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, agent: data })
  } catch (error: any) {
    const msg = error.message || ''
    if (msg.includes("Could not find the table 'public.agents'")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agents table is missing. Run scripts/008-create-agents-table.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'An agent with that email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
