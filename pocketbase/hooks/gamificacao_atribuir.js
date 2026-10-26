// Hook de Gamificação: Atribuição automática de pontos, níveis e recompensas
// Executado sempre que um aluno conclui uma aula ou consulta seu perfil de gamificação.
// Regras e Anti-duplicação implementadas:
// 1. Cada aula só dá +10 pontos 1 VEZ por aluno (registrado em aulas_pontuadas). Concluir de novo nunca duplica.
// 2. Concluir 100% de um curso dá +50 pontos 1 VEZ por curso (registrado em cursos_pontuados e matrícula concluída).
// 3. Sequência de dias de estudo:
//    - Se já estudou hoje (mesmo dia YYYY-MM-DD), mantém a sequência.
//    - Se estudou no dia anterior (ontem), sequencia_dias incrementa em 1.
//    - Se passou mais de um dia sem estudar (ou primeira vez), sequencia_dias vai para 1.
// 4. Níveis (constante de limiares):
//    - Nível 1: 0 pontos
//    - Nível 2: 100 pontos
//    - Nível 3: 250 pontos
//    - Nível 4: 500 pontos
//    - Nível 5: 1000 pontos
// 5. Recompensas:
//    - 'primeira_aula': Conquistada na 1ª aula concluída pelo aluno
//    - 'primeiro_curso': Conquistada no 1º curso 100% concluído
//    - 'dedicado': Conquistada com sequência de 7 dias seguidos de estudo
//    - 'maratonista': Conquistada com sequência de 30 dias seguidos de estudo
//    Cada conquista é única (CREATE UNIQUE INDEX idx_recompensas_aluno_rec).
// 6. RLS: Cada aluno só visualiza e recebe dados da própria pontuação.

// Rota 1: POST /backend/v1/aluno/gamificacao/atribuir-aula
routerAdd(
  'POST',
  '/backend/v1/aluno/gamificacao/atribuir-aula',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { message: 'Não autenticado.' })
    }

    const alunoId = authRecord.id
    const body = e.requestInfo().body || {}
    const aulaId = body.aulaId
    const matriculaId = body.matriculaId

    if (!aulaId || !matriculaId) {
      return e.json(400, { message: 'aulaId e matriculaId são obrigatórios.' })
    }

    try {
      // 1. Validar que a matrícula pertence ao aluno autenticado
      const matricula = $app.findRecordById('matriculas', matriculaId)
      if (matricula.getString('aluno') !== alunoId && authRecord.getString('role') !== 'admin') {
        return e.json(403, { message: 'Acesso negado: matrícula pertence a outro aluno.' })
      }

      // Validar que a aula existe e pertence ao curso da matrícula
      const aula = $app.findRecordById('aulas', aulaId)
      const modulo = $app.findRecordById('modulos', aula.getString('modulo'))
      const cursoId = modulo.getString('curso')
      if (matricula.getString('curso') !== cursoId) {
        return e.json(400, { message: 'Aula não pertence ao curso da matrícula.' })
      }

      // 2. Garantir ou recuperar o registro de pontuação do aluno
      const pontuacaoCol = $app.findCollectionByNameOrId('pontuacao')
      let pontuacaoRecord = null

      try {
        pontuacaoRecord = $app.findFirstRecordByData('pontuacao', 'aluno', alunoId)
      } catch (_) {
        // Criar registro inicial
        const novo = new Record(pontuacaoCol)
        novo.set('aluno', alunoId)
        novo.set('pontos_total', 0)
        novo.set('nivel_atual', 1)
        novo.set('sequencia_dias', 0)
        novo.set('ultimo_dia_estudo', '')
        novo.set('aulas_pontuadas', [])
        novo.set('cursos_pontuados', [])
        $app.save(novo)
        pontuacaoRecord = novo
      }

      // Recuperar dados atuais
      let pontosTotal = Number(pontuacaoRecord.get('pontos_total') || 0)
      const nivelAnterior = Number(pontuacaoRecord.get('nivel_atual') || 1)
      let sequenciaDias = Number(pontuacaoRecord.get('sequencia_dias') || 0)
      const ultimoDiaEstudo = String(pontuacaoRecord.getString('ultimo_dia_estudo') || '')

      let aulasPontuadas = []
      try {
        const rawAulas = pontuacaoRecord.get('aulas_pontuadas')
        if (Array.isArray(rawAulas)) {
          aulasPontuadas = rawAulas
        } else if (typeof rawAulas === 'string' && rawAulas.trim() !== '') {
          aulasPontuadas = JSON.parse(rawAulas)
        }
      } catch (_) {
        aulasPontuadas = []
      }

      let cursosPontuados = []
      try {
        const rawCursos = pontuacaoRecord.get('cursos_pontuados')
        if (Array.isArray(rawCursos)) {
          cursosPontuados = rawCursos
        } else if (typeof rawCursos === 'string' && rawCursos.trim() !== '') {
          cursosPontuados = JSON.parse(rawCursos)
        }
      } catch (_) {
        cursosPontuados = []
      }

      // Cálculo de data de hoje e ontem (em YYYY-MM-DD com base em UTC)
      const agora = new Date()
      const hojeStr = agora.toISOString().substring(0, 10)
      const dataOntem = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
      const ontemStr = dataOntem.toISOString().substring(0, 10)

      let ganhouPontosAula = false
      let ganhouPontosCurso = false
      let pontosGanhos = 0
      const novasRecompensas = []

      // ANTI-DUPLICAÇÃO: Verifica se a aula já foi pontuada para este aluno
      const aulaJaPontuada = aulasPontuadas.indexOf(aulaId) !== -1

      if (!aulaJaPontuada) {
        // Atribuir +10 pontos da aula
        pontosGanhos += 10
        pontosTotal += 10
        ganhouPontosAula = true
        aulasPontuadas.push(aulaId)
      }

      // Sequência de dias: atualizar se hoje for um novo dia de estudo
      if (ultimoDiaEstudo === hojeStr) {
        // Já estudou hoje, sequência permanece a mesma
      } else if (ultimoDiaEstudo === ontemStr) {
        // Estudou ontem: incrementa a sequência em 1
        sequenciaDias += 1
        pontuacaoRecord.set('ultimo_dia_estudo', hojeStr)
      } else {
        // Passou mais de um dia sem estudar ou é a primeira vez: sequência vai para 1
        sequenciaDias = 1
        pontuacaoRecord.set('ultimo_dia_estudo', hojeStr)
      }

      // Verificar conclusão de 100% do curso
      // Buscar todos os módulos e todas as aulas publicadas do curso
      const modulosDoCurso = $app.findRecordsByFilter(
        'modulos',
        'curso = {:cursoId}',
        'ordem',
        0,
        0,
        { cursoId: cursoId },
      )
      const modIds = []
      for (let i = 0; i < modulosDoCurso.length; i++) {
        modIds.push(modulosDoCurso[i].id)
      }

      let totalAulasPublicadas = 0
      const aulaIdsDoCurso = []
      for (let m = 0; m < modIds.length; m++) {
        const aulasMod = $app.findRecordsByFilter(
          'aulas',
          'modulo = {:modId} && situacao = "publicado"',
          'ordem',
          0,
          0,
          { modId: modIds[m] },
        )
        for (let a = 0; a < aulasMod.length; a++) {
          totalAulasPublicadas++
          aulaIdsDoCurso.push(aulasMod[a].id)
        }
      }

      // Buscar progressos concluídos do aluno nesta matrícula
      const progressosConcluidos = $app.findRecordsByFilter(
        'progresso',
        'matricula = {:matId} && situacao = "concluida"',
        '',
        0,
        0,
        { matId: matriculaId },
      )

      // Identificar IDs únicos de aulas concluídas
      const aulasConcluidasSet = {}
      for (let p = 0; p < progressosConcluidos.length; p++) {
        aulasConcluidasSet[progressosConcluidos[p].getString('aula')] = true
      }
      // Considerar a aula atual como concluída caso o progresso ainda esteja sendo gravado
      aulasConcluidasSet[aulaId] = true

      let todasConcluidas = totalAulasPublicadas > 0
      for (let c = 0; c < aulaIdsDoCurso.length; c++) {
        if (!aulasConcluidasSet[aulaIdsDoCurso[c]]) {
          todasConcluidas = false
          break
        }
      }

      const cursoJaPontuado = cursosPontuados.indexOf(cursoId) !== -1

      if (todasConcluidas && !cursoJaPontuado) {
        // Concluiu 100% do curso pela primeira vez! +50 pontos
        pontosGanhos += 50
        pontosTotal += 50
        ganhouPontosCurso = true
        cursosPontuados.push(cursoId)

        // Marcar matrícula como concluída se ainda não estiver
        if (matricula.getString('situacao') !== 'concluida') {
          matricula.set('situacao', 'concluida')
          $app.save(matricula)
        }
      }

      // Calcular novo nível com base nos limiares:
      // Nível 1: 0, Nível 2: 100, Nível 3: 250, Nível 4: 500, Nível 5: 1000
      let novoNivel = 1
      if (pontosTotal >= 1000) {
        novoNivel = 5
      } else if (pontosTotal >= 500) {
        novoNivel = 4
      } else if (pontosTotal >= 250) {
        novoNivel = 3
      } else if (pontosTotal >= 100) {
        novoNivel = 2
      } else {
        novoNivel = 1
      }

      const subiuDeNivel = novoNivel > nivelAnterior

      // Atualizar o registro de pontuação
      pontuacaoRecord.set('pontos_total', pontosTotal)
      pontuacaoRecord.set('nivel_atual', novoNivel)
      pontuacaoRecord.set('sequencia_dias', sequenciaDias)
      pontuacaoRecord.set('aulas_pontuadas', aulasPontuadas)
      pontuacaoRecord.set('cursos_pontuados', cursosPontuados)
      $app.save(pontuacaoRecord)

      // 4. Avaliar Recompensas por Marcos
      const recompensasCol = $app.findCollectionByNameOrId('recompensas_conquistadas')

      // Função interna de atribuição idempotente de recompensa
      const tentarAtribuirRecompensa = (tipoRecompensa) => {
        try {
          $app.findFirstRecordByData(
            'recompensas_conquistadas',
            'aluno',
            alunoId,
            'recompensa',
            tipoRecompensa,
          )
          // já conquistada
          return false
        } catch (_) {
          // Verificar se já existe via filter
          const existentes = $app.findRecordsByFilter(
            'recompensas_conquistadas',
            'aluno = {:alunoId} && recompensa = {:rec}',
            '',
            1,
            0,
            { alunoId: alunoId, rec: tipoRecompensa },
          )
          if (existentes.length > 0) return false

          const novaRec = new Record(recompensasCol)
          novaRec.set('aluno', alunoId)
          novaRec.set('recompensa', tipoRecompensa)
          novaRec.set('data_conquista', agora.toISOString().replace('T', ' ').substring(0, 19))
          $app.save(novaRec)
          novasRecompensas.push(tipoRecompensa)
          return true
        }
      }

      // Recompensa 1: "primeira_aula" (primeira aula concluída)
      // Se aulasPontuadas.length >= 1 ou aluno concluiu ao menos 1 aula
      if (aulasPontuadas.length >= 1) {
        tentarAtribuirRecompensa('primeira_aula')
      }

      // Recompensa 2: "primeiro_curso" (primeiro curso 100% concluído)
      if (cursosPontuados.length >= 1) {
        tentarAtribuirRecompensa('primeiro_curso')
      }

      // Recompensa 3: "dedicado" (7 dias seguidos de estudo)
      if (sequenciaDias >= 7) {
        tentarAtribuirRecompensa('dedicado')
      }

      // Recompensa 4: "maratonista" (30 dias seguidos de estudo)
      if (sequenciaDias >= 30) {
        tentarAtribuirRecompensa('maratonista')
      }

      // Obter todas as recompensas atuais do aluno
      const todasRecompensasRecords = $app.findRecordsByFilter(
        'recompensas_conquistadas',
        'aluno = {:alunoId}',
        '-data_conquista',
        0,
        0,
        { alunoId: alunoId },
      )
      const recompensasConquistadas = []
      for (let r = 0; r < todasRecompensasRecords.length; r++) {
        recompensasConquistadas.push({
          id: todasRecompensasRecords[r].id,
          recompensa: todasRecompensasRecords[r].getString('recompensa'),
          data_conquista: todasRecompensasRecords[r].getString('data_conquista'),
        })
      }

      return e.json(200, {
        sucesso: true,
        pontosGanhos: pontosGanhos,
        pontosTotal: pontosTotal,
        ganhouPontosAula: ganhouPontosAula,
        ganhouPontosCurso: ganhouPontosCurso,
        aulaJaPontuada: aulaJaPontuada,
        nivelAnterior: nivelAnterior,
        novoNivel: novoNivel,
        subiuDeNivel: subiuDeNivel,
        sequenciaDias: sequenciaDias,
        novasRecompensas: novasRecompensas,
        recompensasConquistadas: recompensasConquistadas,
      })
    } catch (err) {
      console.log('Erro ao atribuir gamificação:', err)
      return e.json(500, {
        sucesso: false,
        message:
          'Erro ao processar gamificação: ' + (err && err.message ? err.message : String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
