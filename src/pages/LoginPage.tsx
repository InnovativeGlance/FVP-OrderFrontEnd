import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/black-logo.svg';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api-client';

const LABEL_CLASS = 'text-xs font-normal tracking-wide text-muted-foreground uppercase';
const INPUT_CLASS =
  'h-11 rounded-md border-stone-300 bg-background px-3 text-foreground dark:border-input focus-visible:border-gold focus-visible:ring-gold/25 dark:focus-visible:border-gold';
const SUBMIT_CLASS = 'mt-2 h-10 w-full rounded-md font-semibold';

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
    <main className="relative flex min-h-svh items-center justify-center bg-primary px-4 py-10">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-[360px] rounded-lg border-t-4 border-gold bg-card px-6 pt-7 pb-6 text-card-foreground shadow-[0_24px_60px_-12px_rgb(0_0_0/0.45)]">
        <img src={logo} alt="Fox Valley Paint" width={217} height={159} className="h-12 w-auto dark:brightness-0 dark:invert" />

        <h1 className="mt-5 text-base font-semibold text-foreground">
          {step === 'email' ? 'Staff sign-in' : 'Check your email'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 'email' ? (
            'Enter your staff email to receive a sign-in code.'
          ) : (
            <>
              We sent a 6-digit code to <span className="font-medium break-all text-foreground">{email}</span>
            </>
          )}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} noValidate className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className={LABEL_CLASS}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="username"
                placeholder="you@foxvalleypaint.com"
                className={INPUT_CLASS}
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

            <Button type="submit" size="lg" className={SUBMIT_CLASS} disabled={submitting}>
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
          <form onSubmit={handleVerify} noValidate className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code" className={LABEL_CLASS}>
                Verification code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                placeholder="000000"
                className={`${INPUT_CLASS} text-center font-mono text-lg tracking-[0.5em] md:text-lg`}
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

            <Button type="submit" size="lg" className={SUBMIT_CLASS} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Verifying…
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={backToEmail}
                className="inline-flex items-center gap-1 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Change email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendIn > 0}
                className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline dark:text-gold focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:text-muted-foreground/60 disabled:no-underline"
              >
                {resending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : resendIn > 0 ? (
                  `Resend in ${resendIn}s`
                ) : (
                  'Resend code'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
