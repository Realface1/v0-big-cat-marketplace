import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ActiveAgent = {
  id: string
  created_at?: string | null
  workload: number
}

async function getActiveAgentsWithWorkload(supabase: any): Promise<ActiveAgent[]> {
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (agentError) throw agentError
  if (!agents?.length) return []

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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestIdFromPath = request.nextUrl.pathname.split('/').filter(Boolean).at(-2) || ''
    const requestId = String(params?.id || requestIdFromPath || '').trim()

    if (!requestId) {
      return NextResponse.json({ success: false, error: 'Request id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existing, error: findError } = await supabase
      .from('merchant_onboarding_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Onboarding request not found' }, { status: 404 })
    }

    if (existing.assigned_agent_id) {
      return NextResponse.json({ success: true, request: existing, auto_assigned: true })
    }

    const activeAgents = await getActiveAgentsWithWorkload(supabase)
    const selectedAgent = pickNextAgent(activeAgents)

    if (!selectedAgent) {
      return NextResponse.json({ success: false, error: 'No active agents available for auto-assignment' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('merchant_onboarding_requests')
      .update({
        assigned_agent_id: selectedAgent.id,
        onboarding_status: 'in_progress',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', requestId)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, request: data, auto_assigned: true })
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
