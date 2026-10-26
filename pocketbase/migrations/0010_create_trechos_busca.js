migrate(
  (app) => {
    // 1. Atualizar a coleção 'aulas' com campos para transcrição e situação do preparo de busca
    const aulas = app.findCollectionByNameOrId('aulas')

    if (!aulas.fields.getByName('transcricao')) {
      aulas.fields.add(
        new TextField({
          name: 'transcricao',
          max: 500000, // suporta transcrições longas de vídeos de horas
        }),
      )
    }

    if (!aulas.fields.getByName('situacao_busca')) {
      aulas.fields.add(
        new SelectField({
          name: 'situacao_busca',
          values: ['nao_preparada', 'preparada', 'erro'],
          maxSelect: 1,
        }),
      )
    }

    if (!aulas.fields.getByName('quantidade_trechos')) {
      aulas.fields.add(
        new NumberField({
          name: 'quantidade_trechos',
          onlyInt: true,
          min: 0,
        }),
      )
    }

    if (!aulas.fields.getByName('erro_preparo')) {
      aulas.fields.add(
        new TextField({
          name: 'erro_preparo',
          max: 2000,
        }),
      )
    }

    if (!aulas.fields.getByName('data_preparo_busca')) {
      aulas.fields.add(
        new DateField({
          name: 'data_preparo_busca',
        }),
      )
    }

    app.save(aulas)

    // 2. Criar a coleção interna 'trechos_busca'
    // REGRAS DE ACESSO E RLS:
    // "Os trechos internos nunca ficam visíveis para o aluno — são só da plataforma"
    // List/View/Create/Update/Delete liberados APENAS para admin (@request.auth.role = 'admin')
    // Alunos e visitantes não têm qualquer acesso direto a essa coleção.
    const cursosCol = app.findCollectionByNameOrId('cursos')
    const aulasCol = app.findCollectionByNameOrId('aulas')

    const trechos = new Collection({
      name: 'trechos_busca',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'curso',
          type: 'relation',
          required: true,
          collectionId: cursosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'aula',
          type: 'relation',
          required: true,
          collectionId: aulasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'posicao',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 0,
        },
        {
          name: 'conteudo',
          type: 'text',
          required: true,
          max: 10000,
        },
        {
          name: 'data_preparo',
          type: 'date',
          required: true,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_trechos_aula ON trechos_busca (aula)',
        'CREATE INDEX idx_trechos_curso ON trechos_busca (curso)',
        'CREATE INDEX idx_trechos_posicao ON trechos_busca (aula, posicao)',
      ],
    })

    app.save(trechos)
  },
  (app) => {
    try {
      const trechos = app.findCollectionByNameOrId('trechos_busca')
      app.delete(trechos)
    } catch (_) {}

    try {
      const aulas = app.findCollectionByNameOrId('aulas')
      const campoTranscricao = aulas.fields.getByName('transcricao')
      if (campoTranscricao) aulas.fields.remove(campoTranscricao)
      const campoSituacao = aulas.fields.getByName('situacao_busca')
      if (campoSituacao) aulas.fields.remove(campoSituacao)
      const campoQtd = aulas.fields.getByName('quantidade_trechos')
      if (campoQtd) aulas.fields.remove(campoQtd)
      const campoErro = aulas.fields.getByName('erro_preparo')
      if (campoErro) aulas.fields.remove(campoErro)
      const campoData = aulas.fields.getByName('data_preparo_busca')
      if (campoData) aulas.fields.remove(campoData)
      app.save(aulas)
    } catch (_) {}
  },
)
