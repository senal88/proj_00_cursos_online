import pb from '@/lib/pocketbase/client'

// ============================================================================
// CONSTANTES E CONFIGURAÇÕES DE GAMIFICAÇÃO
// Níveis com progressão visível:
// Nível 1 = 0, Nível 2 = 100, Nível 3 = 250, Nível 4 = 500, Nível 5 = 1000
// ============================================================================

export interface DefinicaoNivel {
  nivel: number
  nome: string
  pontosNecessarios: number
  icone: string
  corBadge: string
}

export const NIVEIS_GAMIFICACAO: DefinicaoNivel[] = [
  {
    nivel: 1,
    nome: 'Iniciante Curioso',
    pontosNecessarios: 0,
    icone: '🌱',
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  },
  {
    nivel: 2,
    nome: 'Aprendiz Ativo',
    pontosNecessarios: 100,
    icone: '⚡',
    corBadge: 'bg-blue-50 text-blue-700 border-blue-300',
  },
  {
    nivel: 3,
    nome: 'Explorador Dedicado',
    pontosNecessarios: 250,
    icone: '🚀',
    corBadge: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  },
  {
    nivel: 4,
    nome: 'Mestre do Conhecimento',
    pontosNecessarios: 500,
    icone: '🔮',
    corBadge: 'bg-purple-50 text-purple-700 border-purple-300',
  },
  {
    nivel: 5,
    nome: 'Lenda dos Estudos',
    pontosNecessarios: 1000,
    icone: '👑',
    corBadge: 'bg-amber-50 text-amber-700 border-amber-300',
  },
]

export interface DefinicaoRecompensa {
  chave: 'primeira_aula' | 'primeiro_curso' | 'dedicado' | 'maratonista'
  titulo: string
  descricao: string
  criterio: string
  icone: string
}

export const TODAS_RECOMPENSAS: DefinicaoRecompensa[] = [
  {
    chave: 'primeira_aula',
    titulo: 'Primeira Aula',
    descricao: 'Concluiu a sua primeira aula na plataforma.',
    criterio: '1ª aula concluída',
    icone: '🎯',
  },
  {
    chave: 'primeiro_curso',
    titulo: 'Primeiro Curso',
    descricao: 'Concluiu 100% de um curso inteiro com sucesso!',
    criterio: '1º curso 100% concluído',
    icone: '🎓',
  },
  {
    chave: 'dedicado',
    titulo: 'Dedicado',
    descricao: 'Manteve uma sequência impressionante de 7 dias seguidos de estudo.',
    criterio: '7 dias seguidos de estudo',
    icone: '🔥',
  },
  {
    chave: 'maratonista',
    titulo: 'Maratonista',
    descricao: 'Alcançou o marco extraordinário de 30 dias ininterruptos de aprendizado!',
    criterio: '30 dias seguidos de estudo',
    icone: '🏆',
  },
]

export interface RecompensaConquistadaItem {
  id: string
  recompensa: string
  data_conquista: string
}

export interface PerfilGamificacaoAluno {
  pontosTotal: number
  nivelAtual: number
  sequenciaDias: number
  ultimoDiaEstudo: string
  totalAulasPontuadas: number
  totalCursosPontuados: number
  recompensasConquistadas: RecompensaConquistadaItem[]
  // Campos calculados para a barra de progresso
  nivelInfo: DefinicaoNivel
  proximoNivelInfo: DefinicaoNivel | null
  pontosNivelAtual: number
  pontosParaProximoNivel: number
  progressoPercentual: number
}

export interface ResultadoAtribuicaoGamificacao {
  sucesso: boolean
  pontosGanhos: number
  pontosTotal: number
  ganhouPontosAula: boolean
  ganhouPontosCurso: boolean
  aulaJaPontuada: boolean
  nivelAnterior: number
  novoNivel: number
  subiuDeNivel: boolean
  sequenciaDias: number
  novasRecompensas: string[]
  recompensasConquistadas: RecompensaConquistadaItem[]
}

/**
 * Calcula a barra de progresso entre o nível atual e o próximo
 */
export function calcularProgressoNivel(pontos: number): {
  nivelAtual: number
  nivelInfo: DefinicaoNivel
  proximoNivelInfo: DefinicaoNivel | null
  pontosNivelAtual: number
  pontosParaProximoNivel: number
  progressoPercentual: number
} {
  let nivelAtual = 1
  for (let i = NIVEIS_GAMIFICACAO.length - 1; i >= 0; i--) {
    if (pontos >= NIVEIS_GAMIFICACAO[i].pontosNecessarios) {
      nivelAtual = NIVEIS_GAMIFICACAO[i].nivel
      break
    }
  }

  const nivelInfo = NIVEIS_GAMIFICACAO.find((n) => n.nivel === nivelAtual) || NIVEIS_GAMIFICACAO[0]
  const proximoNivelInfo = NIVEIS_GAMIFICACAO.find((n) => n.nivel === nivelAtual + 1) || null

  if (!proximoNivelInfo) {
    return {
      nivelAtual,
      nivelInfo,
      proximoNivelInfo: null,
      pontosNivelAtual: nivelInfo.pontosNecessarios,
      pontosParaProximoNivel: 0,
      progressoPercentual: 100,
    }
  }

  const base = nivelInfo.pontosNecessarios
  const alvo = proximoNivelInfo.pontosNecessarios
  const intervalo = alvo - base
  const acumuladoNoNivel = Math.max(0, pontos - base)
  const percentual = Math.min(100, Math.max(0, Math.round((acumuladoNoNivel / intervalo) * 100)))

  return {
    nivelAtual,
    nivelInfo,
    proximoNivelInfo,
    pontosNivelAtual: base,
    pontosParaProximoNivel: Math.max(0, alvo - pontos),
    progressoPercentual: percentual,
  }
}

/**
 * Obter o perfil de gamificação do aluno conectado
 */
export async function obterPerfilGamificacao(): Promise<PerfilGamificacaoAluno | null> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return null

  try {
    const res = await pb.send<{
      sucesso: boolean
      pontosTotal: number
      nivelAtual: number
      sequenciaDias: number
      ultimoDiaEstudo: string
      totalAulasPontuadas: number
      totalCursosPontuados: number
      recompensasConquistadas: RecompensaConquistadaItem[]
    }>('/backend/v1/aluno/gamificacao/perfil', {
      method: 'GET',
    })

    const progresso = calcularProgressoNivel(res.pontosTotal)

    return {
      pontosTotal: res.pontosTotal,
      nivelAtual: progresso.nivelAtual,
      sequenciaDias: res.sequenciaDias,
      ultimoDiaEstudo: res.ultimoDiaEstudo,
      totalAulasPontuadas: res.totalAulasPontuadas,
      totalCursosPontuados: res.totalCursosPontuados,
      recompensasConquistadas: res.recompensasConquistadas,
      nivelInfo: progresso.nivelInfo,
      proximoNivelInfo: progresso.proximoNivelInfo,
      pontosNivelAtual: progresso.pontosNivelAtual,
      pontosParaProximoNivel: progresso.pontosParaProximoNivel,
      progressoPercentual: progresso.progressoPercentual,
    }
  } catch (err) {
    console.error('Erro ao obter perfil de gamificação:', err)
    return null
  }
}

/**
 * Disparar atribuição automática de pontos por aula concluída (idempotente)
 */
export async function atribuirPontosAulaConcluida(
  aulaId: string,
  matriculaId: string,
): Promise<ResultadoAtribuicaoGamificacao | null> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return null

  try {
    return await pb.send<ResultadoAtribuicaoGamificacao>(
      '/backend/v1/aluno/gamificacao/atribuir-aula',
      {
        method: 'POST',
        body: JSON.stringify({ aulaId, matriculaId }),
      },
    )
  } catch (err) {
    console.error('Erro ao atribuir gamificação da aula:', err)
    return null
  }
}
