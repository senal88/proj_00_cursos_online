import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, GraduationCap, Loader2, Play } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { entrar, usuario, carregando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  if (!carregando && usuario) {
    const destino = usuario.role === 'admin' ? '/painel' : '/meus-cursos'
    return <Navigate to={destino} replace />
  }

  const aoEnviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const autenticado = await entrar(email.trim(), senha)
      const destinoPadrao = autenticado.role === 'admin' ? '/painel' : '/meus-cursos'
      const destino = (location.state as { from?: string } | null)?.from ?? destinoPadrao
      navigate(destino, { replace: true })
    } catch {
      setErro('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600" />
      <div className="absolute left-[12%] top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Play className="h-5 w-5 fill-current" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Plataforma de Cursos</span>
        </div>

        <Card className="border-0 shadow-2xl shadow-indigo-950/15">
          <CardHeader className="space-y-2 pb-5 text-center">
            <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-slate-900">Acesse sua conta</CardTitle>
            <CardDescription>Entre como aluno ou administrador da plataforma</CardDescription>
          </CardHeader>{' '}
          <CardContent>
            <form className="space-y-5" onSubmit={aoEnviar}>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="pr-11"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
                    onClick={() => setMostrarSenha((valor) => !valor)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {erro && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  {erro}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={enviando}
              >
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-700"
          >
            ← Voltar para a vitrine de cursos
          </Button>
        </div>
      </div>
    </main>
  )
}
