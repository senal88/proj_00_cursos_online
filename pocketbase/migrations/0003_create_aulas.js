migrate(
  (app) => {
    const modulos = app.findCollectionByNameOrId('modulos')
    const aulas = new Collection({
      name: 'aulas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ordem', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'modulo',
          type: 'relation',
          required: true,
          collectionId: modulos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'video_url', type: 'text', required: true },
        { name: 'duracao_minutos', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'situacao',
          type: 'select',
          required: true,
          values: ['rascunho', 'publicado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_aulas_modulo ON aulas (modulo)',
        'CREATE INDEX idx_aulas_ordem ON aulas (ordem)',
        'CREATE INDEX idx_aulas_situacao ON aulas (situacao)',
      ],
    })
    app.save(aulas)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('aulas'))
  },
)
