migrate(
  (app) => {
    // 1. Adicionar campo 'materiais' na coleção aulas caso ainda não exista
    const aulas = app.findCollectionByNameOrId('aulas')
    if (!aulas.fields.getByName('materiais')) {
      aulas.fields.add(
        new JSONField({
          name: 'materiais',
          maxSize: 1048576, // 1MB
        }),
      )
      app.save(aulas)
    }

    // 2. Atualizar as regras de acesso da coleção 'progresso'
    // Alunos matriculados ativos precisam poder criar e atualizar registros de seu próprio progresso
    const progresso = app.findCollectionByNameOrId('progresso')

    // Aluno pode criar progresso se a matrícula pertencer a ele e estiver ativa
    progresso.createRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && matricula.aluno = @request.auth.id && matricula.situacao = 'ativa')"

    // Aluno pode atualizar seu próprio progresso
    progresso.updateRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && matricula.aluno = @request.auth.id && matricula.situacao = 'ativa')"

    app.save(progresso)

    // 3. Atualizar materiais para as aulas do curso Marketing Digital (especialmente a Aula 2 solicitada no teste da aluna)
    try {
      const aula1 = app.findFirstRecordByData('aulas', 'titulo', 'O que é marketing digital')
      aula1.set('materiais', [
        {
          tipo: 'arquivo',
          nome: 'Guia de Fundamentos do Marketing Digital.pdf',
          url: '/materiais/guia-fundamentos-marketing.pdf',
          tamanho: '2.4 MB',
          formato: 'pdf',
        },
        {
          tipo: 'link',
          nome: 'Artigo complementar: O Cenário do Marketing Digital',
          url: 'https://pt.wikipedia.org/wiki/Marketing_digital',
        },
      ])
      app.save(aula1)
    } catch (_) {}

    try {
      const aula2 = app.findFirstRecordByData('aulas', 'titulo', 'Funil de vendas')
      aula2.set('materiais', [
        {
          tipo: 'arquivo',
          nome: 'Planilha e Mapa do Funil de Vendas.pdf',
          url: '/materiais/mapa-funil-de-vendas.pdf',
          tamanho: '1.8 MB',
          formato: 'pdf',
        },
        {
          tipo: 'link',
          nome: 'Referência e Framework: Hubspot Inbound Funnel',
          url: 'https://br.hubspot.com/inbound-marketing',
        },
        {
          tipo: 'link',
          nome: 'Glossário de Métricas do Funil (CAC, LTV, ROI)',
          url: 'https://rockcontent.com/br/blog/metricas-de-marketing/',
        },
      ])
      app.save(aula2)
    } catch (_) {}

    try {
      const aula3 = app.findFirstRecordByData('aulas', 'titulo', 'Posicionamento de marca')
      aula3.set('materiais', [
        {
          tipo: 'arquivo',
          nome: 'Template de Posicionamento e Proposta de Valor.pdf',
          url: '/materiais/template-posicionamento.pdf',
          tamanho: '1.2 MB',
          formato: 'pdf',
        },
      ])
      app.save(aula3)
    } catch (_) {}
  },
  (app) => {
    // Reverter regras de progresso
    try {
      const progresso = app.findCollectionByNameOrId('progresso')
      progresso.createRule = "@request.auth.role = 'admin'"
      progresso.updateRule = "@request.auth.role = 'admin'"
      app.save(progresso)
    } catch (_) {}

    try {
      const aulas = app.findCollectionByNameOrId('aulas')
      const campo = aulas.fields.getByName('materiais')
      if (campo) {
        aulas.fields.remove(campo)
        app.save(aulas)
      }
    } catch (_) {}
  },
)
