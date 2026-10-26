/* Layout Component - A component that wraps the main content of the app
   - Use this file to add a header, footer, or other elements that should be present on every page
   - This component is used in the App.tsx file to wrap the main content of the app */

import {
  BookOpen,
  ChevronDown,
  Compass,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Play,
  Search,
  Sparkles,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { obterPerfilGamificacao, type PerfilGamificacaoAluno } from '@/services/gamificacao'

export default function Layout() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [gamificacao, setGamificacao] = useState<PerfilGamificacaoAluno | null>(null)

  const nome = String(usuario?.name || 'Administrador')
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  // Buscar dados rápidos de pontuação e nível para o header
  useEffect(() => {
    if (!usuario) return
    let ativo = true
    obterPerfilGamificacao().then((dados) => {
      if (ativo && dados) {
        setGamificacao(dados)
      }
    })
    return () => {
      ativo = false
    }
  }, [usuario])

  const encerrarSessao = () => {
    sair()
    navigate('/login', { replace: true })
  }

  const Sidebar = () => (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-indigo-500/30 px-5 lg:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
          <span className="hidden text-sm font-semibold leading-tight text-white lg:block">
            EducaVídeo
            <br />
            Plataforma
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <NavLink
          to="/meus-cursos"
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-indigo-100 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <GraduationCap className="h-5 w-5 shrink-0" />
          <span className="lg:block">Meus Cursos</span>
        </NavLink>

        <NavLink
          to="/buscar"
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-indigo-100 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="lg:block flex items-center justify-between w-full">
            <span>Buscar nos Cursos</span>
            <span className="hidden lg:inline-flex items-center rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              IA
            </span>
          </span>
        </NavLink>

        <NavLink
          to="/perfil"
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-indigo-100 hover:bg-white/10 hover:text-white',
            )
          }
        >
          <Trophy className="h-5 w-5 shrink-0" />
          <span className="lg:block flex items-center justify-between w-full">
            <span>Meu Perfil</span>
            {gamificacao && (
              <span className="hidden lg:inline-flex items-center gap-1 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                {gamificacao.pontosTotal} pts
              </span>
            )}
          </span>
        </NavLink>

        <NavLink
          to="/"
          onClick={() => setMenuAberto(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-indigo-100 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Compass className="h-5 w-5 shrink-0" />
          <span className="lg:block">Vitrine Pública</span>
        </NavLink>

        {usuario?.role === 'admin' && (
          <NavLink
            to="/painel"
            onClick={() => setMenuAberto(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span className="lg:block">Painel Admin</span>
          </NavLink>
        )}
      </nav>
      <div className="border-t border-indigo-500/30 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-white transition-colors hover:bg-white/10">
              <Avatar className="h-9 w-9 border border-white/20">
                <AvatarFallback className="bg-indigo-500 text-xs font-semibold text-white">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <span className="hidden min-w-0 flex-1 lg:block">
                <span className="block truncate text-sm font-medium">{nome}</span>
                <span className="block truncate text-xs text-indigo-200">{usuario?.email}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-indigo-200 lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4 text-slate-500" />
                <span>Ver Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={encerrarSessao}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col bg-gradient-to-b from-indigo-600 to-indigo-700 shadow-xl sm:flex lg:w-[260px]">
        <Sidebar />
      </aside>
      {menuAberto && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm sm:hidden"
          onClick={() => setMenuAberto(false)}
        >
          <aside
            className="flex h-full w-[280px] flex-col bg-gradient-to-b from-indigo-600 to-indigo-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-3 top-3">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => setMenuAberto(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="sm:pl-[72px] lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="sm:hidden"
              onClick={() => setMenuAberto(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <span>{usuario?.role === 'admin' ? 'Painel de Gestão' : 'Ambiente do Aluno'}</span>
            </div>
          </div>
          {/* Indicadores rápidos de Gamificação no topo */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/perfil"
              className="flex items-center gap-2.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 px-3 py-1.5 transition-colors border border-slate-200 text-xs text-slate-700"
              title="Ver detalhes da sua pontuação e conquistas"
            >
              <span className="flex items-center gap-1 font-bold text-amber-600 font-mono">
                <Trophy className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                {gamificacao ? gamificacao.pontosTotal : 0} pts
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-semibold text-indigo-700">
                <Zap className="h-3.5 w-3.5 text-indigo-600 fill-indigo-200" />
                Nível {gamificacao ? gamificacao.nivelAtual : 1}
              </span>
              {(gamificacao?.sequenciaDias || 0) > 0 && (
                <>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                  <span className="hidden sm:flex items-center gap-1 font-semibold text-orange-600">
                    <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                    {gamificacao?.sequenciaDias}d
                  </span>
                </>
              )}
            </Link>

            <div className="hidden sm:block text-xs text-slate-500">
              Olá, <span className="font-medium text-slate-700">{nome.split(' ')[0]}</span>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
