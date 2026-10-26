// Endpoint do Webhook do Kiwify: POST /backend/v1/kiwify/webhook
// Validação oficial: signature = hmac_sha1(JSON.stringify(request.body), secretKey) em hex
// Protegido por token configurado no painel admin (coleção configuracoes -> kiwify_webhook_token)
// Idempotência garantida via kiwify_order_id e verificação de matrícula existente

routerAdd('POST', '/backend/v1/kiwify/webhook', (e) => {
  // 1. Obter o corpo bruto ou objeto da requisição
  const reqInfo = e.requestInfo()
  const query = reqInfo.query || {}
  const signatureQuery = (query.signature || '').toLowerCase().trim()

  // Buscar token secreto configurado na tabela configuracoes
  let secretKey = ''
  try {
    const configRec = $app.findFirstRecordByData('configuracoes', 'chave', 'kiwify_webhook_token')
    if (configRec) {
      secretKey = configRec.getString('valor') || ''
    }
  } catch (_) {}

  // Fallback para variável de ambiente se não estiver no banco
  if (!secretKey) {
    secretKey = $os.getenv('KIWIFY_WEBHOOK_TOKEN') || ''
  }

  // Se nenhum token estiver configurado, rejeitar por segurança
  if (!secretKey) {
    console.log('[Kiwify Webhook] Token de webhook não configurado no sistema.')
    return e.json(403, {
      sucesso: false,
      mensagem: 'Token de webhook Kiwify não configurado no painel.',
    })
  }

  // Se a requisição não enviou signature na query, rejeitar
  if (!signatureQuery) {
    console.log('[Kiwify Webhook] Requisição rejeitada: parâmetro "signature" ausente na URL.')
    return e.json(401, {
      sucesso: false,
      mensagem: 'Parâmetro signature ausente na URL.',
    })
  }

  const body = reqInfo.body || {}
  const bodyString = JSON.stringify(body)

  // 2. Função pura de HMAC-SHA1 em JavaScript para validar a assinatura
  const calcularHmacSha1Hex = (mensagem, chave) => {
    // Implementação RFC 2104 / SHA-1
    const rotl = (n, s) => (n << s) | (n >>> (32 - s))

    const sha1Words = (words, messageLength) => {
      words[messageLength >> 2] |= 0x80 << (24 - (messageLength % 4) * 8)
      words[(((messageLength + 8) >> 6) << 4) + 15] = messageLength * 8

      const w = new Array(80)
      let a = 1732584193
      let b = -271733879
      let c = -1732584194
      let d = 271733878
      let e = -1009589776

      for (let i = 0; i < words.length; i += 16) {
        const olda = a
        const oldb = b
        const oldc = c
        const oldd = d
        const olde = e

        for (let j = 0; j < 80; j++) {
          if (j < 16) {
            w[j] = words[i + j] || 0
          } else {
            w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)
          }

          let t
          if (j < 20) {
            t = (rotl(a, 5) + ((b & c) | (~b & d)) + e + w[j] + 1518500249) & 0xffffffff
          } else if (j < 40) {
            t = (rotl(a, 5) + (b ^ c ^ d) + e + w[j] + 1859775393) & 0xffffffff
          } else if (j < 60) {
            t = (rotl(a, 5) + ((b & c) | (b & d) | (c & d)) + e + w[j] - 1894007588) & 0xffffffff
          } else {
            t = (rotl(a, 5) + (b ^ c ^ d) + e + w[j] - 899497514) & 0xffffffff
          }

          e = d
          d = c
          c = rotl(b, 30)
          b = a
          a = t
        }

        a = (a + olda) & 0xffffffff
        b = (b + oldb) & 0xffffffff
        c = (c + oldc) & 0xffffffff
        d = (d + oldd) & 0xffffffff
        e = (e + olde) & 0xffffffff
      }

      return [a, b, c, d, e]
    }

    const stringToWords = (str) => {
      const words = []
      let byteLen = 0
      for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i)
        if (code < 0x80) {
          words[byteLen >> 2] |= code << (24 - (byteLen % 4) * 8)
          byteLen++
        } else if (code < 0x800) {
          words[byteLen >> 2] |= (0xc0 | (code >> 6)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | (code & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
        } else if (code < 0xd800 || code >= 0xe000) {
          words[byteLen >> 2] |= (0xe0 | (code >> 12)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | (code & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
        } else {
          i++
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
          words[byteLen >> 2] |= (0xf0 | (code >> 18)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
          words[byteLen >> 2] |= (0x80 | (code & 0x3f)) << (24 - (byteLen % 4) * 8)
          byteLen++
        }
      }
      return { words: words, length: byteLen }
    }

    const keyData = stringToWords(chave)
    let keyWords = keyData.words
    let keyLength = keyData.length

    if (keyLength > 64) {
      keyWords = sha1Words(keyWords, keyLength)
      keyLength = 20
    }

    const ipad = new Array(16)
    const opad = new Array(16)
    for (let i = 0; i < 16; i++) {
      const k = keyWords[i] || 0
      ipad[i] = k ^ 0x36363636
      opad[i] = k ^ 0x5c5c5c5c
    }

    const msgData = stringToWords(mensagem)
    const innerWords = ipad.concat(msgData.words)
    const innerLen = 64 + msgData.length
    const innerHash = sha1Words(innerWords, innerLen)

    const outerWords = opad.concat(innerHash)
    const outerLen = 64 + 20
    const outerHash = sha1Words(outerWords, outerLen)

    let hex = ''
    for (let i = 0; i < outerHash.length; i++) {
      const val = outerHash[i]
      for (let j = 3; j >= 0; j--) {
        const b = (val >>> (j * 8)) & 0xff
        hex += (b < 16 ? '0' : '') + b.toString(16)
      }
    }
    return hex.toLowerCase()
  }

  // 3. Comparar a assinatura esperada com a recebida
  const assinaturaCalculada = calcularHmacSha1Hex(bodyString, secretKey)

  if (assinaturaCalculada !== signatureQuery) {
    console.log(
      '[Kiwify Webhook] Assinatura INVÁLIDA! Esperado:',
      assinaturaCalculada,
      'Recebido:',
      signatureQuery,
    )
    return e.json(401, {
      sucesso: false,
      mensagem: 'Assinatura inválida (HMAC-SHA1 mismatch). Verifique o token configurado.',
    })
  }

  // 4. Extrair dados da notificação Kiwify
  // O payload pode vir direto na raiz ou aninhado em "order"
  const order = body.order || body
  const orderId = String(order.order_id || body.order_id || '')
  const orderRef = String(order.order_ref || body.order_ref || '')
  const orderStatus = String(order.order_status || body.order_status || '').toLowerCase()
  const eventType = String(order.webhook_event_type || body.webhook_event_type || '').toLowerCase()
  const checkoutLink = String(order.checkout_link || body.checkout_link || '')

  const customer = order.Customer || body.Customer || {}
  const customerEmail = String(customer.email || '')
    .toLowerCase()
    .trim()
  const customerName = String(customer.full_name || customer.name || '').trim()

  const product = order.Product || body.Product || {}
  const productIdKiwify = String(product.product_id || '')
  const productName = String(product.product_name || '')

  const commissions = order.Commissions || body.Commissions || {}
  // Valores financeiros do Kiwify chegam em CENTAVOS (ex: 11094 = R$ 110,94)
  const chargeAmountCents = commissions.charge_amount || 0
  const valorReais = chargeAmountCents > 0 ? chargeAmountCents / 100 : 0

  const tracking = order.TrackingParameters || body.TrackingParameters || {}
  const utmSource = tracking.utm_source || ''
  const utmMedium = tracking.utm_medium || ''
  const utmCampaign = tracking.utm_campaign || ''
  const utmContent = tracking.utm_content || ''
  const utmTerm = tracking.utm_term || ''
  const sck = tracking.sck || ''

  const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19)

  console.log(
    `[Kiwify Webhook] Evento recebido: ${eventType}, status: ${orderStatus}, order_id: ${orderId}, aluno: ${customerEmail}`,
  )

  // 5. Tratar eventos de cancelamento / estorno / falha
  const eventosFalha = ['order_rejected', 'order_refunded', 'chargeback', 'refund']
  const statusFalha = ['rejected', 'refunded', 'chargedback', 'canceled', 'expired']

  const isFalha = eventosFalha.indexOf(eventType) !== -1 || statusFalha.indexOf(orderStatus) !== -1

  if (isFalha) {
    let situacaoFinal = 'falhou'
    if (eventType === 'order_refunded' || orderStatus === 'refunded') situacaoFinal = 'expirado'
    if (eventType === 'chargeback' || orderStatus === 'chargedback') situacaoFinal = 'falhou'

    try {
      // Buscar pedido pelo order_id ou ref
      let pedidoExistente = null
      if (orderId) {
        try {
          pedidoExistente = $app.findFirstRecordByData('pedidos', 'kiwify_order_id', orderId)
        } catch (_) {}
      }

      if (pedidoExistente) {
        pedidoExistente.set('situacao', situacaoFinal)
        $app.save(pedidoExistente)

        // Se houver matrícula ativa vinculada, cancelar matrícula
        const alunoId = pedidoExistente.getString('aluno')
        const cursoId = pedidoExistente.getString('curso')
        if (alunoId && cursoId) {
          const matriculas = $app.findRecordsByFilter(
            'matriculas',
            'aluno = {:alunoId} && curso = {:cursoId}',
            '',
            1,
            0,
            { alunoId, cursoId },
          )
          if (matriculas.length > 0) {
            const mat = matriculas[0]
            mat.set('situacao', 'cancelada')
            $app.save(mat)
          }
        }
      }
    } catch (err) {
      console.log('[Kiwify Webhook] Erro ao registrar falha de pedido:', err)
    }

    return e.json(200, {
      sucesso: true,
      mensagem: 'Evento de cancelamento/falha processado com sucesso.',
      situacao: situacaoFinal,
    })
  }

  // 6. Tratar evento de aprovação: order_approved ou order_status === 'paid'
  const isAprovado = eventType === 'order_approved' || orderStatus === 'paid'

  if (!isAprovado) {
    // Outros eventos (ex: billet_created, pix_created) apenas acknowledge 200
    return e.json(200, {
      sucesso: true,
      mensagem: `Evento ${eventType || orderStatus} recebido e registrado (sem liberação de matrícula).`,
    })
  }

  // --- FLUXO DE APROVAÇÃO ---
  try {
    let resultado = null

    $app.runInTransaction((txApp) => {
      // A. Identificar o Aluno:
      // Tentar encontrar aluno existente por e-mail
      let alunoRecord = null
      if (customerEmail) {
        try {
          alunoRecord = txApp.findAuthRecordByEmail('_pb_users_auth_', customerEmail)
        } catch (_) {}
      }

      // Se o aluno ainda não existir no banco, criá-lo automaticamente com role 'aluno'
      if (!alunoRecord && customerEmail) {
        const usersCol = txApp.findCollectionByNameOrId('_pb_users_auth_')
        alunoRecord = new Record(usersCol)
        alunoRecord.setEmail(customerEmail)
        alunoRecord.setPassword('Skip@Pass123')
        alunoRecord.setVerified(true)
        alunoRecord.set('name', customerName || customerEmail.split('@')[0])
        alunoRecord.set('role', 'aluno')
        txApp.save(alunoRecord)
      }

      // B. Identificar o Curso correspondente:
      // Estratégia 1: Comparar o checkout_link do payload com o slug (último segmento) da URL do curso
      let cursoRecord = null
      const todosCursos = txApp.findRecordsByFilter('cursos', '', '', 0, 0)

      if (checkoutLink) {
        for (let i = 0; i < todosCursos.length; i++) {
          const c = todosCursos[i]
          const linkCadastrado = (c.getString('kiwify_checkout_url') || '').trim()
          if (linkCadastrado) {
            const segmentos = linkCadastrado.split('/').filter(Boolean)
            const slug = segmentos[segmentos.length - 1]
            if (slug && slug.toLowerCase() === checkoutLink.toLowerCase()) {
              cursoRecord = c
              break
            }
          }
        }
      }

      // Estratégia 2: Buscar pedido pendente recente desse aluno ou desse e-mail
      let pedidoPendente = null
      if (!cursoRecord && alunoRecord) {
        const pedidosPendentes = txApp.findRecordsByFilter(
          'pedidos',
          "(aluno = {:alunoId} || aluno_email = {:email}) && situacao = 'pendente'",
          '-created',
          1,
          0,
          { alunoId: alunoRecord.id, email: customerEmail },
        )
        if (pedidosPendentes.length > 0) {
          pedidoPendente = pedidosPendentes[0]
          try {
            cursoRecord = txApp.findRecordById('cursos', pedidoPendente.getString('curso'))
          } catch (_) {}
        }
      }

      // Estratégia 3: Se ainda não encontrou, associar ao curso publicado principal
      if (!cursoRecord && todosCursos.length > 0) {
        const publicados = todosCursos.filter((c) => c.getString('situacao') === 'publicado')
        cursoRecord = publicados.length > 0 ? publicados[0] : todosCursos[0]
      }

      if (!cursoRecord) {
        throw new Error('Nenhum curso correspondente encontrado no catálogo.')
      }

      // C. Idempotência do Pedido:
      // Verificar se já existe um pedido com este orderId
      let pedidoRecord = null
      if (orderId) {
        try {
          pedidoRecord = txApp.findFirstRecordByData('pedidos', 'kiwify_order_id', orderId)
        } catch (_) {}
      }

      // Se não encontrou por orderId, verificar se temos o pedido pendente localizado antes
      if (!pedidoRecord && pedidoPendente) {
        pedidoRecord = pedidoPendente
      }

      // Se ainda não encontrou pedido existente, verificar se há pedido pendente para este aluno+curso
      if (!pedidoRecord && alunoRecord && cursoRecord) {
        const pedidosPendentes = txApp.findRecordsByFilter(
          'pedidos',
          'aluno = {:alunoId} && curso = {:cursoId}',
          '-created',
          1,
          0,
          { alunoId: alunoRecord.id, cursoId: cursoRecord.id },
        )
        if (pedidosPendentes.length > 0) {
          pedidoRecord = pedidosPendentes[0]
        }
      }

      // Se já estiver marcado como pago com o mesmo orderId, idempotência pura: não duplica
      const pedidosCol = txApp.findCollectionByNameOrId('pedidos')
      let eraNovoPedido = false
      if (!pedidoRecord) {
        pedidoRecord = new Record(pedidosCol)
        eraNovoPedido = true
      }

      const valorFinal = valorReais > 0 ? valorReais : cursoRecord.getFloat('preco') || 0

      if (alunoRecord) {
        pedidoRecord.set('aluno', alunoRecord.id)
      }
      pedidoRecord.set('curso', cursoRecord.id)
      pedidoRecord.set('aluno_email', customerEmail)
      pedidoRecord.set(
        'aluno_nome',
        customerName || (alunoRecord ? alunoRecord.getString('name') : ''),
      )
      pedidoRecord.set('valor', valorFinal)
      pedidoRecord.set('situacao', 'pago')
      if (orderId) pedidoRecord.set('kiwify_order_id', orderId)
      if (orderRef) pedidoRecord.set('kiwify_order_ref', orderRef)
      if (checkoutLink) pedidoRecord.set('checkout_link', checkoutLink)
      pedidoRecord.set('data_confirmacao', agoraIso)

      // Salvar parâmetros de origem UTM / trk
      pedidoRecord.set('origem_utm', {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        sck: sck,
      })

      txApp.save(pedidoRecord)

      // D. Idempotência da Matrícula:
      // Criar a matrícula ativa do aluno no curso (se ainda não existir)
      let matriculaCriada = false
      if (alunoRecord && cursoRecord) {
        const matriculasExistentes = txApp.findRecordsByFilter(
          'matriculas',
          'aluno = {:alunoId} && curso = {:cursoId}',
          '',
          1,
          0,
          { alunoId: alunoRecord.id, cursoId: cursoRecord.id },
        )

        if (matriculasExistentes.length === 0) {
          const matriculasCol = txApp.findCollectionByNameOrId('matriculas')
          const novaMatricula = new Record(matriculasCol)
          novaMatricula.set('aluno', alunoRecord.id)
          novaMatricula.set('curso', cursoRecord.id)
          novaMatricula.set('situacao', 'ativa')
          novaMatricula.set('data_matricula', agoraIso)
          txApp.save(novaMatricula)
          matriculaCriada = true
        } else {
          // Se já existia, garantir que a situação é 'ativa'
          const mat = matriculasExistentes[0]
          if (mat.getString('situacao') !== 'ativa') {
            mat.set('situacao', 'ativa')
            txApp.save(mat)
          }
        }
      }

      resultado = {
        pedidoId: pedidoRecord.id,
        orderId: orderId,
        cursoId: cursoRecord.id,
        cursoTitulo: cursoRecord.getString('titulo'),
        alunoId: alunoRecord ? alunoRecord.id : null,
        alunoEmail: customerEmail,
        matriculaCriada: matriculaCriada,
        eraNovoPedido: eraNovoPedido,
      }
    })

    console.log(
      '[Kiwify Webhook] Pagamento aprovado processado com sucesso:',
      JSON.stringify(resultado),
    )

    return e.json(200, {
      sucesso: true,
      mensagem: 'Pagamento confirmado e matrícula liberada com sucesso.',
      detalhes: resultado,
    })
  } catch (err) {
    console.log('[Kiwify Webhook] Erro ao processar confirmação:', err)
    return e.json(500, {
      sucesso: false,
      mensagem: 'Erro ao processar webhook Kiwify: ' + String(err),
    })
  }
})
