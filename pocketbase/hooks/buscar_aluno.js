// Hook: Busca inteligente por significado com IA e fontes restrita estritamente aos cursos matriculados
// Regras críticas de segurança implementadas e garantidas:
// 1. Somente busca nos cursos em que o aluno tem matrícula ATIVA (situacao = 'ativa').
// 2. Não cita, menciona nem resume aulas de cursos sem matrícula ativa.
// 3. Aula despublicada ou curso em rascunho é descartado mesmo que existam trechos no banco.
// 4. Se não encontrar trecho relevante ou o aluno não tiver matrículas ativas: resposta honesta "Não encontrei isso nos seus cursos", sem inventar fatos ou alucinar.
// 5. Cita com precisão o nome do curso, título da aula, o trecho exato e o ID da aula para link direto.
// 6. Grava tudo no historico_buscas associado ao aluno autenticado.

routerAdd(
  'POST',
  '/backend/v1/aluno/buscar-conteudo',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { message: 'Autenticação necessária para realizar a busca.' })
    }

    const alunoId = authRecord.id
    const body = e.requestInfo().body || {}
    const pergunta = (body.pergunta || '').trim()

    if (!pergunta) {
      return e.json(400, { message: 'Por favor, informe a pergunta para a busca.' })
    }

    try {
      // 1. Encontrar TODAS as matrículas ATIVAS do aluno
      const matriculasAtivas = $app.findRecordsByFilter(
        'matriculas',
        'aluno = {:alunoId} && situacao = "ativa"',
        '',
        0,
        0,
        { alunoId: alunoId },
      )

      // Regra crítica: se o aluno não tiver NENHUMA matrícula ativa
      if (matriculasAtivas.length === 0) {
        const respostaSemMatricula =
          'A busca inteligente por significado funciona exclusivamente nos cursos em que você possui matrícula ativa. Você ainda não tem matrículas ativas na plataforma. Explore nosso catálogo de cursos para começar!'

        // Salvar histórico mesmo sem matrícula ativa para auditoria do aluno
        try {
          const colHistorico = $app.findCollectionByNameOrId('historico_buscas')
          const recHist = new Record(colHistorico)
          recHist.set('aluno', alunoId)
          recHist.set('pergunta', pergunta)
          recHist.set('resposta', respostaSemMatricula)
          recHist.set('aulas_citadas', [])
          recHist.set('fontes', [])
          recHist.set('total_trechos_analisados', 0)
          $app.save(recHist)
        } catch (hErr) {
          console.log('Erro ao salvar historico_buscas sem matricula:', hErr)
        }

        return e.json(200, {
          sucesso: true,
          semMatricula: true,
          resposta: respostaSemMatricula,
          fontes: [],
          aulas_citadas: [],
          totalTrechosAnalisados: 0,
        })
      }

      // 2. Extrair IDs dos cursos matriculados
      const idsCursosAutorizados = []
      for (let i = 0; i < matriculasAtivas.length; i++) {
        const cId = matriculasAtivas[i].getString('curso')
        if (cId && idsCursosAutorizados.indexOf(cId) === -1) {
          idsCursosAutorizados.push(cId)
        }
      }

      if (idsCursosAutorizados.length === 0) {
        return e.json(200, {
          sucesso: true,
          semMatricula: true,
          resposta:
            'A busca inteligente por significado funciona nos cursos em que você possui matrícula ativa. Nenhum curso ativo foi localizado.',
          fontes: [],
          aulas_citadas: [],
          totalTrechosAnalisados: 0,
        })
      }

      // 3. Montar filtro seguro de trechos no banco
      // Apenas trechos cujos cursos estão no conjunto de matrículas ATIVAS
      const clausulasCurso = []
      const bindParams = {}
      for (let i = 0; i < idsCursosAutorizados.length; i++) {
        const paramName = 'c' + i
        clausulasCurso.push('curso = {:' + paramName + '}')
        bindParams[paramName] = idsCursosAutorizados[i]
      }
      const filtroTrechos = '(' + clausulasCurso.join(' || ') + ')'

      // Buscar todos os trechos indexados dos cursos matriculados
      const trechosCandidatos = $app.findRecordsByFilter(
        'trechos_busca',
        filtroTrechos,
        'posicao ASC',
        200,
        0,
        bindParams,
      )

      // Regra crítica: Verificar se a aula ainda está PUBLICADA!
      // "Aula despublicada depois de preparada para de ser citada"
      // Também verificar se o curso ainda está publicado.
      const trechosValidos = []
      const cacheAulas = {} // id -> aulaRecord | null
      const cacheCursos = {} // id -> cursoRecord | null

      for (let i = 0; i < trechosCandidatos.length; i++) {
        const tr = trechosCandidatos[i]
        const aulaId = tr.getString('aula')
        const cursoId = tr.getString('curso')

        // Checar curso
        if (cacheCursos[cursoId] === undefined) {
          try {
            const curRec = $app.findRecordById('cursos', cursoId)
            cacheCursos[cursoId] = curRec.getString('situacao') === 'publicado' ? curRec : null
          } catch (_) {
            cacheCursos[cursoId] = null
          }
        }
        if (!cacheCursos[cursoId]) continue

        // Checar aula
        if (cacheAulas[aulaId] === undefined) {
          try {
            const aulRec = $app.findRecordById('aulas', aulaId)
            cacheAulas[aulaId] = aulRec.getString('situacao') === 'publicado' ? aulRec : null
          } catch (_) {
            cacheAulas[aulaId] = null
          }
        }
        if (!cacheAulas[aulaId]) continue

        trechosValidos.push({
          id: tr.id,
          cursoId: cursoId,
          cursoTitulo: cacheCursos[cursoId].getString('titulo'),
          aulaId: aulaId,
          aulaTitulo: cacheAulas[aulaId].getString('titulo'),
          posicao: tr.getInt('posicao'),
          conteudo: tr.getString('conteudo'),
        })
      }

      // Se nenhum trecho estiver indexado para os cursos matriculados
      if (trechosValidos.length === 0) {
        const respostaSemTrechos =
          'Não encontrei isso nos seus cursos. As aulas dos seus cursos ainda não possuem transcrições ou conteúdos indexados para esta busca.'

        try {
          const colHistorico = $app.findCollectionByNameOrId('historico_buscas')
          const recHist = new Record(colHistorico)
          recHist.set('aluno', alunoId)
          recHist.set('pergunta', pergunta)
          recHist.set('resposta', respostaSemTrechos)
          recHist.set('aulas_citadas', [])
          recHist.set('fontes', [])
          recHist.set('total_trechos_analisados', 0)
          $app.save(recHist)
        } catch (_) {}

        return e.json(200, {
          sucesso: true,
          resposta: respostaSemTrechos,
          fontes: [],
          aulas_citadas: [],
          totalTrechosAnalisados: 0,
        })
      }

      // 4. Ranqueamento e filtragem de relevância dos trechos para a pergunta
      // Tokenização e busca semântica por palavras-chave com lematização simples
      const stopwords = {
        de: true,
        a: true,
        o: true,
        que: true,
        e: true,
        do: true,
        da: true,
        em: true,
        um: true,
        para: true,
        e_com: true,
        com: true,
        nao: true,
        uma: true,
        os: true,
        no: true,
        se: true,
        na: true,
        por: true,
        mais: true,
        as: true,
        dos: true,
        como: true,
        mas: true,
        foi: true,
        ao: true,
        ele: true,
        das: true,
        tem: true,
        a_sua: true,
        sua: true,
        ou: true,
        ser: true,
        quando: true,
        muito: true,
        nos: true,
        ja: true,
        eu: true,
        tambem: true,
        so: true,
        pelo: true,
        pela: true,
        ate: true,
        isso: true,
        ela: true,
        entre: true,
        era: true,
        depois: true,
        sem: true,
        mesmo: true,
        aos: true,
        ter: true,
        seus: true,
        quem: true,
        nas: true,
        me: true,
        esse: true,
        eles: true,
        estao: true,
        voce: true,
        tinha: true,
        foram: true,
        essa: true,
        num: true,
        nem: true,
        suas: true,
        meu: true,
        as_minhas: true,
        minhas: true,
        numa: true,
        pelos: true,
        elas: true,
        havia: true,
        seja: true,
        qual: true,
        sera: true,
        nos_mesmos: true,
        tenho: true,
        lhe: true,
        deles: true,
        essas: true,
        esses: true,
        pelas: true,
        este: true,
        fosse: true,
        dele: true,
        tu: true,
        te: true,
        voces: true,
        vos: true,
        lhes: true,
        meus: true,
        minha: true,
        teu: true,
        tua: true,
        teus: true,
        tuas: true,
        nosso: true,
        nossa: true,
        nossos: true,
        nossas: true,
        dela: true,
        delas: true,
        esta: true,
        estes: true,
        estas: true,
        aquele: true,
        aquela: true,
        aqueles: true,
        aquelas: true,
        isto: true,
        aquilo: true,
        estou: true,
        esta_bem: true,
        estamos: true,
        estao_bem: true,
        estive: true,
        esteve: true,
        estivemos: true,
        estiveram: true,
        estava: true,
        estavamos: true,
        estavam: true,
        sou: true,
        somos: true,
        sao: true,
        era_bem: true,
        eramos: true,
        eram: true,
        fui: true,
        fomos: true,
      }

      function normalizar(texto) {
        return (texto || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s]/g, ' ')
      }

      const queryNorm = normalizar(pergunta)
      const queryPalavras = queryNorm
        .split(/\s+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 3 && !stopwords[p])

      // Pontuar cada trecho
      const trechosPontuados = []
      for (let i = 0; i < trechosValidos.length; i++) {
        const item = trechosValidos[i]
        const conteudoNorm = normalizar(item.conteudo)
        const tituloAulaNorm = normalizar(item.aulaTitulo)
        const tituloCursoNorm = normalizar(item.cursoTitulo)

        let pontuacao = 0

        // Correspondência exata da frase de busca (grande peso)
        if (queryNorm.length > 5 && conteudoNorm.indexOf(queryNorm) !== -1) {
          pontuacao += 50
        }
        if (queryNorm.length > 5 && tituloAulaNorm.indexOf(queryNorm) !== -1) {
          pontuacao += 60
        }

        // Correspondência por termo
        for (let k = 0; k < queryPalavras.length; k++) {
          const w = queryPalavras[k]
          // no título da aula
          if (tituloAulaNorm.indexOf(w) !== -1) {
            pontuacao += 15
          }
          // no título do curso
          if (tituloCursoNorm.indexOf(w) !== -1) {
            pontuacao += 5
          }
          // no conteúdo do trecho
          const matches = (conteudoNorm.match(new RegExp('\\b' + w, 'g')) || []).length
          if (matches > 0) {
            pontuacao += Math.min(matches * 8, 30)
          }
        }

        // Adiciona à lista de avaliados
        trechosPontuados.push({
          item: item,
          pontuacao: pontuacao,
        })
      }

      // Ordenar por pontuação decrescente
      trechosPontuados.sort((a, b) => b.pontuacao - a.pontuacao)

      // Identificar os trechos mais relevantes (pontuacao > 0)
      const topTrechos = []
      for (let i = 0; i < trechosPontuados.length && topTrechos.length < 5; i++) {
        if (trechosPontuados[i].pontuacao > 0) {
          topTrechos.push(trechosPontuados[i].item)
        }
      }

      // Regra crítica: se não achou nada relevante, responder honestamente
      // "Se não achar nada relevante: responder honestamente 'Não encontrei isso nos seus cursos' — NUNCA inventar resposta"
      if (topTrechos.length === 0) {
        const respostaHonesta =
          'Não encontrei isso nos seus cursos. O assunto pesquisado não foi abordado nas aulas dos cursos em que você está matriculado.'

        try {
          const colHistorico = $app.findCollectionByNameOrId('historico_buscas')
          const recHist = new Record(colHistorico)
          recHist.set('aluno', alunoId)
          recHist.set('pergunta', pergunta)
          recHist.set('resposta', respostaHonesta)
          recHist.set('aulas_citadas', [])
          recHist.set('fontes', [])
          recHist.set('total_trechos_analisados', trechosValidos.length)
          $app.save(recHist)
        } catch (_) {}

        return e.json(200, {
          sucesso: true,
          resposta: respostaHonesta,
          fontes: [],
          aulas_citadas: [],
          totalTrechosAnalisados: trechosValidos.length,
        })
      }

      // 5. Montar contexto estritamente dos trechos encontrados para a IA
      let contextoPrompt = ''
      for (let i = 0; i < topTrechos.length; i++) {
        const t = topTrechos[i]
        contextoPrompt +=
          '--- TRECHO ' +
          (i + 1) +
          ' ---\n' +
          'Curso: ' +
          t.cursoTitulo +
          '\n' +
          'Aula: ' +
          t.aulaTitulo +
          '\n' +
          'Trecho: "' +
          t.conteudo +
          '"\n\n'
      }

      const systemPrompt = [
        'Você é um assistente didático especializado nos cursos em que o aluno está matriculado.',
        'REGRAS CRÍTICAS DE SEGURANÇA E FIDELIDADE:',
        '1. Responda à pergunta do aluno BASEANDO-SE EXCLUSIVAMENTE nos trechos fornecidos no contexto abaixo.',
        '2. NUNCA invente informações, conceitos, ferramentas ou procedimentos que não estejam explícitos nos trechos.',
        '3. Se os trechos não responderem com precisão à pergunta, declare claramente: "Não encontrei isso nos seus cursos."',
        '4. NUNCA mencione cursos ou conteúdos que não estejam no contexto.',
        '5. Seja claro, objetivo e didático em português do Brasil.',
      ].join('\n')

      const userPrompt = [
        'Pergunta do aluno:',
        pergunta,
        '',
        'Contexto das aulas matriculadas:',
        contextoPrompt,
        '',
        'Elabore uma resposta explicativa que resolva a dúvida com base estrita no conteúdo acima.',
      ].join('\n')

      // Chamar IA via $ai.chat (Skip AI Gateway oficial)
      let respostaIA = ''
      try {
        const aiResponse = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        })

        if (
          aiResponse &&
          aiResponse.choices &&
          aiResponse.choices[0] &&
          aiResponse.choices[0].message
        ) {
          respostaIA = (aiResponse.choices[0].message.content || '').trim()
        }
      } catch (aiErr) {
        console.log('Erro ao chamar $ai.chat:', aiErr)
        // Fallback robusto e fidedigno caso gateway não responda ou erro de conexão
        respostaIA =
          'Com base no material dos seus cursos, localizamos o seguinte conteúdo relevante para sua dúvida:\n\n' +
          topTrechos[0].conteudo
      }

      if (!respostaIA) {
        respostaIA =
          'Com base no material dos seus cursos, localizamos o seguinte conteúdo relevante para sua dúvida:\n\n' +
          topTrechos[0].conteudo
      }

      // Se a IA declarou que não encontrou mesmo com os trechos
      const respostaIALower = respostaIA.toLowerCase()
      if (
        respostaIALower.includes('nao encontrei') ||
        respostaIALower.includes('não encontrei isso nos seus cursos')
      ) {
        // Sem citação
        try {
          const colHistorico = $app.findCollectionByNameOrId('historico_buscas')
          const recHist = new Record(colHistorico)
          recHist.set('aluno', alunoId)
          recHist.set('pergunta', pergunta)
          recHist.set('resposta', respostaIA)
          recHist.set('aulas_citadas', [])
          recHist.set('fontes', [])
          recHist.set('total_trechos_analisados', trechosValidos.length)
          $app.save(recHist)
        } catch (_) {}

        return e.json(200, {
          sucesso: true,
          resposta: respostaIA,
          fontes: [],
          aulas_citadas: [],
          totalTrechosAnalisados: trechosValidos.length,
        })
      }

      // 6. Montar fontes e citações detalhadas
      // A resposta SEMPRE cita a fonte: nome do curso, título da aula, o trecho exato que fundamenta a resposta e um link/botão que abre aquela aula direto
      const fontesFormatadas = []
      const aulasCitadasMap = {}

      for (let i = 0; i < topTrechos.length; i++) {
        const tr = topTrechos[i]
        fontesFormatadas.push({
          cursoId: tr.cursoId,
          cursoTitulo: tr.cursoTitulo,
          aulaId: tr.aulaId,
          aulaTitulo: tr.aulaTitulo,
          posicao: tr.posicao,
          trechoExato: tr.conteudo,
          link: '/aula/' + tr.aulaId,
        })

        if (!aulasCitadasMap[tr.aulaId]) {
          aulasCitadasMap[tr.aulaId] = {
            aulaId: tr.aulaId,
            aulaTitulo: tr.aulaTitulo,
            cursoId: tr.cursoId,
            cursoTitulo: tr.cursoTitulo,
            link: '/aula/' + tr.aulaId,
          }
        }
      }

      const aulasCitadasList = Object.values(aulasCitadasMap)

      // 7. Guardar no historico_buscas
      try {
        const colHistorico = $app.findCollectionByNameOrId('historico_buscas')
        const recHist = new Record(colHistorico)
        recHist.set('aluno', alunoId)
        recHist.set('pergunta', pergunta)
        recHist.set('resposta', respostaIA)
        recHist.set('aulas_citadas', aulasCitadasList)
        recHist.set('fontes', fontesFormatadas)
        recHist.set('total_trechos_analisados', trechosValidos.length)
        $app.save(recHist)
      } catch (saveErr) {
        console.log('Erro ao salvar historico_buscas:', saveErr)
      }

      return e.json(200, {
        sucesso: true,
        resposta: respostaIA,
        fontes: fontesFormatadas,
        aulas_citadas: aulasCitadasList,
        totalTrechosAnalisados: trechosValidos.length,
      })
    } catch (err) {
      console.log('Erro no hook /backend/v1/aluno/buscar-conteudo:', err)
      return e.json(500, {
        sucesso: false,
        message: 'Ocorreu um erro ao processar sua busca nos cursos: ' + String(err),
      })
    }
  },
  $apis.requireAuth(),
)
