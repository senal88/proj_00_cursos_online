import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type SituacaoPedido = 'pendente' | 'pago' | 'falhou' | 'expirado'

export type PedidoItem = {
  id: string
  alunoId?: string
  alunoNome?: string
  alunoEmail?: string
  cursoId: string
  cursoTitulo: string
  valor: number
  situacao: SituacaoPedido
  kiwifyOrderId?: string
  kiwifyOrderRef?: string
  checkoutLink?: string
  origemUtm?: Record<string, string>
  dataConfirmacao?: string
  created: string
}

type PedidoRecord = RecordModel & {
  aluno?: string
  curso: string
  aluno_email?: string
  aluno_nome?: string
  valor: number
  situacao: SituacaoPedido
  kiwify_order_id?: string
  kiwify_order_ref?: string
  checkout_link?: string
  origem_utm?: Record<string, string>
  data_confirmacao?: string
  created: string
  expand?: {
    aluno?: RecordModel & { name?: string; email?: string }
    curso?: RecordModel & { titulo: string }
  }
}

type ConfigRecord = RecordModel & {
  chave: string
  valor: string
}

/**
 * Cria um pedido em estado 'pendente' quando o aluno clica em "Quero me matricular"
 * NUNCA cria matrícula diretamente (a matrícula só nasce na confirmação do webhook).
 */
export async function criarPedidoPendente(dados: {
  cursoId: string
  valor: number
  checkoutLink?: string
  origemUtm?: Record<string, string>
}): Promise<{ pedidoId: string }> {
  const alunoId = pb.authStore.record?.id
  const alunoEmail = pb.authStore.record?.email || ''
  const alunoNome = pb.authStore.record?.name || ''

  const pedido = await pb.collection('pedidos').create({
    aluno: alunoId || null,
    curso: dados.cursoId,
    aluno_email: alunoEmail,
    aluno_nome: alunoNome,
    valor: dados.valor,
    situacao: 'pendente',
    checkout_link: dados.checkoutLink || '',
    origem_utm: dados.origemUtm || {},
  })

  return { pedidoId: pedido.id }
}

/**
 * Consulta a situação de um pedido pelo ID (usado na página de retorno pós-checkout)
 */
export async function obterSituacaoPedido(pedidoId: string): Promise<{
  id: string
  situacao: SituacaoPedido
  cursoId: string
  cursoTitulo: string
  valor: number
  dataConfirmacao?: string
} | null> {
  try {
    const pedido = await pb.collection<PedidoRecord>('pedidos').getOne(pedidoId, {
      expand: 'curso',
    })

    return {
      id: pedido.id,
      situacao: pedido.situacao,
      cursoId: pedido.curso,
      cursoTitulo: pedido.expand?.curso?.titulo || 'Curso',
      valor: Number(pedido.valor),
      dataConfirmacao: pedido.data_confirmacao,
    }
  } catch (err) {
    console.error('Erro ao buscar pedido:', err)
    return null
  }
}

/**
 * Lista todos os pedidos para o painel administrativo (com dados expandidos de aluno e curso)
 */
export async function listarPedidosAdmin(): Promise<{
  pedidos: PedidoItem[]
  totalConfirmado: number
  totalPedidos: number
  totalPagos: number
  totalPendentes: number
  totalFalhos: number
}> {
  try {
    const records = await pb.collection<PedidoRecord>('pedidos').getFullList({
      sort: '-created',
      expand: 'aluno,curso',
    })

    let totalConfirmado = 0
    let totalPagos = 0
    let totalPendentes = 0
    let totalFalhos = 0

    const pedidos: PedidoItem[] = records.map((r) => {
      const valor = Number(r.valor) || 0
      if (r.situacao === 'pago') {
        totalConfirmado += valor
        totalPagos++
      } else if (r.situacao === 'pendente') {
        totalPendentes++
      } else {
        totalFalhos++
      }

      return {
        id: r.id,
        alunoId: r.aluno,
        alunoNome: r.expand?.aluno?.name || r.aluno_nome || 'Aluno Convidado',
        alunoEmail: r.expand?.aluno?.email || r.aluno_email || '',
        cursoId: r.curso,
        cursoTitulo: r.expand?.curso?.titulo || 'Curso',
        valor,
        situacao: r.situacao,
        kiwifyOrderId: r.kiwify_order_id,
        kiwifyOrderRef: r.kiwify_order_ref,
        checkoutLink: r.checkout_link,
        origemUtm: r.origem_utm,
        dataConfirmacao: r.data_confirmacao,
        created: r.created,
      }
    })

    return {
      pedidos,
      totalConfirmado,
      totalPedidos: records.length,
      totalPagos,
      totalPendentes,
      totalFalhos,
    }
  } catch (err) {
    console.error('Erro ao listar pedidos admin:', err)
    return {
      pedidos: [],
      totalConfirmado: 0,
      totalPedidos: 0,
      totalPagos: 0,
      totalPendentes: 0,
      totalFalhos: 0,
    }
  }
}

/**
 * Obter o token de webhook do Kiwify configurado (somente admin)
 */
export async function obterTokenKiwify(): Promise<string> {
  try {
    const rec = await pb
      .collection<ConfigRecord>('configuracoes')
      .getFirstListItem('chave = "kiwify_webhook_token"')
    return rec.valor || ''
  } catch {
    return ''
  }
}

/**
 * Atualizar o token de webhook do Kiwify configurado (somente admin)
 */
export async function salvarTokenKiwify(token: string): Promise<void> {
  try {
    const rec = await pb
      .collection<ConfigRecord>('configuracoes')
      .getFirstListItem('chave = "kiwify_webhook_token"')
    await pb.collection('configuracoes').update(rec.id, {
      valor: token.trim(),
    })
  } catch {
    await pb.collection('configuracoes').create({
      chave: 'kiwify_webhook_token',
      valor: token.trim(),
    })
  }
}
