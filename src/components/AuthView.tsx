import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { ColorPalette, ThemeMode, UserProfile } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { StoredUserAccount } from '../lib/storage';
import { SupabaseSyncService } from '../lib/supabaseSync';

interface AuthViewProps {
  onLoginSuccess: (userId: string, account: StoredUserAccount, profile?: UserProfile) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onSelectPalette: (pal: ColorPalette) => void;
  savedAccounts: StoredUserAccount[];
}

// Helper to generate an SVG avatar with the user's initial letter
export const generateInitialAvatar = (fullName: string, bgColor = '#7c3aed'): string => {
  const initial = (fullName.trim()[0] || 'E').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="#4c1d95" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="48" fill="url(#grad)"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="95" font-weight="700" fill="#ffffff">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  colorPalette,
  themeMode,
  onToggleTheme,
  onSelectPalette,
  savedAccounts,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Fields - Only Username and Password
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setErrorMessage('Por favor, informe seu nome de usuário.');
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 3) {
          setErrorMessage('A senha deve ter pelo menos 3 caracteres.');
          setIsLoading(false);
          return;
        }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const initialAvatar = generateInitialAvatar(name, pal.previewColor);

        // 1. Create Stored User Account
        const newAccount: StoredUserAccount = {
          id: userId,
          name: name.trim(),
          email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@estudotrack.local`,
          passwordHash: password,
          avatar: initialAvatar,
          courseOrGoal: '',
          createdAt: new Date().toISOString(),
        };

        // 2. Create UserProfile for background sync
        const newProfile: UserProfile = {
          id: userId,
          name: name.trim(),
          email: newAccount.email,
          avatar: initialAvatar,
          courseOrGoal: '',
          level: 1,
          xp: 0,
          streakDays: 0,
          lastActiveDate: new Date().toISOString().split('T')[0],
          targetWeeklyMinutes: 300,
          createdAt: new Date().toISOString(),
        };

        // 3. Sync profile in background
        await SupabaseSyncService.syncProfile(newProfile, password);

        setSuccessMessage('Conta criada com sucesso! Entrando...');
        setTimeout(() => {
          onLoginSuccess(userId, newAccount, newProfile);
        }, 400);
      } else {
        // Mode === 'login'
        if (!name.trim()) {
          setErrorMessage('Por favor, informe seu nome de usuário.');
          setIsLoading(false);
          return;
        }
        if (!password) {
          setErrorMessage('Por favor, informe sua senha.');
          setIsLoading(false);
          return;
        }

        const cleanName = name.trim().toLowerCase();

        // 1. First check in saved local accounts
        const localFound = savedAccounts.find(
          (u) =>
            u.name.trim().toLowerCase() === cleanName &&
            (u.passwordHash === password || !u.passwordHash)
        );

        if (localFound) {
          const remoteProfile = await SupabaseSyncService.fetchProfile(localFound.id);
          setSuccessMessage('Login efetuado com sucesso!');
          setTimeout(() => {
            onLoginSuccess(localFound.id, localFound, remoteProfile || undefined);
          }, 400);
          return;
        }

        // 2. Search in remote profile table directly
        const remoteProfile = await SupabaseSyncService.searchProfileByName(cleanName);
        if (remoteProfile) {
          // Verify password if stored
          if (remoteProfile.passwordHash && remoteProfile.passwordHash !== password) {
            setErrorMessage('Senha incorreta para este usuário.');
            setIsLoading(false);
            return;
          }

          const accountFromSupabase: StoredUserAccount = {
            id: remoteProfile.id,
            name: remoteProfile.name,
            email: remoteProfile.email,
            passwordHash: password,
            avatar: remoteProfile.avatar || generateInitialAvatar(remoteProfile.name, pal.previewColor),
            courseOrGoal: remoteProfile.courseOrGoal || '',
            createdAt: remoteProfile.createdAt,
          };

          setSuccessMessage('Login efetuado com sucesso! Entrando...');
          setTimeout(() => {
            onLoginSuccess(remoteProfile.id, accountFromSupabase, remoteProfile);
          }, 400);
          return;
        }

        setErrorMessage('Nenhum perfil encontrado com esse nome. Verifique os dados ou faça seu cadastro.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-view-root"
      className={`min-h-screen flex flex-col justify-between transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header Controls */}
      <header className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg font-bold"
            style={{ backgroundColor: pal.previewColor }}
          >
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight">EstudaTrack</h1>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Organizador Inteligente de Estudos
            </p>
          </div>
        </div>

        {/* Top Right: Theme & Palette Selector */}
        <div className="flex items-center gap-2">
          {/* Palette circles */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/40 border border-slate-700/50">
            {(['purple', 'emerald', 'indigo', 'amber'] as ColorPalette[]).map((pKey) => (
              <button
                key={pKey}
                type="button"
                onClick={() => onSelectPalette(pKey)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                  colorPalette === pKey ? 'scale-125 ring-2 ring-white/60' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: COLOR_PALETTES[pKey].previewColor }}
                title={`Tema ${COLOR_PALETTES[pKey].name}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
            }`}
            title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        <div
          className={`rounded-3xl border p-6 sm:p-7 shadow-2xl transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md' : 'bg-white border-slate-200 shadow-slate-200/60'
          }`}
        >
          {/* Tabs: Cadastro vs Login */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/40 border border-slate-800/80 mb-5">
            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{
                backgroundColor: mode === 'register' ? pal.previewColor : 'transparent',
              }}
            >
              <span>Cadastro</span>
            </button>

            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{
                backgroundColor: mode === 'login' ? pal.previewColor : 'transparent',
              }}
            >
              <span>Login</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome de Usuário (Cadastro & Login) */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Nome de Usuário <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  id="auth-username-input"
                  required
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome de usuário"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-purple-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500'
                  }`}
                />
              </div>
            </div>

            {/* Senha Input (Cadastro & Login) */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-password-input"
                  required
                  value={password || ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 rounded-2xl border text-xs sm:text-sm transition-all focus:outline-hidden focus:ring-2 ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-purple-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-purple-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              id="auth-submit-btn"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mt-2"
              style={{ backgroundColor: pal.previewColor }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Carregando...</span>
                </span>
              ) : (
                <>
                  <span>{mode === 'register' ? 'Criar Cadastro' : 'Entrar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs font-medium text-slate-500 flex items-center justify-center gap-2">
        <span>Desenvolvido por Mizeeski</span>
      </footer>
    </div>
  );
};
