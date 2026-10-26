migrate(
  (app) => {
    // Buscar curso 'Marketing Digital'
    let cursoMarketing
    try {
      cursoMarketing = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
    } catch (_) {
      return
    }

    // Buscar módulo de introdução ou primeiro módulo
    const modulos = app.findRecordsByFilter('modulos', 'curso = {:cursoId}', 'ordem', 1, 0, {
      cursoId: cursoMarketing.id,
    })
    if (modulos.length === 0) return

    const modulo1 = modulos[0]

    // Buscar se a aula "Como configurar o pagamento" já existe
    let aulaPagamento
    const aulas = app.findRecordsByFilter(
      'aulas',
      'modulo = {:moduloId} && titulo = {:titulo}',
      '',
      1,
      0,
      { moduloId: modulo1.id, titulo: 'Como configurar o pagamento' },
    )

    if (aulas.length > 0) {
      aulaPagamento = aulas[0]
    } else {
      const aulasCol = app.findCollectionByNameOrId('aulas')
      aulaPagamento = new Record(aulasCol)
      aulaPagamento.set('modulo', modulo1.id)
      aulaPagamento.set('titulo', 'Como configurar o pagamento')
      aulaPagamento.set('ordem', 4)
      aulaPagamento.set('video_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      aulaPagamento.set('duracao_minutos', 40)
      aulaPagamento.set('situacao', 'publicado')
      aulaPagamento.set(
        'descricao',
        'Passo a passo completo para integrar gateways de pagamento, checkout transparente e Pix.',
      )
    }

    // Texto de transcrição de aula de 40 minutos com múltiplos tópicos detalhados
    const transcricaoExemplo = [
      'Olá pessoal, sejam muito bem-vindos a mais esta aula sobre como configurar o pagamento no seu negócio online.',
      'Hoje nós vamos passar detalhadamente por toda a infraestrutura financeira necessária para receber vendas com segurança, velocidade e alta taxa de conversão.',
      'No primeiro bloco, falaremos sobre a escolha do gateway de pagamento ou adquirente. É essencial entender as taxas de intermediação por transação, o prazo de recebimento padrão como D+14 ou D+30, e a taxa de antecipação de recebíveis quando você decide antecipar parcelas de cartão de crédito.',
      'Além disso, explicaremos a diferença fundamental entre checkout transparente e checkout redirecionado. No checkout transparente, o cliente nunca sai do domínio da sua plataforma de cursos, o que reduz drasticamente o abandono de carrinho.',
      'No segundo bloco, vamos configurar as chaves de API nos ambientes de sandbox e produção. Mostraremos onde encontrar a chave pública para validação de dados no front-end e a chave secreta que deve permanecer restrita no backend para assinatura digital de requisições e webhooks.',
      'O terceiro tópico importante é a homologação do Pix dinâmico com QR Code e Pix Copia e Cola. O webhook de notificação instantânea é disparado assim que o banco liquida o Pix no Banco Central, liberando a matrícula do aluno em menos de 3 segundos.',
      'Também configuraremos regras antifraude inteligentes para evitar chargebacks e clonagem de cartão sem barrar compradores legítimos.',
      'Por fim, realizaremos compras de teste com cartões de crédito simulados para confirmar o fluxo ponta a ponta de aprovação, cancelamento e estorno.',
      'Fiquem atentos às instruções e materiais complementares anexados na aba da aula. Qualquer dúvida, deixem nos comentários.',
    ].join('\n\n')

    aulaPagamento.set('transcricao', transcricaoExemplo)

    // Fatiar a transcrição em trechos para semente inicial
    // Dividir em 5 parágrafos/trechos
    const paragrafos = [
      'Olá pessoal, sejam muito bem-vindos a mais esta aula sobre como configurar o pagamento no seu negócio online. Hoje nós vamos passar detalhadamente por toda a infraestrutura financeira necessária para receber vendas com segurança, velocidade e alta taxa de conversão.',
      'No primeiro bloco, falaremos sobre a escolha do gateway de pagamento ou adquirente. É essencial entender as taxas de intermediação por transação, o prazo de recebimento padrão como D+14 ou D+30, e a taxa de antecipação de recebíveis quando você decide antecipar parcelas de cartão de crédito.',
      'Além disso, explicaremos a diferença fundamental entre checkout transparente e checkout redirecionado. No checkout transparente, o cliente nunca sai do domínio da sua plataforma de cursos, o que reduz drasticamente o abandono de carrinho.',
      'No segundo bloco, vamos configurar as chaves de API nos ambientes de sandbox e produção. Mostraremos onde encontrar a chave pública para validação de dados no front-end e a chave secreta que deve permanecer restrita no backend para assinatura digital de requisições e webhooks.',
      'O terceiro tópico importante é a homologação do Pix dinâmico com QR Code e Pix Copia e Cola. O webhook de notificação instantânea é disparado assim que o banco liquida o Pix no Banco Central, liberando a matrícula do aluno em menos de 3 segundos.',
      'Também configuraremos regras antifraude inteligentes para evitar chargebacks e clonagem de cartão sem barrar compradores legítimos. Por fim, realizaremos compras de teste com cartões de crédito simulados para confirmar o fluxo ponta a ponta de aprovação, cancelamento e estorno.',
    ]

    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19)
    aulaPagamento.set('situacao_busca', 'preparada')
    aulaPagamento.set('quantidade_trechos', paragrafos.length)
    aulaPagamento.set('erro_preparo', '')
    aulaPagamento.set('data_preparo_busca', agora)
    app.save(aulaPagamento)

    // Inserir trechos na coleção trechos_busca
    const trechosCol = app.findCollectionByNameOrId('trechos_busca')

    // Limpar trechos antigos se houver
    const trechosAntigos = app.findRecordsByFilter('trechos_busca', 'aula = {:aulaId}', '', 0, 0, {
      aulaId: aulaPagamento.id,
    })
    for (let i = 0; i < trechosAntigos.length; i++) {
      app.delete(trechosAntigos[i])
    }

    for (let pos = 0; pos < paragrafos.length; pos++) {
      const rec = new Record(trechosCol)
      rec.set('curso', cursoMarketing.id)
      rec.set('aula', aulaPagamento.id)
      rec.set('posicao', pos + 1)
      rec.set('conteudo', paragrafos[pos])
      rec.set('data_preparo', agora)
      app.save(rec)
    }
  },
  (app) => {
    try {
      const aulas = app.findRecordsByFilter('aulas', 'titulo = {:titulo}', '', 1, 0, {
        titulo: 'Como configurar o pagamento',
      })
      if (aulas.length > 0) {
        const aula = aulas[0]
        const trechosAntigos = app.findRecordsByFilter(
          'trechos_busca',
          'aula = {:aulaId}',
          '',
          0,
          0,
          { aulaId: aula.id },
        )
        for (let i = 0; i < trechosAntigos.length; i++) {
          app.delete(trechosAntigos[i])
        }
        app.delete(aula)
      }
    } catch (_) {}
  },
)
