import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  GraduationCap,
  Lock,
  Play,
  PlayCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { obterCursoAluno, type CursoCardItem, type ModuloAluno } from '@/services/cursos'

export default function CursoEstudo() {
  const { cursoId } = useParams<{ cursoId: string }>()
  const navigate = useNavigate()

  const [curso, setCurso] = useState<CursoCardItem | null>(null)
  const [modulos, setModulos] = useState<ModuloAluno[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!cursoId) return

    let ativo = true
    const carregar = async () => {
      setCarregando(true)
      try {
        const dados = await obterCursoAluno(cursoId)
        if (!ativo) return

        if (!dados) {
          // Sem matrícula ativa ou curso inexistente -> bloqueado e redirecionado para a página de vendas pública
          navigate(`/curso/${cursoId}`, { replace: true })
          return
        }

        setCurso(dados.curso)
        setModulos(dados.modulos)
      } catch (err) {
        console.error('Acesso negado ao curso:', err)
        if (ativo) navigate(`/curso/${cursoId}`, { replace: true })
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [cursoId, navigate])

  if (carregando) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!curso) return null

  // Calcular progresso geral
  let totalAulas = 0
  let aulasConcluidas = 0
  for (const m of modulos) {
    for (const a of m.aulas) {
      totalAulas++
      if (a.progresso?.situacao === 'concluida') {
        aulasConcluidas++
      }
    }
  }
  const percentual = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Topo / Voltar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600">
          <Link to="/meus-cursos">
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Meus Cursos</span>
          </Link>
        </Button>

        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
          Matrícula Ativa
        </Badge>
      </div>

      {/* Banner do Curso */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-0 mb-1">
              {curso.categoria}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{curso.titulo}</h1>
            {curso.subtitulo && (
              <p className="text-sm text-indigo-200 max-w-2xl leading-relaxed">{curso.subtitulo}</p>
            )}
          </div>

          <div className="min-w-[200px] rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-indigo-200">Seu progresso</span>
              <span className="font-mono text-white text-sm">{percentual}%</span>
            </div>
            <Progress value={percentual} className="h-2.5 bg-white/20" />
            <p className="mt-2 text-right text-[11px] text-indigo-200">
              {aulasConcluidas} de {totalAulas} aulas concluídas
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Módulos e Aulas Clicáveis */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Conteúdo do Curso</h2>
          <p className="text-xs text-slate-500 mt-1">
            Selecione uma aula abaixo para assistir e continuar seus estudos.
          </p>
        </div>

        {modulos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nenhum módulo liberado no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {modulos.map((modulo, idxMod) => (
              <Card key={modulo.id} className="overflow-hidden border-slate-200 shadow-sm bg-white">
                <div className="flex items-center justify-between bg-slate-50 px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                      {idxMod + 1}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {modulo.titulo}
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {modulo.aulas.length} {modulo.aulas.length === 1 ? 'aula' : 'aulas'}
                  </span>
                </div>

                <CardContent className="p-0 divide-y divide-slate-100">
                  {modulo.aulas.map((aula, idxAula) => {
                    const concluida = aula.progresso?.situacao === 'concluida'
                    const iniciada = aula.progresso?.situacao === 'iniciada'

                    return (
                      <Link
                        key={aula.id}
                        to={`/aula/${aula.id}`}
                        className="group flex items-center justify-between p-4 transition-colors hover:bg-indigo-50/40"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              concluida
                                ? 'bg-emerald-100 text-emerald-700'
                                : iniciada
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                            }`}
                          >
                            {concluida ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Play className="ml-0.5 h-4 w-4 fill-current" />
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm text-slate-900 group-hover:text-indigo-600">
                              <span className="text-slate-400 mr-2 font-mono">
                                {idxMod + 1}.{idxAula + 1}
                              </span>
                              {aula.titulo}
                            </p>
                            {aula.descricao && (
                              <p className="truncate text-xs text-slate-500 mt-0.5">
                                {aula.descricao}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {concluida && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Concluída
                            </Badge>
                          )}
                          {iniciada && !concluida && (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                              Em andamento ({aula.progresso?.minuto_parada || 0}m)
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                            <Clock className="h-3 w-3" />
                            {aula.duracao_minutos} min
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
