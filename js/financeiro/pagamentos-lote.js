async function abrirFormularioPagamentoLote(id = null) {
    AppEstado.modoEdicao = 'pagamentos_lote';
    AppEstado.registroEmEdicao = id;

    const [cursos, paroquias, participantes, lote] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('paroquias'),
        bd.obterTodos('participantes'),
        id ? bd.obter('pagamentos_lote', id) : Promise.resolve(null)
    ]);

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    paroquias.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    document.getElementById('titulo-janela').textContent = id ? 'Editar Pagamento em Lote' : 'Novo Pagamento em Lote';

    const dataLote = lote?.data || Utilidades.obterDataAtual();
    let formulario = '<form novalidate id="formulario-pagamento-lote" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamentoLote(event)">';
    formulario += criarSeletor('Curso', 'id_curso_lote', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), lote?.id_curso || '', true);
    formulario += criarSeletor('Paróquia', 'id_paroquia_lote', paroquias.map(paroquia => ({ id: paroquia.id, nome: paroquia.nome })), lote?.id_paroquia || '', true);
    formulario += '<div id="recipiente-referencia-lote" class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md"></div>';
    formulario += '<div id="recipiente-participantes-lote" class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md"></div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Descrição', 'text', 'descricao_lote', lote?.descricao || '', 'Ex: Inscrição', true) + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', lote?.valor_unitario || '', '', true) + '</div>';
    formulario += '</div>';
    formulario += '<input type="hidden" id="data_lote" value="' + dataLote + '">';
    formulario += criarCampoSomenteLeitura('Data do Recebimento', 'data_lote_visual', Utilidades.formatarData(dataLote));
    formulario += criarCampoSomenteLeitura('Valor Total', 'valor_total_lote', Utilidades.formatarMoeda(lote?.valor_total || 0));
    formulario += criarRodapeFormulario('', id ? 'Atualizar Pagamento em Lote' : 'Salvar Pagamento em Lote', {
        tipoSalvar: 'submit',
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoLoteEGerarRecibo()', 'secundario', 'md-w-total', 'button', '')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    document.getElementById('valor_unitario_lote')?.setAttribute('step', '0.01');
    document.getElementById('id_curso_lote')?.toggleAttribute('disabled', Boolean(lote));
    document.getElementById('id_paroquia_lote')?.toggleAttribute('disabled', Boolean(lote));
    if (!lote) {
        document.getElementById('id_curso_lote')?.addEventListener('change', () => atualizarFormularioPagamentoLote(participantes, lote));
        document.getElementById('id_paroquia_lote')?.addEventListener('change', () => atualizarFormularioPagamentoLote(participantes, lote));
    }
    document.getElementById('recipiente-referencia-lote')?.addEventListener('change', evento => {
        if (evento.target?.id === 'tipo_cobranca_lote') atualizarGrupoCobrancasPagamento('tipo_cobranca_lote', 'marcador-cobranca-lote', !lote);
        atualizarValorPagamentoLote();
    });
    document.getElementById('valor_unitario_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('descricao_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('recipiente-participantes-lote')?.addEventListener('change', async () => {
        await atualizarReferenciasPagamentoLote(lote, participantes);
        atualizarValorPagamentoLote();
    });

    await atualizarFormularioPagamentoLote(participantes, lote);
    Interface.abrirJanela('janela-formulario');
}

async function atualizarFormularioPagamentoLote(participantes, lote = null) {
    await atualizarReferenciasPagamentoLote(lote, participantes);
    await renderizarParticipantesLotePagamento(participantes, lote);
    await atualizarValorPagamentoLote();
}

async function atualizarReferenciasPagamentoLote(lote = null, participantes = []) {
    const idCurso = document.getElementById('id_curso_lote')?.value || '';
    const recipiente = document.getElementById('recipiente-referencia-lote');
    if (!recipiente) return;

    const pagamentos = await bd.obterTodos('pagamentos');

    if (lote) {
        const opcoes = montarOpcoesCobrancasRegistradasLote(lote, pagamentos);
        const marcadasAtuais = new Set(Array.from(document.querySelectorAll('.marcador-cobranca-lote:checked')).map(campo => campo.value));
        const marcadas = marcadasAtuais.size > 0
            ? new Set(opcoes.filter(opcao => marcadasAtuais.has(opcao.id)).map(opcao => opcao.id))
            : new Set(opcoes.map(opcao => opcao.id));
        const tipoSelecionado = obterTipoCobrancaSelecionado(opcoes, lote.tipo === 'Múltiplas' ? '' : lote.tipo);
        recipiente.innerHTML = montarControleCobrancasPagamento(opcoes, marcadas, 'marcador-cobranca-lote', 'tipo_cobranca_lote', tipoSelecionado);
        atualizarGrupoCobrancasPagamento('tipo_cobranca_lote', 'marcador-cobranca-lote', false);
        return;
    }

    const curso = idCurso ? await bd.obter('cursos', idCurso) : null;
    const [disciplinas, frequencias] = await Promise.all([
        bd.obterTodos('disciplinas'),
        bd.obterTodos('frequencias')
    ]);
    const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(idCurso));
    const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(idCurso));
    const participantesBase = await obterParticipantesBaseCobrancasLote(participantes, curso, disciplinasCurso, frequenciasCurso, pagamentos, { ignorarLoteId: AppEstado.registroEmEdicao });
    const opcoes = montarOpcoesCobrancaLote(curso, disciplinasCurso, participantesBase, pagamentos, { ignorarLoteId: AppEstado.registroEmEdicao }, frequenciasCurso);
    const marcadasAtuais = new Set(Array.from(document.querySelectorAll('.marcador-cobranca-lote:checked')).map(campo => campo.value));
    const tipoSelecionado = obterTipoCobrancaSelecionado(opcoes, '');
    recipiente.innerHTML = montarControleCobrancasPagamento(opcoes, marcadasAtuais, 'marcador-cobranca-lote', 'tipo_cobranca_lote', tipoSelecionado);
    atualizarGrupoCobrancasPagamento('tipo_cobranca_lote', 'marcador-cobranca-lote');
}

function montarOpcoesCobrancasRegistradasLote(lote = null, pagamentos = []) {
    const cobrancasRegistradas = obterCobrancasRegistradasLote(lote, pagamentos);
    if (!cobrancasRegistradas.length) {
        return [{ id: '', nome: 'Nenhuma cobrança registrada neste lote.', valor: 0, descricao: '' }];
    }

    return ordenarOpcoesCobrancaPagamento(cobrancasRegistradas.map(cobranca => ({
        id: codificarCobrancaPagamento(cobranca),
        tipo: cobranca.tipo,
        nome: `${cobranca.descricao || cobranca.tipo} - ${Utilidades.formatarMoeda(cobranca.valor)}`,
        descricao: cobranca.descricao || cobranca.tipo,
        valor: Utilidades.normalizarValorMonetario(cobranca.valor)
    })));
}

function obterCobrancasRegistradasLote(lote = null, pagamentos = []) {
    if (!lote) return [];

    const origem = Array.isArray(lote.cobrancas) && lote.cobrancas.length
        ? lote.cobrancas
        : pagamentos.filter(pagamento => String(pagamento.id_lote || '') === String(lote.id));

    const mapa = new Map();
    origem.forEach(cobranca => {
        const chave = codificarCobrancaPagamento(cobranca);
        if (!chave || mapa.has(chave)) return;
        mapa.set(chave, {
            tipo: cobranca.tipo,
            referencia_id: cobranca.referencia_id || '',
            referencia_indice: cobranca.referencia_indice || null,
            descricao: cobranca.descricao || cobranca.tipo || 'Pagamento',
            valor: Utilidades.normalizarValorMonetario(cobranca.valor)
        });
    });

    return Array.from(mapa.values());
}

function montarOpcoesCobrancaLote(curso = null, disciplinas = [], participantes = [], pagamentos = [], contexto = {}, frequencias = []) {
    if (!curso) return [{ id: '', nome: 'Selecione o curso para listar as cobranças disponíveis.', valor: 0, descricao: '' }];
    if (!participantes.length) return [{ id: '', nome: 'Selecione curso e paróquia para listar as cobranças abertas do lote.', valor: 0, descricao: '' }];

    const mapaOpcoes = new Map();
    const participantesConsiderados = participantes.filter(participante => String(participante.id_curso) === String(curso.id));

    participantesConsiderados.forEach(participante => {
        const obrigacoesAbertas = obterObrigacoesAbertasParticipante(participante, curso, disciplinas, frequencias, pagamentos, contexto);
        obrigacoesAbertas.forEach(obrigacao => {
            const chave = codificarCobrancaPagamento(obrigacao);
            const registro = mapaOpcoes.get(chave) || { obrigacao, ocorrencias: 0 };
            registro.ocorrencias++;
            mapaOpcoes.set(chave, registro);
        });
    });

    const opcoes = Array.from(mapaOpcoes.values())
        .filter(registro => registro.ocorrencias === participantesConsiderados.length)
        .map(({ obrigacao }) => ({
            id: codificarCobrancaPagamento(obrigacao),
            tipo: obrigacao.tipo,
            nome: `${obrigacao.descricao} - ${Utilidades.formatarMoeda(obrigacao.valor)}`,
            descricao: obrigacao.descricao,
            valor: Utilidades.normalizarValorMonetario(obrigacao.valor)
        }));

    opcoes.push({ id: 'Outros||outros||', tipo: 'Outros', nome: 'Outros - valor manual', descricao: 'Outros', valor: 0 });
    return ordenarOpcoesCobrancaPagamento(opcoes);
}

async function salvarPagamentoLote(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function' ? {} : eventoOuOpcoes;
    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') eventoOuOpcoes.preventDefault();
    if (AppEstado.salvandoPagamentoLote) return null;

    AppEstado.salvandoPagamentoLote = true;
    try {
        const dados = await obterDadosFormularioPagamentoLote();
        if (!validarFormularioPagamentoLote(dados)) return null;

        const participantes = await bd.obterTodos('participantes');
        const loteOriginal = AppEstado.registroEmEdicao ? await bd.obter('pagamentos_lote', AppEstado.registroEmEdicao) : null;
        const pagamentos = loteOriginal ? await bd.obterTodos('pagamentos') : [];
        const cobrancasOriginais = new Set(obterCobrancasRegistradasLote(loteOriginal, pagamentos).map(codificarCobrancaPagamento));
        const participantesOriginais = new Set((loteOriginal?.ids_participantes || []).map(String));

        for (const cobranca of dados.cobrancas) {
            if (cobranca.tipo === 'Outros') continue;
            const chaveCobranca = codificarCobrancaPagamento(cobranca);
            for (const idParticipante of dados.ids_participantes) {
                if (cobrancasOriginais.has(chaveCobranca) && participantesOriginais.has(String(idParticipante))) continue;

                const validacao = await validarPagamento(montarDadosPagamentoPorCobranca({ ...dados, id_participante: idParticipante }, cobranca), { ignorarLoteId: AppEstado.registroEmEdicao });
                if (!validacao.valido) {
                    const participante = participantes.find(item => String(item.id) === String(idParticipante));
                    Utilidades.notificacao(`${participante?.nome || 'Participante'}: ${validacao.mensagem}`, 'erro');
                    return null;
                }
            }
        }

        const lote = montarPagamentoLote(dados, AppEstado.registroEmEdicao);
        await bd.salvar('pagamentos_lote', lote);

        await removerPagamentosDoLote(lote.id);
        for (const idParticipante of lote.ids_participantes) {
            for (const cobranca of lote.cobrancas) {
                const pagamento = montarPagamento(montarDadosPagamentoPorCobranca({ ...dados, id_participante: idParticipante, id_lote: lote.id }, cobranca));
                await bd.salvar('pagamentos', pagamento);
            }
        }

        if (opcoes.notificar !== false) Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Pagamento em lote atualizado!' : 'Pagamento em lote salvo com sucesso!', 'sucesso');
        if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
        if (opcoes.renderizar !== false) await renderizarAbaAtual();
        return lote;
    } finally {
        AppEstado.salvandoPagamentoLote = false;
    }
}

async function salvarPagamentoLoteEGerarRecibo() {
    const lote = await salvarPagamentoLote({ fecharJanela: true, renderizar: true, notificar: true });
    if (lote) await acionarReciboDiretoLote(lote.id);
}

async function editarPagamentoLote(id) {
    await abrirFormularioPagamentoLote(id);
}

async function excluirPagamentoLote(id) {
    if (!confirm('Deseja realmente excluir este pagamento em lote?')) return;
    await removerPagamentosDoLote(id);
    await bd.excluir('pagamentos_lote', id);
    Utilidades.notificacao('Pagamento em lote excluído!', 'sucesso');
    await renderizarAbaAtual();
}

function participanteDeveAparecerNoLote(participante, curso = null, disciplinas = [], frequencias = [], pagamentos = [], contexto = {}) {
    if (Utilidades.participanteEstaAtivo(participante)) return true;
    if (!curso || !cursoCobraDesistentes(curso)) return false;

    return obterObrigacoesAbertasParticipante(participante, curso, disciplinas, frequencias, pagamentos, contexto).length > 0;
}

async function obterParticipantesFiltradosLote(participantes = [], curso = null, disciplinas = [], frequencias = [], pagamentos = [], contexto = {}) {
    const idCurso = document.getElementById('id_curso_lote')?.value || '';
    const idParoquia = document.getElementById('id_paroquia_lote')?.value || '';

    if (!idCurso || !idParoquia) return [];

    return participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .filter(participante => String(participante.id_paroquia) === String(idParoquia))
        .filter(participante => participanteDeveAparecerNoLote(participante, curso, disciplinas, frequencias, pagamentos, contexto));
}

async function obterParticipantesBaseCobrancasLote(participantes = [], curso = null, disciplinas = [], frequencias = [], pagamentos = [], contexto = {}) {
    const idsMarcados = new Set(obterIdsParticipantesLoteMarcados().map(String));
    const filtrados = await obterParticipantesFiltradosLote(participantes, curso, disciplinas, frequencias, pagamentos, contexto);

    if (idsMarcados.size > 0) {
        return filtrados.filter(participante => idsMarcados.has(String(participante.id)));
    }

    return filtrados;
}

async function renderizarParticipantesLotePagamento(participantes, lote = null) {
    const idCurso = document.getElementById('id_curso_lote')?.value || '';
    const idParoquia = document.getElementById('id_paroquia_lote')?.value || '';
    const recipiente = document.getElementById('recipiente-participantes-lote');
    if (!recipiente) return;

    const idsMarcados = new Set((lote?.ids_participantes || []).map(String));
    let filtrados = [];

    if (lote) {
        filtrados = participantes.filter(participante => idsMarcados.has(String(participante.id)));
    } else if (idCurso && idParoquia) {
        const [curso, disciplinas, frequencias, pagamentos] = await Promise.all([
            bd.obter('cursos', idCurso),
            bd.obterTodos('disciplinas'),
            bd.obterTodos('frequencias'),
            bd.obterTodos('pagamentos')
        ]);
        const disciplinasCurso = disciplinas.filter(disciplina => String(disciplina.id_curso) === String(idCurso));
        const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(idCurso));
        filtrados = await obterParticipantesFiltradosLote(participantes, curso, disciplinasCurso, frequenciasCurso, pagamentos, { ignorarLoteId: AppEstado.registroEmEdicao });
    }

    filtrados = filtrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (!idCurso || !idParoquia) {
        recipiente.innerHTML = '<p class="texto-sm cor-texto-claro m-zero">Selecione curso e paróquia para listar os participantes.</p>';
        return;
    }

    if (filtrados.length === 0) {
        recipiente.innerHTML = '<p class="texto-sm cor-texto-claro m-zero">Nenhum participante encontrado para este curso e paróquia.</p>';
        return;
    }

    recipiente.innerHTML = `
        <h3 class="texto-md peso-bold cor-texto-primario mb-sm">Participantes do lote</h3>
        <div class="lista-selecao flex flex-coluna gap-xs">
            ${filtrados.map(participante => `
                <label class="flex itens-centro gap-sm p-sm fundo-branco hover-fundo-superficie-2 raio-xxs cursor-apontador transicao">
                    <input type="checkbox" class="checkbox-padrao marcador-participante-lote" value="${participante.id}" ${idsMarcados.has(String(participante.id)) ? 'checked' : ''}>
                    <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(participante.nome)}${Utilidades.participanteEstaAtivo(participante) ? '' : ' <span class="etiqueta">Desistente</span>'}</span>
                </label>
            `).join('')}
        </div>
    `;
}

async function atualizarValorPagamentoLote() {
    const cobrancas = obterCobrancasLoteMarcadas();
    const campoDescricao = document.getElementById('descricao_lote');
    const campoValorUnitario = document.getElementById('valor_unitario_lote');
    const campoValorTotal = document.getElementById('valor_total_lote');
    const idsParticipantes = obterIdsParticipantesLoteMarcados();
    if (!campoDescricao || !campoValorUnitario || !campoValorTotal) return;

    const temManual = cobrancas.some(cobranca => cobranca.tipo === 'Outros');
    const somenteManual = cobrancas.length === 1 && temManual;
    campoValorUnitario.readOnly = cobrancas.length > 0 && !temManual;

    if (cobrancas.length === 0) {
        campoDescricao.value = '';
        campoValorUnitario.value = '';
        campoValorTotal.value = Utilidades.formatarMoeda(0);
        return;
    }

    if (!somenteManual) {
        const automaticas = cobrancas.filter(cobranca => cobranca.tipo !== 'Outros');
        const valorAutomatico = automaticas.reduce((total, cobranca) => total + Utilidades.normalizarValorMonetario(cobranca.valor), 0);
        const valorAtual = Utilidades.normalizarValorMonetario(campoValorUnitario.value);
        const valorManual = temManual ? Math.max(valorAtual - valorAutomatico, 0) : 0;
        campoDescricao.value = temManual ? (campoDescricao.value || montarDescricaoPagamento([...automaticas, { tipo: 'Outros', descricao: 'Outros' }])) : montarDescricaoPagamento(automaticas);
        campoValorUnitario.value = temManual ? valorAutomatico + valorManual : valorAutomatico;
    } else {
        campoDescricao.value = campoDescricao.value || 'Outros';
    }

    const valorUnitario = Utilidades.normalizarValorMonetario(campoValorUnitario.value);
    campoValorTotal.value = Utilidades.formatarMoeda(valorUnitario * idsParticipantes.length);
}

function obterCobrancasLoteMarcadas() {
    return Array.from(document.querySelectorAll('.marcador-cobranca-lote:checked')).map(marcador => ({
        ...decodificarCobrancaPagamento(marcador.value),
        descricao: marcador.dataset.descricao || '',
        valor: Utilidades.normalizarValorMonetario(marcador.dataset.valor || 0)
    }));
}

async function obterDadosFormularioPagamentoLote() {
    const cobrancas = obterCobrancasLoteMarcadas();
    const idsParticipantes = obterIdsParticipantesLoteMarcados();
    const participantes = await bd.obterTodos('participantes');
    const nomes = idsParticipantes.map(id => participantes.find(participante => String(participante.id) === String(id))?.nome || id);
    const valorUnitario = Utilidades.normalizarValorMonetario(document.getElementById('valor_unitario_lote')?.value || 0);

    return {
        id_curso: document.getElementById('id_curso_lote')?.value || '',
        id_paroquia: document.getElementById('id_paroquia_lote')?.value || '',
        ids_participantes: idsParticipantes,
        nomes_participantes: nomes,
        cobrancas,
        descricao: document.getElementById('descricao_lote')?.value.trim() || '',
        valor_unitario: valorUnitario,
        valor_total: valorUnitario * idsParticipantes.length,
        data: document.getElementById('data_lote')?.value || Utilidades.obterDataAtual()
    };
}

function montarPagamentoLote(dados, id = null) {
    const tipos = [...new Set(dados.cobrancas.map(cobranca => cobranca.tipo))];
    return {
        id: id || Utilidades.gerarId(),
        id_curso: dados.id_curso,
        id_paroquia: dados.id_paroquia,
        ids_participantes: dados.ids_participantes,
        nomes_participantes: dados.nomes_participantes,
        tipo: tipos.length === 1 ? tipos[0] : 'Múltiplas',
        referencia_tipo: tipos.length === 1 ? obterReferenciaTipoPagamento(tipos[0]) : 'multiplas',
        referencia_id: '',
        referencia_indice: null,
        quantidade: dados.cobrancas.length,
        cobrancas: dados.cobrancas,
        descricao: dados.descricao,
        valor_unitario: dados.valor_unitario,
        valor_total: dados.valor_total,
        data: dados.data
    };
}

function validarFormularioPagamentoLote(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Curso', valor: dados.id_curso },
        { nome: 'Paróquia', valor: dados.id_paroquia },
        { nome: 'Cobranças', valor: dados.cobrancas.length },
        { nome: 'Participantes', valor: dados.ids_participantes.length },
        { nome: 'Descrição', valor: dados.descricao },
        { nome: 'Valor unitário', valor: dados.valor_unitario },
        { nome: 'Data', valor: dados.data }
    ])) return false;

    if (!Validacao.listaNaoVazia(dados.cobrancas)) {
        Utilidades.notificacao('Selecione ao menos uma cobrança para o lote.', 'erro');
        return false;
    }

    if (!Validacao.listaNaoVazia(dados.ids_participantes)) {
        Utilidades.notificacao('Selecione ao menos um participante para o lote.', 'erro');
        return false;
    }

    if (cobrancasPossuemDuplicidade(dados.cobrancas)) {
        Utilidades.notificacao('A mesma cobrança foi selecionada mais de uma vez.', 'erro');
        return false;
    }

    if (dados.valor_unitario <= 0) {
        Utilidades.notificacao('Informe um valor unitário maior que zero.', 'erro');
        return false;
    }

    const valorAutomatico = dados.cobrancas
        .filter(cobranca => cobranca.tipo !== 'Outros')
        .reduce((total, cobranca) => total + Utilidades.normalizarValorMonetario(cobranca.valor), 0);
    if (dados.cobrancas.some(cobranca => cobranca.tipo === 'Outros') && dados.valor_unitario <= valorAutomatico) {
        Utilidades.notificacao('Informe o valor adicional da cobrança manual.', 'erro');
        return false;
    }

    return true;
}

function obterIdsParticipantesLoteMarcados() {
    return Array.from(document.querySelectorAll('.marcador-participante-lote:checked')).map(campo => campo.value);
}

async function removerPagamentosDoLote(idLote) {
    const pagamentos = await bd.obterTodos('pagamentos');
    const pagamentosLote = pagamentos.filter(pagamento => String(pagamento.id_lote) === String(idLote));
    for (const pagamento of pagamentosLote) await bd.excluir('pagamentos', pagamento.id);
}
