import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logo from '@/assets/black-logo.svg';
import { ON_GREEN_BUTTON, ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export function AppHeader() {
  const { userEmail, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-gold bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Order Desk home" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          {/* The source logo is near-black; render it white on the green bar */}
          <img src={logo} alt="Fox Valley Paint" width={217} height={159} className="h-11 w-auto shrink-0 brightness-0 invert" />
          <span className="hidden h-8 w-px bg-white/30 sm:block" aria-hidden />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold">Order Desk</span>
            <span className="text-xs text-white/75">Order management</span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {userEmail && (
            <div className="hidden min-w-0 items-center gap-2 sm:flex" title={userEmail}>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold uppercase"
                aria-hidden
              >
                {userEmail.charAt(0)}
              </span>
              <span className="truncate text-sm text-white/80">{userEmail}</span>
            </div>
          )}
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} className={ON_GREEN_BUTTON}>
            <LogOut />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
