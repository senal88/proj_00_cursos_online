// Hook: Consulta e cálculo de perfil de gamificação do aluno
// Retorna pontuação total, nível atual, sequência de dias, progresso para o próximo nível e todas as recompensas
// Também verifica se a sequência de dias expirou (caso o aluno tenha ficado mais de 1 dia sem estudar)

routerAdd(
  'GET',
  '/backend/v1/aluno/gamificacao/perfil',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { message: 'Não autenticado.' })
    }

    const alunoId = authRecord.id

    try {
      const pontuacaoCol = $app.findCollectionByNameOrId('pontuacao')
      let pontuacaoRecord = null

      try {
        pontuacaoRecord = $app.findFirstRecordByData('pontuacao', 'aluno', alunoId)
      } catch (_) {
        // Inicializar se ainda não existir
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

      let pontosTotal = Number(pontuacaoRecord.get('pontos_total') || 0)
      let sequenciaDias = Number(pontuacaoRecord.get('sequencia_dias') || 0)
      const ultimoDiaEstudo = String(pontuacaoRecord.getString('ultimo_dia_estudo') || '')

      // Verificar se a sequência expirou (se mais de 1 dia se passou desde o último estudo)
      // "um dia inteiro sem estudar zera"
      if (ultimoDiaEstudo) {
        const agora = new Date()
        const hojeStr = agora.toISOString().substring(0, 10)
        const dataOntem = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
        const ontemStr = dataOntem.toISOString().substring(0, 10)

        // Se o último dia não foi nem hoje nem ontem, o aluno ficou um dia inteiro sem estudar -> zera a sequência
        if (ultimoDiaEstudo !== hojeStr && ultimoDiaEstudo !== ontemStr) {
          sequenciaDias = 0
          pontuacaoRecord.set('sequencia_dias', 0)
          $app.save(pontuacaoRecord)
        }
      }

      // Constante de Níveis e Limiares
      // Nível 1: 0, Nível 2: 100, Nível 3: 250, Nível 4: 500, Nível 5: 1000
      let nivelAtual = 1
      if (pontosTotal >= 1000) {
        nivelAtual = 5
      } else if (pontosTotal >= 500) {
        nivelAtual = 4
      } else if (pontosTotal >= 250) {
        nivelAtual = 3
      } else if (pontosTotal >= 100) {
        nivelAtual = 2
      } else {
        nivelAtual = 1
      }

      if (Number(pontuacaoRecord.get('nivel_atual') || 1) !== nivelAtual) {
        pontuacaoRecord.set('nivel_atual', nivelAtual)
        $app.save(pontuacaoRecord)
      }

      // Recompensas conquistadas
      const todasRecompensasRecords = $app.findRecordsByFilter(
        'recompensas_conquistadas',
        'aluno = {:alunoId}',
        '-data_conquista',
        0,
        0,
        { alunoId: alunoId },
      )

      const conquistadas = []
      for (let i = 0; i < todasRecompensasRecords.length; i++) {
        conquistadas.push({
          id: todasRecompensasRecords[i].id,
          recompensa: todasRecompensasRecords[i].getString('recompensa'),
          data_conquista: todasRecompensasRecords[i].getString('data_conquista'),
        })
      }

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

      return e.json(200, {
        sucesso: true,
        pontosTotal: pontosTotal,
        nivelAtual: nivelAtual,
        sequenciaDias: sequenciaDias,
        ultimoDiaEstudo: ultimoDiaEstudo,
        totalAulasPontuadas: aulasPontuadas.length,
        totalCursosPontuados: cursosPontuados.length,
        recompensasConquistadas: conquistadas,
      })
    } catch (err) {
      console.log('Erro ao obter perfil de gamificação:', err)
      return e.json(500, {
        sucesso: false,
        message:
          'Erro ao consultar gamificação: ' + (err && err.message ? err.message : String(err)),
      })
    }
  },
  $apis.requireAuth(),
)
