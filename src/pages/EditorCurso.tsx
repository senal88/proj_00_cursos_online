import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  FolderPlus,
  Globe,
  GlobeLock,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MoreVertical,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Users,
  Video,
  X,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import {
  alterarSituacaoCurso,
  atualizarAulaAdmin,
  atualizarCursoAdmin,
  criarAulaAdmin,
  criarModuloAdmin,
  excluirAulaAdmin,
  excluirModuloAdmin,
  obterCursoAdmin,
  renomearModuloAdmin,
  reordenarAulasAdmin,
  reordenarModulosAdmin,
  validarPublicacaoCurso,
  prepararBuscaAulaAdmin,
  type AulaAdminItem,
  type CursoAdminDetalhado,
  type MaterialItem,
  type ModuloAdminItem,
  type SituacaoBusca,
} from '@/services/cursos'
import { Search, Sparkles } from 'lucide-react'

export default function EditorCurso() {
  const { cursoId } = useParams<{ cursoId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [curso, setCurso] = useState<CursoAdminDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Formulário de dados do curso
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [preco, setPreco] = useState('')
  const [kiwifyCheckoutUrl, setKiwifyCheckoutUrl] = useState('')
  const [arquivoCapa, setArquivoCapa] = useState<File | null>(null)
  const [previewCapa, setPreviewCapa] = useState<string | null>(null)
  const [removerCapaAtual, setRemoverCapaAtual] = useState(false)
  const [salvandoCurso, setSalvandoCurso] = useState(false)
  const inputCapaRef = useRef<HTMLInputElement | null>(null)

  // Gestão de Módulos
  const [dialogoNovoModulo, setDialogoNovoModulo] = useState(false)
  const [tituloNovoModulo, setTituloNovoModulo] = useState('')
  const [salvandoNovoModulo, setSalvandoNovoModulo] = useState(false)

  const [moduloParaRenomear, setModuloParaRenomear] = useState<ModuloAdminItem | null>(null)
  const [novoNomeModulo, setNovoNomeModulo] = useState('')
  const [salvandoRenomearModulo, setSalvandoRenomearModulo] = useState(false)

  const [moduloParaExcluir, setModuloParaExcluir] = useState<ModuloAdminItem | null>(null)
  const [excluindoModulo, setExcluindoModulo] = useState(false)

  // Gestão de Aulas (Editor Modal)
  const [dialogoAulaAberto, setDialogoAulaAberto] = useState(false)
  const [moduloAlvoAula, setModuloAlvoAula] = useState<string>('')
  const [aulaEmEdicao, setAulaEmEdicao] = useState<AulaAdminItem | null>(null)
  const [aulaTitulo, setAulaTitulo] = useState('')
  const [aulaDescricao, setAulaDescricao] = useState('')
  const [aulaVideoUrl, setAulaVideoUrl] = useState('')
  const [aulaDuracao, setAulaDuracao] = useState('15')
  const [aulaSituacao, setAulaSituacao] = useState<'rascunho' | 'publicado'>('rascunho')
  const [aulaTranscricao, setAulaTranscricao] = useState('')
  const [aulaSituacaoBusca, setAulaSituacaoBusca] = useState<SituacaoBusca>('nao_preparada')
  const [aulaQtdTrechos, setAulaQtdTrechos] = useState<number>(0)
  const [aulaErroPreparo, setAulaErroPreparo] = useState<string>('')
  const [aulaDataPreparo, setAulaDataPreparo] = useState<string>('')
  const [preparandoBusca, setPreparandoBusca] = useState(false)
  const inputTranscricaoTxtRef = useRef<HTMLInputElement | null>(null)
  const [aulaMateriais, setAulaMateriais] = useState<MaterialItem[]>([])
  const [aulaArquivosUpload, setAulaArquivosUpload] = useState<File[]>([])
  const [salvandoAula, setSalvandoAula] = useState(false)

  // Adicionar Link Externo nos Materiais
  const [novoLinkNome, setNovoLinkNome] = useState('')
  const [novoLinkUrl, setNovoLinkUrl] = useState('')

  // Exclusão de Aula
  const [aulaParaExcluir, setAulaParaExcluir] = useState<AulaAdminItem | null>(null)
  const [excluindoAula, setExcluindoAula] = useState(false)

  // Diálogo de Validação de Publicação
  const [avisoPublicacao, setAvisoPublicacao] = useState<{
    aberto: boolean
    mensagem: string
  }>({ aberto: false, mensagem: '' })

  // Carregar dados
  const carregarDados = useCallback(async () => {
    if (!cursoId) return
    try {
      const dados = await obterCursoAdmin(cursoId)
      if (!dados) {
        toast({
          title: 'Curso não encontrado',
          description: 'O curso solicitado não existe ou você não tem permissão.',
          variant: 'destructive',
        })
        navigate('/painel', { replace: true })
        return
      }
      setCurso(dados)
      setTitulo(dados.titulo)
      setSubtitulo(dados.subtitulo)
      setDescricao(dados.descricao)
      setCategoria(dados.categoria)
      setPreco(dados.preco.toString())
      setKiwifyCheckoutUrl(dados.kiwifyCheckoutUrl || '')
      setPreviewCapa(dados.imagemCapa)
      setArquivoCapa(null)
      setRemoverCapaAtual(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [cursoId, navigate, toast])

  useEffect(() => {
    void carregarDados()
  }, [carregarDados])

  useRealtime('cursos', () => void carregarDados())
  useRealtime('modulos', () => void carregarDados())
  useRealtime('aulas', () => void carregarDados())

  // Preview de Capa ao selecionar arquivo local
  const handleSelecionarArquivoCapa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor selecione uma imagem (PNG, JPG ou WEBP).',
        variant: 'destructive',
      })
      return
    }

    setArquivoCapa(file)
    setRemoverCapaAtual(false)
    const urlLocal = URL.createObjectURL(file)
    setPreviewCapa(urlLocal)
  }

  const handleRemoverCapa = () => {
    setArquivoCapa(null)
    setPreviewCapa(null)
    setRemoverCapaAtual(true)
    if (inputCapaRef.current) inputCapaRef.current.value = ''
  }

  // Salvar Informações Básicas do Curso
  const handleSalvarCurso = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cursoId) return

    setSalvandoCurso(true)
    try {
      await atualizarCursoAdmin(cursoId, {
        titulo,
        subtitulo,
        descricao,
        categoria,
        preco: Math.max(0, parseFloat(preco) || 0),
        kiwifyCheckoutUrl,
        imagemCapaArquivo: arquivoCapa,
        removerImagemCapa: removerCapaAtual,
      })

      toast({
        title: 'Curso atualizado com sucesso!',
        description: 'As alterações das informações foram gravadas.',
      })
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar curso',
        description: 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoCurso(false)
    }
  }

  // Alternar Publicação do Curso
  const handleAlternarPublicacao = async () => {
    if (!curso) return
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
        title: novaSituacao === 'publicado' ? '🎉 Curso publicado!' : 'Curso despublicado',
        description:
          novaSituacao === 'publicado'
            ? 'O curso agora está público na vitrine!'
            : 'O curso agora está em rascunho e não aparece na vitrine.',
      })
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao alterar situação',
        description: 'Não foi possível alterar a situação do curso.',
        variant: 'destructive',
      })
    }
  }

  // --- Handlers de Módulos ---
  const handleCriarModulo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cursoId || !tituloNovoModulo.trim()) return

    setSalvandoNovoModulo(true)
    try {
      await criarModuloAdmin(cursoId, tituloNovoModulo)
      toast({
        title: 'Módulo criado com sucesso!',
      })
      setTituloNovoModulo('')
      setDialogoNovoModulo(false)
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao criar módulo',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovoModulo(false)
    }
  }

  const handleRenomearModulo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moduloParaRenomear || !novoNomeModulo.trim()) return

    setSalvandoRenomearModulo(true)
    try {
      await renomearModuloAdmin(moduloParaRenomear.id, novoNomeModulo)
      toast({
        title: 'Módulo renomeado',
      })
      setModuloParaRenomear(null)
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao renomear',
        variant: 'destructive',
      })
    } finally {
      setSalvandoRenomearModulo(false)
    }
  }

  const handleReordenarModulo = async (moduloId: string, direcao: 'subir' | 'descer') => {
    if (!cursoId) return
    try {
      await reordenarModulosAdmin(cursoId, moduloId, direcao)
      void carregarDados()
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmarExcluirModulo = async () => {
    if (!moduloParaExcluir) return
    setExcluindoModulo(true)
    try {
      await excluirModuloAdmin(moduloParaExcluir.id)
      toast({
        title: 'Módulo excluído',
      })
      setModuloParaExcluir(null)
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir módulo',
        variant: 'destructive',
      })
    } finally {
      setExcluindoModulo(false)
    }
  }

  // --- Handlers de Aulas ---
  const handleAbrirNovaAula = (moduloId: string) => {
    setModuloAlvoAula(moduloId)
    setAulaEmEdicao(null)
    setAulaTitulo('')
    setAulaDescricao('')
    setAulaVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    setAulaDuracao('15')
    setAulaSituacao('rascunho')
    setAulaTranscricao('')
    setAulaSituacaoBusca('nao_preparada')
    setAulaQtdTrechos(0)
    setAulaErroPreparo('')
    setAulaDataPreparo('')
    setAulaMateriais([])
    setAulaArquivosUpload([])
    setNovoLinkNome('')
    setNovoLinkUrl('')
    setDialogoAulaAberto(true)
  }

  const handleAbrirEditarAula = (moduloId: string, aula: AulaAdminItem) => {
    setModuloAlvoAula(moduloId)
    setAulaEmEdicao(aula)
    setAulaTitulo(aula.titulo)
    setAulaDescricao(aula.descricao)
    setAulaVideoUrl(aula.video_url)
    setAulaDuracao(aula.duracao_minutos.toString())
    setAulaSituacao(aula.situacao)
    setAulaTranscricao(aula.transcricao || '')
    setAulaSituacaoBusca(aula.situacao_busca || 'nao_preparada')
    setAulaQtdTrechos(aula.quantidade_trechos || 0)
    setAulaErroPreparo(aula.erro_preparo || '')
    setAulaDataPreparo(aula.data_preparo_busca || '')
    setAulaMateriais(aula.materiais || [])
    setAulaArquivosUpload([])
    setNovoLinkNome('')
    setNovoLinkUrl('')
    setDialogoAulaAberto(true)
  }

  // Upload de arquivo .txt para transcrição
  const handleUploadArquivoTxt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor selecione um arquivo de texto (.txt).',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const conteudo = (event.target?.result as string) || ''
      setAulaTranscricao(conteudo)
      toast({
        title: 'Transcrição carregada!',
        description: `Arquivo "${file.name}" importado com sucesso (${conteudo.length} caracteres).`,
      })
    }
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo .txt selecionado.',
        variant: 'destructive',
      })
    }
    reader.readAsText(file, 'UTF-8')
    // Reset do input para permitir selecionar o mesmo arquivo novamente se desejar
    e.target.value = ''
  }

  // Preparar busca da aula (divide a transcrição em trechos e guarda vinculados à aula/curso)
  const handlePrepararBusca = async () => {
    setPreparandoBusca(true)
    try {
      let aulaIdParaPreparo = aulaEmEdicao?.id

      // Se a aula ainda não foi salva (nova aula), precisamos salvá-la primeiro
      if (!aulaIdParaPreparo) {
        if (!aulaTitulo.trim() || !aulaVideoUrl.trim()) {
          toast({
            title: 'Preencha título e link do vídeo',
            description:
              'Para preparar a busca em uma nova aula, preencha o título e link primeiro.',
            variant: 'destructive',
          })
          setPreparandoBusca(false)
          return
        }

        const novaId = await criarAulaAdmin({
          moduloId: moduloAlvoAula,
          titulo: aulaTitulo,
          descricao: aulaDescricao,
          videoUrl: aulaVideoUrl,
          duracaoMinutos: Math.max(1, parseInt(aulaDuracao, 10) || 1),
          situacao: aulaSituacao,
          transcricao: aulaTranscricao,
          materiais: aulaMateriais,
          arquivosUpload: aulaArquivosUpload,
        })
        aulaIdParaPreparo = novaId
      } else {
        // Atualizar previamente a aula com a transcrição mais recente editada
        await atualizarAulaAdmin(aulaIdParaPreparo, {
          titulo: aulaTitulo,
          descricao: aulaDescricao,
          videoUrl: aulaVideoUrl,
          duracaoMinutos: Math.max(1, parseInt(aulaDuracao, 10) || 1),
          situacao: aulaSituacao,
          transcricao: aulaTranscricao,
          materiais: aulaMateriais,
          arquivosUpload: aulaArquivosUpload,
        })
      }

      const res = await prepararBuscaAulaAdmin(aulaIdParaPreparo, aulaTranscricao)
      setAulaSituacaoBusca(res.situacao_busca)
      setAulaQtdTrechos(res.quantidade_trechos)
      setAulaErroPreparo(res.erro || '')
      if (res.data_preparo_busca) setAulaDataPreparo(res.data_preparo_busca)

      if (res.situacao_busca === 'preparada') {
        toast({
          title: '🎉 Busca preparada com sucesso!',
          description: `A aula agora conta com ${res.quantidade_trechos} trechos indexados para pesquisa inteligente por significado.`,
        })
      } else if (res.situacao_busca === 'nao_preparada') {
        toast({
          title: 'Aula sem transcrição',
          description: 'A aula permanece como não preparada e fora da busca, sem erros.',
        })
      } else {
        toast({
          title: 'Erro no preparo da busca',
          description: res.erro || 'Houve uma falha ao indexar os trechos da aula.',
          variant: 'destructive',
        })
      }

      void carregarDados()
    } catch (err) {
      console.error(err)
      setAulaSituacaoBusca('erro')
      setAulaErroPreparo(String(err))
      toast({
        title: 'Erro ao preparar busca',
        description: 'Verifique a transcrição e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setPreparandoBusca(false)
    }
  }

  const handleAdicionarLinkMaterial = () => {
    if (!novoLinkNome.trim() || !novoLinkUrl.trim()) {
      toast({
        title: 'Preencha nome e URL do link',
        variant: 'destructive',
      })
      return
    }

    let urlFormatada = novoLinkUrl.trim()
    if (!urlFormatada.startsWith('http://') && !urlFormatada.startsWith('https://')) {
      urlFormatada = 'https://' + urlFormatada
    }

    setAulaMateriais((prev) => [
      ...prev,
      {
        tipo: 'link',
        nome: novoLinkNome.trim(),
        url: urlFormatada,
      },
    ])

    setNovoLinkNome('')
    setNovoLinkUrl('')
  }

  const handleRemoverMaterial = (index: number) => {
    setAulaMateriais((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSelecionarArquivosAula = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const novos = Array.from(e.target.files)
    setAulaArquivosUpload((prev) => [...prev, ...novos])
  }

  const handleRemoverArquivoUpload = (index: number) => {
    setAulaArquivosUpload((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSalvarAula = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aulaTitulo.trim() || !aulaVideoUrl.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Título e link do YouTube são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoAula(true)
    try {
      if (aulaEmEdicao) {
        await atualizarAulaAdmin(aulaEmEdicao.id, {
          titulo: aulaTitulo,
          descricao: aulaDescricao,
          videoUrl: aulaVideoUrl,
          duracaoMinutos: Math.max(1, parseInt(aulaDuracao, 10) || 1),
          situacao: aulaSituacao,
          transcricao: aulaTranscricao,
          materiais: aulaMateriais,
          arquivosUpload: aulaArquivosUpload,
        })
        toast({
          title: 'Aula atualizada!',
        })
      } else {
        await criarAulaAdmin({
          moduloId: moduloAlvoAula,
          titulo: aulaTitulo,
          descricao: aulaDescricao,
          videoUrl: aulaVideoUrl,
          duracaoMinutos: Math.max(1, parseInt(aulaDuracao, 10) || 1),
          situacao: aulaSituacao,
          transcricao: aulaTranscricao,
          materiais: aulaMateriais,
          arquivosUpload: aulaArquivosUpload,
        })
        toast({
          title: 'Aula criada com sucesso!',
        })
      }

      setDialogoAulaAberto(false)
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar aula',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAula(false)
    }
  }

  const handleReordenarAula = async (
    moduloId: string,
    aulaId: string,
    direcao: 'subir' | 'descer',
  ) => {
    try {
      await reordenarAulasAdmin(moduloId, aulaId, direcao)
      void carregarDados()
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmarExcluirAula = async () => {
    if (!aulaParaExcluir) return
    setExcluindoAula(true)
    try {
      await excluirAulaAdmin(aulaParaExcluir.id)
      toast({
        title: 'Aula excluída',
      })
      setAulaParaExcluir(null)
      void carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir aula',
        variant: 'destructive',
      })
    } finally {
      setExcluindoAula(false)
    }
  }

  if (carregando) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!curso) return null

  const publicado = curso.situacao === 'publicado'
  const totalAulasGerais = curso.modulos.reduce((sum, m) => sum + m.aulas.length, 0)
  const totalAulasPublicadas = curso.modulos.reduce(
    (sum, m) => sum + m.aulas.filter((a) => a.situacao === 'publicado').length,
    0,
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Barra Superior de Navegação e Status */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-2 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Link to="/painel">
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar aos cursos</span>
            </Link>
          </Button>

          <span className="hidden sm:inline text-slate-300">|</span>

          <Badge
            className={
              publicado
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
            }
          >
            {publicado ? 'Publicado na Vitrine' : 'Rascunho'}
          </Badge>

          <span className="text-xs text-slate-500 font-mono">
            {curso.modulos.length} {curso.modulos.length === 1 ? 'módulo' : 'módulos'} •{' '}
            {totalAulasGerais} aulas ({totalAulasPublicadas} publicadas)
          </span>
        </div>

        {/* Botões de Ação Global */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Ver como aluno */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/curso/${curso.id}`, '_blank')}
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            <span>Ver como aluno</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Button>

          {/* Botão Ver Matrículas */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100"
          >
            <Link to={`/painel/cursos/${curso.id}/matriculas`}>
              <Users className="h-4 w-4" />
              <span>Matrículas</span>
            </Link>
          </Button>

          {/* Botão Publicar / Despublicar */}
          <Button
            variant={publicado ? 'outline' : 'default'}
            size="sm"
            onClick={handleAlternarPublicacao}
            className={
              publicado
                ? 'gap-2 border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'gap-2 bg-emerald-600 hover:bg-emerald-700 text-white'
            }
          >
            {publicado ? (
              <>
                <GlobeLock className="h-4 w-4" />
                <span>Despublicar</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                <span>Publicar curso</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Abas: Conteúdo do Curso (Módulos & Aulas) / Dados do Curso */}
      <Tabs defaultValue="conteudo" className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
          <TabsTrigger
            value="conteudo"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4"
          >
            Módulos e Aulas ({curso.modulos.length})
          </TabsTrigger>
          <TabsTrigger
            value="dados"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg px-4"
          >
            Informações e Capa do Curso
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Módulos e Aulas */}
        <TabsContent value="conteudo" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Grade de Conteúdo</h2>
              <p className="text-xs text-slate-500">
                Organize os módulos em sequência lógica e insira as aulas em vídeo e materiais
              </p>
            </div>
            <Button
              onClick={() => {
                setTituloNovoModulo('')
                setDialogoNovoModulo(true)
              }}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Adicionar módulo</span>
            </Button>
          </div>

          {curso.modulos.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FolderOpen className="h-8 w-8" />
              </span>
              <h3 className="text-lg font-semibold text-slate-900">Nenhum módulo criado ainda</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Comece criando o primeiro módulo para agrupar as aulas do seu curso.
              </p>
              <Button
                onClick={() => setDialogoNovoModulo(true)}
                className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Criar primeiro módulo
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {curso.modulos.map((modulo, idxMod) => {
                const totalAulas = modulo.aulas.length
                const aulasPub = modulo.aulas.filter((a) => a.situacao === 'publicado').length

                return (
                  <Card
                    key={modulo.id}
                    className="overflow-hidden border-slate-200 shadow-sm bg-white"
                  >
                    {/* Cabeçalho do Módulo */}
                    <CardHeader className="bg-slate-50/80 p-4 sm:p-5 border-b border-slate-200">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700 font-mono">
                            {idxMod + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base font-bold text-slate-900">
                                {modulo.titulo}
                              </CardTitle>
                            </div>
                            <p className="text-xs text-slate-500">
                              {totalAulas} {totalAulas === 1 ? 'aula' : 'aulas'} • {aulasPub}{' '}
                              publicadas
                            </p>
                          </div>
                        </div>

                        {/* Ações do Módulo */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Botões de Ordenação do Módulo */}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idxMod === 0}
                            onClick={() => handleReordenarModulo(modulo.id, 'subir')}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                            title="Subir módulo"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idxMod === curso.modulos.length - 1}
                            onClick={() => handleReordenarModulo(modulo.id, 'descer')}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                            title="Descer módulo"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>

                          <span className="text-slate-200 mx-1">|</span>

                          {/* Adicionar Aula */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAbrirNovaAula(modulo.id)}
                            className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-8"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Nova aula</span>
                          </Button>

                          {/* Menu Dropdown de Mais Opções do Módulo */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-800"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setModuloParaRenomear(modulo)
                                  setNovoNomeModulo(modulo.titulo)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4 text-indigo-600" />
                                Renomear módulo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setModuloParaExcluir(modulo)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir módulo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Lista de Aulas do Módulo */}
                    <CardContent className="p-0 divide-y divide-slate-100">
                      {modulo.aulas.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Nenhuma aula neste módulo. Clique em &quot;Nova aula&quot; para adicionar.
                        </div>
                      ) : (
                        modulo.aulas.map((aula, idxAula) => {
                          const isPub = aula.situacao === 'publicado'
                          const qtdMateriais = aula.materiais?.length || 0

                          return (
                            <div
                              key={aula.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 font-mono">
                                  {idxAula + 1}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                      {aula.titulo}
                                    </p>
                                    <Badge
                                      className={cn(
                                        'text-[10px] px-1.5 py-0 h-4 font-semibold',
                                        isPub
                                          ? 'bg-emerald-100 text-emerald-800 border-0'
                                          : 'bg-amber-100 text-amber-800 border-0',
                                      )}
                                    >
                                      {isPub ? 'Publicada' : 'Rascunho'}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1 font-mono">
                                      <Clock className="h-3 w-3" />
                                      {aula.duracao_minutos} min
                                    </span>
                                    {qtdMateriais > 0 && (
                                      <span className="flex items-center gap-1 text-indigo-600">
                                        <Paperclip className="h-3 w-3" />
                                        {qtdMateriais}{' '}
                                        {qtdMateriais === 1 ? 'material' : 'materiais'}
                                      </span>
                                    )}
                                    {/* Indicador de Situação de Busca na Linha da Aula */}
                                    {aula.situacao_busca === 'preparada' ? (
                                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                        <Sparkles className="h-3 w-3 text-emerald-600" />
                                        Busca: preparada ({aula.quantidade_trechos || 0} trechos)
                                      </span>
                                    ) : aula.situacao_busca === 'erro' ? (
                                      <span className="flex items-center gap-1 text-red-600 font-medium">
                                        <AlertCircle className="h-3 w-3 text-red-500" />
                                        Busca: erro no preparo
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-slate-400">
                                        <Search className="h-3 w-3" />
                                        Busca: não preparada
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ações da Aula */}
                              <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                                {/* Subir / Descer Aula */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={idxAula === 0}
                                  onClick={() => handleReordenarAula(modulo.id, aula.id, 'subir')}
                                  className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                  title="Subir aula"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={idxAula === modulo.aulas.length - 1}
                                  onClick={() => handleReordenarAula(modulo.id, aula.id, 'descer')}
                                  className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                  title="Descer aula"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>

                                <span className="text-slate-200 mx-1">|</span>

                                {/* Editar Aula */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAbrirEditarAula(modulo.id, aula)}
                                  className="h-8 gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  <span>Editar</span>
                                </Button>

                                {/* Excluir Aula */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setAulaParaExcluir(aula)}
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  title="Excluir aula"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: Dados e Capa do Curso */}
        <TabsContent value="dados">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900">
                Informações do Curso
              </CardTitle>
              <CardDescription>
                Atualize os detalhes principais exibidos na vitrine pública e na área do aluno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarCurso} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna Esquerda: Textos */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-titulo" className="text-xs font-semibold text-slate-700">
                        Título do curso *
                      </Label>
                      <Input
                        id="edit-titulo"
                        required
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-subtitulo"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Subtítulo
                      </Label>
                      <Input
                        id="edit-subtitulo"
                        value={subtitulo}
                        onChange={(e) => setSubtitulo(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="edit-categoria"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Categoria *
                        </Label>
                        <Input
                          id="edit-categoria"
                          required
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="edit-preco"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Preço (R$) *
                        </Label>
                        <Input
                          id="edit-preco"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={preco}
                          onChange={(e) => setPreco(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="edit-kiwify-checkout"
                          className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-indigo-600" />
                          Link de Checkout do Produto no Kiwify
                        </Label>
                        {kiwifyCheckoutUrl && (
                          <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Slug: {kiwifyCheckoutUrl.split('/').filter(Boolean).pop()}
                          </span>
                        )}
                      </div>
                      <Input
                        id="edit-kiwify-checkout"
                        placeholder="https://kiwify.app/DHOtfJC"
                        value={kiwifyCheckoutUrl}
                        onChange={(e) => setKiwifyCheckoutUrl(e.target.value)}
                        className="rounded-xl bg-white border-indigo-200 text-xs font-mono"
                      />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Cole a URL completa de checkout deste curso gerada no painel Kiwify (ex:{' '}
                        <code>https://kiwify.app/DHOtfJC</code>). Os alunos serão direcionados para
                        ela ao clicarem em &quot;Quero me matricular&quot;.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="edit-descricao"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Descrição completa *
                      </Label>
                      <Textarea
                        id="edit-descricao"
                        required
                        rows={5}
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Coluna Direita: Imagem de Capa com Upload e Preview */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-700">
                      Imagem de Capa (16:9 recomendada)
                    </Label>

                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                      {previewCapa ? (
                        <>
                          <img
                            src={previewCapa}
                            alt="Preview da capa"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            onClick={handleRemoverCapa}
                            className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-md"
                            title="Remover capa"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <ImageIcon className="h-6 w-6" />
                          </span>
                          <p className="text-xs font-medium text-slate-600">
                            Nenhuma imagem selecionada
                          </p>
                          <p className="text-[11px] text-slate-400">PNG, JPG ou WEBP até 5MB</p>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={inputCapaRef}
                      onChange={handleSelecionarArquivoCapa}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => inputCapaRef.current?.click()}
                        className="w-full gap-2 rounded-xl border-slate-300"
                      >
                        <Upload className="h-4 w-4" />
                        <span>{previewCapa ? 'Trocar imagem' : 'Selecionar imagem'}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={salvandoCurso}
                    className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 shadow-md shadow-indigo-600/20"
                  >
                    <Save className="h-4 w-4" />
                    {salvandoCurso ? 'Salvando alterações...' : 'Salvar dados do curso'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO: Criar Módulo */}
      <Dialog open={dialogoNovoModulo} onOpenChange={setDialogoNovoModulo}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleCriarModulo}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Criar Novo Módulo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Informe o título do módulo. Ele será inserido na última posição do curso.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="modulo-titulo" className="text-xs font-semibold text-slate-700">
                Título do módulo *
              </Label>
              <Input
                id="modulo-titulo"
                required
                placeholder="Ex: Módulo 1: Fundamentos Práticos"
                value={tituloNovoModulo}
                onChange={(e) => setTituloNovoModulo(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoNovoModulo(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoNovoModulo}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {salvandoNovoModulo ? 'Criando...' : 'Criar módulo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Renomear Módulo */}
      <Dialog
        open={Boolean(moduloParaRenomear)}
        onOpenChange={(aberto) => !aberto && setModuloParaRenomear(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleRenomearModulo}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Renomear Módulo
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="rename-modulo" className="text-xs font-semibold text-slate-700">
                Novo título do módulo *
              </Label>
              <Input
                id="rename-modulo"
                required
                value={novoNomeModulo}
                onChange={(e) => setNovoNomeModulo(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModuloParaRenomear(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoRenomearModulo}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {salvandoRenomearModulo ? 'Salvando...' : 'Salvar título'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Excluir Módulo */}
      <AlertDialog
        open={Boolean(moduloParaExcluir)}
        onOpenChange={(aberto) => !aberto && setModuloParaExcluir(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Excluir este módulo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600">
              O módulo <strong>&ldquo;{moduloParaExcluir?.titulo}&rdquo;</strong> e todas as suas
              aulas serão excluídos definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
            <AlertDialogCancel disabled={excluindoModulo} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExcluirModulo}
              disabled={excluindoModulo}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindoModulo ? 'Excluindo...' : 'Sim, excluir módulo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO: Editor de Aula (Criação e Edição) */}
      <Dialog open={dialogoAulaAberto} onOpenChange={setDialogoAulaAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <form onSubmit={handleSalvarAula}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {aulaEmEdicao ? 'Editar Aula' : 'Nova Aula no Módulo'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os dados do vídeo, duração, materiais complementares e defina a situação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="aula-titulo" className="text-xs font-semibold text-slate-700">
                  Título da aula *
                </Label>
                <Input
                  id="aula-titulo"
                  required
                  placeholder="Ex: Introdução ao conceito de funil de vendas"
                  value={aulaTitulo}
                  onChange={(e) => setAulaTitulo(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aula-video" className="text-xs font-semibold text-slate-700">
                  Link do vídeo do YouTube *
                </Label>
                <Input
                  id="aula-video"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={aulaVideoUrl}
                  onChange={(e) => setAulaVideoUrl(e.target.value)}
                  className="rounded-xl"
                />
                <p className="text-[11px] text-slate-400">
                  Formatos aceitos: youtube.com/watch?v=ID ou youtu.be/ID
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="aula-duracao" className="text-xs font-semibold text-slate-700">
                    Duração estimada (minutos) *
                  </Label>
                  <Input
                    id="aula-duracao"
                    type="number"
                    min="1"
                    required
                    value={aulaDuracao}
                    onChange={(e) => setAulaDuracao(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Situação da aula *</Label>
                  <Select
                    value={aulaSituacao}
                    onValueChange={(v) => setAulaSituacao(v as 'rascunho' | 'publicado')}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho (invisível aos alunos)</SelectItem>
                      <SelectItem value="publicado">Publicado (disponível no curso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aula-desc" className="text-xs font-semibold text-slate-700">
                  Descrição e notas da aula
                </Label>
                <Textarea
                  id="aula-desc"
                  rows={3}
                  placeholder="Resumo dos tópicos abordados nesta aula..."
                  value={aulaDescricao}
                  onChange={(e) => setAulaDescricao(e.target.value)}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Seção Transcrição & Preparo de Busca por Significado */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Transcrição & Busca por Significado
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cole o texto da aula ou envie um arquivo .txt. A busca inteligente permitirá
                      aos alunos encontrar a aula mesmo sem saber o título exato.
                    </p>
                  </div>

                  {/* Badge de Situação de Preparo */}
                  <div className="shrink-0">
                    {aulaSituacaoBusca === 'preparada' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 gap-1.5 text-xs py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Preparada ({aulaQtdTrechos} trechos)</span>
                      </Badge>
                    ) : aulaSituacaoBusca === 'erro' ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 gap-1.5 text-xs py-1">
                        <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                        <span>Erro no preparo</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-600 border-slate-300 gap-1.5 text-xs py-1"
                      >
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                        <span>Não preparada</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {aulaSituacaoBusca === 'erro' && aulaErroPreparo && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Mensagem do erro:</p>
                      <p className="font-mono mt-0.5 text-[11px]">{aulaErroPreparo}</p>
                    </div>
                  </div>
                )}

                {/* Campo de Transcrição: Texto Colado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="aula-transcricao"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Texto da transcrição (colado ou digitado)
                    </Label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {aulaTranscricao.length.toLocaleString('pt-BR')} caracteres
                    </span>
                  </div>
                  <Textarea
                    id="aula-transcricao"
                    rows={6}
                    placeholder="Cole aqui a transcrição completa do vídeo ou utilize o botão de upload de arquivo .txt abaixo..."
                    value={aulaTranscricao}
                    onChange={(e) => setAulaTranscricao(e.target.value)}
                    className="rounded-xl font-sans text-xs leading-relaxed bg-white"
                  />
                </div>

                {/* Controles: Upload de Arquivo .txt e Botão "Preparar busca" */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={inputTranscricaoTxtRef}
                      onChange={handleUploadArquivoTxt}
                      accept=".txt,text/plain"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => inputTranscricaoTxtRef.current?.click()}
                      className="gap-2 rounded-xl text-xs bg-white hover:bg-slate-50 border-slate-300"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-600" />
                      <span>Upload arquivo .txt</span>
                    </Button>

                    {aulaTranscricao && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAulaTranscricao('')}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Limpar texto
                      </Button>
                    )}
                  </div>

                  {/* Botão de Preparar Busca */}
                  <Button
                    type="button"
                    onClick={handlePrepararBusca}
                    disabled={preparandoBusca}
                    className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-xs h-9 px-4"
                  >
                    {preparandoBusca ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Dividindo em trechos...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Preparar busca</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span>
                    Ao preparar novamente, os trechos anteriores da aula são automaticamente
                    substituídos, sem duplicação.
                  </span>
                </div>
              </div>

              {/* Seção Materiais da Aula: Upload de Arquivos e Links Externos */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-indigo-600" />
                    Materiais Complementares
                  </h4>
                  <p className="text-xs text-slate-500">
                    Disponibilize PDFs, planilhas e referências externas para os alunos
                  </p>
                </div>

                {/* Lista de Materiais Cadastrados */}
                {aulaMateriais.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Materiais associados:</p>
                    <div className="space-y-1.5">
                      {aulaMateriais.map((mat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-white p-2.5 px-3 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {mat.tipo === 'arquivo' ? (
                              <Download className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 truncate">
                              {mat.nome}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {mat.tipo}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoverMaterial(i)}
                            className="h-6 w-6 text-slate-400 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Arquivos Selecionados para Upload nesta Ação */}
                {aulaArquivosUpload.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Arquivos para enviar nesta gravação:
                    </p>
                    <div className="space-y-1.5">
                      {aulaArquivosUpload.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-indigo-50/60 p-2.5 px-3 border border-indigo-100 text-xs text-indigo-900"
                        >
                          <span className="truncate">{f.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoverArquivoUpload(i)}
                            className="h-6 w-6 text-indigo-400 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload de Arquivos */}
                <div className="pt-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Enviar novo arquivo (PDF, ZIP, DOCX, Planilha)
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={handleSelecionarArquivosAula}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Cadastro de Link Externo */}
                <div className="pt-2 border-t border-slate-200">
                  <Label className="text-xs font-semibold text-slate-700">
                    Cadastrar link externo complementar
                  </Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Nome do link (ex: Artigo Wiki)"
                        value={novoLinkNome}
                        onChange={(e) => setNovoLinkNome(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="https://..."
                        value={novoLinkUrl}
                        onChange={(e) => setNovoLinkUrl(e.target.value)}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAdicionarLinkMaterial}
                      className="gap-1 rounded-xl text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoAulaAberto(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoAula}
                className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {salvandoAula ? 'Gravando...' : 'Salvar aula'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Excluir Aula */}
      <AlertDialog
        open={Boolean(aulaParaExcluir)}
        onOpenChange={(aberto) => !aberto && setAulaParaExcluir(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Excluir esta aula?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600">
              A aula <strong>&ldquo;{aulaParaExcluir?.titulo}&rdquo;</strong> será removida deste
              módulo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
            <AlertDialogCancel disabled={excluindoAula} className="rounded-xl">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExcluirAula}
              disabled={excluindoAula}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {excluindoAula ? 'Excluindo...' : 'Sim, excluir aula'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO: Aviso de Impedimento de Publicação */}
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
