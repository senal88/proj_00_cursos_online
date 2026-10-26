import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Calendar, Compass, GraduationCap, Play, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { listarMeusCursos, type MeuCursoItem } from '@/services/cursos'

export default function MeusCursos() {
  const { usuario } = useAuth()
  const [cursos, setCursos] = useState<MeuCursoItem[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    const carregar = async () => {
      setCarregando(true)
      try {
        const dados = await listarMeusCursos()
        if (ativo) setCursos(dados)
      } catch (err) {
        console.error('Erro ao listar meus cursos:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-indigo-600">
            Área do Aluno
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Meus Cursos
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Acompanhe seu progresso e continue seus estudos de onde parou.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 shadow-sm"
        >
          <Link to="/buscar">
            <Sparkles className="mr-2 h-4 w-4 text-indigo-600" />
            Buscar nos meus cursos (com IA)
          </Link>
        </Button>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-slate-200">
              <Skeleton className="aspect-video w-full rounded-none" />
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cursos.length === 0 ? (
        /* Mensagem amigável para aluno sem nenhuma matrícula */
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-inner">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Você ainda não está matriculado em nenhum curso
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            Explore nosso catálogo completo com cursos práticos em vídeo e dê o próximo passo na sua
            formação profissional.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700 font-semibold gap-2">
              <Link to="/">
                <Compass className="h-4 w-4" />
                Explorar o catálogo de cursos
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((item) => (
            <Card
              key={item.matriculaId}
              className="group flex flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Capa */}
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
                {item.curso.imagemCapa ? (
                  <img
                    src={item.curso.imagemCapa}
                    alt={item.curso.titulo}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm">
                      <Play className="ml-1 h-6 w-6 fill-current" />
                    </span>
                  </div>
                )}
                <Badge className="absolute left-3 top-3 border-0 bg-black/60 text-white backdrop-blur-md">
                  {item.curso.categoria}
                </Badge>
              </div>

              {/* Informações e Progresso */}
              <CardContent className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {item.curso.titulo}
                </h3>

                {item.curso.subtitulo && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.curso.subtitulo}</p>
                )}

                {/* Barra de Progresso */}
                <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Progresso</span>
                    <span className="font-bold text-indigo-600 font-mono">
                      {item.percentualProgresso}%
                    </span>
                  </div>
                  <Progress value={item.percentualProgresso} className="h-2 bg-slate-200" />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>
                      {item.aulasConcluidas} de {item.totalAulas} aulas concluídas
                    </span>
                    {item.percentualProgresso === 100 && (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Concluído
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <Button
                    asChild
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    <Link to={`/curso/${item.curso.id}/estudo`}>
                      <Play className="mr-2 h-4 w-4 fill-current" />
                      Continuar Curso
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
