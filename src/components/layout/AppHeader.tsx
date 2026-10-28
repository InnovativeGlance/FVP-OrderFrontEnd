import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logo from '@/assets/black-logo.svg';
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
    <header className="sticky top-0 z-20 border-b bg-white/95 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Order Desk home" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          <img src={logo} alt="Fox Valley Paint" width={217} height={159} className="h-11 w-auto shrink-0" />
          <span className="hidden h-8 w-px bg-border sm:block" aria-hidden />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold text-foreground">Order Desk</span>
            <span className="text-xs text-muted-foreground">Order management</span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {userEmail && (
            <div className="hidden min-w-0 items-center gap-2 sm:flex" title={userEmail}>
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground uppercase"
                aria-hidden
              >
                {userEmail.charAt(0)}
              </span>
              <span className="truncate text-sm text-muted-foreground">{userEmail}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
