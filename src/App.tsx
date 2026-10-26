/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Login from './pages/Login'
import Painel from './pages/Painel'
import EditorCurso from './pages/EditorCurso'
import MatriculasCurso from './pages/MatriculasCurso'
import MeusCursos from './pages/MeusCursos'
import BuscarNosCursos from './pages/BuscarNosCursos'
import CursoEstudo from './pages/CursoEstudo'
import PaginaAula from './pages/PaginaAula'
import PaginaCursoPublica from './pages/PaginaCursoPublica'
import PaginaRetornoPagamento from './pages/PaginaRetornoPagamento'
import PerfilAluno from './pages/PerfilAluno'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/curso/:cursoId" element={<PaginaCursoPublica />} />
          <Route path="/pagamento/retorno" element={<PaginaRetornoPagamento />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas do Aluno (Autenticado) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/meus-cursos" element={<MeusCursos />} />
            <Route path="/buscar" element={<BuscarNosCursos />} />
            <Route path="/curso/:cursoId/estudo" element={<CursoEstudo />} />
            <Route path="/aula/:aulaId" element={<PaginaAula />} />
            <Route path="/perfil" element={<PerfilAluno />} />
          </Route>

          {/* Rotas Administrativas (Exclusivas para role='admin', redireciona aluno para home) */}
          <Route
            element={
              <ProtectedRoute apenasAdmin>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/painel" element={<Painel />} />
            <Route path="/painel/cursos/:cursoId" element={<EditorCurso />} />
            <Route path="/painel/cursos/:cursoId/matriculas" element={<MatriculasCurso />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
