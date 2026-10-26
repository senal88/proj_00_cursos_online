migrate(
  (app) => {
    const cursos = app.findCollectionByNameOrId('cursos')
    const modulos = new Collection({
      name: 'modulos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'ordem', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'curso',
          type: 'relation',
          required: true,
          collectionId: cursos.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_modulos_curso ON modulos (curso)',
        'CREATE INDEX idx_modulos_ordem ON modulos (ordem)',
      ],
    })
    app.save(modulos)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('modulos'))
  },
)
