// Hook: preparar busca de aula dividindo transcrição em trechos e guardando em trechos_busca
// Regras obrigatórias atendidas:
// - Apenas admin pode executar
// - Preparar de novo substitui os trechos antigos da aula (nunca duplica)
// - Aula sem transcrição simplesmente fica "nao_preparada" e limpa trechos anteriores, sem erro
// - Cada trecho guarda a qual aula e qual curso pertence, a posição na transcrição e a data do preparo
// - Atualiza situacao_busca ('preparada', 'nao_preparada' ou 'erro'), quantidade_trechos, data_preparo_busca, erro_preparo
routerAdd(
  'POST',
  '/backend/v1/admin/aulas/:aulaId/preparar-busca',
  (e) => {
    // 1. Validar autenticação e perfil admin
    const authRecord = e.auth
    if (!authRecord || authRecord.getString('role') !== 'admin') {
      return e.json(403, {
        message: 'Acesso negado: apenas administradores podem preparar a busca.',
      })
    }

    const aulaId = e.requestInfo().pathParams.aulaId
    if (!aulaId) {
      return e.json(400, { message: 'ID da aula não informado.' })
    }

    try {
      const aula = $app.findRecordById('aulas', aulaId)

      // Identificar o curso correspondente através do módulo da aula
      const moduloId = aula.getString('modulo')
      const modulo = $app.findRecordById('modulos', moduloId)
      const cursoId = modulo.getString('curso')

      // Verificar se uma nova transcrição foi enviada no corpo da requisição para atualização prévia
      const body = e.requestInfo().body || {}
      if (typeof body.transcricao === 'string') {
        aula.set('transcricao', body.transcricao)
      }

      const transcricao = (aula.getString('transcricao') || '').trim()

      // Regra: "Aula sem transcrição simplesmente fica fora da busca (sem erro)"
      // Se não há transcrição, removemos eventuais trechos anteriores da aula e marcamos como 'nao_preparada'
      if (!transcricao) {
        $app.runInTransaction((txApp) => {
          // Deletar trechos antigos da aula
          const trechosAntigos = txApp.findRecordsByFilter(
            'trechos_busca',
            'aula = {:aulaId}',
            '',
            0,
            0,
            { aulaId: aula.id },
          )
          for (let i = 0; i < trechosAntigos.length; i++) {
            txApp.delete(trechosAntigos[i])
          }

          aula.set('situacao_busca', 'nao_preparada')
          aula.set('quantidade_trechos', 0)
          aula.set('erro_preparo', '')
          aula.set('data_preparo_busca', '')
          txApp.save(aula)
        })

        return e.json(200, {
          sucesso: true,
          situacao_busca: 'nao_preparada',
          quantidade_trechos: 0,
          mensagem: 'Aula sem transcrição. Permanece como não preparada para a busca (sem erro).',
        })
      }

      // Fatiamento da transcrição em trechos pesquisáveis com sobreposição (chunking)
      // Cada trecho tem cerca de 600 a 800 caracteres com overlap de ~150 caracteres, ou quebras de parágrafo / pontuação
      const CHUNK_SIZE = 700
      const CHUNK_OVERLAP = 120

      const trechosTexto = []
      let start = 0
      const totalLen = transcricao.length

      while (start < totalLen) {
        let end = Math.min(start + CHUNK_SIZE, totalLen)

        // Se não chegamos ao final, tentar quebrar em fim de frase ou espaço
        if (end < totalLen) {
          const ponto = transcricao.lastIndexOf('.', end)
          const pontoExclamacao = transcricao.lastIndexOf('!', end)
          const pontoInterrogacao = transcricao.lastIndexOf('?', end)
          const quebraLinha = transcricao.lastIndexOf('\n', end)

          const melhorPontuacao = Math.max(ponto, pontoExclamacao, pontoInterrogacao, quebraLinha)

          if (melhorPontuacao > start + 300) {
            end = melhorPontuacao + 1
          } else {
            const espaco = transcricao.lastIndexOf(' ', end)
            if (espaco > start + 300) {
              end = espaco
            }
          }
        }

        const pedaco = transcricao.substring(start, end).trim()
        if (pedaco.length > 0) {
          trechosTexto.push(pedaco)
        }

        if (end >= totalLen) {
          break
        }

        start = Math.max(end - CHUNK_OVERLAP, start + 1)
      }

      if (trechosTexto.length === 0) {
        trechosTexto.push(transcricao)
      }

      const agora = new Date().toISOString().replace('T', ' ').substring(0, 19)
      const trechosCol = $app.findCollectionByNameOrId('trechos_busca')

      // Transação atômica: deletar antigos e inserir novos para nunca duplicar
      $app.runInTransaction((txApp) => {
        // 1. Deletar trechos anteriores da aula
        const trechosAntigos = txApp.findRecordsByFilter(
          'trechos_busca',
          'aula = {:aulaId}',
          '',
          0,
          0,
          { aulaId: aula.id },
        )
        for (let i = 0; i < trechosAntigos.length; i++) {
          txApp.delete(trechosAntigos[i])
        }

        // 2. Gravar novos trechos com posicao, aula, curso e data_preparo
        for (let pos = 0; pos < trechosTexto.length; pos++) {
          const recordTrecho = new Record(trechosCol)
          recordTrecho.set('curso', cursoId)
          recordTrecho.set('aula', aula.id)
          recordTrecho.set('posicao', pos + 1)
          recordTrecho.set('conteudo', trechosTexto[pos])
          recordTrecho.set('data_preparo', agora)
          txApp.save(recordTrecho)
        }

        // 3. Atualizar status da aula
        aula.set('situacao_busca', 'preparada')
        aula.set('quantidade_trechos', trechosTexto.length)
        aula.set('erro_preparo', '')
        aula.set('data_preparo_busca', agora)
        txApp.save(aula)
      })

      return e.json(200, {
        sucesso: true,
        situacao_busca: 'preparada',
        quantidade_trechos: trechosTexto.length,
        data_preparo_busca: agora,
        mensagem: 'Busca preparada com sucesso! ' + trechosTexto.length + ' trechos indexados.',
      })
    } catch (err) {
      console.log('Erro ao preparar busca da aula ' + aulaId + ':', err)
      const erroMsg = err && err.message ? err.message : String(err)

      // Marcar erro na aula se ela existir
      try {
        const aulaParaErro = $app.findRecordById('aulas', aulaId)
        aulaParaErro.set('situacao_busca', 'erro')
        aulaParaErro.set('erro_preparo', erroMsg)
        $app.save(aulaParaErro)
      } catch (_) {}

      return e.json(500, {
        sucesso: false,
        situacao_busca: 'erro',
        erro: erroMsg,
        mensagem: 'Falha no processamento da transcrição: ' + erroMsg,
      })
    }
  },
  $apis.requireAuth(),
)
