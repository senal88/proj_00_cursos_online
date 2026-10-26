import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  Filter,
  GraduationCap,
  LogIn,
  LogOut,
  Play,
  Search,
  Sparkles,
  User,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { listarCursosPublicos, type CursoCardItem } from '@/services/cursos'

const formatadorPreco = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export default function HomeVitrine() {
  const { usuario, sair } = useAuth()
  const [cursos, setCursos] = useState<CursoCardItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('todas')

  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        const dados = await listarCursosPublicos()
        if (ativo) setCursos(dados)
      } catch (err) {
        console.error('Erro ao carregar vitrine:', err)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    void carregar()

    // Subscrição realtime em cursos para atualização instantânea da vitrine ao publicar/despublicar
    let unsub: (() => void) | undefined
    pb.collection('cursos')
      .subscribe('*', () => {
        if (ativo) {
          void carregar()
        }
      })
      .then((u) => {
        unsub = u
      })
      .catch((err) => {
        console.error('Erro realtime vitrine:', err)
      })

    return () => {
      ativo = false
      if (unsub) {
        unsub()
      } else {
        pb.collection('cursos')
          .unsubscribe('*')
          .catch(() => {})
      }
    }
  }, [])

  // Obter categorias únicas disponíveis nos cursos publicados
  const categorias = useMemo(() => {
    const lista = new Set<string>()
    for (const c of cursos) {
      if (c.categoria) lista.add(c.categoria)
    }
    return ['todas', ...Array.from(lista)]
  }, [cursos])

  // Filtragem combinada por busca de nome e categoria selecionada
  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => {
      const correspondeBusca =
        c.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        c.subtitulo.toLowerCase().includes(busca.toLowerCase()) ||
        c.descricao.toLowerCase().includes(busca.toLowerCase())
      const correspondeCategoria =
        categoriaSelecionada === 'todas' || c.categoria === categoriaSelecionada
      return correspondeBusca && correspondeCategoria
    })
  }, [cursos, busca, categoriaSelecionada])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegação Pública */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold text-slate-900">EducaVídeo</span>
              <span className="block text-[11px] font-medium text-slate-500">Cursos em Vídeo</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {usuario ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="text-slate-700">
                  <Link to="/meus-cursos" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    <span>Meus Cursos</span>
                  </Link>
                </Button>
                {usuario.role === 'admin' && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/painel">Painel Admin</Link>
                  </Button>
                )}
                <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    {usuario.name?.split(' ')[0] || 'Aluno'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={sair}
                  title="Sair"
                  className="text-slate-400 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild className="text-slate-700">
                  <Link to="/login" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Entrar</span>
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero da Vitrine */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <Badge className="mb-4 border-indigo-400/30 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-300" />
            Catálogo Oficial de Cursos
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Aprenda novas habilidades no seu próprio ritmo
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-indigo-100 sm:text-lg">
            Cursos práticos e objetivos em vídeo aulas de alta qualidade para impulsionar sua
            carreira.
          </p>

          {/* Barra de Busca rápida */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Busque por título do curso ou palavra-chave..."
                className="h-12 w-full rounded-2xl border-0 bg-white pl-11 pr-4 text-slate-900 shadow-xl placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Seção Principal: Filtros e Vitrine */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* Barra de Filtro por Categoria */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
              <Filter className="h-3.5 w-3.5" />
              Categorias:
            </span>
            {categorias.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={categoriaSelecionada === cat ? 'default' : 'outline'}
                onClick={() => setCategoriaSelecionada(cat)}
                className={
                  categoriaSelecionada === cat
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'text-slate-600 hover:text-slate-900'
                }
              >
                {cat === 'todas' ? 'Todos os Cursos' : cat}
              </Button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            {cursosFiltrados.length}{' '}
            {cursosFiltrados.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
          </div>
        </div>

        {/* Grade de Cards de Cursos */}
        {carregando ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden border-slate-200">
                <Skeleton className="aspect-video w-full rounded-none" />
                <CardContent className="space-y-4 p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : cursosFiltrados.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">Nenhum curso encontrado</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {busca || categoriaSelecionada !== 'todas'
                ? 'Tente ajustar sua busca ou selecionar outra categoria.'
                : 'Não há cursos publicados disponíveis no momento.'}
            </p>
            {(busca || categoriaSelecionada !== 'todas') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setBusca('')
                  setCategoriaSelecionada('todas')
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cursosFiltrados.map((curso) => (
              <Card
                key={curso.id}
                className="group flex flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Imagem de Capa */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800">
                  {curso.imagemCapa ? (
                    <img
                      src={curso.imagemCapa}
                      alt={curso.titulo}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)]" />
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm">
                        <Play className="ml-1 h-6 w-6 fill-current" />
                      </span>
                    </div>
                  )}
                  <Badge className="absolute left-3 top-3 border-0 bg-black/60 text-white backdrop-blur-md">
                    {curso.categoria}
                  </Badge>
                </div>

                {/* Conteúdo do Card */}
                <CardContent className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {curso.titulo}
                  </h3>

                  {curso.subtitulo && (
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-2">{curso.subtitulo}</p>
                  )}

                  <p className="mt-2 text-xs text-slate-500 line-clamp-3">{curso.descricao}</p>

                  <div className="mt-auto pt-5">
                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
                      <div>
                        <span className="block text-[11px] font-medium uppercase text-slate-400">
                          Investimento
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {formatadorPreco.format(curso.preco)}
                        </span>
                      </div>

                      <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                        <Link to={`/curso/${curso.id}`}>Conhecer Curso</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer simples */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} EducaVídeo — Plataforma de Cursos em Vídeo.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:underline">
              Área do Aluno / Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
