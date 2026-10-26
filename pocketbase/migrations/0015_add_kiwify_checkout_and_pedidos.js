migrate(
  (app) => {
    // 1. Adicionar campo kiwify_checkout_url na coleção cursos
    const cursos = app.findCollectionByNameOrId('cursos')
    if (!cursos.fields.getByName('kiwify_checkout_url')) {
      cursos.fields.add(
        new URLField({
          name: 'kiwify_checkout_url',
          required: false,
        }),
      )
      app.save(cursos)
    }

    // 2. Criar coleção configuracoes para chave/token Kiwify
    let configuracoes
    try {
      configuracoes = app.findCollectionByNameOrId('configuracoes')
    } catch (_) {
      configuracoes = new Collection({
        name: 'configuracoes',
        type: 'base',
        listRule: "@request.auth.role = 'admin'",
        viewRule: "@request.auth.role = 'admin'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'chave', type: 'text', required: true },
          { name: 'valor', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_configuracoes_chave ON configuracoes (chave)'],
      })
      app.save(configuracoes)

      // Semear registro inicial para token do Kiwify
      const rec = new Record(configuracoes)
      rec.set('chave', 'kiwify_webhook_token')
      rec.set('valor', 'token_kiwify_segredo_exemplo')
      app.save(rec)
    }

    // 3. Criar coleção pedidos
    // Requisitos: aluno, curso, valor, situacao (pendente, pago, falhou, expirado),
    // data de criacao, data de confirmacao, kiwify_order_id, checkout_link, origem_utm
    let pedidos
    try {
      pedidos = app.findCollectionByNameOrId('pedidos')
    } catch (_) {
      pedidos = new Collection({
        name: 'pedidos',
        type: 'base',
        // Regras: admin vê todos; aluno logado vê seus próprios pedidos; autenticado ou visitante pode criar pedido pendente
        listRule: "@request.auth.role = 'admin' || aluno = @request.auth.id",
        viewRule: "@request.auth.role = 'admin' || aluno = @request.auth.id",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'aluno',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'curso',
            type: 'relation',
            required: true,
            collectionId: cursos.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'aluno_email', type: 'text', required: false },
          { name: 'aluno_nome', type: 'text', required: false },
          { name: 'valor', type: 'number', required: true, min: 0 },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['pendente', 'pago', 'falhou', 'expirado'],
            maxSelect: 1,
          },
          { name: 'kiwify_order_id', type: 'text', required: false },
          { name: 'kiwify_order_ref', type: 'text', required: false },
          { name: 'checkout_link', type: 'text', required: false },
          { name: 'origem_utm', type: 'json', required: false },
          { name: 'data_confirmacao', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pedidos_aluno ON pedidos (aluno)',
          'CREATE INDEX idx_pedidos_curso ON pedidos (curso)',
          'CREATE INDEX idx_pedidos_situacao ON pedidos (situacao)',
          'CREATE INDEX idx_pedidos_order_id ON pedidos (kiwify_order_id)',
          'CREATE INDEX idx_pedidos_email ON pedidos (aluno_email)',
        ],
      })
      app.save(pedidos)
    }

    // 4. Semear um link de checkout de exemplo no curso Marketing Digital
    try {
      const cursoMarketing = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
      if (cursoMarketing && !cursoMarketing.getString('kiwify_checkout_url')) {
        cursoMarketing.set('kiwify_checkout_url', 'https://kiwify.app/DHOtfJC')
        app.save(cursoMarketing)
      }
    } catch (_) {}

    // 5. Semear um pedido de exemplo para visualização no painel
    try {
      const cursoMarketing = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
      const maria = app.findAuthRecordByEmail('_pb_users_auth_', 'maria.silva@email.com')
      if (cursoMarketing && maria) {
        const pedidosEncontrados = app.findRecordsByFilter(
          'pedidos',
          'aluno = {:alunoId} && curso = {:cursoId}',
          '',
          1,
          0,
          { alunoId: maria.id, cursoId: cursoMarketing.id },
        )
        if (pedidosEncontrados.length === 0) {
          const ped = new Record(pedidos)
          ped.set('aluno', maria.id)
          ped.set('curso', cursoMarketing.id)
          ped.set('aluno_email', maria.getString('email'))
          ped.set('aluno_nome', maria.getString('name'))
          ped.set('valor', 199)
          ped.set('situacao', 'pago')
          ped.set('kiwify_order_id', 'kiwify_seed_order_123')
          ped.set('kiwify_order_ref', 'DHOtfJC')
          ped.set('checkout_link', 'DHOtfJC')
          ped.set('origem_utm', { utm_source: 'organico', utm_campaign: 'vitrine' })
          ped.set('data_confirmacao', new Date().toISOString().replace('T', ' ').substring(0, 19))
          app.save(ped)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const configuracoes = app.findCollectionByNameOrId('configuracoes')
      app.delete(configuracoes)
    } catch (_) {}

    try {
      const pedidos = app.findCollectionByNameOrId('pedidos')
      app.delete(pedidos)
    } catch (_) {}

    try {
      const cursos = app.findCollectionByNameOrId('cursos')
      const campoCheckout = cursos.fields.getByName('kiwify_checkout_url')
      if (campoCheckout) {
        cursos.fields.removeById(campoCheckout.id)
        app.save(cursos)
      }
    } catch (_) {}
  },
)
