migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'patric.martins@adapta.org')
    } catch (_) {
      admin = new Record(users)
      admin.setEmail('patric.martins@adapta.org')
    }
    admin.setPassword('Skip@Pass')
    admin.setVerified(true)
    admin.set('name', 'Patric Martins')
    admin.set('role', 'admin')
    app.save(admin)

    let maria
    try {
      maria = app.findAuthRecordByEmail('_pb_users_auth_', 'maria.silva@email.com')
    } catch (_) {
      maria = new Record(users)
      maria.setEmail('maria.silva@email.com')
    }
    maria.setPassword('Skip@Pass')
    maria.setVerified(true)
    maria.set('name', 'Maria Silva')
    maria.set('role', 'aluno')
    app.save(maria)

    const cursos = app.findCollectionByNameOrId('cursos')
    let curso
    try {
      curso = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
    } catch (_) {
      curso = new Record(cursos)
      curso.set('titulo', 'Marketing Digital')
    }
    curso.set('subtitulo', 'Aprenda marketing digital do zero ao avançado')
    curso.set('descricao', 'Curso completo de marketing digital')
    curso.set('categoria', 'Marketing')
    curso.set('imagem_capa', '')
    curso.set('preco', 199)
    curso.set('situacao', 'rascunho')
    app.save(curso)

    const modulos = app.findCollectionByNameOrId('modulos')
    const moduloDados = [
      { titulo: 'Fundamentos', ordem: 1 },
      { titulo: 'Tráfego Pago', ordem: 2 },
    ]
    const modulosCriados = []

    for (let i = 0; i < moduloDados.length; i++) {
      const dados = moduloDados[i]
      let modulo
      const encontrados = app.findRecordsByFilter(
        'modulos',
        'titulo = {:titulo} && curso = {:curso}',
        '',
        1,
        0,
        {
          titulo: dados.titulo,
          curso: curso.id,
        },
      )
      if (encontrados.length > 0) {
        modulo = encontrados[0]
      } else {
        modulo = new Record(modulos)
        modulo.set('titulo', dados.titulo)
        modulo.set('curso', curso.id)
      }
      modulo.set('ordem', dados.ordem)
      app.save(modulo)
      modulosCriados.push(modulo)
    }

    const aulas = app.findCollectionByNameOrId('aulas')
    const aulaDados = [
      {
        modulo: 0,
        titulo: 'O que é marketing digital',
        ordem: 1,
        duracao: 15,
        video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        modulo: 0,
        titulo: 'Funil de vendas',
        ordem: 2,
        duracao: 18,
        video: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      },
      {
        modulo: 0,
        titulo: 'Posicionamento de marca',
        ordem: 3,
        duracao: 12,
        video: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      },
      {
        modulo: 1,
        titulo: 'Introdução ao tráfego pago',
        ordem: 1,
        duracao: 20,
        video: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      },
      {
        modulo: 1,
        titulo: 'Google Ads para iniciantes',
        ordem: 2,
        duracao: 25,
        video: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
      },
      {
        modulo: 1,
        titulo: 'Facebook e Instagram Ads',
        ordem: 3,
        duracao: 22,
        video: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      },
      {
        modulo: 1,
        titulo: 'Otimizando campanhas',
        ordem: 4,
        duracao: 28,
        video: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      },
    ]
    const aulasCriadas = []

    for (let i = 0; i < aulaDados.length; i++) {
      const dados = aulaDados[i]
      const modulo = modulosCriados[dados.modulo]
      let aula
      const encontradas = app.findRecordsByFilter(
        'aulas',
        'titulo = {:titulo} && modulo = {:modulo}',
        '',
        1,
        0,
        {
          titulo: dados.titulo,
          modulo: modulo.id,
        },
      )
      if (encontradas.length > 0) {
        aula = encontradas[0]
      } else {
        aula = new Record(aulas)
        aula.set('titulo', dados.titulo)
        aula.set('modulo', modulo.id)
      }
      aula.set('descricao', '')
      aula.set('ordem', dados.ordem)
      aula.set('video_url', dados.video)
      aula.set('duracao_minutos', dados.duracao)
      aula.set('situacao', 'publicado')
      app.save(aula)
      aulasCriadas.push(aula)
    }

    const matriculas = app.findCollectionByNameOrId('matriculas')
    let matricula
    const matriculasEncontradas = app.findRecordsByFilter(
      'matriculas',
      'aluno = {:aluno} && curso = {:curso}',
      '',
      1,
      0,
      {
        aluno: maria.id,
        curso: curso.id,
      },
    )
    if (matriculasEncontradas.length > 0) {
      matricula = matriculasEncontradas[0]
    } else {
      matricula = new Record(matriculas)
      matricula.set('aluno', maria.id)
      matricula.set('curso', curso.id)
      matricula.set('data_matricula', new Date().toISOString())
    }
    matricula.set('situacao', 'ativa')
    app.save(matricula)

    const progressos = app.findCollectionByNameOrId('progresso')
    const primeiraAula = aulasCriadas[0]
    let progresso
    const progressosEncontrados = app.findRecordsByFilter(
      'progresso',
      'matricula = {:matricula} && aula = {:aula}',
      '',
      1,
      0,
      {
        matricula: matricula.id,
        aula: primeiraAula.id,
      },
    )
    if (progressosEncontrados.length > 0) {
      progresso = progressosEncontrados[0]
    } else {
      progresso = new Record(progressos)
      progresso.set('matricula', matricula.id)
      progresso.set('aula', primeiraAula.id)
    }
    progresso.set('situacao', 'iniciada')
    progresso.set('minuto_parada', 7)
    progresso.set('data_conclusao', '')
    app.save(progresso)
  },
  (app) => {
    try {
      const maria = app.findAuthRecordByEmail('_pb_users_auth_', 'maria.silva@email.com')
      app.delete(maria)
    } catch (_) {}
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'patric.martins@adapta.org')
      app.delete(admin)
    } catch (_) {}
    try {
      const curso = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
      app.delete(curso)
    } catch (_) {}
  },
)
