import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Sparkles,
  BookOpen,
  ExternalLink,
  History,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Info,
  Layers,
  GraduationCap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import {
  buscarConteudoNosCursos,
  listarHistoricoBuscasAluno,
  listarMeusCursos,
  type RespostaBuscaConteudo,
  type ItemHistoricoBusca,
  type MeuCursoItem,
} from '@/services/cursos'

const SUGESTOES_EXEMPLO = [
  'Como configurar o pagamento',
  'Como funciona o Pix dinâmico e checkout transparente?',
  'Quais as taxas de intermediação e regras antifraude?',
  'O que é funil de vendas e posicionamento?',
  'Como criar anúncios no Google Ads e Facebook?',
]

export default function BuscarNosCursos() {
  const { usuario } = useAuth()
  const navigate = useNavigate()

  const [pergunta, setPergunta] = useState('')
  const [pesquisando, setPesquisando] = useState(false)
  const [resultadoAtual, setResultadoAtual] = useState<RespostaBuscaConteudo | null>(null)
  const [perguntaRespondida, setPerguntaRespondida] = useState('')
  const [historico, setHistorico] = useState<ItemHistoricoBusca[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const [meusCursos, setMeusCursos] = useState<MeuCursoItem[]>([])
  const [carregandoCursos, setCarregandoCursos] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'busca' | 'historico'>('busca')
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  // Carregar dados iniciais: cursos do aluno e histórico
  useEffect(() => {
    let ativo = true

    const carregar = async () => {
      try {
        const [cursosData, historicoData] = await Promise.all([
          listarMeusCursos(),
          listarHistoricoBuscasAluno(),
        ])
        if (ativo) {
          setMeusCursos(cursosData)
          setHistorico(historicoData)
        }
      } catch (err) {
        console.error('Erro ao carregar dados da busca:', err)
      } finally {
        if (ativo) {
          setCarregandoCursos(false)
          setCarregandoHistorico(false)
        }
      }
    }

    void carregar()

    return () => {
      ativo = false
    }
  }, [])

  const recarregarHistorico = async () => {
    try {
      const data = await listarHistoricoBuscasAluno()
      setHistorico(data)
    } catch (err) {
      console.error('Erro ao recarregar histórico:', err)
    }
  }

  const executarBusca = async (textoParaBuscar?: string) => {
    const termo = (textoParaBuscar ?? pergunta).trim()
    if (!termo) return

    setPergunta(termo)
    setPesquisando(true)
    setErroMsg(null)

    try {
      const resp = await buscarConteudoNosCursos(termo)
      setResultadoAtual(resp)
      setPerguntaRespondida(termo)
      void recarregarHistorico()
    } catch (err: unknown) {
      console.error('Erro na busca inteligente:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao processar a busca com IA.'
      setErroMsg(msg)
    } finally {
      setPesquisando(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void executarBusca()
  }

  const aplicarSugestao = (sugestao: string) => {
    setPergunta(sugestao)
    void executarBusca(sugestao)
  }

  const semMatriculas = !carregandoCursos && meusCursos.length === 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          <Sparkles className="h-3.5 w-3.5" />
          Área do Aluno • Inteligência Artificial
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Buscar nos meus cursos
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Faça perguntas em linguagem natural. A IA analisa os trechos transcritos exclusivamente
          dos cursos em que você está matriculado e fundamenta a resposta com fontes e links diretos
          para a aula.
        </p>
      </div>

      {/* Banner de Garantia de Privacidade e Segurança */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900 sm:text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600" />
        <div className="flex-1">
          <span className="font-semibold text-indigo-950">Garantia de matrícula ativa:</span> A IA
          tem acesso <strong>exclusivamente</strong> aos cursos e aulas públicas em que você possui
          matrícula regular ativa. Nenhum conteúdo de outros cursos é lido, citado ou revelado.
        </div>
        {meusCursos.length > 0 && (
          <Badge variant="outline" className="border-indigo-300 bg-white text-indigo-700">
            {meusCursos.length} curso(s) matriculado(s)
          </Badge>
        )}
      </div>

      {/* Mensagem amigável caso o aluno não tenha nenhuma matrícula ativa */}
      {semMatriculas && (
        <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg font-semibold text-amber-950">
                Você ainda não tem matrículas ativas
              </CardTitle>
            </div>
            <CardDescription className="text-amber-800 text-sm">
              A busca por significado funciona nos cursos em que você está matriculado. Como você
              ainda não possui matrícula ativa, não há aulas para pesquisar no momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                <Link to="/">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Conhecer os Cursos Disponíveis
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-900 hover:bg-amber-100"
                onClick={() => setPergunta('Como funciona o pagamento?')}
              >
                Testar pergunta para ver a proteção
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas: Buscar vs Histórico de Perguntas */}
      <Tabs
        value={abaAtiva}
        onValueChange={(v) => setAbaAtiva(v as 'busca' | 'historico')}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <TabsList className="grid w-full max-w-[360px] grid-cols-2">
            <TabsTrigger value="busca" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Nova Busca
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico ({historico.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA: BUSCA */}
        <TabsContent value="busca" className="mt-6 space-y-6">
          {/* Caixa de Entrada e Pergunta */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Ex: Como configurar o pagamento ou checkout transparente?"
                      value={pergunta}
                      onChange={(e) => setPergunta(e.target.value)}
                      disabled={pesquisando}
                      className="h-12 pl-11 pr-4 text-base shadow-sm focus-visible:ring-indigo-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={pesquisando || !pergunta.trim()}
                    className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
                  >
                    {pesquisando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Consultando Cursos...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Perguntar à IA
                      </>
                    )}
                  </Button>
                </div>

                {/* Sugestões de exemplo */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Exemplos de perguntas para testar:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGESTOES_EXEMPLO.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => aplicarSugestao(sug)}
                        disabled={pesquisando}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Alerta de erro caso ocorra */}
          {erroMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Não foi possível concluir a busca</AlertTitle>
              <AlertDescription>{erroMsg}</AlertDescription>
            </Alert>
          )}

          {/* Estado de Carregamento */}
          {pesquisando && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Analisando os conteúdos dos seus cursos...
              </h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Verificando suas matrículas ativas, localizando os trechos exatos nas transcrições e
                sintetizando a resposta com fontes.
              </p>
            </div>
          )}

          {/* Resultado da Pergunta Atual */}
          {!pesquisando && resultadoAtual && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <Card className="overflow-hidden border-indigo-200 bg-white shadow-md">
                <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Resposta com IA Baseada nos seus Cursos
                    </span>
                    {resultadoAtual.totalTrechosAnalisados > 0 && (
                      <span className="text-xs text-slate-500">
                        {resultadoAtual.totalTrechosAnalisados} trecho(s) verificados
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">"{perguntaRespondida}"</h2>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Corpo da Resposta */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 text-sm leading-relaxed text-slate-800 whitespace-pre-line sm:text-base">
                    {resultadoAtual.resposta}
                  </div>

                  {/* Aulas Citadas com Botão/Link direto */}
                  {resultadoAtual.aulas_citadas && resultadoAtual.aulas_citadas.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        Aulas Citadas (Acesse direto):
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {resultadoAtual.aulas_citadas.map((aula, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-400 hover:shadow-sm"
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <span className="block text-xs font-medium text-indigo-600 truncate">
                                {aula.cursoTitulo}
                              </span>
                              <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {aula.aulaTitulo}
                              </h4>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-medium"
                            >
                              <Link to={aula.link}>
                                Ir para aula
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trechos Exatos que Fundamentam a Resposta */}
                  {resultadoAtual.fontes && resultadoAtual.fontes.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Trechos Exatos da Transcrição (Fundamentação):
                      </h3>
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {resultadoAtual.fontes.map((fonte, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`fonte-${idx}`}
                            className="rounded-xl border border-slate-200 bg-white px-4"
                          >
                            <AccordionTrigger className="text-left py-3 hover:no-underline">
                              <div className="flex flex-col text-xs sm:text-sm">
                                <span className="font-semibold text-slate-900">
                                  Fonte {idx + 1}: {fonte.aulaTitulo} (Trecho #{fonte.posicao})
                                </span>
                                <span className="text-xs text-slate-500">
                                  Curso: {fonte.cursoTitulo}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-1">
                              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs sm:text-sm text-slate-700 font-mono italic leading-relaxed">
                                "{fonte.trechoExato}"
                              </div>
                              <div className="mt-2.5 flex justify-end">
                                <Button asChild variant="outline" size="sm" className="text-xs">
                                  <Link to={fonte.link}>
                                    <ExternalLink className="mr-1.5 h-3 w-3" />
                                    Abrir aula "{fonte.aulaTitulo}"
                                  </Link>
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}

                  {/* Caso não haja fontes ou não encontrou nos cursos */}
                  {(!resultadoAtual.fontes || resultadoAtual.fontes.length === 0) && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 flex items-start gap-2.5">
                      <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                      <div>
                        Nenhum trecho de aula foi citado porque o assunto não foi localizado nos
                        cursos em que você está matriculado. A plataforma nunca inventa conteúdos
                        nem cita cursos sem matrícula.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ABA: HISTÓRICO DE BUSCAS */}
        <TabsContent value="historico" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Seu Histórico de Perguntas</h2>
            <span className="text-xs text-slate-500">
              Perguntas realizadas e respostas gravadas exclusivamente para você
            </span>
          </div>

          {carregandoHistorico ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <History className="h-10 w-10 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                Nenhuma busca realizada ainda
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                Suas perguntas e respostas geradas ficarão salvas aqui para consulta posterior.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setAbaAtiva('busca')}>
                Fazer minha primeira pergunta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item) => {
                const dataFormatada = new Date(item.created).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <Card
                    key={item.id}
                    className="border-slate-200 shadow-sm transition hover:shadow-md"
                  >
                    <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          {dataFormatada}
                        </span>
                        {item.aulas_citadas && item.aulas_citadas.length > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            {item.aulas_citadas.length} aula(s) citada(s)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600">
                            Sem citação
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 mt-1">
                        "{item.pergunta}"
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {item.resposta}
                      </p>

                      {/* Aulas Citadas no Histórico */}
                      {item.aulas_citadas && item.aulas_citadas.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                            Aulas citadas:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {item.aulas_citadas.map((aula, aIdx) => (
                              <Button
                                key={aIdx}
                                asChild
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <Link to={aula.link}>
                                  <BookOpen className="mr-1.5 h-3 w-3" />
                                  {aula.aulaTitulo}
                                  <ArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trechos citados no Histórico */}
                      {item.fontes && item.fontes.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="trechos" className="border-none">
                            <AccordionTrigger className="text-xs text-indigo-600 py-1 hover:no-underline">
                              Ver {item.fontes.length} trecho(s) de transcrição que fundamentaram
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 space-y-2">
                              {item.fontes.map((f, fIdx) => (
                                <div
                                  key={fIdx}
                                  className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200 font-mono italic"
                                >
                                  <strong>{f.aulaTitulo}:</strong> "{f.trechoExato}"
                                </div>
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
