import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleAlert,
  Clock,
  ExternalLink,
  GraduationCap,
  Mail,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  listarMatriculasCursoAdmin,
  type CursoCardItem,
  type MatriculaComProgressoAdmin,
} from '@/services/cursos'

const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
})

export default function MatriculasCurso() {
  const { cursoId } = useParams<{ cursoId: string }>()
  const { toast } = useToast()

  const [curso, setCurso] = useState<CursoCardItem | null>(null)
  const [matriculas, setMatriculas] = useState<MatriculaComProgressoAdmin[]>([])
  const [totalAulas, setTotalAulas] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    if (!cursoId) return
    setCarregando(true)
    try {
      const res = await listarMatriculasCursoAdmin(cursoId)
      setCurso(res.curso)
      setMatriculas(res.matriculas)
      setTotalAulas(res.totalAulasPublicadas)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar matrículas',
        description: 'Não foi possível carregar os alunos deste curso.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [cursoId, toast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useRealtime('matriculas', () => void carregar())
  useRealtime('progresso', () => void carregar())

  const matriculasFiltradas = matriculas.filter((m) => {
    const termo = busca.toLowerCase().trim()
    if (!termo) return true
    return (
      m.nomeAluno.toLowerCase().includes(termo) ||
      m.emailAluno.toLowerCase().includes(termo) ||
      m.situacao.toLowerCase().includes(termo)
    )
  })

  // Estatísticas
  const totalAlunos = matriculas.length
  const concluidos = matriculas.filter((m) => m.percentualProgresso === 100).length
  const emAndamento = matriculas.filter(
    (m) => m.percentualProgresso > 0 && m.percentualProgresso < 100,
  ).length
  const naoIniciados = matriculas.filter((m) => m.percentualProgresso === 0).length

  if (carregando) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <CircleAlert className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Curso não encontrado</h2>
        <Button asChild className="mt-4">
          <Link to="/painel">Voltar ao Painel</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Link to={`/painel/cursos/${curso.id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao editor</span>
            </Link>
          </Button>

          <span className="hidden sm:inline text-slate-300">|</span>

          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Alunos e Matrículas: {curso.titulo}
            </h1>
            <p className="text-xs text-slate-500">
              Acompanhamento de progresso e datas de ingresso no curso
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/curso/${curso.id}`, '_blank')}
            className="gap-2 border-slate-300 text-slate-700"
          >
            <span>Ver como aluno</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void carregar()}
            className="gap-1.5 text-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Matrículas</p>
              <p className="text-2xl font-bold text-slate-900">{totalAlunos}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Curso Concluído (100%)</p>
              <p className="text-2xl font-bold text-emerald-600">{concluidos}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Em Andamento</p>
              <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <UserCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-medium text-slate-500">Ainda Não Iniciaram</p>
              <p className="text-2xl font-bold text-slate-700">{naoIniciados}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Alunos Matriculados */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Lista de Alunos</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Total de aulas publicadas do curso: {totalAulas} aulas
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-xs rounded-xl bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {matriculasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              {busca
                ? 'Nenhum aluno encontrado para a busca informada.'
                : 'Nenhum aluno matriculado neste curso ainda.'}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[300px] text-xs font-semibold text-slate-700">
                    Aluno
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">
                    Data da Matrícula
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-700">Situação</TableHead>
                  <TableHead className="w-[280px] text-xs font-semibold text-slate-700">
                    Progresso de Conclusão
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {matriculasFiltradas.map((m) => {
                  const dataFormatada = m.dataMatricula
                    ? formatadorData.format(new Date(m.dataMatricula))
                    : '—'

                  const iniciais = m.nomeAluno
                    .split(' ')
                    .slice(0, 2)
                    .map((parte) => parte[0])
                    .join('')
                    .toUpperCase()

                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Aluno (Avatar, Nome, Email) */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-200">
                            {m.avatarAluno && <AvatarImage src={m.avatarAluno} alt={m.nomeAluno} />}
                            <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xs font-semibold">
                              {iniciais}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {m.nomeAluno}
                            </p>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {m.emailAluno}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Data da Matrícula */}
                      <TableCell>
                        <span className="text-xs text-slate-600 flex items-center gap-1.5 font-mono">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {dataFormatada}
                        </span>
                      </TableCell>

                      {/* Situação */}
                      <TableCell>
                        <Badge
                          className={
                            m.situacao === 'ativa'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : m.situacao === 'concluida'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {m.situacao === 'ativa'
                            ? 'Ativa'
                            : m.situacao === 'concluida'
                              ? 'Concluída'
                              : 'Cancelada'}
                        </Badge>
                      </TableCell>

                      {/* Progresso (% e Aulas) */}
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              {m.aulasConcluidas} de {m.totalAulas} aulas concluídas
                            </span>
                            <span className="font-mono font-bold text-indigo-700">
                              {m.percentualProgresso}%
                            </span>
                          </div>
                          <Progress value={m.percentualProgresso} className="h-2 bg-slate-100" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
