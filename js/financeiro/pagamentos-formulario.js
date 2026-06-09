async function abrirFormularioPagamento(id = null) {
    AppEstado.modoEdicao = 'pagamentos';
    AppEstado.registroEmEdicao = id;

    const [participantes, pagamento] = await Promise.all([
        bd.obterTodos('participantes'),
        id ? bd.obter('pagamentos', id) : Promise.resolve(null)
    ]);

    const participantesDisponiveis = participantes
        .filter(participante => Utilidades.participanteEstaAtivo(participante) || String(participante.id) === String(pagamento?.id_participante || ''))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const data = pagamento?.data || Utilidades.obterDataAtual();

    document.getElementById('titulo-janela').textContent = id ? 'Editar Pagamento Individual' : 'Novo Pagamento Individual';

    let formulario = '<form novalidate id="formulario-pagamento" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamento(event)">';
    formulario += '<input type="hidden" id="id_lote_pagamento" value="' + (pagamento?.id_lote || '') + '">';
    formulario += criarSeletor('Participante', 'id_participante', participantesDisponiveis.map(participante => ({ id: participante.id, nome: participante.nome })), pagamento?.id_participante || '', true);
    formulario += '<div id="recipiente-cobrancas-pagamento" class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md"></div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Descrição', 'text', 'descricao', pagamento?.descricao || '', 'Ex: Inscrição', true) + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Valor (R$)', 'number', 'valor', pagamento?.valor || '', 'Ex: 150.00', true) + '</div>';
    formulario += '</div>';
    formulario += '<input type="hidden" id="data" value="' + data + '">';
    formulario += criarCampoSomenteLeitura('Data do Recebimento', 'data_visual', Utilidades.formatarData(data));
    formulario += criarRodapeFormulario('', id ? 'Atualizar Pagamento' : 'Salvar Pagamento', {
        tipoSalvar: 'submit',
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoEGerarRecibo()', 'secundario', 'md-w-total', 'button', '')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    document.getElementById('valor')?.setAttribute('step', '0.01');
    document.getElementById('id_participante')?.addEventListener('change', () => atualizarCobrancasPagamentoIndividual(pagamento));
    document.getElementById('recipiente-cobrancas-pagamento')?.addEventListener('change', evento => {
        if (evento.target?.id === 'tipo_cobranca_pagamento') atualizarGrupoCobrancasPagamento('tipo_cobranca_pagamento', 'marcador-cobranca-pagamento');
        atualizarValorPagamentoIndividual();
    });
    document.getElementById('valor')?.addEventListener('input', atualizarValorPagamentoIndividual);
    document.getElementById('descricao')?.addEventListener('input', atualizarValorPagamentoIndividual);
    await atualizarCobrancasPagamentoIndividual(pagamento);
    Interface.abrirJanela('janela-formulario');
}

async function editarPagamento(id) {
    await abrirFormularioPagamento(id);
}

async function atualizarCobrancasPagamentoIndividual(pagamento = null) {
    const idParticipante = document.getElementById('id_participante')?.value || '';
    const recipiente = document.getElementById('recipiente-cobrancas-pagamento');
    if (!recipiente) return;

    const opcoes = await montarOpcoesCobrancaParticipante(idParticipante, pagamento);
    const marcadas = new Set(pagamento ? [montarValorOpcaoCobranca(pagamento)] : []);
    const tipoSelecionado = obterTipoCobrancaSelecionado(opcoes, pagamento?.tipo);
    recipiente.innerHTML = montarControleCobrancasPagamento(opcoes, marcadas, 'marcador-cobranca-pagamento', 'tipo_cobranca_pagamento', tipoSelecionado);
    atualizarGrupoCobrancasPagamento('tipo_cobranca_pagamento', 'marcador-cobranca-pagamento');
    await atualizarValorPagamentoIndividual();
}

async function montarOpcoesCobrancaParticipante(idParticipante, pagamento = null) {
    if (!idParticipante) return [{ id: '', nome: 'Selecione o participante para listar as cobranças abertas.', valor: 0, descricao: '' }];

    const obrigacoes = await obterObrigacoesAbertasPagamento(idParticipante, { ignorarPagamentoId: AppEstado.registroEmEdicao });
    const opcoesPorChave = new Map();

    obrigacoes.forEach(obrigacao => {
        const id = codificarCobrancaPagamento(obrigacao);
        opcoesPorChave.set(id, {
            id,
            tipo: obrigacao.tipo,
            nome: `${obrigacao.descricao} - ${Utilidades.formatarMoeda(obrigacao.valor)}`,
            descricao: obrigacao.descricao,
            valor: Utilidades.normalizarValorMonetario(obrigacao.valor)
        });
    });

    opcoesPorChave.set('Outros||||', { id: 'Outros||||', tipo: 'Outros', nome: 'Outros - valor manual', descricao: 'Outros', valor: 0 });
    return ordenarOpcoesCobrancaPagamento([...opcoesPorChave.values()]);
}

async function atualizarValorPagamentoIndividual() {
    const cobrancas = obterCobrancasPagamentoMarcadas();
    const campoDescricao = document.getElementById('descricao');
    const campoValor = document.getElementById('valor');
    if (!campoDescricao || !campoValor) return;

    const somenteManual = cobrancas.length === 1 && cobrancas[0].tipo === 'Outros';
    const temManual = cobrancas.some(cobranca => cobranca.tipo === 'Outros');
    campoValor.readOnly = cobrancas.length > 0 && !temManual;

    if (cobrancas.length === 0) {
        campoDescricao.value = '';
        campoValor.value = '';
        return;
    }

    if (somenteManual) {
        campoDescricao.value = campoDescricao.value || 'Outros';
        return;
    }

    const automaticas = cobrancas.filter(cobranca => cobranca.tipo !== 'Outros');
    const valorAutomatico = automaticas.reduce((total, cobranca) => total + Utilidades.normalizarValorMonetario(cobranca.valor), 0);
    const valorAtual = Utilidades.normalizarValorMonetario(campoValor.value);
    const valorManual = temManual ? Math.max(valorAtual - valorAutomatico, 0) : 0;

    campoDescricao.value = temManual ? (campoDescricao.value || montarDescricaoPagamento([...automaticas, { tipo: 'Outros', descricao: 'Outros' }])) : montarDescricaoPagamento(automaticas);
    campoValor.value = temManual ? valorAutomatico + valorManual : valorAutomatico;
}

function obterCobrancasPagamentoMarcadas() {
    return Array.from(document.querySelectorAll('.marcador-cobranca-pagamento:checked')).map(marcador => ({
        ...decodificarCobrancaPagamento(marcador.value),
        descricao: marcador.dataset.descricao || '',
        valor: Utilidades.normalizarValorMonetario(marcador.dataset.valor || 0)
    }));
}

async function salvarPagamento(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function' ? {} : eventoOuOpcoes;
    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') eventoOuOpcoes.preventDefault();
    if (AppEstado.salvandoPagamento) return null;

    AppEstado.salvandoPagamento = true;
    try {
        const dados = await obterDadosFormularioPagamento();
        if (!validarFormularioPagamento(dados)) return null;

        const dadosPagamentos = [];
        for (const cobranca of dados.cobrancas) {
            const dadosPagamento = montarDadosPagamentoPorCobranca(dados, cobranca);
            const validacao = await validarPagamento(dadosPagamento, { ignorarPagamentoId: AppEstado.registroEmEdicao });
            if (!validacao.valido) {
                Utilidades.notificacao(validacao.mensagem, 'erro');
                return null;
            }
            dadosPagamentos.push(dadosPagamento);
        }

        if (AppEstado.registroEmEdicao) {
            await bd.excluir('pagamentos', AppEstado.registroEmEdicao);
        }

        const pagamentosSalvos = [];
        for (const dadosPagamento of dadosPagamentos) {
            const pagamento = montarPagamento(dadosPagamento, dadosPagamentos.length === 1 ? AppEstado.registroEmEdicao : null);
            await bd.salvar('pagamentos', pagamento);
            pagamentosSalvos.push(pagamento);
        }

        if (opcoes.notificar !== false) Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Pagamento atualizado!' : 'Pagamento salvo com sucesso!', 'sucesso');
        if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
        if (opcoes.renderizar !== false) await renderizarAbaAtual();
        return pagamentosSalvos;
    } finally {
        AppEstado.salvandoPagamento = false;
    }
}

async function salvarPagamentoEGerarRecibo() {
    const pagamentos = await salvarPagamento({ fecharJanela: true, renderizar: true, notificar: true });
    if (!pagamentos || pagamentos.length === 0) return;

    if (pagamentos.length === 1) {
        await acionarReciboDireto(pagamentos[0].id);
        return;
    }

    const participante = await bd.obter('participantes', pagamentos[0].id_participante);
    const total = pagamentos.reduce((soma, pagamento) => soma + Utilidades.normalizarValorMonetario(pagamento.valor), 0);
    const descricao = montarDescricaoPagamento(pagamentos);
    gerarReciboGenerico(participante?.nome || 'Participante', total, descricao, pagamentos[0].data, participante?.cpf || '');
}

async function excluirPagamento(id) {
    if (!confirm('Deseja realmente excluir este pagamento?')) return;
    await bd.excluir('pagamentos', id);
    Utilidades.notificacao('Pagamento excluído!', 'sucesso');
    await renderizarAbaAtual();
}

