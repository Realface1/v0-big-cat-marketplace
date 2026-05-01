'use client'

import { useState, useEffect } from 'react'
import { Mail, ArrowLeft, Loader2, CheckCircle2, RefreshCw } from 'lucide-react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

interface OTPVerificationProps {
  email: string
  onVerifySuccess: () => void
  onBack: () => void
  onResend: () => Promise<{ success: boolean; error?: string; data?: any }>
  onVerify: (otp: string) => Promise<{ success: boolean; error?: string }>
  initialDemoOtp?: string
}

export function OTPVerification({
  email,
  onVerifySuccess,
  onBack,
  onResend,
  onVerify,
  initialDemoOtp,
}: OTPVerificationProps) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [canResend, setCanResend] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [demoOtp, setDemoOtp] = useState(initialDemoOtp || '')

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      const result = await onVerify(otp)

      if (result.success) {
        setSuccessMessage('Email verified successfully!')
        setTimeout(() => {
          onVerifySuccess()
        }, 1500)
      } else {
        setError(result.error || 'Verification failed')
      }
    } catch (err) {
      setError('An error occurred during verification')
      // console.error('[v0] Verification error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setError('')

    try {
      const result = await onResend()

      if (result.success) {
        setSuccessMessage('New OTP sent to your email')
        setOtp('')
        setTimeLeft(300)
        setCanResend(false)
        // Show demo OTP if available
        if (result.data?.otp) {
          setDemoOtp(result.data.otp)
        }
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(result.error || 'Failed to resend OTP')
      }
    } catch (err) {
      setError('Failed to resend OTP')
      // console.error('[v0] Resend error:', err)
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all rounded-lg"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-sm">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <p className="text-sm text-success font-medium">{successMessage}</p>
            </div>
          )}

          {/* Card */}
          <div className="bg-card rounded-3xl shadow-2xl shadow-primary/10 border border-border/50 p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-5 shadow-lg shadow-primary/25">
                <Mail className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Verify Email</h1>
              <p className="text-muted-foreground text-sm">
                We&apos;ve sent a 6-digit code to<br />
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Demo OTP Notice */}
            {demoOtp && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-sm font-semibold text-amber-600 mb-1">Demo OTP Code:</p>
                <p className="text-2xl font-bold text-amber-600 font-mono tracking-[0.3em] text-center">{demoOtp}</p>
                <p className="text-xs text-muted-foreground mt-2 text-center">(Copy this code to verify - demo only)</p>
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Enter Code</label>
                <div className="flex justify-center gap-2">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={loading}
                    containerClassName="gap-3"
                  >
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-12 w-12 text-lg font-semibold rounded-lg border-2 border-border bg-secondary/50 focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Timer and Resend */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  {canResend ? (
                    <span className="text-destructive font-semibold">Code expired</span>
                  ) : (
                    <>Expires in <span className="font-semibold text-foreground">{formatTime(timeLeft)}</span></>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend && timeLeft > 0 && resendLoading}
                  className="flex items-center gap-1.5 text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Sending...' : 'Resend'}
                </button>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || timeLeft <= 0}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Back to Sign Up
              </button>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-8 p-4 bg-card border border-border rounded-2xl text-center text-xs text-muted-foreground">
            <p>Didn&apos;t receive the code?</p>
            <p className="mt-2">Check your spam folder or request a new code using the button above</p>
          </div>
        </div>
      </main>
    </div>
  )
}
