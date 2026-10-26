// Hook: rota para obter métricas de preparo de busca e transcrição no painel admin
// Indicador geral no painel:
// - total de aulas publicadas
// - quantas aulas publicadas estão sem transcrição
// - quantas aulas publicadas estão sem preparo de busca (situacao_busca != 'preparada')
// - quantas aulas publicadas estão preparadas
// - quantas aulas publicadas estão com erro de preparo
routerAdd(
  'GET',
  '/backend/v1/admin/metricas-busca',
  (e) => {
    const authRecord = e.auth
    if (!authRecord || authRecord.getString('role') !== 'admin') {
      return e.json(403, {
        message: 'Acesso negado: apenas administradores podem consultar métricas.',
      })
    }

    try {
      // Buscar todas as aulas publicadas
      const aulasPublicadas = $app.findRecordsByFilter('aulas', "situacao = 'publicado'", '', 0, 0)

      let totalPublicadas = aulasPublicadas.length
      let semTranscricao = 0
      let semPreparo = 0
      let preparadas = 0
      let comErro = 0
      let totalTrechos = 0

      for (let i = 0; i < aulasPublicadas.length; i++) {
        const a = aulasPublicadas[i]
        const transcricao = (a.getString('transcricao') || '').trim()
        const situacao = a.getString('situacao_busca') || 'nao_preparada'
        const qtdTrechos = a.getInt('quantidade_trechos') || 0

        if (!transcricao) {
          semTranscricao++
        }

        if (situacao === 'preparada' && qtdTrechos > 0) {
          preparadas++
          totalTrechos += qtdTrechos
        } else if (situacao === 'erro') {
          comErro++
          semPreparo++
        } else {
          // 'nao_preparada'
          semPreparo++
        }
      }

      // Total de trechos na tabela trechos_busca
      let contagemTotalTrechosGeral = 0
      try {
        contagemTotalTrechosGeral = $app.countRecords('trechos_busca')
      } catch (_) {}

      return e.json(200, {
        totalAulasPublicadas: totalPublicadas,
        aulasPublicadasSemTranscricao: semTranscricao,
        aulasPublicadasSemPreparo: semPreparo,
        aulasPublicadasPreparadas: preparadas,
        aulasPublicadasComErro: comErro,
        totalTrechosIndexados: contagemTotalTrechosGeral || totalTrechos,
      })
    } catch (err) {
      console.log('Erro ao calcular metricas de busca:', err)
      return e.json(500, { message: 'Erro ao calcular métricas de busca', error: String(err) })
    }
  },
  $apis.requireAuth(),
)
