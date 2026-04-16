"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp, Wallet, DollarSign, CheckCircle2, Clock, Loader2, UserPlus, Copy, Trash2, MapPin } from "lucide-react"
import { formatNaira } from "@/lib/currency-utils"

export function PalmpayAdminDashboard() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    productEscrow: 0,
    deliveryEscrow: 0,
    totalEscrow: 0,
    completedPayments: 0,
    pendingPayments: 0,
    pendingOrders: 0,
    completedOrders: 0,
    disbursedAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<any[]>([])
  const [newAgent, setNewAgent] = useState({ name: "", email: "", region: "" })
  const [agentAction, setAgentAction] = useState("")
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentFeedback, setAgentFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    const adminAccess = sessionStorage.getItem("adminAccess")
    if (adminAccess === "PALMPAY_012") {
      setIsAuthorized(true)
      loadData()
    } else {
      router.push("/")
    }
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/transactions', { cache: 'no-store' })
      const data = await res.json()

      if (data.success) {
        setTransactions(data.transactions || [])
        if (data.stats) setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadAgents = async () => {
    setAgentsLoading(true)
    setAgentFeedback(null)
    try {
      const res = await fetch('/api/admin/agents')
      const data = await res.json()
      if (data.success) {
        setAgents(data.agents || [])
      } else {
        setAgentFeedback({ type: "error", message: data.error || 'Failed to load agents' })
      }
    } catch (error) {
      console.error('Error loading agents:', error)
      setAgentFeedback({ type: "error", message: 'Failed to load agents. Please try again.' })
    } finally {
      setAgentsLoading(false)
    }
  }

  const addAgent = async () => {
    if (!newAgent.name.trim() || !newAgent.email.trim() || !newAgent.region.trim()) {
      alert('Please fill in all fields')
      return
    }

    setAgentAction('adding')
    setAgentFeedback(null)
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgent.name.trim(),
          email: newAgent.email.trim(),
          region: newAgent.region.trim(),
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewAgent({ name: "", email: "", region: "" })
        setAgentFeedback({ type: "success", message: 'Agent added successfully.' })
        loadAgents()
      } else {
        setAgentFeedback({ type: "error", message: data.error || 'Failed to add agent.' })
      }
    } catch (error) {
      console.error('Error adding agent:', error)
      setAgentFeedback({ type: "error", message: 'Failed to add agent. Please try again.' })
    } finally {
      setAgentAction('')
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return

    setAgentAction('deleting')
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        loadAgents()
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
    } finally {
      setAgentAction('')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  useEffect(() => {
    if (isAuthorized) {
      loadAgents()
    }
  }, [isAuthorized])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: "Total Transactions",
      value: stats.totalTransactions,
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Total Revenue",
      value: formatNaira(stats.totalRevenue),
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Total In Escrow",
      value: formatNaira(stats.totalEscrow),
      icon: Wallet,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Disbursed Amount",
      value: formatNaira(stats.disbursedAmount),
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-600",
    },
  ]

  const failedTransactions = transactions.filter((txn) => txn.status !== 'completed').length
  const highValueCount = transactions.filter((txn) => Number(txn.amount || 0) >= 50000).length
  const settlementQueue = transactions
    .filter((txn) => txn.status !== 'completed')
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center gap-4 p-6 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PalmPay Admin</h1>
            <p className="text-sm text-muted-foreground">Payment & Escrow Management</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Payment Status Overview</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
                <span className="font-bold text-foreground">{stats.completedPayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-muted-foreground">Pending Payments</span>
                </div>
                <span className="font-bold text-foreground">{stats.pendingPayments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-muted-foreground">Pending Orders</span>
                </div>
                <span className="font-bold text-foreground">{stats.pendingOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-muted-foreground">Completed Orders</span>
                </div>
                <span className="font-bold text-foreground">{stats.completedOrders}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Escrow Summary</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Product Escrow</span>
                <span className="font-bold text-foreground">{formatNaira(stats.productEscrow)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery Escrow</span>
                <span className="font-bold text-foreground">{formatNaira(stats.deliveryEscrow)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total Held</span>
                <span className="font-bold text-foreground">{formatNaira(stats.totalEscrow)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Total Disbursed</span>
                <span className="font-bold text-foreground">{formatNaira(stats.disbursedAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Payment Risk Monitor</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed transactions</span>
                <span className="font-bold text-red-600">{failedTransactions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High value transactions</span>
                <span className="font-bold text-amber-600">{highValueCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Escrow release backlog</span>
                <span className="font-bold text-purple-600">{stats.pendingPayments}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-bold text-lg text-foreground mb-4">Settlement Queue</h2>
            {settlementQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending settlements.</p>
            ) : (
              <div className="space-y-2">
                {settlementQueue.map((txn) => (
                  <div key={txn.id} className="rounded-lg border border-border px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{txn.id.substring(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{txn.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatNaira(txn.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Management */}
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-border">
            <h2 className="font-bold text-xl text-foreground mb-4">Agent Management</h2>
            {agentFeedback && (
              <div
                className={`mb-4 rounded-md border px-3 py-2 text-sm ${
                  agentFeedback.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {agentFeedback.message}
              </div>
            )}
            
            {/* Add New Agent Form */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-3">Add New Agent</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Agent Name..."
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                  className="px-3 py-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="email"
                  placeholder="Email..."
                  value={newAgent.email}
                  onChange={(e) => setNewAgent({...newAgent, email: e.target.value})}
                  className="px-3 py-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Region..."
                  value={newAgent.region}
                  onChange={(e) => setNewAgent({...newAgent, region: e.target.value})}
                  className="px-3 py-2 border border-border rounded bg-background text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={addAgent}
                  disabled={agentAction === 'adding'}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {agentAction === 'adding' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Add Agent
                </button>
              </div>
            </div>

            {/* Agents List */}
            {agentsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <p className="text-muted-foreground">No agents created yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agents.map((agent) => (
                  <div key={agent.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{agent.name}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">{agent.email}</span>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{agent.region}</span>
                        </div>
                        {agent.access_code && (
                          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                            <span className="font-mono text-xs text-foreground">{agent.access_code}</span>
                            <button
                              onClick={() => copyToClipboard(agent.access_code)}
                              className="p-1 hover:bg-background rounded"
                            >
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      disabled={agentAction === 'deleting'}
                      className="text-red-600 hover:bg-red-50 p-2 rounded disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-lg text-foreground">Recent Transactions</h2>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-sm text-foreground">ID</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">User</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Amount</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Type</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Date</th>
                  <th className="text-left p-4 font-semibold text-sm text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-4 text-sm text-muted-foreground">{txn.id.substring(0, 8)}</td>
                      <td className="p-4 text-sm text-foreground font-medium">{txn.user.substring(0, 8)}</td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {formatNaira(txn.amount)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground capitalize">{txn.type}</td>
                      <td className="p-4 text-sm text-muted-foreground">{txn.date}</td>
                      <td className="p-4 text-sm">
                        {txn.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
