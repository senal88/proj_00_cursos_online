import { useEffect, useState } from 'react'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import {
  NIVEIS_GAMIFICACAO,
  TODAS_RECOMPENSAS,
  obterPerfilGamificacao,
  type PerfilGamificacaoAluno,
} from '@/services/gamificacao'

export default function PerfilGamificacao() {
  const { usuario } = useAuth()
  const [perfil, setPerfil] = useState<PerfilGamificacaoAluno | null>(null)
  const [carregando, setCarregando] = useState(true)

  const nome = String(usuario?.name || 'Aluno')
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      const res = await obterPerfilGamificacao()
      setPerfil(res)
      setCarregando(false)
    }
    void carregar()
  }, [])

  if (carregando) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    )
  }

  const pontos = perfil?.pontosTotal ?? 0
  const nivelAtual = perfil?.nivelAtual ?? 1
  const sequenciaDias = perfil?.sequenciaDias ?? 0
  const nivelInfo = perfil?.nivelInfo ?? NIVEIS_GAMIFICACAO[0]
  const proximoNivel = perfil?.proximoNivelInfo
  const progressoPercentual = perfil?.progressoPercentual ?? 0
  const pontosRestantes = perfil?.pontosParaProximoNivel ?? 0

  const conquistasMap = new Set((perfil?.recompensasConquistadas || []).map((r) => r.recompensa))

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Banner de Boas-vindas e Status do Aluno */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/30 shadow-md">
              <AvatarFallback className="bg-indigo-500 text-lg font-bold text-white">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{nome}</h1>
                <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs px-2.5 py-0.5 font-medium">
                  {usuario?.role === 'admin' ? 'Administrador' : 'Aluno'}
                </Badge>
              </div>
              <p className="text-sm text-indigo-100 mt-1">
                Acompanhe seus pontos, nível e conquistas adquiridos ao estudar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Card Nível Atual */}
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 backdrop-blur-md px-4 py-2.5 border border-white/20 shadow-sm">
              <span className="text-2xl">{nivelInfo.icone}</span>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-indigo-200 font-semibold">
                  Nível Atual
                </p>
                <p className="text-base font-bold text-white">
                  Nível {nivelAtual} • {nivelInfo.nome}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Progresso de Nível no Banner */}
        <div className="relative z-10 mt-6 rounded-2xl bg-black/20 backdrop-blur-sm p-4 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
            <span className="font-semibold text-indigo-100 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-300" />
              Progresso para o Nível {proximoNivel ? proximoNivel.nivel : 'Máximo'}
              {proximoNivel && ` (${proximoNivel.nome})`}
            </span>
            <span className="text-indigo-200 font-mono text-[11px]">
              {proximoNivel
                ? `Faltam ${pontosRestantes} pontos para o Nível ${proximoNivel.nivel}`
                : 'Parabéns! Nível máximo alcançado!'}
            </span>
          </div>

          <div className="relative">
            <Progress value={progressoPercentual} className="h-3 bg-white/20" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-indigo-200 mt-1.5 font-mono">
            <span>
              {nivelInfo.pontosNecessarios} pts (Nível {nivelAtual})
            </span>
            <span className="font-bold text-amber-300 text-xs">{pontos} pts totais</span>
            <span>
              {proximoNivel
                ? `${proximoNivel.pontosNecessarios} pts (Nível ${proximoNivel.nivel})`
                : '1000+ pts'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de 3 Cards de Destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total de Pontos */}
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm shrink-0">
              <Trophy className="h-7 w-7 text-amber-500 fill-amber-100" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total de Pontos
              </p>
              <p className="text-3xl font-extrabold text-slate-900 font-mono mt-0.5">{pontos}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                +10 por aula concluída • +50 por curso
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Nível Atual */}
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm shrink-0">
              <Zap className="h-7 w-7 text-indigo-600 fill-indigo-100" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nível Atual
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-3xl font-extrabold text-indigo-700 font-mono">
                  {nivelAtual}
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {nivelInfo.nome}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {proximoNivel
                  ? `${pontosRestantes} pts para Nível ${proximoNivel.nivel}`
                  : 'Nível mais alto'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sequência de Dias de Estudo */}
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm shrink-0 ${
                sequenciaDias > 0
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              <Flame
                className={`h-7 w-7 ${
                  sequenciaDias > 0
                    ? 'text-orange-500 fill-orange-400 animate-pulse'
                    : 'text-slate-400'
                }`}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Sequência de Estudo
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  {sequenciaDias}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {sequenciaDias === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {sequenciaDias >= 7
                  ? 'Recompensa Dedicado conquistada!'
                  : 'Estude diariamente para somar dias'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escala de Níveis e Regras */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg font-bold text-slate-900">
                Jornada de Evolução (Níveis)
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono text-slate-600">
              5 Níveis Disponíveis
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Avance de nível estudando com frequência e concluindo suas aulas e cursos
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {NIVEIS_GAMIFICACAO.map((n) => {
              const alcancado = pontos >= n.pontosNecessarios
              const eAtual = nivelAtual === n.nivel

              return (
                <div
                  key={n.nivel}
                  className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                    eAtual
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                      : alcancado
                        ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                        : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  {eAtual && (
                    <span className="absolute -top-2.5 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Seu Nível
                    </span>
                  )}

                  <span className="text-3xl my-1">{n.icone}</span>
                  <span className="text-xs font-bold text-slate-900 mt-1">Nível {n.nivel}</span>
                  <span className="text-[11px] text-slate-600 font-medium leading-tight">
                    {n.nome}
                  </span>
                  <Badge
                    variant="outline"
                    className={`mt-2 font-mono text-[10px] ${
                      alcancado
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    {n.pontosNecessarios} pts
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Recompensas por Marcos */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-bold text-slate-900">
                Recompensas por Marcos
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {perfil?.recompensasConquistadas?.length || 0} de {TODAS_RECOMPENSAS.length}
              </span>
              <span>desbloqueadas</span>
            </div>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Conquistas marcantes pelo seu esforço e dedicação contínua
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TODAS_RECOMPENSAS.map((rec) => {
              const desbloqueada = conquistasMap.has(rec.chave)
              const conquistaItem = perfil?.recompensasConquistadas.find(
                (r) => r.recompensa === rec.chave,
              )

              return (
                <div
                  key={rec.chave}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                    desbloqueada
                      ? 'border-amber-200 bg-amber-50/40 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 opacity-55 grayscale'
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl border ${
                      desbloqueada
                        ? 'bg-amber-100/80 border-amber-300 shadow-sm'
                        : 'bg-slate-200 border-slate-300'
                    }`}
                  >
                    {desbloqueada ? rec.icone : <Lock className="h-6 w-6 text-slate-400" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {rec.titulo}
                      </h4>
                      {desbloqueada ? (
                        <Badge className="bg-emerald-600 text-white border-0 text-[10px] px-2 py-0.5 gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Conquistada
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-slate-300 text-slate-500 gap-1 shrink-0"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Bloqueada
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rec.descricao}</p>

                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal bg-white/80 border border-slate-200 text-slate-700"
                      >
                        Critério: {rec.criterio}
                      </Badge>
                      {desbloqueada && conquistaItem?.data_conquista && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(conquistaItem.data_conquista).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
