import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export type CursoPainel = {
  id: string
  titulo: string
  subtitulo: string
  categoria: string
  preco: number
  situacao: 'rascunho' | 'publicado'
  imagemCapa: string | null
  quantidadeModulos: number
  quantidadeAulas: number
  quantidadeMatriculas: number
  created: string
}

export async function listarCursosPainel(): Promise<CursoPainel[]> {
  const [cursos, modulos, aulas, matriculas] = await Promise.all([
    pb.collection<CursoRecord>('cursos').getFullList({ sort: '-created' }),
    pb.collection<ModuloRecord>('modulos').getFullList({ fields: 'id,curso' }),
    pb
      .collection<AulaRecord>('aulas')
      .getFullList({ fields: 'id,modulo' })
      .catch(() => [] as AulaRecord[]),
    pb
      .collection<MatriculaRecord>('matriculas')
      .getFullList({ fields: 'id,curso' })
      .catch(() => [] as MatriculaRecord[]),
  ])

  const modulosPorCurso = new Map<string, string[]>()
  for (const modulo of modulos) {
    const ids = modulosPorCurso.get(modulo.curso) ?? []
    ids.push(modulo.id)
    modulosPorCurso.set(modulo.curso, ids)
  }

  const aulasPorModulo = new Map<string, number>()
  for (const aula of aulas) {
    aulasPorModulo.set(aula.modulo, (aulasPorModulo.get(aula.modulo) ?? 0) + 1)
  }

  const matriculasPorCurso = new Map<string, number>()
  for (const matricula of matriculas) {
    matriculasPorCurso.set(matricula.curso, (matriculasPorCurso.get(matricula.curso) ?? 0) + 1)
  }

  return cursos.map((curso) => {
    const idsModulos = modulosPorCurso.get(curso.id) ?? []
    return {
      id: curso.id,
      titulo: curso.titulo,
      subtitulo: curso.subtitulo ?? '',
      categoria: curso.categoria,
      preco: Number(curso.preco),
      situacao: curso.situacao,
      imagemCapa: curso.imagem_capa
        ? pb.files.getURL(curso, curso.imagem_capa, { thumb: '800x450' })
        : null,
      quantidadeModulos: idsModulos.length,
      quantidadeAulas: idsModulos.reduce((total, id) => total + (aulasPorModulo.get(id) ?? 0), 0),
      quantidadeMatriculas: matriculasPorCurso.get(curso.id) ?? 0,
      created: curso.created,
    }
  })
}

export type CursoCardItem = {
  id: string
  titulo: string
  subtitulo: string
  descricao: string
  categoria: string
  preco: number
  situacao: 'rascunho' | 'publicado'
  imagemCapa: string | null
  kiwifyCheckoutUrl?: string
  created: string
}

export type ModuloPublico = {
  id: string
  titulo: string
  ordem: number
  aulas: {
    id: string
    titulo: string
    ordem: number
    duracao_minutos: number
  }[]
}

export type CurriculoPublicoResponse = {
  cursoId: string
  modulos: ModuloPublico[]
}

export type MeuCursoItem = {
  matriculaId: string
  curso: CursoCardItem
  dataMatricula: string
  situacaoMatricula: 'ativa' | 'cancelada' | 'concluida'
  aulasConcluidas: number
  totalAulas: number
  percentualProgresso: number
}

export type ModuloAluno = {
  id: string
  titulo: string
  ordem: number
  aulas: AulaAlunoItem[]
}

export type MaterialItem = {
  tipo: 'arquivo' | 'link'
  nome: string
  url: string
  tamanho?: string
  formato?: string
}

export type AulaAlunoItem = {
  id: string
  titulo: string
  descricao: string
  ordem: number
  modulo: string
  video_url: string
  duracao_minutos: number
  situacao: 'rascunho' | 'publicado'
  materiais?: MaterialItem[]
  progresso?: {
    id: string
    situacao: 'iniciada' | 'concluida'
    minuto_parada: number
    data_conclusao?: string
  }
}

type CursoRecord = RecordModel & {
  titulo: string
  subtitulo?: string
  descricao: string
  categoria: string
  preco: number
  situacao: 'rascunho' | 'publicado'
  imagem_capa?: string
  kiwify_checkout_url?: string
  created: string
}

type MatriculaRecord = RecordModel & {
  aluno: string
  curso: string
  situacao: 'ativa' | 'cancelada' | 'concluida'
  data_matricula: string
  expand?: {
    curso?: CursoRecord
  }
}

type ModuloRecord = RecordModel & {
  titulo: string
  ordem: number
  curso: string
}

type AulaRecord = RecordModel & {
  titulo: string
  descricao?: string
  ordem: number
  modulo: string
  video_url: string
  duracao_minutos: number
  situacao: 'rascunho' | 'publicado'
  materiais?: MaterialItem[]
}

type ProgressoRecord = RecordModel & {
  matricula: string
  aula: string
  situacao: 'iniciada' | 'concluida'
  minuto_parada?: number
  data_conclusao?: string
}

function parseCursoCard(record: CursoRecord): CursoCardItem {
  return {
    id: record.id,
    titulo: record.titulo,
    subtitulo: record.subtitulo ?? '',
    descricao: record.descricao,
    categoria: record.categoria,
    preco: Number(record.preco),
    situacao: record.situacao,
    imagemCapa: record.imagem_capa
      ? pb.files.getURL(record, record.imagem_capa, { thumb: '800x450' })
      : null,
    kiwifyCheckoutUrl: record.kiwify_checkout_url || undefined,
    created: record.created,
  }
}

/**
 * Vitrine pública: lista apenas cursos com situacao='publicado'
 */
export async function listarCursosPublicos(): Promise<CursoCardItem[]> {
  const records = await pb.collection<CursoRecord>('cursos').getFullList({
    filter: "situacao = 'publicado'",
    sort: '-created',
  })
  return records.map(parseCursoCard)
}

/**
 * Obter dados de um curso público pelo ID
 */
export async function obterCursoPublico(cursoId: string): Promise<CursoCardItem | null> {
  try {
    const record = await pb.collection<CursoRecord>('cursos').getOne(cursoId)
    // Se não for publicado e o usuário não for admin, não retorna
    if (record.situacao !== 'publicado' && pb.authStore.record?.role !== 'admin') {
      return null
    }
    return parseCursoCard(record)
  } catch {
    return null
  }
}

/**
 * Obter currículo público (módulos e apenas títulos das aulas publicadas)
 */
export async function obterCurriculoPublico(cursoId: string): Promise<CurriculoPublicoResponse> {
  return await pb.send<CurriculoPublicoResponse>(`/backend/v1/public-curriculo/${cursoId}`, {
    method: 'GET',
  })
}

/**
 * Verifica se o usuário autenticado possui matrícula ATIVA no curso
 */
export async function verificarMatriculaAtiva(cursoId: string): Promise<{
  temMatricula: boolean
  matriculaId?: string
}> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return { temMatricula: false }

  try {
    const records = await pb.collection<MatriculaRecord>('matriculas').getFullList({
      filter: `aluno = "${alunoId}" && curso = "${cursoId}" && situacao = "ativa"`,
      limit: 1,
    })

    if (records.length > 0) {
      return { temMatricula: true, matriculaId: records[0].id }
    }
    return { temMatricula: false }
  } catch {
    return { temMatricula: false }
  }
}

/**
 * Meus Cursos (aluno logado): lista apenas cursos com matrícula ativa do próprio aluno
 * Calcula o progresso com base nas aulas concluídas / total de aulas publicadas
 */
export async function listarMeusCursos(): Promise<MeuCursoItem[]> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return []

  // PocketBase listRule em matriculas: @request.auth.role = 'admin' || aluno = @request.auth.id
  // Filtrar apenas situacao='ativa' e aluno=alunoId
  const matriculas = await pb.collection<MatriculaRecord>('matriculas').getFullList({
    filter: `aluno = "${alunoId}" && situacao = "ativa"`,
    sort: '-created',
    expand: 'curso',
  })

  if (matriculas.length === 0) return []

  const resultado: MeuCursoItem[] = []

  for (const m of matriculas) {
    const cursoRecord = m.expand?.curso
    if (!cursoRecord) continue

    // Buscar módulos do curso
    const modulos = await pb.collection<ModuloRecord>('modulos').getFullList({
      filter: `curso = "${cursoRecord.id}"`,
    })
    const moduloIds = modulos.map((mod) => mod.id)

    let totalAulasPublicadas = 0
    let aulasConcluidas = 0

    if (moduloIds.length > 0) {
      // Buscar aulas do aluno (PocketBase listRule já bloqueia não matriculado e aulas em rascunho)
      const modulosFilter = moduloIds.map((id) => `modulo = "${id}"`).join(' || ')
      const aulas = await pb.collection<AulaRecord>('aulas').getFullList({
        filter: `(${modulosFilter}) && situacao = "publicado"`,
      })
      totalAulasPublicadas = aulas.length

      // Buscar progresso desta matrícula
      const progressos = await pb.collection<ProgressoRecord>('progresso').getFullList({
        filter: `matricula = "${m.id}" && situacao = "concluida"`,
      })
      aulasConcluidas = progressos.length
    }

    const percentual =
      totalAulasPublicadas > 0 ? Math.round((aulasConcluidas / totalAulasPublicadas) * 100) : 0

    resultado.push({
      matriculaId: m.id,
      curso: parseCursoCard(cursoRecord),
      dataMatricula: m.data_matricula,
      situacaoMatricula: m.situacao,
      aulasConcluidas,
      totalAulas: totalAulasPublicadas,
      percentualProgresso: percentual,
    })
  }

  return resultado
}

/**
 * Obter a estrutura completa do curso para o aluno matriculado (módulos e aulas com progresso)
 */
export async function obterCursoAluno(cursoId: string): Promise<{
  curso: CursoCardItem
  matricula: MatriculaRecord
  modulos: ModuloAluno[]
} | null> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return null

  // Verificar matrícula ativa
  const matriculas = await pb.collection<MatriculaRecord>('matriculas').getFullList({
    filter: `aluno = "${alunoId}" && curso = "${cursoId}" && situacao = "ativa"`,
    limit: 1,
    expand: 'curso',
  })
  if (matriculas.length === 0) return null

  const matricula = matriculas[0]
  const cursoRecord =
    matricula.expand?.curso ?? (await pb.collection<CursoRecord>('cursos').getOne(cursoId))

  // Buscar módulos
  const modulosRecord = await pb.collection<ModuloRecord>('modulos').getFullList({
    filter: `curso = "${cursoId}"`,
    sort: 'ordem',
  })

  // Buscar aulas (listRule do PocketBase garante apenas aulas publicadas para quem tem matrícula ativa)
  const moduloIds = modulosRecord.map((m) => m.id)
  let aulasRecord: AulaRecord[] = []
  if (moduloIds.length > 0) {
    const modulosFilter = moduloIds.map((id) => `modulo = "${id}"`).join(' || ')
    aulasRecord = await pb.collection<AulaRecord>('aulas').getFullList({
      filter: `(${modulosFilter}) && situacao = "publicado"`,
      sort: 'ordem',
    })
  }

  // Buscar progressos do aluno
  const progressos = await pb.collection<ProgressoRecord>('progresso').getFullList({
    filter: `matricula = "${matricula.id}"`,
  })
  const progressoMap = new Map<string, ProgressoRecord>()
  for (const p of progressos) {
    progressoMap.set(p.aula, p)
  }

  const modulosEstruturados: ModuloAluno[] = modulosRecord.map((mod) => {
    const aulasDoModulo = aulasRecord
      .filter((a) => a.modulo === mod.id)
      .map((a) => {
        const prog = progressoMap.get(a.id)
        return {
          id: a.id,
          titulo: a.titulo,
          descricao: a.descricao ?? '',
          ordem: a.ordem,
          modulo: a.modulo,
          video_url: a.video_url,
          duracao_minutos: a.duracao_minutos,
          situacao: a.situacao,
          materiais: a.materiais ?? [],
          progresso: prog
            ? {
                id: prog.id,
                situacao: prog.situacao,
                minuto_parada: prog.minuto_parada ?? 0,
                data_conclusao: prog.data_conclusao,
              }
            : undefined,
        }
      })

    return {
      id: mod.id,
      titulo: mod.titulo,
      ordem: mod.ordem,
      aulas: aulasDoModulo,
    }
  })

  return {
    curso: parseCursoCard(cursoRecord),
    matricula,
    modulos: modulosEstruturados,
  }
}

/**
 * Obter uma aula específica garantindo validação de matrícula ativa e status publicado
 * Se o aluno não tiver matrícula ativa ou a aula for rascunho, a requisição no PocketBase lança erro de permissão (403/404)
 */
export type DadosAulaAssistir = {
  aula: AulaAlunoItem
  modulo: ModuloRecord
  curso: CursoCardItem
  matriculaId: string
  modulos: ModuloAluno[]
  aulaAnterior: AulaAlunoItem | null
  proximaAula: AulaAlunoItem | null
  totalAulas: number
  aulasConcluidas: number
  progresso: {
    id?: string
    situacao: 'iniciada' | 'concluida'
    minuto_parada: number
    data_conclusao?: string
  }
}

/**
 * Obter uma aula específica garantindo validação de matrícula ativa e status publicado
 * Retorna também a árvore completa de módulos/aulas do curso, progresso de cada uma,
 * referências à aula anterior e próxima e contagem para a barra de progresso.
 */
export async function obterAulaAluno(aulaId: string): Promise<DadosAulaAssistir | null> {
  try {
    const aulaRecord = await pb.collection<AulaRecord>('aulas').getOne(aulaId)

    if (aulaRecord.situacao !== 'publicado' && pb.authStore.record?.role !== 'admin') {
      return null
    }

    const moduloRecord = await pb.collection<ModuloRecord>('modulos').getOne(aulaRecord.modulo)
    const cursoRecord = await pb.collection<CursoRecord>('cursos').getOne(moduloRecord.curso)

    const alunoId = pb.authStore.record?.id
    if (!alunoId) return null

    // Verificar matrícula ativa
    const matriculas = await pb.collection<MatriculaRecord>('matriculas').getFullList({
      filter: `aluno = "${alunoId}" && curso = "${cursoRecord.id}" && situacao = "ativa"`,
      limit: 1,
    })

    if (matriculas.length === 0 && pb.authStore.record?.role !== 'admin') {
      return null
    }

    const matriculaId = matriculas[0]?.id || ''

    // Buscar todos os módulos do curso
    const todosModulos = await pb.collection<ModuloRecord>('modulos').getFullList({
      filter: `curso = "${cursoRecord.id}"`,
      sort: 'ordem',
    })

    // Buscar todas as aulas publicadas do curso
    const moduloIds = todosModulos.map((m) => m.id)
    let todasAulas: AulaRecord[] = []
    if (moduloIds.length > 0) {
      const modulosFilter = moduloIds.map((id) => `modulo = "${id}"`).join(' || ')
      todasAulas = await pb.collection<AulaRecord>('aulas').getFullList({
        filter: `(${modulosFilter}) && situacao = "publicado"`,
        sort: 'ordem',
      })
    }

    // Buscar progressos do aluno
    const progressos = matriculaId
      ? await pb.collection<ProgressoRecord>('progresso').getFullList({
          filter: `matricula = "${matriculaId}"`,
        })
      : []

    const progressoMap = new Map<string, ProgressoRecord>()
    for (const p of progressos) {
      progressoMap.set(p.aula, p)
    }

    // Montar módulos e aulas em lista ordenada plana para determinar anterior/próxima
    const modulosAluno: ModuloAluno[] = []
    const todasAulasPlanas: AulaAlunoItem[] = []
    let concluidasCount = 0

    for (const mod of todosModulos) {
      const aulasDoMod = todasAulas
        .filter((a) => a.modulo === mod.id)
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => {
          const p = progressoMap.get(a.id)
          const isConcluida = p?.situacao === 'concluida'
          if (isConcluida) concluidasCount++

          const aulaItem: AulaAlunoItem = {
            id: a.id,
            titulo: a.titulo,
            descricao: a.descricao ?? '',
            ordem: a.ordem,
            modulo: a.modulo,
            video_url: a.video_url,
            duracao_minutos: a.duracao_minutos,
            situacao: a.situacao,
            materiais: a.materiais ?? [],
            progresso: p
              ? {
                  id: p.id,
                  situacao: p.situacao,
                  minuto_parada: p.minuto_parada ?? 0,
                  data_conclusao: p.data_conclusao,
                }
              : undefined,
          }
          todasAulasPlanas.push(aulaItem)
          return aulaItem
        })

      modulosAluno.push({
        id: mod.id,
        titulo: mod.titulo,
        ordem: mod.ordem,
        aulas: aulasDoMod,
      })
    }

    // Identificar a aula atual, aula anterior e próxima aula
    const indiceAtual = todasAulasPlanas.findIndex((a) => a.id === aulaId)
    const aulaAnterior = indiceAtual > 0 ? todasAulasPlanas[indiceAtual - 1] : null
    const proximaAula =
      indiceAtual >= 0 && indiceAtual < todasAulasPlanas.length - 1
        ? todasAulasPlanas[indiceAtual + 1]
        : null

    const progressoAtual = progressoMap.get(aulaId)
    const aulaAtualItem: AulaAlunoItem = {
      id: aulaRecord.id,
      titulo: aulaRecord.titulo,
      descricao: aulaRecord.descricao ?? '',
      ordem: aulaRecord.ordem,
      modulo: aulaRecord.modulo,
      video_url: aulaRecord.video_url,
      duracao_minutos: aulaRecord.duracao_minutos,
      situacao: aulaRecord.situacao,
      materiais: aulaRecord.materiais ?? [],
      progresso: progressoAtual
        ? {
            id: progressoAtual.id,
            situacao: progressoAtual.situacao,
            minuto_parada: progressoAtual.minuto_parada ?? 0,
            data_conclusao: progressoAtual.data_conclusao,
          }
        : undefined,
    }

    return {
      aula: aulaAtualItem,
      modulo: moduloRecord,
      curso: parseCursoCard(cursoRecord),
      matriculaId,
      modulos: modulosAluno,
      aulaAnterior,
      proximaAula,
      totalAulas: todasAulasPlanas.length,
      aulasConcluidas: concluidasCount,
      progresso: {
        id: progressoAtual?.id,
        situacao: progressoAtual?.situacao ?? 'iniciada',
        minuto_parada: progressoAtual?.minuto_parada ?? 0,
        data_conclusao: progressoAtual?.data_conclusao,
      },
    }
  } catch (err) {
    console.error('Erro ao obter aula:', err)
    return null
  }
}

/**
 * Salvar o minuto de parada no vídeo da aula para a aluna retomar depois
 */
export async function salvarMinutoParada(
  matriculaId: string,
  aulaId: string,
  minuto: number,
): Promise<{ id: string; minuto_parada: number }> {
  if (!matriculaId || !aulaId) {
    throw new Error('Matrícula e Aula são obrigatórios')
  }

  const minutoArredondado = Math.max(0, Math.floor(minuto))

  // Buscar registro existente
  const existentes = await pb.collection<ProgressoRecord>('progresso').getFullList({
    filter: `matricula = "${matriculaId}" && aula = "${aulaId}"`,
    limit: 1,
  })

  if (existentes.length > 0) {
    const reg = existentes[0]
    // Apenas atualiza se o minuto mudou
    if (reg.minuto_parada !== minutoArredondado) {
      const atualizado = await pb.collection<ProgressoRecord>('progresso').update(reg.id, {
        minuto_parada: minutoArredondado,
      })
      return { id: atualizado.id, minuto_parada: atualizado.minuto_parada ?? minutoArredondado }
    }
    return { id: reg.id, minuto_parada: reg.minuto_parada ?? minutoArredondado }
  }

  // Criar novo progresso como 'iniciada'
  const novo = await pb.collection<ProgressoRecord>('progresso').create({
    matricula: matriculaId,
    aula: aulaId,
    situacao: 'iniciada',
    minuto_parada: minutoArredondado,
  })

  return { id: novo.id, minuto_parada: novo.minuto_parada ?? minutoArredondado }
}

/**
 * Concluir aula: atualiza ou cria o registro de progresso como 'concluida'
 */
export async function concluirAula(
  matriculaId: string,
  aulaId: string,
  minutoAtual?: number,
): Promise<{
  id: string
  situacao: 'concluida'
  gamificacao?: import('./gamificacao').ResultadoAtribuicaoGamificacao | null
}> {
  if (!matriculaId || !aulaId) {
    throw new Error('Matrícula e Aula são obrigatórios')
  }

  const agora = new Date().toISOString()
  const minuto = minutoAtual !== undefined ? Math.max(0, Math.floor(minutoAtual)) : undefined

  // Buscar registro existente
  const existentes = await pb.collection<ProgressoRecord>('progresso').getFullList({
    filter: `matricula = "${matriculaId}" && aula = "${aulaId}"`,
    limit: 1,
  })

  let progressoId = ''

  if (existentes.length > 0) {
    const reg = existentes[0]
    const dadosUpdate: Record<string, unknown> = {
      situacao: 'concluida',
      data_conclusao: agora,
    }
    if (minuto !== undefined) {
      dadosUpdate.minuto_parada = minuto
    }
    const atualizado = await pb.collection<ProgressoRecord>('progresso').update(reg.id, dadosUpdate)
    progressoId = atualizado.id
  } else {
    // Criar registro já concluído
    const novo = await pb.collection<ProgressoRecord>('progresso').create({
      matricula: matriculaId,
      aula: aulaId,
      situacao: 'concluida',
      minuto_parada: minuto ?? 0,
      data_conclusao: agora,
    })
    progressoId = novo.id
  }

  // Atribuição automática de pontos, nível e recompensas (executado de forma transparente e idempotente)
  let resultadoGamificacao: import('./gamificacao').ResultadoAtribuicaoGamificacao | null = null
  try {
    const { atribuirPontosAulaConcluida } = await import('./gamificacao')
    resultadoGamificacao = await atribuirPontosAulaConcluida(aulaId, matriculaId)
  } catch (err) {
    console.error('Erro ao chamar gamificação pós-conclusão:', err)
  }

  return { id: progressoId, situacao: 'concluida', gamificacao: resultadoGamificacao }
}

/**
 * Desmarcar conclusão de aula (caso a aluna queira rever ou desmarcar)
 */
export async function desmarcarConclusaoAula(
  matriculaId: string,
  aulaId: string,
): Promise<{ id: string; situacao: 'iniciada' }> {
  const existentes = await pb.collection<ProgressoRecord>('progresso').getFullList({
    filter: `matricula = "${matriculaId}" && aula = "${aulaId}"`,
    limit: 1,
  })

  if (existentes.length > 0) {
    const reg = existentes[0]
    const atualizado = await pb.collection<ProgressoRecord>('progresso').update(reg.id, {
      situacao: 'iniciada',
      data_conclusao: '',
    })
    return { id: atualizado.id, situacao: 'iniciada' }
  }

  const novo = await pb.collection<ProgressoRecord>('progresso').create({
    matricula: matriculaId,
    aula: aulaId,
    situacao: 'iniciada',
    minuto_parada: 0,
    data_conclusao: '',
  })

  return { id: novo.id, situacao: 'iniciada' }
}

/* =========================================================================
   OPERAÇÕES ADMINISTRATIVAS (GESTÃO DE CURSOS, MÓDULOS, AULAS E MATRÍCULAS)
   ========================================================================= */

export type ModuloAdminItem = {
  id: string
  titulo: string
  ordem: number
  curso: string
  created: string
  aulas: AulaAdminItem[]
}

export type SituacaoBusca = 'nao_preparada' | 'preparada' | 'erro'

export type AulaAdminItem = {
  id: string
  titulo: string
  descricao: string
  ordem: number
  modulo: string
  video_url: string
  duracao_minutos: number
  situacao: 'rascunho' | 'publicado'
  materiais: MaterialItem[]
  arquivos_materiais?: string[]
  transcricao?: string
  situacao_busca?: SituacaoBusca
  quantidade_trechos?: number
  erro_preparo?: string
  data_preparo_busca?: string
  created: string
}

export type CursoAdminDetalhado = {
  id: string
  titulo: string
  subtitulo: string
  descricao: string
  categoria: string
  preco: number
  situacao: 'rascunho' | 'publicado'
  imagemCapa: string | null
  kiwifyCheckoutUrl?: string
  created: string
  modulos: ModuloAdminItem[]
}

export type MatriculaComProgressoAdmin = {
  id: string
  alunoId: string
  nomeAluno: string
  emailAluno: string
  avatarAluno: string | null
  dataMatricula: string
  situacao: 'ativa' | 'cancelada' | 'concluida'
  aulasConcluidas: number
  totalAulas: number
  percentualProgresso: number
}

/**
 * Obter estrutura completa do curso para o editor admin
 */
export async function obterCursoAdmin(cursoId: string): Promise<CursoAdminDetalhado | null> {
  try {
    const cursoRecord = await pb.collection<CursoRecord>('cursos').getOne(cursoId)

    const [modulosRecord, aulasRecord] = await Promise.all([
      pb.collection<ModuloRecord>('modulos').getFullList({
        filter: `curso = "${cursoId}"`,
        sort: 'ordem',
      }),
      pb.collection<AulaRecord & { arquivos_materiais?: string[] }>('aulas').getFullList({
        sort: 'ordem',
      }),
    ])

    const modulosIds = new Set(modulosRecord.map((m) => m.id))
    const aulasDoCurso = aulasRecord.filter((a) => modulosIds.has(a.modulo))

    const modulos: ModuloAdminItem[] = modulosRecord.map((mod) => {
      const aulasDoMod = aulasDoCurso
        .filter((a) => a.modulo === mod.id)
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => ({
          id: a.id,
          titulo: a.titulo,
          descricao: a.descricao ?? '',
          ordem: a.ordem,
          modulo: a.modulo,
          video_url: a.video_url,
          duracao_minutos: a.duracao_minutos,
          situacao: a.situacao,
          materiais: a.materiais ?? [],
          arquivos_materiais: a.arquivos_materiais ?? [],
          transcricao: a.transcricao ?? '',
          situacao_busca: a.situacao_busca ?? 'nao_preparada',
          quantidade_trechos: a.quantidade_trechos ?? 0,
          erro_preparo: a.erro_preparo ?? '',
          data_preparo_busca: a.data_preparo_busca ?? '',
          created: a.created,
        }))

      return {
        id: mod.id,
        titulo: mod.titulo,
        ordem: mod.ordem,
        curso: mod.curso,
        created: mod.created,
        aulas: aulasDoMod,
      }
    })

    return {
      id: cursoRecord.id,
      titulo: cursoRecord.titulo,
      subtitulo: cursoRecord.subtitulo ?? '',
      descricao: cursoRecord.descricao,
      categoria: cursoRecord.categoria,
      preco: Number(cursoRecord.preco),
      situacao: cursoRecord.situacao,
      imagemCapa: cursoRecord.imagem_capa
        ? pb.files.getURL(cursoRecord, cursoRecord.imagem_capa, { thumb: '800x450' })
        : null,
      kiwifyCheckoutUrl: cursoRecord.kiwify_checkout_url || '',
      created: cursoRecord.created,
      modulos,
    }
  } catch (err) {
    console.error('Erro ao obter curso admin:', err)
    return null
  }
}

/**
 * Criar novo curso (inicia como rascunho)
 */
export async function criarCursoAdmin(dados: {
  titulo: string
  subtitulo?: string
  descricao: string
  categoria: string
  preco: number
  kiwifyCheckoutUrl?: string
  imagemCapaArquivo?: File | null
}): Promise<string> {
  const formData = new FormData()
  formData.append('titulo', dados.titulo)
  formData.append('subtitulo', dados.subtitulo || '')
  formData.append('descricao', dados.descricao)
  formData.append('categoria', dados.categoria)
  formData.append('preco', dados.preco.toString())
  formData.append('situacao', 'rascunho')
  if (dados.kiwifyCheckoutUrl !== undefined) {
    formData.append('kiwify_checkout_url', dados.kiwifyCheckoutUrl.trim())
  }

  if (dados.imagemCapaArquivo) {
    formData.append('imagem_capa', dados.imagemCapaArquivo)
  }

  const criado = await pb.collection('cursos').create(formData)
  return criado.id
}

/**
 * Atualizar dados do curso
 */
export async function atualizarCursoAdmin(
  cursoId: string,
  dados: {
    titulo: string
    subtitulo?: string
    descricao: string
    categoria: string
    preco: number
    kiwifyCheckoutUrl?: string
    imagemCapaArquivo?: File | null
    removerImagemCapa?: boolean
  },
): Promise<void> {
  const formData = new FormData()
  formData.append('titulo', dados.titulo)
  formData.append('subtitulo', dados.subtitulo || '')
  formData.append('descricao', dados.descricao)
  formData.append('categoria', dados.categoria)
  formData.append('preco', dados.preco.toString())
  if (dados.kiwifyCheckoutUrl !== undefined) {
    formData.append('kiwify_checkout_url', dados.kiwifyCheckoutUrl.trim())
  }

  if (dados.removerImagemCapa) {
    formData.append('imagem_capa', '')
  } else if (dados.imagemCapaArquivo) {
    formData.append('imagem_capa', dados.imagemCapaArquivo)
  }

  await pb.collection('cursos').update(cursoId, formData)
}

/**
 * Validação de publicação do curso:
 * Exige ao menos 1 módulo com ao menos 1 aula publicada!
 */
export async function validarPublicacaoCurso(cursoId: string): Promise<{
  podePublicar: boolean
  motivo?: string
  totalModulos: number
  totalAulasPublicadas: number
}> {
  const modulos = await pb.collection<ModuloRecord>('modulos').getFullList({
    filter: `curso = "${cursoId}"`,
  })

  if (modulos.length === 0) {
    return {
      podePublicar: false,
      motivo:
        'O curso precisa ter pelo menos 1 módulo com ao menos 1 aula publicada para ir ao ar.',
      totalModulos: 0,
      totalAulasPublicadas: 0,
    }
  }

  const modulosFilter = modulos.map((m) => `modulo = "${m.id}"`).join(' || ')
  const aulas = await pb.collection<AulaRecord>('aulas').getFullList({
    filter: `(${modulosFilter}) && situacao = "publicado"`,
  })

  if (aulas.length === 0) {
    return {
      podePublicar: false,
      motivo:
        'O curso precisa ter pelo menos 1 aula publicada. Publique ao menos uma aula antes de publicar o curso.',
      totalModulos: modulos.length,
      totalAulasPublicadas: 0,
    }
  }

  return {
    podePublicar: true,
    totalModulos: modulos.length,
    totalAulasPublicadas: aulas.length,
  }
}

/**
 * Alterar situação do curso (publicar ou despublicar)
 */
export async function alterarSituacaoCurso(
  cursoId: string,
  novaSituacao: 'rascunho' | 'publicado',
): Promise<{ sucesso: boolean; mensagem?: string }> {
  if (novaSituacao === 'publicado') {
    const validacao = await validarPublicacaoCurso(cursoId)
    if (!validacao.podePublicar) {
      return {
        sucesso: false,
        mensagem: validacao.motivo,
      }
    }
  }

  await pb.collection('cursos').update(cursoId, {
    situacao: novaSituacao,
  })

  return { sucesso: true }
}

/**
 * Excluir curso
 */
export async function excluirCursoAdmin(cursoId: string): Promise<void> {
  await pb.collection('cursos').delete(cursoId)
}

/* --- Gestão de Módulos --- */

export async function criarModuloAdmin(cursoId: string, titulo: string): Promise<ModuloRecord> {
  // Obter última ordem
  const modulosExistentes = await pb.collection<ModuloRecord>('modulos').getFullList({
    filter: `curso = "${cursoId}"`,
    sort: '-ordem',
    limit: 1,
  })

  const proximaOrdem = modulosExistentes.length > 0 ? modulosExistentes[0].ordem + 1 : 1

  return await pb.collection<ModuloRecord>('modulos').create({
    curso: cursoId,
    titulo: titulo.trim(),
    ordem: proximaOrdem,
  })
}

export async function renomearModuloAdmin(moduloId: string, novoTitulo: string): Promise<void> {
  await pb.collection('modulos').update(moduloId, {
    titulo: novoTitulo.trim(),
  })
}

export async function reordenarModulosAdmin(
  cursoId: string,
  moduloId: string,
  direcao: 'subir' | 'descer',
): Promise<void> {
  const modulos = await pb.collection<ModuloRecord>('modulos').getFullList({
    filter: `curso = "${cursoId}"`,
    sort: 'ordem',
  })

  const index = modulos.findIndex((m) => m.id === moduloId)
  if (index === -1) return

  const alvoIndex = direcao === 'subir' ? index - 1 : index + 1
  if (alvoIndex < 0 || alvoIndex >= modulos.length) return

  const atual = modulos[index]
  const vizinho = modulos[alvoIndex]

  // Inverter ordens
  const ordemAtual = atual.ordem
  const ordemVizinho = vizinho.ordem

  // Se por acaso forem iguais, use índice + 1
  const novaOrdemAtual = ordemAtual === ordemVizinho ? alvoIndex + 1 : ordemVizinho
  const novaOrdemVizinho = ordemAtual === ordemVizinho ? index + 1 : ordemAtual

  await Promise.all([
    pb.collection('modulos').update(atual.id, { ordem: novaOrdemAtual }),
    pb.collection('modulos').update(vizinho.id, { ordem: novaOrdemVizinho }),
  ])
}

export async function excluirModuloAdmin(moduloId: string): Promise<void> {
  await pb.collection('modulos').delete(moduloId)
}

/* --- Gestão de Aulas --- */

export async function criarAulaAdmin(dados: {
  moduloId: string
  titulo: string
  descricao?: string
  videoUrl: string
  duracaoMinutos: number
  situacao: 'rascunho' | 'publicado'
  transcricao?: string
  materiais?: MaterialItem[]
  arquivosUpload?: File[]
}): Promise<string> {
  const aulasExistentes = await pb.collection<AulaRecord>('aulas').getFullList({
    filter: `modulo = "${dados.moduloId}"`,
    sort: '-ordem',
    limit: 1,
  })

  const proximaOrdem = aulasExistentes.length > 0 ? aulasExistentes[0].ordem + 1 : 1

  const formData = new FormData()
  formData.append('modulo', dados.moduloId)
  formData.append('titulo', dados.titulo.trim())
  formData.append('descricao', dados.descricao || '')
  formData.append('video_url', dados.videoUrl.trim())
  formData.append('duracao_minutos', Math.max(1, Math.round(dados.duracaoMinutos)).toString())
  formData.append('ordem', proximaOrdem.toString())
  formData.append('situacao', dados.situacao)
  if (dados.transcricao !== undefined) {
    formData.append('transcricao', dados.transcricao.trim())
    // Inicializa situacao_busca como 'nao_preparada' por padrão
    formData.append('situacao_busca', 'nao_preparada')
    formData.append('quantidade_trechos', '0')
  }

  if (dados.arquivosUpload && dados.arquivosUpload.length > 0) {
    for (const file of dados.arquivosUpload) {
      formData.append('arquivos_materiais', file)
    }
  }

  // Se há materiais (links externos ou arquivos já existentes)
  const materiaisIniciais = dados.materiais || []
  formData.append('materiais', JSON.stringify(materiaisIniciais))

  const novaAula = await pb.collection('aulas').create(formData)

  // Se arquivos foram enviados, adicionar seus URLs gerados pelo PocketBase aos materiais JSON
  if (dados.arquivosUpload && dados.arquivosUpload.length > 0) {
    const aulaRecarregada = await pb
      .collection<AulaRecord & { arquivos_materiais?: string[] }>('aulas')
      .getOne(novaAula.id)
    const novosArquivos = aulaRecarregada.arquivos_materiais || []
    const materiaisAtualizados = [...materiaisIniciais]

    for (const nomeArquivo of novosArquivos) {
      const url = pb.files.getURL(aulaRecarregada, nomeArquivo)
      const ext = nomeArquivo.split('.').pop()?.toLowerCase() || 'arquivo'
      // Verifica se já não foi adicionado
      if (!materiaisAtualizados.some((m) => m.url === url)) {
        materiaisAtualizados.push({
          tipo: 'arquivo',
          nome: nomeArquivo.replace(/^[a-zA-Z0-9_]+_/, ''), // remove hash inicial do PB se houver
          url,
          formato: ext,
        })
      }
    }

    await pb.collection('aulas').update(novaAula.id, {
      materiais: materiaisAtualizados,
    })
  }

  return novaAula.id
}

export async function atualizarAulaAdmin(
  aulaId: string,
  dados: {
    titulo: string
    descricao?: string
    videoUrl: string
    duracaoMinutos: number
    situacao: 'rascunho' | 'publicado'
    transcricao?: string
    materiais: MaterialItem[]
    arquivosUpload?: File[]
  },
): Promise<void> {
  const formData = new FormData()
  formData.append('titulo', dados.titulo.trim())
  formData.append('descricao', dados.descricao || '')
  formData.append('video_url', dados.videoUrl.trim())
  formData.append('duracao_minutos', Math.max(1, Math.round(dados.duracaoMinutos)).toString())
  formData.append('situacao', dados.situacao)
  if (dados.transcricao !== undefined) {
    formData.append('transcricao', dados.transcricao.trim())
  }

  if (dados.arquivosUpload && dados.arquivosUpload.length > 0) {
    for (const file of dados.arquivosUpload) {
      formData.append('arquivos_materiais', file)
    }
  }

  const materiaisParaSalvar = [...dados.materiais]
  formData.append('materiais', JSON.stringify(materiaisParaSalvar))

  const aulaAtualizada = await pb
    .collection<AulaRecord & { arquivos_materiais?: string[] }>('aulas')
    .update(aulaId, formData)

  // Se arquivos novos foram enviados, atualizar a lista de materiais com seus links
  if (dados.arquivosUpload && dados.arquivosUpload.length > 0) {
    const novosArquivos = aulaAtualizada.arquivos_materiais || []
    let alterou = false
    for (const nomeArquivo of novosArquivos) {
      const url = pb.files.getURL(aulaAtualizada, nomeArquivo)
      const ext = nomeArquivo.split('.').pop()?.toLowerCase() || 'arquivo'
      if (!materiaisParaSalvar.some((m) => m.url === url)) {
        materiaisParaSalvar.push({
          tipo: 'arquivo',
          nome: nomeArquivo.replace(/^[a-zA-Z0-9_]+_/, ''),
          url,
          formato: ext,
        })
        alterou = true
      }
    }
    if (alterou) {
      await pb.collection('aulas').update(aulaId, {
        materiais: materiaisParaSalvar,
      })
    }
  }
}

export async function reordenarAulasAdmin(
  moduloId: string,
  aulaId: string,
  direcao: 'subir' | 'descer',
): Promise<void> {
  const aulas = await pb.collection<AulaRecord>('aulas').getFullList({
    filter: `modulo = "${moduloId}"`,
    sort: 'ordem',
  })

  const index = aulas.findIndex((a) => a.id === aulaId)
  if (index === -1) return

  const alvoIndex = direcao === 'subir' ? index - 1 : index + 1
  if (alvoIndex < 0 || alvoIndex >= aulas.length) return

  const atual = aulas[index]
  const vizinho = aulas[alvoIndex]

  const ordemAtual = atual.ordem
  const ordemVizinho = vizinho.ordem

  const novaOrdemAtual = ordemAtual === ordemVizinho ? alvoIndex + 1 : ordemVizinho
  const novaOrdemVizinho = ordemAtual === ordemVizinho ? index + 1 : ordemAtual

  await Promise.all([
    pb.collection('aulas').update(atual.id, { ordem: novaOrdemAtual }),
    pb.collection('aulas').update(vizinho.id, { ordem: novaOrdemVizinho }),
  ])
}

export async function excluirAulaAdmin(aulaId: string): Promise<void> {
  await pb.collection('aulas').delete(aulaId)
}

/* --- Matrículas por Curso (Admin) --- */

export async function listarMatriculasCursoAdmin(cursoId: string): Promise<{
  curso: CursoCardItem
  matriculas: MatriculaComProgressoAdmin[]
  totalAulasPublicadas: number
}> {
  const cursoRecord = await pb.collection<CursoRecord>('cursos').getOne(cursoId)

  // Buscar módulos e aulas publicadas do curso para calcular % de conclusão
  const modulos = await pb.collection<ModuloRecord>('modulos').getFullList({
    filter: `curso = "${cursoId}"`,
  })
  const moduloIds = modulos.map((m) => m.id)

  let aulasPublicadas: AulaRecord[] = []
  if (moduloIds.length > 0) {
    const modulosFilter = moduloIds.map((id) => `modulo = "${id}"`).join(' || ')
    aulasPublicadas = await pb.collection<AulaRecord>('aulas').getFullList({
      filter: `(${modulosFilter}) && situacao = "publicado"`,
    })
  }

  const totalAulas = aulasPublicadas.length

  // Buscar matrículas com expand de aluno
  const matriculasRecord = await pb
    .collection<
      MatriculaRecord & {
        expand?: {
          aluno?: RecordModel & { name?: string; email?: string; avatar?: string }
        }
      }
    >('matriculas')
    .getFullList({
      filter: `curso = "${cursoId}"`,
      sort: '-data_matricula',
      expand: 'aluno',
    })

  const matriculasResultado: MatriculaComProgressoAdmin[] = []

  for (const m of matriculasRecord) {
    const alunoRecord = m.expand?.aluno
    const progressos = await pb.collection<ProgressoRecord>('progresso').getFullList({
      filter: `matricula = "${m.id}" && situacao = "concluida"`,
    })

    const aulasConcluidas = progressos.length
    const percentual = totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0

    matriculasResultado.push({
      id: m.id,
      alunoId: m.aluno,
      nomeAluno: alunoRecord?.name || 'Aluno Sem Nome',
      emailAluno: alunoRecord?.email || '',
      avatarAluno:
        alunoRecord && alunoRecord.avatar
          ? pb.files.getURL(alunoRecord, alunoRecord.avatar, { thumb: '100x100' })
          : null,
      dataMatricula: m.data_matricula,
      situacao: m.situacao,
      aulasConcluidas,
      totalAulas,
      percentualProgresso: percentual,
    })
  }

  return {
    curso: parseCursoCard(cursoRecord),
    matriculas: matriculasResultado,
    totalAulasPublicadas: totalAulas,
  }
}

/* --- Preparo de Busca Semântica por Trechos --- */

export type MetricasBuscaGeral = {
  totalAulasPublicadas: number
  aulasPublicadasSemTranscricao: number
  aulasPublicadasSemPreparo: number
  aulasPublicadasPreparadas: number
  aulasPublicadasComErro: number
  totalTrechosIndexados: number
}

export type ResultadoPreparoBusca = {
  sucesso: boolean
  situacao_busca: 'nao_preparada' | 'preparada' | 'erro'
  quantidade_trechos: number
  data_preparo_busca?: string
  mensagem: string
  erro?: string
}

/**
 * Prepara a busca para uma aula:
 * Chama a rota do backend que fatia a transcrição, remove trechos antigos (não duplica),
 * insere os novos trechos vinculados à aula e ao curso e atualiza a situação da aula.
 */
export async function prepararBuscaAulaAdmin(
  aulaId: string,
  transcricaoOpcional?: string,
): Promise<ResultadoPreparoBusca> {
  const payload = transcricaoOpcional !== undefined ? { transcricao: transcricaoOpcional } : {}
  return await pb.send<ResultadoPreparoBusca>(`/backend/v1/admin/aulas/${aulaId}/preparar-busca`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Obtém os indicadores gerais de transcrição e busca de aulas publicadas para o painel admin
 */
export async function obterMetricasBuscaGeral(): Promise<MetricasBuscaGeral> {
  return await pb.send<MetricasBuscaGeral>('/backend/v1/admin/metricas-busca', {
    method: 'GET',
  })
}

/* --- Busca Inteligente com IA nos Cursos Matriculados --- */

export type FonteBuscaItem = {
  cursoId: string
  cursoTitulo: string
  aulaId: string
  aulaTitulo: string
  posicao: number
  trechoExato: string
  link: string
}

export type AulaCitadaItem = {
  aulaId: string
  aulaTitulo: string
  cursoId: string
  cursoTitulo: string
  link: string
}

export type RespostaBuscaConteudo = {
  sucesso: boolean
  semMatricula?: boolean
  resposta: string
  fontes: FonteBuscaItem[]
  aulas_citadas: AulaCitadaItem[]
  totalTrechosAnalisados: number
  message?: string
}

export type ItemHistoricoBusca = {
  id: string
  pergunta: string
  resposta: string
  fontes: FonteBuscaItem[]
  aulas_citadas: AulaCitadaItem[]
  total_trechos_analisados: number
  created: string
}

/**
 * Realiza busca inteligente por significado com IA nos cursos em que o aluno tem matrícula ativa
 */
export async function buscarConteudoNosCursos(pergunta: string): Promise<RespostaBuscaConteudo> {
  return await pb.send<RespostaBuscaConteudo>('/backend/v1/aluno/buscar-conteudo', {
    method: 'POST',
    body: JSON.stringify({ pergunta }),
  })
}

/**
 * Lista o histórico pessoal de perguntas e respostas do aluno
 */
export async function listarHistoricoBuscasAluno(): Promise<ItemHistoricoBusca[]> {
  const alunoId = pb.authStore.record?.id
  if (!alunoId) return []

  try {
    const records = await pb.collection('historico_buscas').getFullList({
      filter: `aluno = "${alunoId}"`,
      sort: '-created',
      limit: 50,
    })

    return records.map((r) => ({
      id: r.id,
      pergunta: String(r.pergunta || ''),
      resposta: String(r.resposta || ''),
      fontes: (r.fontes as FonteBuscaItem[]) || [],
      aulas_citadas: (r.aulas_citadas as AulaCitadaItem[]) || [],
      total_trechos_analisados: Number(r.total_trechos_analisados || 0),
      created: r.created,
    }))
  } catch (err) {
    console.error('Erro ao listar historico_buscas:', err)
    return []
  }
}
