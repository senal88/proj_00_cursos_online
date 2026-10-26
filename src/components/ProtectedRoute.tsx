import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

type ProtectedRouteProps = {
  children: React.ReactNode
  apenasAdmin?: boolean
}

export default function ProtectedRoute({ children, apenasAdmin = false }: ProtectedRouteProps) {
  const { usuario, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-xs space-y-3">
          <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
          <Skeleton className="mx-auto h-4 w-44" />
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Se a rota exige admin e o usuário não for admin, redireciona para a home
  if (apenasAdmin && usuario.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
