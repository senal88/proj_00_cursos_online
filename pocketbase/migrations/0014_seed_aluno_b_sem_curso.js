migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Aluno B: logado mas SEM matrícula em nenhum curso
    let alunoB
    try {
      alunoB = app.findAuthRecordByEmail('_pb_users_auth_', 'aluno.semcurso@email.com')
    } catch (_) {
      alunoB = new Record(users)
      alunoB.setEmail('aluno.semcurso@email.com')
    }
    alunoB.setPassword('Skip@Pass')
    alunoB.setVerified(true)
    alunoB.set('name', 'Aluno Sem Curso')
    alunoB.set('role', 'aluno')
    app.save(alunoB)
  },
  (app) => {
    try {
      const alunoB = app.findAuthRecordByEmail('_pb_users_auth_', 'aluno.semcurso@email.com')
      app.delete(alunoB)
    } catch (_) {}
  },
)
