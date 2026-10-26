migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'aluno'],
          maxSelect: 1,
          required: true,
        }),
      )
    }

    users.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.createRule = ''
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    users.addIndex('idx_users_role', false, 'role', '')
    app.save(users)

    const cursos = new Collection({
      name: 'cursos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'subtitulo', type: 'text' },
        { name: 'descricao', type: 'text', required: true },
        { name: 'categoria', type: 'text', required: true },
        {
          name: 'imagem_capa',
          type: 'file',
          maxSelect: 1,
          maxSize: 2097152,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'preco', type: 'number', required: true, min: 0 },
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
        'CREATE INDEX idx_cursos_situacao ON cursos (situacao)',
        'CREATE INDEX idx_cursos_categoria ON cursos (categoria)',
      ],
    })
    app.save(cursos)
  },
  (app) => {
    const cursos = app.findCollectionByNameOrId('cursos')
    app.delete(cursos)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.removeIndex('idx_users_role')
    const role = users.fields.getByName('role')
    if (role) users.fields.removeById(role.id)
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
