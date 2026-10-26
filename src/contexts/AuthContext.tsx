import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RecordModel } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

type AuthContextValue = {
  usuario: RecordModel | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<RecordModel>
  sair: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<RecordModel | null>(pb.authStore.record)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    const validarSessao = async () => {
      if (pb.authStore.isValid) {
        try {
          await pb.collection('users').authRefresh()
        } catch {
          pb.authStore.clear()
        }
      }

      if (ativo) {
        setUsuario(pb.authStore.record)
        setCarregando(false)
      }
    }

    void validarSessao()
    const removerListener = pb.authStore.onChange((_token, record) => setUsuario(record), true)

    return () => {
      ativo = false
      removerListener()
    }
  }, [])

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      entrar: async (email, senha) => {
        const autenticacao = await pb.collection('users').authWithPassword(email, senha)
        setUsuario(autenticacao.record)
        return autenticacao.record
      },
      sair: () => {
        pb.authStore.clear()
        setUsuario(null)
      },
    }),
    [carregando, usuario],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return contexto
}
