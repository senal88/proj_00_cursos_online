migrate(
  (app) => {
    const aulas = app.findCollectionByNameOrId('aulas')

    if (!aulas.fields.getByName('arquivos_materiais')) {
      aulas.fields.add(
        new FileField({
          name: 'arquivos_materiais',
          maxSelect: 10,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'application/pdf',
            'application/zip',
            'application/x-zip-compressed',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/png',
            'image/jpeg',
          ],
        }),
      )
      app.save(aulas)
    }
  },
  (app) => {
    try {
      const aulas = app.findCollectionByNameOrId('aulas')
      const campo = aulas.fields.getByName('arquivos_materiais')
      if (campo) {
        aulas.fields.remove(campo)
        app.save(aulas)
      }
    } catch (_) {}
  },
)
