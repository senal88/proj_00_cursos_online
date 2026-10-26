import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  GraduationCap,
  Heart,
  Lock,
  Play,
  Share2,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import {
  obterCurriculoPublico,
  obterCursoPublico,
  verificarMatriculaAtiva,
  type CurriculoPublicoResponse,
  type CursoCardItem,
} from '@/services/cursos'
import { criarPedidoPendente } from '@/services/pedidos'
import { useToast } from '@/hooks/use-toast'

const formatadorPreco = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export default function PaginaCursoPublica() {
  const { cursoId } = useParams<{ cursoId: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { toast } = useToast()

  const [curso, setCurso] = useState<CursoCardItem | null>(null)
  const [curriculo, setCurriculo] = useState<CurriculoPublicoResponse | null>(null)
  const [temMatricula, setTemMatricula] = useState<boolean>(false)
  const [carregando, setCarregando] = useState(true)
  const [processandoCheckout, setProcessandoCheckout] = useState(false)

  useEffect(() => {
    if (!cursoId) return

    let ativo = true
    const carregar = async () => {
      setCarregando(true)
      try {
        const [dadosCurso, dadosCurriculo, checagemMatricula] = await Promise.all([
          obterCursoPublico(cursoId),
          obterCurriculoPublico(cursoId).catch(() => null),
          verificarMatriculaAtiva(cursoId),
        ])

        if (!ativo) return

        if (!dadosCurso) {
          navigate('/', { replace: true })
          return
        }

        setCurso(dadosCurso)
        setCurriculo(dadosCurriculo)
        setTemMatricula(checagemMatricula.temMatricula)
      } catch (err) {
        console.error('Erro ao carregar dados do curso:', err)
        if (ativo) navigate('/', { replace: true })
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [cursoId, navigate])

  const handleQueroMeMatricular = async () => {
    if (!curso) return

    // Regra obrigatória: Curso sem link de checkout cadastrado:
    // o botão avisa o administrador em vez de abrir checkout vazio
    if (!curso.kiwifyCheckoutUrl || !curso.kiwifyCheckoutUrl.trim()) {
      toast({
        title: 'Checkout em configuração',
        description:
          'O link de checkout deste produto ainda não foi cadastrado pelo administrador no painel. Notifique a coordenação para ativá-lo.',
        variant: 'destructive',
      })
      return
    }

    setProcessandoCheckout(true)
    try {
      // Capturar parâmetros UTM da URL atual se houver
      const searchParams = new URLSearchParams(window.location.search)
      const origemUtm: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        origemUtm[key] = value
      })

      // Extrair slug do checkout para referência
      const segmentos = curso.kiwifyCheckoutUrl.split('/').filter(Boolean)
      const slug = segmentos[segmentos.length - 1] || ''

      // Regra obrigatória: Botão cria pedido "pendente" -> abre o link de checkout Kiwify
      // NUNCA cria matrícula diretamente
      const { pedidoId } = await criarPedidoPendente({
        cursoId: curso.id,
        valor: curso.preco,
        checkoutLink: slug,
        origemUtm,
      })

      toast({
        title: 'Pedido iniciado!',
        description: 'Redirecionando você com segurança para o checkout seguro do Kiwify...',
      })

      // Armazenar ID do pedido no sessionStorage para caso volte à página de retorno
      try {
        sessionStorage.setItem('ultimo_pedido_pendente_id', pedidoId)
        sessionStorage.setItem('ultimo_pedido_curso_id', curso.id)
      } catch {
        /* intentionally ignored */
      }

      // Redirecionar para o checkout Kiwify cadastrado
      window.location.href = curso.kiwifyCheckoutUrl
    } catch (err) {
      console.error('Erro ao iniciar pedido de checkout:', err)
      toast({
        title: 'Erro ao iniciar inscrição',
        description: 'Não foi possível gerar seu pedido. Tente novamente em instantes.',
        variant: 'destructive',
      })
      setProcessandoCheckout(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 sm:p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Skeleton className="h-80 md:col-span-2 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!curso) return null

  // Calcular estatísticas da grade
  const totalModulos = curriculo?.modulos.length ?? 0
  const totalAulas = curriculo?.modulos.reduce((total, mod) => total + mod.aulas.length, 0) ?? 0
  const totalMinutos =
    curriculo?.modulos.reduce(
      (total, mod) => total + mod.aulas.reduce((sub, aula) => sub + (aula.duracao_minutos || 0), 0),
      0,
    ) ?? 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topo / Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar à vitrine</span>
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            {usuario ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/meus-cursos" className="gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  <span>Meus Cursos</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero da Página de Vendas */}
      <section className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge className="bg-indigo-600 text-white border-0">{curso.categoria}</Badge>
            {temMatricula && (
              <Badge className="bg-emerald-600 text-white border-0">
                <CheckCircle className="mr-1 h-3 w-3" />
                Você já possui matrícula ativa
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {curso.titulo}
          </h1>

          {curso.subtitulo && (
            <p className="mt-3 text-lg text-slate-300 max-w-3xl leading-relaxed">
              {curso.subtitulo}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              {totalModulos} {totalModulos === 1 ? 'módulo' : 'módulos'} • {totalAulas}{' '}
              {totalAulas === 1 ? 'aula' : 'aulas'} ({totalMinutos} min total)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="h-4 w-4" />
              Acesso vitalício após a matrícula
            </span>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Coluna Esquerda: Descrição e Grade Curricular */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sobre o curso */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">Sobre este curso</h2>
                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {curso.descricao}
                </div>
              </CardContent>
            </Card>

            {/* Grade Curricular / Conteúdo Programático */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Grade curricular do curso</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Os conteúdos e vídeos são liberados exclusivamente após a confirmação da
                    matrícula
                  </p>
                </div>
              </div>

              {curriculo && curriculo.modulos.length > 0 ? (
                <div className="space-y-3">
                  {curriculo.modulos.map((modulo, idxModulo) => (
                    <div
                      key={modulo.id}
                      className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center justify-between bg-slate-50/80 px-4 py-3 border-b border-slate-100">
                        <span className="font-semibold text-sm text-slate-800">
                          Módulo {idxModulo + 1}: {modulo.titulo}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {modulo.aulas.length} {modulo.aulas.length === 1 ? 'aula' : 'aulas'}
                        </span>
                      </div>

                      {/* Lista de Aulas: APENAS TÍTULOS e duração, sem player */}
                      <div className="divide-y divide-slate-100">
                        {modulo.aulas.map((aula) => (
                          <div
                            key={aula.id}
                            className="flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Lock className="h-3.5 w-3.5" />
                              </span>
                              <span className="font-medium text-slate-800">{aula.titulo}</span>
                            </div>

                            <span className="text-xs text-slate-400 font-mono">
                              {aula.duracao_minutos} min
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                  Grade curricular em elaboração pela coordenação pedagógica.
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Card de Compra / Matrícula */}
          <div>
            <div className="sticky top-24 space-y-4">
              <Card className="border-slate-200 shadow-md bg-white overflow-hidden">
                {/* Preview de Capa */}
                <div className="relative aspect-video bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
                  {curso.imagemCapa ? (
                    <img
                      src={curso.imagemCapa}
                      alt={curso.titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Play className="h-10 w-10 text-white/70 fill-current" />
                    </div>
                  )}
                </div>

                <CardContent className="p-6 space-y-5">
                  <div>
                    <span className="block text-xs font-medium uppercase text-slate-400">
                      Investimento único
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-slate-900">
                        {formatadorPreco.format(curso.preco)}
                      </span>
                    </div>
                  </div>

                  {temMatricula ? (
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11"
                        asChild
                      >
                        <Link to={`/curso/${curso.id}/estudo`}>
                          <Play className="mr-2 h-4 w-4 fill-current" />
                          Acessar Minhas Aulas
                        </Link>
                      </Button>
                      <p className="text-center text-xs text-emerald-700 font-medium">
                        Você já está matriculado neste curso!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={handleQueroMeMatricular}
                        disabled={processandoCheckout}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base h-12 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        {processandoCheckout ? 'Iniciando checkout...' : 'Quero me matricular'}
                      </Button>
                      <p className="text-center text-xs text-slate-500">
                        Pagamento 100% seguro via Kiwify. Acesso liberado automaticamente via
                        webhook.
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>{totalAulas} aulas gravadas em alta definição</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Acesso imediato após a inscrição</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>Certificado de conclusão digital</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
