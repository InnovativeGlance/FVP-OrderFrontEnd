import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/black-logo.svg';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api-client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;
const RESEND_COOLDOWN_S = 60;

type Step = 'email' | 'code';

/** Field-level errors go under the input; everything else goes in the alert */
interface FormError {
  field?: string;
  alert?: string;
}

function networkOrGeneric(err: unknown): FormError {
  if (err instanceof ApiError) {
    if (err.status === 0) return { alert: 'Cannot reach the server. Is the API running?' };
    return { alert: err.message };
  }
  return { alert: 'Something went wrong, please try again' };
}

function sendCodeError(err: unknown): FormError {
  if (err instanceof ApiError) {
    if (err.status === 400) return { field: err.message };
    if (err.status === 403) return { field: 'This email is not allowed' };
  }
  // 429 and 502 messages come from the server and are shown as-is
  return networkOrGeneric(err);
}

function verifyCodeError(err: unknown): FormError {
  if (err instanceof ApiError) {
    if (err.status === 400) return { field: err.message };
    if (err.status === 401) return { field: 'Invalid or expired code' };
  }
  return networkOrGeneric(err);
}

/** Seconds left until `until` (epoch ms), ticking once a second */
function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

export default function LoginPage() {
  const { sendCode, verifyCode } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<FormError>({});
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const resendIn = useCountdown(resendAt);

  const startCooldown = (seconds: number) => setResendAt(Date.now() + seconds * 1000);

  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const value = email.trim();
    if (!value) return setError({ field: 'Email is required' });
    if (!EMAIL_RE.test(value)) return setError({ field: 'Enter a valid email address' });

    setError({});
    setSubmitting(true);
    try {
      await sendCode(value);
      setEmail(value);
      setCode('');
      startCooldown(RESEND_COOLDOWN_S);
      setStep('code');
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) startCooldown(err.retryAfter);
      setError(sendCodeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (!CODE_RE.test(code)) return setError({ field: 'Enter the 6-digit code' });

    setError({});
    setSubmitting(true);
    try {
      await verifyCode(email, code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(verifyCodeError(err));
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (resending || resendIn > 0) return;

    setError({});
    setResending(true);
    try {
      await sendCode(email);
      setCode('');
      startCooldown(RESEND_COOLDOWN_S);
      toast.success(`A new code was sent to ${email}`);
    } catch (err) {
      if (err instanceof ApiError && err.retryAfter) startCooldown(err.retryAfter);
      // no email field on this screen, so every error goes in the alert
      const { field, alert } = sendCodeError(err);
      setError({ alert: field ?? alert });
    } finally {
      setResending(false);
    }
  }

  function backToEmail() {
    setStep('email');
    setCode('');
    setError({});
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src={logo} alt="Fox Valley Paint" width={217} height={159} className="mx-auto mb-2 h-20 w-auto" />
          <CardTitle className="text-2xl font-semibold">FVP Order Desk</CardTitle>
          <CardDescription>
            {step === 'email' ? (
              'Sign in with your admin email'
            ) : (
              <>
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendCode} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(error.field)}
                  aria-describedby={error.field ? 'email-error' : undefined}
                />
                {error.field && (
                  <p id="email-error" className="text-sm text-destructive">
                    {error.field}
                  </p>
                )}
              </div>

              {error.alert && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error.alert}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending code…
                  </>
                ) : (
                  'Send code'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  aria-invalid={Boolean(error.field)}
                  aria-describedby={error.field ? 'code-error' : undefined}
                />
                {error.field && (
                  <p id="code-error" className="text-sm text-destructive">
                    {error.field}
                  </p>
                )}
              </div>

              {error.alert && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error.alert}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending || resendIn > 0}
              >
                {resending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending…
                  </>
                ) : resendIn > 0 ? (
                  `Resend code in ${resendIn}s`
                ) : (
                  'Resend code'
                )}
              </Button>

              <Button type="button" variant="link" className="self-center" onClick={backToEmail}>
                <ArrowLeft />
                Use a different email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
