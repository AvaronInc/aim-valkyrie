import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { login } from '../lib/auth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(user, pass)) { navigate({ to: '/' }); }
    else { setError(true); setTimeout(() => setError(false), 2000); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="panel scanline w-full max-w-sm">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--primary)] glow-green font-bold">▌ SECURE TERMINAL // AUTH REQUIRED</p>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <input
            className="bg-transparent border border-[var(--border)] px-3 py-2 text-sm font-mono caret-[var(--primary)] outline-none focus:border-[var(--primary)] transition-colors"
            placeholder="USERNAME"
            value={user}
            onChange={e => setUser(e.target.value)}
            autoComplete="off"
          />
          <input
            type="password"
            className="bg-transparent border border-[var(--border)] px-3 py-2 text-sm font-mono caret-[var(--primary)] outline-none focus:border-[var(--primary)] transition-colors"
            placeholder="PASSWORD"
            value={pass}
            onChange={e => setPass(e.target.value)}
          />
          {error && <p className="text-xs glow-red text-[var(--destructive)] tracking-widest">⚠ ACCESS DENIED</p>}
          <button type="submit" className="border border-[var(--primary)] text-[var(--primary)] py-2 text-xs tracking-[0.25em] uppercase hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors font-bold">&gt; AUTHENTICATE</button>
        </form>
      </div>
    </div>
  );
}
