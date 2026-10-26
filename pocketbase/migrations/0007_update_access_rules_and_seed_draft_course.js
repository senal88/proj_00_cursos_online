migrate(
  (app) => {
    // 1. Atualizar API rules das collections

    // Cursos:
    // Visitantes e alunos podem listar e ver cursos publicados.
    // Admin pode listar e ver todos (inclusive rascunho).
    const cursos = app.findCollectionByNameOrId('cursos')
    cursos.listRule = "@request.auth.role = 'admin' || situacao = 'publicado'"
    cursos.viewRule = "@request.auth.role = 'admin' || situacao = 'publicado'"
    app.save(cursos)

    // Módulos:
    // Qualquer visitante ou aluno pode ver módulos de cursos publicados (ou admin vê todos).
    const modulos = app.findCollectionByNameOrId('modulos')
    modulos.listRule = "@request.auth.role = 'admin' || curso.situacao = 'publicado'"
    modulos.viewRule = "@request.auth.role = 'admin' || curso.situacao = 'publicado'"
    app.save(modulos)

    // Aulas:
    // Regra rigorosa:
    // - Para listar/visualizar aulas com seus dados completos (video_url, etc.):
    //   Somente admin OU aluno com matrícula ATIVA no curso correspondente E com situacao='publicado'.
    //   Aulas em rascunho NÃO devem aparecer para aluno matriculado (apenas admin).
    //   PocketBase permite relacionamentos indiretos na regra:
    //   @request.auth.id != '' && situacao = 'publicado' && @collection.matriculas.id ?= true && @collection.matriculas.aluno = @request.auth.id && @collection.matriculas.curso = modulo.curso && @collection.matriculas.situacao = 'ativa'
    const aulas = app.findCollectionByNameOrId('aulas')
    aulas.listRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && situacao = 'publicado' && @collection.matriculas.aluno ?= @request.auth.id && @collection.matriculas.curso ?= modulo.curso && @collection.matriculas.situacao ?= 'ativa')"
    aulas.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && situacao = 'publicado' && @collection.matriculas.aluno ?= @request.auth.id && @collection.matriculas.curso ?= modulo.curso && @collection.matriculas.situacao ?= 'ativa')"
    app.save(aulas)

    // Matrículas:
    // Admin vê tudo; aluno só vê suas próprias matrículas.
    const matriculas = app.findCollectionByNameOrId('matriculas')
    matriculas.listRule = "@request.auth.role = 'admin' || aluno = @request.auth.id"
    matriculas.viewRule = "@request.auth.role = 'admin' || aluno = @request.auth.id"
    app.save(matriculas)

    // Progresso:
    // Admin vê tudo; aluno vê progresso vinculado à sua matrícula ativa.
    const progresso = app.findCollectionByNameOrId('progresso')
    progresso.listRule = "@request.auth.role = 'admin' || matricula.aluno = @request.auth.id"
    progresso.viewRule = "@request.auth.role = 'admin' || matricula.aluno = @request.auth.id"
    app.save(progresso)

    // 2. Atualizar o curso 'Marketing Digital' para 'publicado'
    try {
      const cursoMarketing = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
      cursoMarketing.set('situacao', 'publicado')
      app.save(cursoMarketing)
    } catch (_) {}

    // 3. Semear um segundo curso em rascunho para demonstrar que NÃO aparece na vitrine pública
    let cursoRascunho
    try {
      cursoRascunho = app.findFirstRecordByData(
        'cursos',
        'titulo',
        'Inteligência Artificial Aplicada',
      )
    } catch (_) {
      cursoRascunho = new Record(cursos)
      cursoRascunho.set('titulo', 'Inteligência Artificial Aplicada')
    }
    cursoRascunho.set('subtitulo', 'Domine ferramentas e conceitos práticos de IA')
    cursoRascunho.set(
      'descricao',
      'Curso em desenvolvimento com foco em automação e produtividade com IA.',
    )
    cursoRascunho.set('categoria', 'Tecnologia')
    cursoRascunho.set('imagem_capa', '')
    cursoRascunho.set('preco', 249)
    cursoRascunho.set('situacao', 'rascunho')
    app.save(cursoRascunho)

    // Semear módulo e aula em rascunho para este curso
    let moduloRascunho
    const modulosEncontrados = app.findRecordsByFilter(
      'modulos',
      'titulo = {:titulo} && curso = {:curso}',
      '',
      1,
      0,
      { titulo: 'Fundamentos de IA', curso: cursoRascunho.id },
    )
    if (modulosEncontrados.length > 0) {
      moduloRascunho = modulosEncontrados[0]
    } else {
      moduloRascunho = new Record(modulos)
      moduloRascunho.set('titulo', 'Fundamentos de IA')
      moduloRascunho.set('curso', cursoRascunho.id)
    }
    moduloRascunho.set('ordem', 1)
    app.save(moduloRascunho)

    let aulaRascunho
    const aulasEncontradas = app.findRecordsByFilter(
      'aulas',
      'titulo = {:titulo} && modulo = {:modulo}',
      '',
      1,
      0,
      { titulo: 'Introdução a LLMs', modulo: moduloRascunho.id },
    )
    if (aulasEncontradas.length > 0) {
      aulaRascunho = aulasEncontradas[0]
    } else {
      aulaRascunho = new Record(aulas)
      aulaRascunho.set('titulo', 'Introdução a LLMs')
      aulaRascunho.set('modulo', moduloRascunho.id)
    }
    aulaRascunho.set('descricao', 'Conceitos de transformers e modelos de linguagem')
    aulaRascunho.set('ordem', 1)
    aulaRascunho.set('video_url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    aulaRascunho.set('duracao_minutos', 14)
    aulaRascunho.set('situacao', 'rascunho')
    app.save(aulaRascunho)
  },
  (app) => {
    // Reverter regras e dados se necessário
    try {
      const cursoMarketing = app.findFirstRecordByData('cursos', 'titulo', 'Marketing Digital')
      cursoMarketing.set('situacao', 'rascunho')
      app.save(cursoMarketing)
    } catch (_) {}

    try {
      const cursoRascunho = app.findFirstRecordByData(
        'cursos',
        'titulo',
        'Inteligência Artificial Aplicada',
      )
      app.delete(cursoRascunho)
    } catch (_) {}
  },
)
