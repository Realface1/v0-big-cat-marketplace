import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

type ActiveAgent = {
  id: string
  created_at?: string | null
  workload: number
}

function normalizeRequest(row: any) {
  return {
    ...row,
    assigned_agent_id: row?.assigned_agent_id || null,
    onboarding_status: row?.onboarding_status || 'not_started',
  }
}

async function getActiveAgentsWithWorkload(supabase: any): Promise<ActiveAgent[]> {
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (agentError) {
    const msg = agentError?.message || ''
    if (msg.includes("Could not find the table 'public.agents'")) {
      return []
    }
    throw agentError
  }

  if (!agents?.length) {
    return []
  }

  const agentIds = agents.map((agent: any) => agent.id).filter(Boolean)
  const { data: queue, error: queueError } = await supabase
    .from('merchant_onboarding_requests')
    .select('assigned_agent_id, onboarding_status')
    .in('assigned_agent_id', agentIds)
    .neq('onboarding_status', 'completed')

  if (queueError) throw queueError

  const workloads = new Map<string, number>()
  for (const id of agentIds) workloads.set(id, 0)

  for (const row of queue || []) {
    const assignedAgentId = row?.assigned_agent_id
    if (!assignedAgentId) continue
    workloads.set(assignedAgentId, (workloads.get(assignedAgentId) || 0) + 1)
  }

  return agents.map((agent: any) => ({
    id: agent.id,
    created_at: agent.created_at || null,
    workload: workloads.get(agent.id) || 0,
  }))
}

function pickNextAgent(agents: ActiveAgent[]) {
  if (!agents.length) return null

  return [...agents].sort((a, b) => {
    if (a.workload !== b.workload) {
      return a.workload - b.workload
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  })[0]
}

async function autoAssignBacklog(supabase: any, rows: any[]) {
  const normalizedRows = (rows || []).map(normalizeRequest)
  const unassignedRows = normalizedRows.filter((row: any) => !row.assigned_agent_id)

  if (!unassignedRows.length) {
    return normalizedRows
  }

  const activeAgents = await getActiveAgentsWithWorkload(supabase)
  if (!activeAgents.length) {
    return normalizedRows
  }

  const mutableAgents = activeAgents.map((agent) => ({ ...agent }))
  const nextRows = [...normalizedRows]

  for (let index = 0; index < nextRows.length; index++) {
    const row = nextRows[index]
    if (row.assigned_agent_id) continue

    const selectedAgent = pickNextAgent(mutableAgents)
    if (!selectedAgent) break

    const { data: updatedRow, error: updateError } = await supabase
      .from('merchant_onboarding_requests')
      .update({
        assigned_agent_id: selectedAgent.id,
        onboarding_status: row.onboarding_status === 'completed' ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', row.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    nextRows[index] = normalizeRequest(updatedRow || row)
    selectedAgent.workload += 1
  }

  return nextRows
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('merchant_onboarding_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const requests = await autoAssignBacklog(supabase, data || [])

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    const msg = error?.message || 'Unknown error'
    if (msg.includes("Could not find the table 'public.merchant_onboarding_requests'")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Onboarding table is missing. Run scripts/009-create-merchant-onboarding-table.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const business_name = String(body.business_name || '').trim()
    const category = String(body.category || '').trim()
    const date_of_commencement = String(body.date_of_commencement || '').trim()
    const owner_name = String(body.owner_name || '').trim()
    const phone = String(body.phone || '').trim()
    const email = String(body.email || '').trim().toLowerCase()

    if (!business_name || !category || !date_of_commencement || !owner_name || !phone || !email) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const activeAgents = await getActiveAgentsWithWorkload(supabase)
    const selectedAgent = pickNextAgent(activeAgents)

    const payload = {
      id: `onboard_${randomUUID()}`,
      business_name,
      category,
      date_of_commencement,
      owner_name,
      phone,
      email,
      onboarding_status: selectedAgent ? 'in_progress' : 'not_started',
      assigned_agent_id: selectedAgent?.id || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('merchant_onboarding_requests')
      .insert(payload as any)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      request: normalizeRequest(data),
      auto_assigned: Boolean(selectedAgent),
    })
  } catch (error: any) {
    const msg = error?.message || 'Unknown error'
    if (msg.includes("Could not find the table 'public.merchant_onboarding_requests'")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Onboarding table is missing. Run scripts/009-create-merchant-onboarding-table.sql in Supabase SQL Editor.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
