import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Edit,
  ExternalLink,
  Eye,
  FolderOpen,
  Globe,
  GlobeLock,
  Layers,
  MoreVertical,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import {
  alterarSituacaoCurso,
  criarCursoAdmin,
  excluirCursoAdmin,
  listarCursosPainel,
  obterMetricasBuscaGeral,
  type CursoPainel,
  type MetricasBuscaGeral,
} from '@/services/cursos'
import {
  Sparkles,
  Search,
  FileQuestion,
  CheckCircle,
  CreditCard,
  Copy,
  Check,
  KeyRound,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  listarPedidosAdmin,
  obterTokenKiwify,
  salvarTokenKiwify,
  type PedidoItem,
} from '@/services/pedidos'

const formatadorPreco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatadorData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function pluralizar(quantidade: number, singular: string, plural: string) {
  return `${quantidade.toLocaleString('pt-BR')} ${quantidade === 1 ? singular : plural}`
}

function CourseSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-28" />
      </CardContent>
    </Card>
  )
}

export default function Painel() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cursos, setCursos] = useState<CursoPainel[]>([])
  const [metricasBusca, setMetricasBusca] = useState<MetricasBuscaGeral | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  // Estados de Pedidos & Kiwify
  const [pedidos, setPedidos] = useState<PedidoItem[]>([])
  const [totalConfirmado, setTotalConfirmado] = useState(0)
  const [totalPedidos, setTotalPedidos] = useState(0)
  const [totalPagos, setTotalPagos] = useState(0)
  const [totalPendentes, setTotalPendentes] = useState(0)
  const [totalFalhos, setTotalFalhos] = useState(0)
  const [tokenKiwify, setTokenKiwify] = useState('')
  const [salvandoToken, setSalvandoToken] = useState(false)
  const [copiadoWebhookUrl, setCopiadoWebhookUrl] = useState(false)
  const [filtroSituacaoPedido, setFiltroSituacaoPedido] = useState<string>('todos')

  // Diálogo para criar novo curso rapidamente
  const [dialogoNovoCurso, setDialogoNovoCurso] = useState(false)
  const [salvandoNovoCurso, setSalvandoNovoCurso] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoSubtitulo, setNovoSubtitulo] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novoPreco, setNovoPreco] = useState('199')

  // Diálogo de confirmação de exclusão
  const [cursoParaExcluir, setCursoParaExcluir] = useState<CursoPainel | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Diálogo de aviso de impedimento de publicação
  const [avisoPublicacao, setAvisoPublicacao] = useState<{
    aberto: boolean
    mensagem: string
  }>({ aberto: false, mensagem: '' })

  const carregar = useCallback(async (mostrarCarregamento = false) => {
    if (mostrarCarregamento) setCarregando(true)
    try {
      const [listaCursos, metricas, dadosPedidos, tokenAtual] = await Promise.all([
        listarCursosPainel(),
        obterMetricasBuscaGeral().catch((err) => {
          console.warn('Erro ao obter métricas de busca:', err)
          return null
        }),
        listarPedidosAdmin(),
        obterTokenKiwify(),
      ])
      setCursos(listaCursos)
      if (metricas) setMetricasBusca(metricas)
      setPedidos(dadosPedidos.pedidos)
      setTotalConfirmado(dadosPedidos.totalConfirmado)
      setTotalPedidos(dadosPedidos.totalPedidos)
      setTotalPagos(dadosPedidos.totalPagos)
      setTotalPendentes(dadosPedidos.totalPendentes)
      setTotalFalhos(dadosPedidos.totalFalhos)
      setTokenKiwify(tokenAtual)
      setErro(false)
    } catch (e) {
      console.error(e)
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useRealtime('cursos', () => void carregar())
  useRealtime('modulos', () => void carregar())
  useRealtime('aulas', () => void carregar())
  useRealtime('matriculas', () => void carregar())
  useRealtime('pedidos', () => void carregar())
  useRealtime('configuracoes', () => void carregar())

  // Ação de publicar / despublicar
  const handleAlternarPublicacao = async (curso: CursoPainel) => {
    const novaSituacao = curso.situacao === 'publicado' ? 'rascunho' : 'publicado'
    try {
      const res = await alterarSituacaoCurso(curso.id, novaSituacao)
      if (!res.sucesso) {
        setAvisoPublicacao({
          aberto: true,
          mensagem:
            res.mensagem ||
            'O curso precisa ter pelo menos 1 módulo com 1 aula publicada para poder ser publicado.',
        })
        return
      }

      toast({
        title: novaSituacao === 'publicado' ? 'Curso publicado!' : 'Curso despublicado',
        description:
          novaSituacao === 'publicado'
            ? 'O curso agora está visível na vitrine pública para todos os alunos.'
            : 'O curso foi retirado da vitrine pública imediatamente.',
      })
      void carregar()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao alterar situação',
        description: 'Verifique se você possui permissões de administrador.',
        variant: 'destructive',
      })
    }
  }

  // Criar novo curso e navegar para o editor completo
  const handleCriarCurso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoTitulo.trim() || !novaDescricao.trim() || !novaCategoria.trim()) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Título, categoria e descrição são necessários.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoNovoCurso(true)
    try {
      const novoId = await criarCursoAdmin({
        titulo: novoTitulo,
        subtitulo: novoSubtitulo,
        descricao: novaDescricao,
        categoria: novaCategoria,
        preco: Math.max(0, parseFloat(novoPreco) || 0),
      })

      toast({
        title: 'Curso criado com sucesso!',
        description: 'Agora organize os módulos e adicione as aulas.',
      })

      setDialogoNovoCurso(false)
      navigate(`/painel/cursos/${novoId}`)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao criar curso',
        description: 'Não foi possível salvar o novo curso.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovoCurso(false)
    }
  }

  // Salvar Token Kiwify
  const handleSalvarTokenKiwify = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoToken(true)
    try {
      await salvarTokenKiwify(tokenKiwify)
      toast({
        title: 'Token do Kiwify salvo com sucesso!',
        description:
          'O webhook validará as requisições recebidas com este novo token de segurança.',
      })
    } catch (err) {
      console.error('Erro ao salvar token Kiwify:', err)
      toast({
        title: 'Erro ao salvar token',
        description: 'Não foi possível salvar o token de segurança no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoToken(false)
    }
  }

  // URL pública do Webhook para o usuário cadastrar na Kiwify
  const webhookUrlPublica = `${window.location.origin}/backend/v1/kiwify/webhook`

  const handleCopiarWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrlPublica)
    setCopiadoWebhookUrl(true)
    toast({
      title: 'URL do Webhook copiada!',
      description: 'Cole esta URL no painel do Kiwify em Configurações > Webhooks.',
    })
    setTimeout(() => setCopiadoWebhookUrl(false), 3000)
  }

  // Filtragem de pedidos
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroSituacaoPedido === 'todos') return true
    return p.situacao === filtroSituacaoPedido
  })

  // Excluir curso
  const handleConfirmarExclusao = async () => {
    if (!cursoParaExcluir) return
    setExcluindo(true)
    try {
      await excluirCursoAdmin(cursoParaExcluir.id)
      toast({
        title: 'Curso excluído',
        description: 'O curso e todos os módulos foram excluídos.',
      })
      setCursoParaExcluir(null)
      void carregar()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o curso.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Painel de Gestão
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Gestão da Plataforma
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
            Cursos em vídeo, checkout Kiwify, pedidos, webhooks e controle de matrículas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setNovoTitulo('')
              setNovoSubtitulo('')
              setNovaDescricao('')
              setNovaCategoria('Marketing')
              setNovoPreco('199')
              setDialogoNovoCurso(true)
            }}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Criar novo curso</span>
          </Button>
        </div>
      </div>

      {/* Abas Principais: Cursos | Pedidos & Vendas Kiwify */}
      <Tabs defaultValue="cursos" className="w-full space-y-6">
        <TabsList className="bg-slate-200/80 p-1 rounded-xl">
          <TabsTrigger value="cursos" className="rounded-lg gap-2 data-[state=active]:bg-white">
            <BookOpen className="h-4 w-4" />
            <span>Cursos ({cursos.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="rounded-lg gap-2 data-[state=active]:bg-white">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Pedidos & Kiwify ({pedidos.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: GESTÃO DE CURSOS */}
        <TabsContent value="cursos" className="space-y-8 mt-0">
          {metricasBusca && (
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                      <Sparkles className="h-4 w-4 text-indigo-300" />
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Indicador Geral: Preparo da Busca por Significado
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    Acompanhamento das aulas publicadas que já possuem transcrição fatiada em
                    trechos e estão aptas para a busca inteligente dos alunos.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  {metricasBusca.aulasPublicadasSemTranscricao === 0 &&
                  metricasBusca.aulasPublicadasSemPreparo === 0 &&
                  metricasBusca.totalAulasPublicadas > 0 ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-3 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      100% das aulas preparadas
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1.5 py-1 px-3 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      Aulas pendentes de transcrição ou preparo
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                {/* Aulas sem Transcrição */}
                <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Sem transcrição</span>
                    <FileQuestion className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {metricasBusca.aulasPublicadasSemTranscricao}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    de {metricasBusca.totalAulasPublicadas} publicadas
                  </p>
                </div>

                {/* Aulas sem Preparo de Busca */}
                <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Sem preparo de busca</span>
                    <Search className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-amber-300">
                    {metricasBusca.aulasPublicadasSemPreparo}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">aulas fora da busca</p>
                </div>

                {/* Aulas Preparadas */}
                <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Busca preparada</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-emerald-400">
                    {metricasBusca.aulasPublicadasPreparadas}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">indexadas com sucesso</p>
                </div>

                {/* Total de Trechos Guardados */}
                <div className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Trechos pesquisáveis</span>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-indigo-300">
                    {metricasBusca.totalTrechosIndexados.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">na tabela interna</p>
                </div>
              </div>
            </div>
          )}

          {/* Grid de Cursos ou Estados Vazios / Carregamento */}
          {carregando ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseSkeleton key={i} />
              ))}
            </div>
          ) : erro ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 text-center shadow-sm">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <CircleAlert className="h-7 w-7" />
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Não foi possível carregar os cursos
              </h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Confira sua conexão com o banco de dados e tente novamente.
              </p>
              <Button variant="outline" className="mt-5" onClick={() => void carregar(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          ) : cursos.length === 0 ? (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500">
                <BookOpen className="h-10 w-10" />
              </span>
              <h2 className="text-xl font-semibold text-slate-900">
                Nenhum curso cadastrado ainda
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Comece criando o seu primeiro curso para organizar módulos, vídeos do YouTube e
                materiais.
              </p>
              <Button
                onClick={() => setDialogoNovoCurso(true)}
                className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro curso
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {cursos.map((curso, indice) => {
                const publicado = curso.situacao === 'publicado'

                return (
                  <Card
                    key={curso.id}
                    className="group relative flex flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    style={{ animationDelay: `${indice * 60}ms`, animationFillMode: 'both' }}
                  >
                    {/* Capa com Badge e Menu Rápido */}
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
                      {curso.imagemCapa ? (
                        <img
                          src={curso.imagemCapa}
                          alt={`Capa do curso ${curso.titulo}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_38%)]" />
                          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
                            <Play className="ml-1 h-6 w-6 fill-current" />
                          </span>
                        </div>
                      )}

                      {/* Badges no topo da imagem */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            'border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md',
                            publicado
                              ? 'border-emerald-200 bg-emerald-500 text-white'
                              : 'border-amber-200 bg-amber-500 text-white',
                          )}
                        >
                          {publicado ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </div>

                      {/* Dropdown de Ações */}
                      <div className="absolute right-3 top-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white backdrop-blur-sm"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                              <Link to={`/painel/cursos/${curso.id}`}>
                                <Edit className="mr-2 h-4 w-4 text-indigo-600" />
                                Editar curso e aulas
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/painel/cursos/${curso.id}/matriculas`}>
                                <Users className="mr-2 h-4 w-4 text-blue-600" />
                                Ver alunos matriculados
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`/curso/${curso.id}`, '_blank')}
                            >
                              <Eye className="mr-2 h-4 w-4 text-slate-600" />
                              Ver como aluno (nova aba)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAlternarPublicacao(curso)}>
                              {publicado ? (
                                <>
                                  <GlobeLock className="mr-2 h-4 w-4 text-amber-600" />
                                  Despublicar curso
                                </>
                              ) : (
                                <>
                                  <Globe className="mr-2 h-4 w-4 text-emerald-600" />
                                  Publicar curso
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setCursoParaExcluir(curso)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir curso
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <CardContent className="flex flex-1 flex-col p-5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          {curso.categoria}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatadorPreco.format(curso.preco)}
                        </span>
                      </div>

                      <h2 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-900">
                        {curso.titulo}
                      </h2>
                      {curso.subtitulo && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {curso.subtitulo}
                        </p>
                      )}

                      {/* Métricas: Módulos, Aulas e Matrículas Reais */}
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400">Módulos</p>
                          <p className="text-sm font-bold text-slate-800">
                            {curso.quantidadeModulos}
                          </p>
                        </div>
                        <div className="border-x border-slate-200">
                          <p className="text-xs text-slate-400">Aulas</p>
                          <p className="text-sm font-bold text-slate-800">
                            {curso.quantidadeAulas}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Alunos</p>
                          <p className="text-sm font-bold text-indigo-600">
                            {curso.quantidadeMatriculas}
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação Direta */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          asChild
                          className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Link to={`/painel/cursos/${curso.id}`}>
                            <Edit className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </Link>
                        </Button>

                        <Button
                          variant={publicado ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={() => handleAlternarPublicacao(curso)}
                          className={cn(
                            'gap-1.5',
                            publicado
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
                          )}
                          title={publicado ? 'Despublicar' : 'Publicar curso'}
                        >
                          {publicado ? (
                            <>
                              <GlobeLock className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Despublicar</span>
                            </>
                          ) : (
                            <>
                              <Globe className="h-3.5 w-3.5" />
                              <span>Publicar</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/curso/${curso.id}`, '_blank')}
                          className="h-8 px-2 text-slate-500 hover:text-indigo-600"
                          title="Ver como aluno (abre em nova aba)"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: PEDIDOS & INTEGRAÇÃO KIWIFY */}
        <TabsContent value="pedidos" className="space-y-8 mt-0">
          {/* Cards de Resumo Financeiro */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 bg-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Confirmado
                  </p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {formatadorPreco.format(totalConfirmado)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">pedidos pagos e liberados</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pedidos Pagos
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{totalPagos}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    matrículas criadas via webhook
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pendentes
                  </p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{totalPendentes}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">aguardando webhook Kiwify</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Falhas / Expirados
                  </p>
                  <p className="text-2xl font-black text-slate-700 mt-1">{totalFalhos}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">rejeitados ou cancelados</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuração do Webhook Kiwify (Requisito 4) */}
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Configuração do Webhook Kiwify (Segurança & Token)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Validação oficial de autenticidade HMAC-SHA1: o webhook só aceita avisos com o
                    token válido cadastrado abaixo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL do Webhook para cadastro */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Endereço Público do Webhook (cadastrar no painel Kiwify):
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrlPublica}
                    className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-700 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopiarWebhookUrl}
                    className="shrink-0 gap-1.5 border-slate-300"
                  >
                    {copiadoWebhookUrl ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-slate-600" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  No painel da Kiwify, acesse <strong>Configurações &gt; Webhooks</strong> e
                  adicione esta URL como destino POST para os eventos <code>order_approved</code>,{' '}
                  <code>order_refunded</code>, etc.
                </p>
              </div>

              {/* Campo para colar o token de segurança */}
              <form
                onSubmit={handleSalvarTokenKiwify}
                className="space-y-3 pt-2 border-t border-slate-100"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="token-kiwify" className="text-xs font-semibold text-slate-700">
                      Token Secreto do Webhook Kiwify *
                    </Label>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                      Protegido por HMAC-SHA1
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="token-kiwify"
                      type="text"
                      placeholder="Cole aqui o token de segurança exibido no painel Kiwify..."
                      value={tokenKiwify}
                      onChange={(e) => setTokenKiwify(e.target.value)}
                      className="font-mono text-xs bg-white rounded-xl"
                    />
                    <Button
                      type="submit"
                      disabled={salvandoToken}
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                    >
                      {salvandoToken ? 'Salvando...' : 'Salvar Token'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    O Kiwify assina cada requisição via{' '}
                    <code>signature = hmac_sha1(corpo, token)</code>. Se este token estiver
                    incorreto ou não configurado, nenhuma matrícula será liberada e o webhook
                    retornará 401.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tabela de Pedidos (Requisitos 2 e 7) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Histórico de Pedidos</h2>
                <p className="text-xs text-slate-500">
                  Lista de todos os pedidos iniciados pelos alunos e confirmados pelo webhook Kiwify
                </p>
              </div>

              {/* Filtro por Situação */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Filtrar:</span>
                <select
                  value={filtroSituacaoPedido}
                  onChange={(e) => setFiltroSituacaoPedido(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="todos">Todos ({pedidos.length})</option>
                  <option value="pago">Pagos ({totalPagos})</option>
                  <option value="pendente">Pendentes ({totalPendentes})</option>
                  <option value="falhou">Falhou / Expirado ({totalFalhos})</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void carregar(true)}
                  className="rounded-xl h-8 px-2.5"
                  title="Atualizar lista"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                </Button>
              </div>
            </div>

            {pedidosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Nenhum pedido encontrado com o filtro selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Aluno</th>
                      <th className="px-4 py-3">Curso</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Situação</th>
                      <th className="px-4 py-3">Criação</th>
                      <th className="px-4 py-3">Confirmação</th>
                      <th className="px-4 py-3">Ref Kiwify</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {pedidosFiltrados.map((p) => {
                      let badgeClasse = 'bg-slate-100 text-slate-700'
                      let labelSituacao = 'Pendente'
                      if (p.situacao === 'pago') {
                        badgeClasse = 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        labelSituacao = 'Pago'
                      } else if (p.situacao === 'pendente') {
                        badgeClasse = 'bg-amber-100 text-amber-800 border-amber-200'
                        labelSituacao = 'Pendente'
                      } else if (p.situacao === 'falhou') {
                        badgeClasse = 'bg-red-100 text-red-800 border-red-200'
                        labelSituacao = 'Falhou'
                      } else if (p.situacao === 'expirado') {
                        badgeClasse = 'bg-slate-100 text-slate-700 border-slate-200'
                        labelSituacao = 'Expirado'
                      }

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">{p.alunoNome}</div>
                            {p.alunoEmail && (
                              <div className="text-xs text-slate-400 font-mono">{p.alunoEmail}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-800">
                            {p.cursoTitulo}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            {formatadorPreco.format(p.valor)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
                                badgeClasse,
                              )}
                            >
                              {labelSituacao}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {formatadorData.format(new Date(p.created))}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {p.dataConfirmacao
                              ? formatadorData.format(new Date(p.dataConfirmacao))
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-slate-400">
                            {p.kiwifyOrderId ? (
                              <span title={`ID: ${p.kiwifyOrderId}`}>
                                {p.kiwifyOrderRef || p.kiwifyOrderId.slice(0, 8)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo para Criar Novo Curso */}
      <Dialog open={dialogoNovoCurso} onOpenChange={setDialogoNovoCurso}>
        <DialogContent className="max-w-lg rounded-2xl">
          <form onSubmit={handleCriarCurso}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Criar Novo Curso
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Preencha as informações básicas para iniciar. Você poderá adicionar imagem de capa,
                módulos e aulas na tela de edição a seguir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo" className="text-xs font-semibold text-slate-700">
                  Título do curso *
                </Label>
                <Input
                  id="titulo"
                  required
                  placeholder="Ex: Introdução ao React Avançado"
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subtitulo" className="text-xs font-semibold text-slate-700">
                  Subtítulo ou chamada
                </Label>
                <Input
                  id="subtitulo"
                  placeholder="Ex: Domine hooks, componentes e boas práticas"
                  value={novoSubtitulo}
                  onChange={(e) => setNovoSubtitulo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="categoria" className="text-xs font-semibold text-slate-700">
                    Categoria *
                  </Label>
                  <Input
                    id="categoria"
                    required
                    placeholder="Ex: Tecnologia, Design, Negócios"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="preco" className="text-xs font-semibold text-slate-700">
                    Preço (R$) *
                  </Label>
                  <Input
                    id="preco"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="199"
                    value={novoPreco}
                    onChange={(e) => setNovoPreco(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descricao" className="text-xs font-semibold text-slate-700">
                  Descrição completa do curso *
                </Label>
                <Textarea
                  id="descricao"
                  required
                  rows={3}
                  placeholder="Explique o objetivo do curso, o que o aluno vai aprender e para quem é indicado..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoNovoCurso(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovoCurso}
                className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {salvandoNovoCurso ? 'Criando...' : 'Criar e abrir editor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(cursoParaExcluir)}
        onOpenChange={(aberto) => !aberto && setCursoParaExcluir(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Excluir curso definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600">
              Tem certeza que deseja excluir{' '}
              <strong>&ldquo;{cursoParaExcluir?.titulo}&rdquo;</strong>? Esta ação removerá todos os
              módulos, aulas e materiais vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
            <AlertDialogCancel disabled={excluindo} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindo ? 'Excluindo...' : 'Sim, excluir curso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Aviso quando Publicação é Impedida */}
      <AlertDialog
        open={avisoPublicacao.aberto}
        onOpenChange={(aberto) => setAvisoPublicacao((prev) => ({ ...prev, aberto }))}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Não é possível publicar o curso
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600 leading-relaxed">
              {avisoPublicacao.mensagem}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-2">
            <AlertDialogAction
              onClick={() => setAvisoPublicacao({ aberto: false, mensagem: '' })}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Entendi, vou revisar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
