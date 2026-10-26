migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // Tabela historico_buscas:
    // Guarda cada pergunta, a resposta gerada e as aulas citadas — o aluno vê seu histórico de perguntas.
    // Regra RLS rígida: cada aluno só acessa e visualiza o seu próprio histórico. Admin tem acesso completo.
    const historico = new Collection({
      name: 'historico_buscas',
      type: 'base',
      listRule:
        "@request.auth.role = 'admin' || (@request.auth.id != '' && aluno = @request.auth.id)",
      viewRule:
        "@request.auth.role = 'admin' || (@request.auth.id != '' && aluno = @request.auth.id)",
      createRule:
        "@request.auth.role = 'admin' || (@request.auth.id != '' && aluno = @request.auth.id)",
      updateRule:
        "@request.auth.role = 'admin' || (@request.auth.id != '' && aluno = @request.auth.id)",
      deleteRule:
        "@request.auth.role = 'admin' || (@request.auth.id != '' && aluno = @request.auth.id)",
      fields: [
        {
          name: 'aluno',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'pergunta',
          type: 'text',
          required: true,
          max: 2000,
        },
        {
          name: 'resposta',
          type: 'text',
          required: true,
          max: 20000,
        },
        {
          name: 'aulas_citadas',
          type: 'json',
          maxSize: 1048576,
        },
        {
          name: 'fontes',
          type: 'json',
          maxSize: 1048576,
        },
        {
          name: 'total_trechos_analisados',
          type: 'number',
          onlyInt: true,
          min: 0,
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
        'CREATE INDEX idx_historico_aluno_created ON historico_buscas (aluno, created DESC)',
      ],
    })

    app.save(historico)
  },
  (app) => {
    try {
      const historico = app.findCollectionByNameOrId('historico_buscas')
      app.delete(historico)
    } catch (_) {}
  },
)
