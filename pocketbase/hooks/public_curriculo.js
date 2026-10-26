// Hook de endpoint público para listar a grade curricular pública de um curso (apenas títulos, sem vazar video_url ou dados sensíveis)
routerAdd('GET', '/backend/v1/public-curriculo/:cursoId', (e) => {
  const cursoId = e.requestInfo().pathParams.cursoId

  try {
    const curso = $app.findRecordById('cursos', cursoId)
    // Se o curso estiver em rascunho e não for admin, não deve aparecer
    const authRecord = e.auth
    const isAdmin = authRecord && authRecord.getString('role') === 'admin'
    if (curso.getString('situacao') !== 'publicado' && !isAdmin) {
      return e.json(404, { message: 'Curso não encontrado ou indisponível' })
    }

    // Buscar módulos do curso ordenados
    const modulos = $app.findRecordsByFilter('modulos', 'curso = {:cursoId}', 'ordem', 0, 0, {
      cursoId: cursoId,
    })

    const resultado = []
    for (let i = 0; i < modulos.length; i++) {
      const mod = modulos[i]
      // Buscar apenas aulas publicadas (aulas em rascunho nunca aparecem na vitrine nem para visitante)
      const aulas = $app.findRecordsByFilter(
        'aulas',
        "modulo = {:modId} && situacao = 'publicado'",
        'ordem',
        0,
        0,
        { modId: mod.id },
      )

      resultado.push({
        id: mod.id,
        titulo: mod.getString('titulo'),
        ordem: mod.getInt('ordem'),
        aulas: aulas.map((a) => ({
          id: a.id,
          titulo: a.getString('titulo'),
          ordem: a.getInt('ordem'),
          duracao_minutos: a.getInt('duracao_minutos'),
        })),
      })
    }

    return e.json(200, {
      cursoId: curso.id,
      modulos: resultado,
    })
  } catch (err) {
    return e.json(404, { message: 'Curso não encontrado', error: String(err) })
  }
})
