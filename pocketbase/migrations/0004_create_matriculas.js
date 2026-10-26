migrate(
  (app) => {
    const cursos = app.findCollectionByNameOrId('cursos')
    const matriculas = new Collection({
      name: 'matriculas',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || aluno = @request.auth.id",
      viewRule: "@request.auth.role = 'admin' || aluno = @request.auth.id",
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
          name: 'curso',
          type: 'relation',
          required: true,
          collectionId: cursos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'situacao',
          type: 'select',
          required: true,
          values: ['ativa', 'cancelada', 'concluida'],
          maxSelect: 1,
        },
        { name: 'data_matricula', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_matriculas_aluno_curso ON matriculas (aluno, curso)',
        'CREATE INDEX idx_matriculas_aluno ON matriculas (aluno)',
        'CREATE INDEX idx_matriculas_curso ON matriculas (curso)',
        'CREATE INDEX idx_matriculas_situacao ON matriculas (situacao)',
      ],
    })
    app.save(matriculas)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('matriculas'))
  },
)
