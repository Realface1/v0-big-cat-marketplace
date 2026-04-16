'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export function DeploymentGuide() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps)
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId)
    } else {
      newCompleted.add(stepId)
    }
    setCompletedSteps(newCompleted)
  }

  const steps = [
    {
      id: 'db-migration',
      title: 'Database Migration',
      description: 'Create necessary tables and schema',
      details: [
        'Execute orders table creation SQL',
        'Execute order_items table creation SQL',
        'Execute escrow table creation SQL',
        'Verify all indexes are created',
        'Disable RLS on all tables',
      ],
    },
    {
      id: 'env-vars',
      title: 'Environment Variables',
      description: 'Configure payment and service settings',
      details: [
        'SUPABASE_URL - Your Supabase project URL',
        'SUPABASE_ANON_KEY - Supabase anonymous key',
        'PALMPAY_API_KEY - PalmPay API credentials',
        'PALMPAY_MERCHANT_ID - PalmPay merchant account ID',
        'BANK_API_KEY - Bank transfer service API key',
      ],
    },
    {
      id: 'currency-test',
      title: 'Currency Display Testing',
      description: 'Verify Naira currency displays correctly',
      details: [
        'Test product prices display as ₦',
        'Verify cart totals show Naira formatting',
        'Check checkout summary shows ₦',
        'Confirm merchant dashboard stats use ₦',
        'Test order history displays Naira amounts',
      ],
    },
    {
      id: 'payment-methods',
      title: 'Payment Method Testing',
      description: 'Test all payment method options',
      details: [
        'Select PalmPay Wallet as payment method',
        'Select Bank Transfer as payment method',
        'Select Credit Card as payment method',
        'Verify payment method persists to order',
        'Check database stores selected method',
      ],
    },
    {
      id: 'buyer-flow',
      title: 'Buyer Experience',
      description: 'Test complete buyer purchasing flow',
      details: [
        'Signup as buyer with email and phone',
        'Login with credentials',
        'Browse products in marketplace',
        'Click "Add to Cart" on product',
        'Verify "Order Now" button is gone',
        'View cart with items and Naira prices',
        'Proceed to checkout',
        'Select delivery type (Normal/Express)',
        'Enter delivery address',
        'Select payment method',
        'Review order summary',
        'Place order',
        'Receive order confirmation',
      ],
    },
    {
      id: 'merchant-signup',
      title: 'Merchant Signup Flow',
      description: 'Test merchant registration and onboarding',
      details: [
        'Signup as merchant with email, phone, SMEDAN ID',
        'Receive confirmation message',
        'Login with merchant credentials',
        'Complete store setup (name, description, category, location)',
        'Verify setup data saved to auth_users',
      ],
    },
    {
      id: 'store-settings',
      title: 'Store Settings Configuration',
      description: 'Test merchant store settings',
      details: [
        'Access store settings page after setup',
        'Enter store contact details',
        'Configure payment information (bank account)',
        'Set store policies (minimum order, commission)',
        'Save settings successfully',
        'Verify data persists',
      ],
    },
    {
      id: 'merchant-dashboard',
      title: 'Merchant Dashboard',
      description: 'Verify full merchant dashboard access',
      details: [
        'View dashboard with all sections populated',
        'Check stats display in Naira (₦)',
        'Access products section',
        'View products with Naira pricing',
        'Access orders section',
        'Check AI BizPilot insights',
        'Test quick actions buttons',
      ],
    },
    {
      id: 'admin-access',
      title: 'Admin Access',
      description: 'Test admin panel access',
      details: [
        'Click "Admin Access" on onboarding',
        'Enter SMEDAN admin code',
        'View SMEDAN dashboard with merchant approvals',
        'Try PalmPay admin code',
        'View payment and escrow data',
        'Try BigCat super admin code',
        'View full platform analytics',
      ],
    },
    {
      id: 'security-check',
      title: 'Security Verification',
      description: 'Verify security implementations',
      details: [
        'Test session persists on page reload',
        'Logout and verify session cleared',
        'Test invalid login attempts',
        'Verify password validation on signup',
        'Test SMEDAN ID format validation',
        'Verify authenticated users cannot access admin',
      ],
    },
  ]

  const completionPercent = Math.round((completedSteps.size / steps.length) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            BigCat Marketplace - Deployment Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Complete checklist for deployment and testing
          </p>
        </div>

        {/* Progress */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Overall Progress</h2>
            <span className="text-2xl font-bold text-primary">{completionPercent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {completedSteps.size} of {steps.length} steps completed
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                    {completedSteps.has(step.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    ) : (
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                <ArrowRight className={`w-5 h-5 text-muted-foreground transition-transform ${completedSteps.has(step.id) ? 'rotate-90' : ''}`} />
              </button>

              {completedSteps.has(step.id) && (
                <div className="px-4 pb-4 pt-0 border-t border-border space-y-2 bg-muted/30">
                  {step.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Important Notes */}
        <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Important Notes Before Deployment
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• Ensure all database migrations have been executed in Supabase</li>
                <li>• Test payment gateway integrations in sandbox mode first</li>
                <li>• Verify all environment variables are correctly set in Vercel</li>
                <li>• Conduct thorough testing of all user flows</li>
                <li>• Have admin codes ready for different admin levels</li>
                <li>• Set up monitoring and error tracking before going live</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Features Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-2">✅ Implemented Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All currency in Naira (₦)</li>
              <li>• Multi-payment checkout</li>
              <li>• Merchant store setup</li>
              <li>• Admin dashboards</li>
              <li>• Add to cart flow</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-2">🔧 Configuration</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Database schema ready</li>
              <li>• Payment methods configured</li>
              <li>• Currency utilities in place</li>
              <li>• Auth system complete</li>
              <li>• Delivery fee calculation</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-2">📋 Testing Areas</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Buyer signup & login</li>
              <li>• Merchant onboarding</li>
              <li>• Payment selection</li>
              <li>• Order creation</li>
              <li>• Admin access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
