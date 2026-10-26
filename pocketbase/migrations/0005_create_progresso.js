migrate(
  (app) => {
    const matriculas = app.findCollectionByNameOrId('matriculas')
    const aulas = app.findCollectionByNameOrId('aulas')
    const progresso = new Collection({
      name: 'progresso',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || matricula.aluno = @request.auth.id",
      viewRule: "@request.auth.role = 'admin' || matricula.aluno = @request.auth.id",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'matricula',
          type: 'relation',
          required: true,
          collectionId: matriculas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'aula',
          type: 'relation',
          required: true,
          collectionId: aulas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'situacao',
          type: 'select',
          required: true,
          values: ['iniciada', 'concluida'],
          maxSelect: 1,
        },
        { name: 'minuto_parada', type: 'number', onlyInt: true, min: 0 },
        { name: 'data_conclusao', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_progresso_matricula_aula ON progresso (matricula, aula)',
        'CREATE INDEX idx_progresso_matricula ON progresso (matricula)',
      ],
    })
    app.save(progresso)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('progresso'))
  },
)
