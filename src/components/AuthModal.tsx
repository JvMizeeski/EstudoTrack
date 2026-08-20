import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ColorPalette, ThemeMode, UserProfile } from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { StoredUserAccount } from '../lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  availableUsers: StoredUserAccount[];
  onLogin: (email: string, pass: string) => boolean;
  onRegister: (name: string, email: string, pass: string, course: string) => void;
  onSwitchUser: (userId: string) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableUsers,
  onLogin,
  onRegister,
  onSwitchUser,
  colorPalette,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login') {
      const success = onLogin(email.trim(), password);
      if (success) {
        onClose();
      } else {
        setErrorMsg('E-mail ou senha inválidos. Tente novamente ou use uma das contas rápidas abaixo.');
      }
    } else {
      if (!name.trim() || !email.trim() || !password) {
        setErrorMsg('Preencha todos os campos obrigatórios.');
        return;
      }
      onRegister(name.trim(), email.trim(), password, course.trim());
      onClose();
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auth-modal-container"
        className={`relative w-full max-w-md rounded-3xl border p-5 sm:p-7 shadow-2xl my-3 sm:my-8 transition-all ${
          isDark ? 'bg-[#1E293B] border-slate-700/60 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
              style={{ backgroundColor: pal.previewColor }}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                {mode === 'login' ? 'Acessar Conta' : 'Criar Nova Conta'}
              </h2>
              <p className="text-xs text-slate-400">Inventário de estudos individual & seguro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-700/60 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          {mode === 'register' && (
            <>
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Nome Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name || ''}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Curso / Alvo de Estudos</label>
                <input
                  type="text"
                  value={course || ''}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ex: Engenharia, ENEM, Concurso..."
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold mb-1 text-slate-300">E-mail *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email || ''}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-300">Senha *</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer mt-4 transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: pal.previewColor }}
          >
            <span>{mode === 'login' ? 'Entrar no EstudoFlow' : 'Criar Conta Gratuita'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick User Switcher / Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">
            Ou alterne instantaneamente entre usuários locais:
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {availableUsers.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    onSwitchUser(u.id);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-purple-950/40 border-purple-500/50'
                      : 'bg-slate-900/40 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-lg object-cover" />
                    <div>
                      <p className="font-bold text-xs text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white">
                      Ativo
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
