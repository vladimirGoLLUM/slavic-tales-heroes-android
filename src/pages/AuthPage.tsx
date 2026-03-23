import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import bgHub from '@/assets/bg-hub.jpg';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (mode === 'signup' && !username.trim()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error('Подтвердите email перед входом');
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error('Неверный email или пароль');
          } else {
            toast.error(error.message);
          }
        }
      } else {
        if (password.length < 6) {
          toast.error('Пароль должен быть минимум 6 символов');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Этот email уже зарегистрирован');
          } else {
            toast.error(error.message);
          }
        } else {
          setConfirmSent(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="fixed inset-0 z-0">
          <img src={bgHub} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 bg-surface/80 backdrop-blur-sm rounded-2xl border border-border card-lubok p-8 max-w-sm w-full mx-4 text-center"
        >
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-kelly text-primary text-gold-glow mb-2">Проверь почту!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Мы отправили письмо на <span className="text-foreground font-kelly">{email}</span>. 
            Нажми на ссылку в письме, чтобы подтвердить аккаунт.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setMode('login'); }}
            className="text-sm text-primary hover:text-primary/80 font-kelly"
          >
            ← Войти
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      <div className="fixed inset-0 z-0">
        <img src={bgHub} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-kelly text-primary text-gold-glow">
            Б Ы Л И Н А
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === 'login' ? 'Войди в игру' : 'Создай аккаунт'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface/80 backdrop-blur-sm rounded-2xl border border-border card-lubok p-6 space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="username"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-xs font-kelly text-muted-foreground mb-1">Имя витязя</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Как тебя зовут?"
                  className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[48px]"
                  maxLength={30}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-kelly text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hero@bylina.ru"
              className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[48px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-kelly text-muted-foreground mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[48px]"
              minLength={6}
              required
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-kelly text-lg py-3 rounded-xl card-lubok transition-all min-h-[48px] disabled:opacity-50"
          >
            {loading ? '⏳' : mode === 'login' ? '⚔️ Войти' : '🛡️ Создать аккаунт'}
          </motion.button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-primary font-kelly transition-colors"
            >
              {mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
