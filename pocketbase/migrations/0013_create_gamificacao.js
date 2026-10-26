migrate(
  (app) => {
    // 1. Coleção 'pontuacao' (um registro por aluno)
    // listRule e viewRule: cada aluno só vê a própria pontuação (RLS) ou admin vê
    // createRule, updateRule, deleteRule: superuser/admin apenas (atualizado com segurança via hooks/backend)
    const pontuacao = new Collection({
      name: 'pontuacao',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || aluno = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || aluno = @request.auth.id)",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'aluno',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'pontos_total', type: 'number', onlyInt: true, min: 0 },
        { name: 'nivel_atual', type: 'number', onlyInt: true, min: 1 },
        { name: 'sequencia_dias', type: 'number', onlyInt: true, min: 0 },
        { name: 'ultimo_dia_estudo', type: 'text' }, // YYYY-MM-DD para controle preciso de dias consecutivos
        { name: 'aulas_pontuadas', type: 'json' }, // array com IDs das aulas que já concederam pontos
        { name: 'cursos_pontuados', type: 'json' }, // array com IDs dos cursos que já concederam +50 pontos
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_pontuacao_aluno ON pontuacao (aluno)'],
    })
    app.save(pontuacao)

    // 2. Coleção 'recompensas_conquistadas' (aluno, recompensa, data da conquista)
    // listRule e viewRule: aluno só vê as próprias conquistas ou admin vê
    const recompensas = new Collection({
      name: 'recompensas_conquistadas',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || aluno = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || aluno = @request.auth.id)",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'aluno',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'recompensa',
          type: 'select',
          required: true,
          values: ['primeira_aula', 'primeiro_curso', 'dedicado', 'maratonista'],
          maxSelect: 1,
        },
        { name: 'data_conquista', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_recompensas_aluno_rec ON recompensas_conquistadas (aluno, recompensa)',
        'CREATE INDEX idx_recompensas_aluno ON recompensas_conquistadas (aluno)',
      ],
    })
    app.save(recompensas)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('recompensas_conquistadas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pontuacao'))
    } catch (_) {}
  },
)
