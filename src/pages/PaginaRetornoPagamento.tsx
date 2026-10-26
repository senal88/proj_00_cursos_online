import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { obterSituacaoPedido, type SituacaoPedido } from '@/services/pedidos'
import { verificarMatriculaAtiva } from '@/services/cursos'

const formatadorPreco = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export default function PaginaRetornoPagamento() {
  const [searchParams] = useSearchParams()
  const { usuario } = useAuth()

  // Parâmetros que o Kiwify ou nosso redirect podem passar na URL
  const pedidoIdParam =
    searchParams.get('pedido_id') ||
    searchParams.get('order_id') ||
    sessionStorage.getItem('ultimo_pedido_pendente_id') ||
    ''

  const cursoIdParam =
    searchParams.get('curso_id') || sessionStorage.getItem('ultimo_pedido_curso_id') || ''

  const [carregando, setCarregando] = useState(true)
  const [situacao, setSituacao] = useState<SituacaoPedido>('pendente')
  const [cursoId, setCursoId] = useState<string>(cursoIdParam)
  const [cursoTitulo, setCursoTitulo] = useState<string>('Curso Online')
  const [valor, setValor] = useState<number>(0)
  const [matriculaLiberada, setMatriculaLiberada] = useState<boolean>(false)
  const [verificandoNovamente, setVerificandoNovamente] = useState(false)

  const checarStatus = async () => {
    setVerificandoNovamente(true)
    try {
      // 1. Se temos o ID do pedido, consultar no banco
      if (pedidoIdParam) {
        const dadosPedido = await obterSituacaoPedido(pedidoIdParam)
        if (dadosPedido) {
          setSituacao(dadosPedido.situacao)
          setCursoId(dadosPedido.cursoId)
          setCursoTitulo(dadosPedido.cursoTitulo)
          setValor(dadosPedido.valor)
        }
      }

      // 2. Se temos o ID do curso (ou veio do pedido), verificar se a matrícula já foi liberada pelo webhook
      const cId = cursoId || cursoIdParam
      if (cId) {
        const check = await verificarMatriculaAtiva(cId)
        if (check.temMatricula) {
          setMatriculaLiberada(true)
          setSituacao('pago')
        }
      }
    } catch (err) {
      console.error('Erro ao checar status do pagamento:', err)
    } finally {
      setCarregando(false)
      setVerificandoNovamente(false)
    }
  }

  useEffect(() => {
    void checarStatus()

    // Polling suave a cada 5 segundos se ainda estiver pendente (esperando webhook do Kiwify)
    const interval = setInterval(() => {
      if (!matriculaLiberada && situacao === 'pendente') {
        void checarStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [pedidoIdParam, cursoId, matriculaLiberada, situacao])

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  const isPago = situacao === 'pago' || matriculaLiberada

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Topo simples */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </span>
            <span>EducaVídeo</span>
          </Link>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/meus-cursos">Ir para Meus Cursos</Link>
          </Button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg">
          {isPago ? (
            /* Card de Sucesso ("Matrícula Liberada") */
            <Card className="border-emerald-200 shadow-xl shadow-emerald-600/5 bg-white overflow-hidden rounded-3xl">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 text-center text-white">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-inner ring-8 ring-white/10 animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="h-10 w-10 text-white stroke-[2.5]" />
                </div>
                <Badge className="bg-white text-emerald-800 hover:bg-white mb-2 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                  Pagamento Confirmado
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Sua Matrícula está Liberada! 🎉
                </h1>
                <p className="mt-2 text-sm text-emerald-50 max-w-sm mx-auto leading-relaxed">
                  O webhook do Kiwify confirmou sua transação e liberou seu acesso imediato e
                  vitalício.
                </p>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Detalhes do Curso
                  </span>
                  <p className="text-lg font-bold text-slate-900">{cursoTitulo}</p>
                  {valor > 0 && (
                    <p className="text-xs text-slate-500">
                      Valor aprovado: <strong>{formatadorPreco.format(valor)}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    size="lg"
                    asChild
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-13 rounded-2xl shadow-lg shadow-emerald-600/20 text-base gap-2"
                  >
                    <Link to={cursoId ? `/curso/${cursoId}/estudo` : '/meus-cursos'}>
                      <Play className="h-5 w-5 fill-current" />
                      <span>Começar o curso agora</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    asChild
                    className="w-full h-11 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Link to="/meus-cursos" className="gap-2">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                      <span>Ver em Meus Cursos</span>
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Transação autenticada e protegida com token Kiwify</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Card de Pendência ("Aguardando Confirmação do Pagamento") */
            <Card className="border-amber-200 shadow-xl shadow-amber-600/5 bg-white overflow-hidden rounded-3xl">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-center text-white">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md mb-4 shadow-inner ring-8 ring-white/10">
                  <Clock className="h-10 w-10 text-white animate-pulse" />
                </div>
                <Badge className="bg-white text-amber-800 hover:bg-white mb-2 font-bold px-3 py-1 text-xs uppercase tracking-wider">
                  Processando Transação
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Aguardando Confirmação
                </h1>
                <p className="mt-2 text-sm text-amber-50 max-w-sm mx-auto leading-relaxed">
                  Recebemos seu pedido e estamos aguardando a notificação segura do Kiwify para
                  liberar sua aula.
                </p>
              </div>

              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Liberação automática via Webhook</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Assim que seu pagamento via Pix, cartão ou boleto for aprovado na Kiwify, o
                    webhook oficial ativa sua matrícula em instantes. Você não precisa fazer nada!
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 flex items-center justify-between">
                  <span>Status do pedido:</span>
                  <Badge
                    variant="outline"
                    className="border-amber-400 text-amber-700 bg-amber-50 font-mono"
                  >
                    {situacao.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => void checarStatus()}
                    disabled={verificandoNovamente}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-12 rounded-2xl shadow-md shadow-amber-600/20 gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${verificandoNovamente ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {verificandoNovamente
                        ? 'Verificando com o banco...'
                        : 'Verificar status novamente'}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    asChild
                    className="w-full h-11 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Link to="/meus-cursos">Ir para Meus Cursos</Link>
                  </Button>
                </div>

                <p className="text-center text-[11px] text-slate-400">
                  Esta tela atualiza automaticamente quando a Kiwify enviar o webhook de
                  confirmação.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Rodapé simples */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Plataforma EducaVídeo • Checkout Integrado Kiwify & Webhook com HMAC-SHA1
      </footer>
    </div>
  )
}
