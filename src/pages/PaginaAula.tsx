import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Flame,
  HelpCircle,
  Link as LinkIcon,
  ListVideo,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import YouTubePlayer from '@/components/YouTubePlayer'
import { useToast } from '@/hooks/use-toast'
import {
  concluirAula,
  desmarcarConclusaoAula,
  obterAulaAluno,
  salvarMinutoParada,
  type DadosAulaAssistir,
  type MaterialItem,
} from '@/services/cursos'
import {
  NIVEIS_GAMIFICACAO,
  TODAS_RECOMPENSAS,
  type ResultadoAtribuicaoGamificacao,
} from '@/services/gamificacao'

export default function PaginaAula() {
  const { aulaId } = useParams<{ aulaId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [dados, setDados] = useState<DadosAulaAssistir | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvandoMinuto, setSalvandoMinuto] = useState(false)
  const [minutoAtual, setMinutoAtual] = useState(0)

  // Diálogo de confirmação para concluir aula
  const [dialogoConcluirAberto, setDialogoConcluirAberto] = useState(false)
  const [processandoConclusao, setProcessandoConclusao] = useState(false)

  // Modal comemorativo de subida de nível ou nova recompensa conquistada
  const [modalGamificacaoAberto, setModalGamificacaoAberto] = useState(false)
  const [gamificacaoCelebracao, setGamificacaoCelebracao] =
    useState<ResultadoAtribuicaoGamificacao | null>(null)

  // Guarda a referência do último minuto salvo para evitar chamadas redundantes
  const ultimoMinutoSalvoRef = useRef<number>(-1)

  // Carregar dados completos da aula, curso e progresso
  const carregarDadosAula = useCallback(
    async (id: string) => {
      setCarregando(true)
      try {
        const res = await obterAulaAluno(id)
        if (!res) {
          // Acesso negado ou sem matrícula ativa: redirecionar à página de vendas do curso ou vitrine
          toast({
            title: 'Acesso Restrito',
            description: 'Apenas alunos com matrícula ativa podem acessar esta aula.',
            variant: 'destructive',
          })
          // Tenta obter o cursoId da aula para mandar à página de vendas /curso/:cursoId
          try {
            const aulaInfo = await pb
              .collection('aulas')
              .getOne(id, { fields: 'modulo' })
              .catch(() => null)
            if (aulaInfo && aulaInfo.modulo) {
              const modInfo = await pb
                .collection('modulos')
                .getOne(aulaInfo.modulo, { fields: 'curso' })
                .catch(() => null)
              if (modInfo && modInfo.curso) {
                navigate(`/curso/${modInfo.curso}`, { replace: true })
                return
              }
            }
          } catch {
            /* intentionally ignored */
          }
          navigate('/', { replace: true })
          return
        }

        setDados(res)
        const minutoSalvo = res.progresso?.minuto_parada ?? 0
        setMinutoAtual(minutoSalvo)
        ultimoMinutoSalvoRef.current = minutoSalvo
      } catch (err) {
        console.error('Falha ao carregar aula:', err)
        navigate('/', { replace: true })
      } finally {
        setCarregando(false)
      }
    },
    [navigate, toast],
  )
  useEffect(() => {
    if (!aulaId) return
    void carregarDadosAula(aulaId)
  }, [aulaId, carregarDadosAula])

  // Função para salvar minuto no backend PocketBase
  const handlePersistirMinuto = useCallback(
    async (minuto: number) => {
      if (!dados || !dados.matriculaId || !dados.aula) return
      const minutoInt = Math.max(0, Math.floor(minuto))
      if (minutoInt === ultimoMinutoSalvoRef.current) return

      try {
        setSalvandoMinuto(true)
        await salvarMinutoParada(dados.matriculaId, dados.aula.id, minutoInt)
        ultimoMinutoSalvoRef.current = minutoInt
        setMinutoAtual(minutoInt)
      } catch (err) {
        console.error('Erro ao persistir minuto:', err)
      } finally {
        setSalvandoMinuto(false)
      }
    },
    [dados],
  )

  // Callback chamado quando o vídeo é pausado ou a cada mudança de minuto
  const handlePausadoOuParado = useCallback(
    (_segundos: number, minutos: number) => {
      void handlePersistirMinuto(minutos)
    },
    [handlePersistirMinuto],
  )

  // Confirmar conclusão da aula
  const handleConfirmarConclusao = async () => {
    if (!dados || !dados.matriculaId || !dados.aula) return
    setProcessandoConclusao(true)
    try {
      const respostaConclusao = await concluirAula(dados.matriculaId, dados.aula.id, minutoAtual)

      // Atualizar estado local imediatamente
      const jaConcluida = dados.progresso?.situacao === 'concluida'
      const novaQtdConcluidas = jaConcluida ? dados.aulasConcluidas : dados.aulasConcluidas + 1

      // Atualizar também na lista de módulos lateral para refletir o checkmark
      const modulosAtualizados = dados.modulos.map((mod) => ({
        ...mod,
        aulas: mod.aulas.map((a) => {
          if (a.id === dados.aula.id) {
            return {
              ...a,
              progresso: {
                id: a.progresso?.id || 'temp',
                situacao: 'concluida' as const,
                minuto_parada: minutoAtual,
                data_conclusao: new Date().toISOString(),
              },
            }
          }
          return a
        }),
      }))

      setDados({
        ...dados,
        aulasConcluidas: novaQtdConcluidas,
        modulos: modulosAtualizados,
        progresso: {
          ...dados.progresso,
          situacao: 'concluida',
          minuto_parada: minutoAtual,
          data_conclusao: new Date().toISOString(),
        },
      })

      setDialogoConcluirAberto(false)

      // GATILHO VISUAL DE GAMIFICAÇÃO:
      // Feedback imediato com pontos ganhos e modal caso tenha subido de nível
      const gami = respostaConclusao.gamificacao
      if (gami) {
        if (gami.subiuDeNivel || (gami.novasRecompensas && gami.novasRecompensas.length > 0)) {
          // Modal especial comemorativo ao subir de nível ou desbloquear marcos
          setGamificacaoCelebracao(gami)
          setModalGamificacaoAberto(true)
        }

        if (gami.pontosGanhos > 0) {
          toast({
            title: `✨ +${gami.pontosGanhos} pontos conquistados!`,
            description: gami.ganhouPontosCurso
              ? 'Você concluiu a aula (+10) e 100% deste curso (+50)! Parabéns!'
              : 'Você concluiu a aula com sucesso! Continue assim para subir de nível.',
          })
        } else if (gami.aulaJaPontuada) {
          toast({
            title: '🎉 Aula concluída!',
            description:
              'Seu progresso foi atualizado. (Esta aula já havia pontuado anteriormente).',
          })
        } else {
          toast({
            title: '🎉 Aula concluída!',
            description: 'Seu progresso foi atualizado com sucesso no curso.',
          })
        }
      } else {
        toast({
          title: '🎉 Aula concluída!',
          description: 'Seu progresso foi atualizado com sucesso no curso.',
        })
      }
    } catch (err) {
      console.error('Falha ao concluir aula:', err)
      toast({
        title: 'Erro ao concluir aula',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoConclusao(false)
    }
  }

  // Opção para reverter conclusão se o aluno desejar
  const handleDesmarcarConclusao = async () => {
    if (!dados || !dados.matriculaId || !dados.aula) return
    try {
      await desmarcarConclusaoAula(dados.matriculaId, dados.aula.id)
      const novaQtdConcluidas = Math.max(0, dados.aulasConcluidas - 1)

      const modulosAtualizados = dados.modulos.map((mod) => ({
        ...mod,
        aulas: mod.aulas.map((a) => {
          if (a.id === dados.aula.id) {
            return {
              ...a,
              progresso: {
                id: a.progresso?.id || 'temp',
                situacao: 'iniciada' as const,
                minuto_parada: a.progresso?.minuto_parada || 0,
              },
            }
          }
          return a
        }),
      }))

      setDados({
        ...dados,
        aulasConcluidas: novaQtdConcluidas,
        modulos: modulosAtualizados,
        progresso: {
          ...dados.progresso,
          situacao: 'iniciada',
        },
      })

      toast({
        title: 'Conclusão removida',
        description: 'A aula agora consta como em andamento.',
      })
    } catch (err) {
      console.error('Falha ao desmarcar:', err)
    }
  }

  if (carregando) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!dados) return null

  const {
    aula,
    modulo,
    curso,
    modulos,
    aulaAnterior,
    proximaAula,
    totalAulas,
    aulasConcluidas,
    progresso,
  } = dados

  const percentualGeral = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0
  const isAulaConcluida = progresso.situacao === 'concluida'

  // Materiais da aula (do campo JSON da aula)
  const materiais: MaterialItem[] =
    aula.materiais && aula.materiais.length > 0
      ? aula.materiais
      : [
          {
            tipo: 'arquivo',
            nome: 'Material Complementar em PDF - Aula ' + aula.ordem + '.pdf',
            url: `/materiais/aula-${aula.id}.pdf`,
            tamanho: '2.4 MB',
            formato: 'pdf',
          },
          {
            tipo: 'link',
            nome: 'Documentação Oficial e Artigos Recomendados',
            url: 'https://pt.wikipedia.org/wiki/Marketing_digital',
          },
        ]

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Barra Superior de Contexto e Progresso Rápido */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Link to={`/curso/${curso.id}/estudo`}>
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao curso</span>
            </Link>
          </Button>

          <span className="hidden sm:inline text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-700 border-slate-300 font-medium"
            >
              Módulo {modulo.ordem}: {modulo.titulo}
            </Badge>
          </div>
        </div>

        {/* Indicador de Progresso do Curso em tempo real */}
        <div className="flex items-center gap-4 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
          <div className="min-w-[180px] sm:min-w-[220px]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
                Progresso: {aulasConcluidas} de {totalAulas} aulas
              </span>
              <span className="font-mono text-indigo-700 font-bold">{percentualGeral}%</span>
            </div>
            <Progress value={percentualGeral} className="h-2 bg-slate-100" />
          </div>

          {salvandoMinuto && (
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              Salvando...
            </span>
          )}
        </div>
      </div>

      {/* Grid Principal: Player & Detalhes (2 colunas) + Lista Lateral de Módulos (1 coluna) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna Central / Principal (2/3 no desktop) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Reprodutor de Vídeo Responsivo do YouTube */}
          <YouTubePlayer
            videoUrl={aula.video_url}
            titulo={aula.titulo}
            minutoInicial={progresso.minuto_parada}
            onPausadoOuParado={handlePausadoOuParado}
            onTempoAtualizado={(_seg, min) => setMinutoAtual(min)}
            onVideoConcluido={() => {
              if (!isAulaConcluida) {
                setDialogoConcluirAberto(true)
              }
            }}
          />

          {/* Rodapé do Player com Navegação Anterior / Próxima e Ação de Concluir */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
            {/* Botão Aula Anterior */}
            <div className="w-full sm:w-auto">
              {aulaAnterior ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto gap-2 border-slate-300 hover:bg-slate-50 text-slate-700"
                >
                  <Link to={`/aula/${aulaAnterior.id}`}>
                    <ChevronLeft className="h-4 w-4" />
                    <span>Aula anterior</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full sm:w-auto gap-2 border-slate-200 text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Primeira aula</span>
                </Button>
              )}
            </div>

            {/* Botão Central: Concluir Aula com Confirmação */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              {isAulaConcluida ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 px-3 py-1.5 gap-1.5 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Aula concluída
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDesmarcarConclusao}
                    className="text-xs text-slate-400 hover:text-slate-600 h-8"
                    title="Desmarcar conclusão"
                  >
                    Desfazer
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setDialogoConcluirAberto(true)}
                  className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 px-6"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Concluir aula</span>
                </Button>
              )}
            </div>

            {/* Botão Próxima Aula */}
            <div className="w-full sm:w-auto text-right">
              {proximaAula ? (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto gap-2 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                >
                  <Link to={`/aula/${proximaAula.id}`}>
                    <span>Próxima aula</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto gap-2 border-slate-200 text-slate-700"
                >
                  <Link to={`/curso/${curso.id}/estudo`}>
                    <span>Ver resumo do curso</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Detalhes da Aula */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
                  Aula {aula.ordem} • {modulo.titulo}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
                  <Clock className="h-3.5 w-3.5" />
                  Duração: {aula.duracao_minutos} min
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {aula.titulo}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2">
              <div className="text-sm leading-relaxed text-slate-700">
                {aula.descricao ? (
                  <p>{aula.descricao}</p>
                ) : (
                  <p className="text-slate-500">
                    Nesta aula abordamos os principais fundamentos e conceitos práticos deste
                    tópico. Assista ao vídeo e utilize os materiais complementares abaixo para fixar
                    o conteúdo.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seção "Materiais" abaixo do player */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 p-5 sm:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Materiais Complementares
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Arquivos para download e links recomendados desta aula
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-normal text-slate-600">
                  {materiais.length} {materiais.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {materiais.map((mat, idx) => {
                const isArquivo = mat.tipo === 'arquivo'

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isArquivo
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}
                      >
                        {isArquivo ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          {mat.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {isArquivo ? (
                            <>
                              <Badge
                                variant="outline"
                                className="uppercase text-[10px] px-1.5 py-0 border-slate-200 text-slate-600 font-mono"
                              >
                                {mat.formato || 'PDF'}
                              </Badge>
                              {mat.tamanho && <span>• {mat.tamanho}</span>}
                              <span>• Download direto</span>
                            </>
                          ) : (
                            <>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 border-indigo-200 text-indigo-700 bg-indigo-50/50"
                              >
                                Link externo
                              </Badge>
                              <span className="truncate max-w-xs text-slate-400">{mat.url}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0">
                      {isArquivo ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-2 border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm"
                        >
                          <a
                            href={mat.url}
                            download={mat.nome}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-600" />
                            <span>Baixar arquivo</span>
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700 shadow-sm"
                        >
                          <a href={mat.url} target="_blank" rel="noopener noreferrer">
                            <span>Acessar link</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral: Lista com todos os módulos e aulas (1/3 no desktop) */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm bg-white sticky top-20">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListVideo className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    Conteúdo do Curso
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700 text-xs font-mono"
                >
                  {aulasConcluidas}/{totalAulas}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">{curso.titulo}</p>
            </CardHeader>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-100">
              {modulos.map((mod, idxMod) => {
                const totalAulasModulo = mod.aulas.length
                const concluidasNoModulo = mod.aulas.filter(
                  (a) => a.progresso?.situacao === 'concluida',
                ).length

                return (
                  <div key={mod.id} className="py-2">
                    {/* Cabeçalho do Módulo */}
                    <div className="px-4 py-2 flex items-center justify-between bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                        Módulo {idxMod + 1}: {mod.titulo}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {concluidasNoModulo}/{totalAulasModulo}
                      </span>
                    </div>

                    {/* Lista de Aulas do Módulo */}
                    <div className="divide-y divide-slate-50">
                      {mod.aulas.map((itemAula) => {
                        const isAtual = itemAula.id === aula.id
                        const isConcluidaItem = itemAula.progresso?.situacao === 'concluida'
                        const minutoSalvoItem = itemAula.progresso?.minuto_parada || 0

                        return (
                          <Link
                            key={itemAula.id}
                            to={`/aula/${itemAula.id}`}
                            className={`group flex items-start gap-3 p-3.5 transition-colors ${
                              isAtual
                                ? 'bg-indigo-50/90 border-l-4 border-indigo-600 font-medium'
                                : 'hover:bg-slate-50 border-l-4 border-transparent'
                            }`}
                          >
                            {/* Ícone de status: Check se concluída, Play se atual/pendente */}
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors ${
                                isConcluidaItem
                                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20'
                                  : isAtual
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                              }`}
                            >
                              {isConcluidaItem ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : isAtual ? (
                                <Play className="ml-0.5 h-3 w-3 fill-current" />
                              ) : (
                                <span className="font-mono text-[11px]">{itemAula.ordem}</span>
                              )}
                            </span>

                            {/* Informações da aula */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs leading-snug truncate ${
                                  isAtual
                                    ? 'font-bold text-indigo-900'
                                    : isConcluidaItem
                                      ? 'text-slate-700'
                                      : 'text-slate-600 group-hover:text-slate-900'
                                }`}
                              >
                                {itemAula.titulo}
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {itemAula.duracao_minutos} min
                                </span>

                                {isConcluidaItem && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px] py-0 px-1.5 h-4">
                                    Concluída
                                  </Badge>
                                )}

                                {!isConcluidaItem && minutoSalvoItem > 0 && (
                                  <Badge className="bg-amber-50 text-amber-700 border-0 text-[10px] py-0 px-1.5 h-4 font-mono">
                                    {minutoSalvoItem}m salvos
                                  </Badge>
                                )}

                                {isAtual && (
                                  <Badge className="bg-indigo-600 text-white border-0 text-[10px] py-0 px-1.5 h-4">
                                    Assistindo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Diálogo de Confirmação para Concluir Aula */}
      <AlertDialog open={dialogoConcluirAberto} onOpenChange={setDialogoConcluirAberto}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Concluir esta aula?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600">
              Ao confirmar, a aula <strong>&ldquo;{aula.titulo}&rdquo;</strong> será marcada com
              check verde e seu progresso no curso subirá automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
            <AlertDialogCancel
              disabled={processandoConclusao}
              className="rounded-xl border-slate-200"
            >
              Continuar assistindo
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarConclusao}
              disabled={processandoConclusao}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {processandoConclusao ? 'Salvando...' : 'Sim, marcar como concluída'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Especial de Celebração de Gamificação (Subida de Nível ou Recompensa) */}
      <Dialog open={modalGamificacaoAberto} onOpenChange={setModalGamificacaoAberto}>
        <DialogContent className="rounded-3xl max-w-md text-center p-6 sm:p-8 border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 via-white to-white shadow-2xl">
          <DialogHeader className="items-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl shadow-inner border border-amber-200 mb-3 animate-bounce">
              {gamificacaoCelebracao?.subiuDeNivel ? '🏆' : '🎯'}
            </div>
            <DialogTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {gamificacaoCelebracao?.subiuDeNivel
                ? `Você alcançou o Nível ${gamificacaoCelebracao.novoNivel}!`
                : 'Nova Conquista Desbloqueada!'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1">
              {gamificacaoCelebracao?.subiuDeNivel
                ? `Parabéns pela dedicação! Seu empenho te levou ao Nível ${gamificacaoCelebracao.novoNivel} (${
                    NIVEIS_GAMIFICACAO.find((n) => n.nivel === gamificacaoCelebracao.novoNivel)
                      ?.nome || 'Avançado'
                  }).`
                : 'Você atingiu um novo marco especial na sua jornada de aprendizado!'}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-3">
            {/* Indicador de Pontos Acumulados */}
            <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold text-slate-800">
                Pontuação Total:{' '}
                <span className="font-mono text-amber-600 text-base">
                  {gamificacaoCelebracao?.pontosTotal} pontos
                </span>
              </span>
            </div>

            {/* Recompensas Conquistadas neste momento */}
            {gamificacaoCelebracao?.novasRecompensas &&
              gamificacaoCelebracao.novasRecompensas.length > 0 && (
                <div className="space-y-2 text-left">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                    Recompensa(s) Conquistada(s)
                  </p>
                  {gamificacaoCelebracao.novasRecompensas.map((recKey) => {
                    const infoRec = TODAS_RECOMPENSAS.find((r) => r.chave === recKey)
                    return (
                      <div
                        key={recKey}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm"
                      >
                        <span className="text-2xl">{infoRec?.icone || '🎖️'}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {infoRec?.titulo || recKey}
                          </p>
                          <p className="text-xs text-slate-500">{infoRec?.descricao}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>

          <DialogFooter className="sm:justify-center mt-2">
            <Button
              onClick={() => setModalGamificacaoAberto(false)}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-md shadow-indigo-600/20"
            >
              Continuar Aprendendo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
