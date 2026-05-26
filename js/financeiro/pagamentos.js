async function renderizarPagamentos(conteudo) {
    const [pagamentos, lotes, participantes, paroquias] = await Promise.all([
        bd.obterTodos('pagamentos'),
        bd.obterTodos('pagamentos_lote'),
        bd.obterTodos('participantes'),
        bd.obterTodos('paroquias')
    ]);

    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna">'
        + criarBotao('Pagamento em Lote (Paróquia)', 'abrirFormularioPagamentoLote()', 'secundario')
        + criarBotao('Novo Pagamento Individual', 'abrirFormularioPagamento()')
        + '</div>';

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Controle de Pagamentos', botoesCabecalho);
    codigo += Busca.criarCampoBusca('busca-pagamentos', 'Buscar por descrição...');

    codigo += renderizarTabelaLotesPagamento(lotes, paroquias);
    codigo += renderizarTabelaPagamentosIndividuais(pagamentos, participantes);
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-pagamentos', 'corpo-tabela-pagamentos');
    Busca.vincularFiltro('busca-pagamentos', 'corpo-tabela-lotes');
}

async function abrirFormularioPagamento(id = null) {
    AppEstado.modoEdicao = 'pagamentos';
    AppEstado.registroEmEdicao = id;

    const [participantes, pagamento] = await Promise.all([
        bd.obterTodos('participantes'),
        id ? bd.obter('pagamentos', id) : Promise.resolve(null)
    ]);

    participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    document.getElementById('titulo-janela').textContent = id ? 'Editar Pagamento Individual' : 'Novo Pagamento Individual';

    const data = pagamento?.data || new Date().toISOString().split('T')[0];

    let formulario = '<form id="formulario-pagamento" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamento(event)">';
    formulario += '<input type="hidden" id="id_lote_pagamento" value="' + (pagamento?.id_lote || '') + '">';
    formulario += criarSeletor('Participante', 'id_participante', participantes.map(participante => ({ id: participante.id, nome: participante.nome })), pagamento?.id_participante || '', true);
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-2">' + criarSeletor('Tipo', 'tipo', TIPOS_PAGAMENTO, pagamento?.tipo || '', true) + '</div>';
    formulario += `<div class="flex-1 ${pagamento?.tipo === 'Mensalidade' ? '' : 'oculto'}" id="container-quantidade">` + criarCampoFormulario('Quantidade', 'number', 'quantidade', pagamento?.quantidade || 1, 'Ex: 2') + '</div>';
    formulario += '<div class="flex-2">' + criarCampoFormulario('Valor Total (R$)', 'number', 'valor', pagamento?.valor || '', 'Ex: 150.00', true) + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Descrição', 'text', 'descricao', pagamento?.descricao || '', 'Ex: Parcela 01') + '</div>';
    formulario += '<input type="hidden" id="data" value="' + data + '">';
    formulario += '<div class="flex-1">' + criarCampoSomenteLeitura('Data do Recebimento', 'data_visual', Utilidades.formatarData(data)) + '</div>';
    formulario += '</div>';
    formulario += criarRodapeFormulario('', id ? 'Atualizar Pagamento' : 'Salvar Pagamento', {
        tipoSalvar: 'submit',
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoEGerarRecibo()', 'secundario', 'md-w-total')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    vincularEventosFormularioPagamento();
    await atualizarValorPagamentoIndividual();
    Interface.abrirJanela('janela-formulario');
}

async function editarPagamento(id) {
    await abrirFormularioPagamento(id);
}

async function salvarPagamento(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function'
        ? {}
        : eventoOuOpcoes;

    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') {
        eventoOuOpcoes.preventDefault();
    }

    const dados = await obterDadosFormularioPagamento();
    if (!validarFormularioPagamento(dados)) return null;

    const validacao = await validarPagamento(dados, { ignorarPagamentoId: AppEstado.registroEmEdicao });
    if (!validacao.valido) {
        Utilidades.notificacao(validacao.mensagem, 'erro');
        return null;
    }

    const pagamento = montarPagamento(dados, AppEstado.registroEmEdicao);
    await bd.salvar('pagamentos', pagamento);

    if (opcoes.notificar !== false) {
        Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Pagamento atualizado!' : 'Pagamento salvo com sucesso!', 'sucesso');
    }
    if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
    if (opcoes.renderizar !== false) await renderizarAbaAtual();

    return pagamento;
}

async function salvarPagamentoEGerarRecibo() {
    const pagamento = await salvarPagamento({ fecharJanela: true, renderizar: true, notificar: true });
    if (pagamento) await acionarReciboDireto(pagamento.id);
}

async function excluirPagamento(id) {
    if (!confirm('Deseja realmente excluir este pagamento?')) return;

    await bd.excluir('pagamentos', id);
    Utilidades.notificacao('Pagamento excluído!', 'sucesso');
    await renderizarAbaAtual();
}

async function abrirFormularioPagamentoLote(id = null) {
    AppEstado.modoEdicao = 'pagamentos_lote';
    AppEstado.registroEmEdicao = id;

    const [paroquias, participantes, lote] = await Promise.all([
        bd.obterTodos('paroquias'),
        bd.obterTodos('participantes'),
        id ? bd.obter('pagamentos_lote', id) : Promise.resolve(null)
    ]);

    document.getElementById('titulo-janela').textContent = id ? 'Editar Pagamento em Lote' : 'Novo Pagamento em Lote';

    let formulario = '<form id="formulario-pagamento-lote" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamentoLote(event)">';
    formulario += criarSeletor('Paróquia', 'id_paroquia_lote', paroquias.map(paroquia => ({ id: paroquia.id, nome: paroquia.nome })), lote?.id_paroquia || '', true);
    formulario += '<div id="recipiente-participantes-lote" class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md"></div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-2">' + criarSeletor('Tipo', 'tipo_lote', TIPOS_PAGAMENTO, lote?.tipo || '', true) + '</div>';
    formulario += `<div class="flex-1 ${lote?.tipo === 'Mensalidade' ? '' : 'oculto'}" id="container-quantidade-lote">` + criarCampoFormulario('Quantidade', 'number', 'quantidade_lote', lote?.quantidade || 1, 'Ex: 2') + '</div>';
    formulario += '<div class="flex-2">' + criarCampoFormulario('Valor Unitário (R$)', 'number', 'valor_unitario_lote', lote?.valor_unitario || '', '', true) + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    const dataLote = lote?.data || new Date().toISOString().split('T')[0];
    formulario += '<div class="flex-1">' + criarCampoFormulario('Descrição', 'text', 'descricao_lote', lote?.descricao || '', 'Ex: Mensalidade') + '</div>';
    formulario += '<input type="hidden" id="data_lote" value="' + dataLote + '">';
    formulario += '<div class="flex-1">' + criarCampoSomenteLeitura('Data do Recebimento', 'data_lote_visual', Utilidades.formatarData(dataLote)) + '</div>';
    formulario += '</div>';
    formulario += criarCampoSomenteLeitura('Valor Total', 'valor_total_lote', Utilidades.formatarMoeda(lote?.valor_total || 0));
    formulario += criarRodapeFormulario('', id ? 'Atualizar Pagamento em Lote' : 'Salvar Pagamento em Lote', {
        tipoSalvar: 'submit',
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoLoteEGerarRecibo()', 'secundario', 'md-w-total')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;

    document.getElementById('id_paroquia_lote').addEventListener('change', () => renderizarParticipantesLotePagamento(participantes, lote));
    document.getElementById('tipo_lote').addEventListener('change', atualizarValorPagamentoLote);
    document.getElementById('quantidade_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('valor_unitario_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('recipiente-participantes-lote').addEventListener('change', atualizarValorPagamentoLote);

    renderizarParticipantesLotePagamento(participantes, lote);
    await atualizarValorPagamentoLote();
    Interface.abrirJanela('janela-formulario');
}

async function editarPagamentoLote(id) {
    await abrirFormularioPagamentoLote(id);
}

async function salvarPagamentoLote(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function'
        ? {}
        : eventoOuOpcoes;

    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') {
        eventoOuOpcoes.preventDefault();
    }

    const dados = await obterDadosFormularioPagamentoLote();
    if (!validarFormularioPagamentoLote(dados)) return null;

    const validacao = await validarPagamento(dados, { ignorarLoteId: AppEstado.registroEmEdicao });
    if (!validacao.valido) {
        Utilidades.notificacao(validacao.mensagem, 'erro');
        return null;
    }

    const mesmoCurso = await validarParticipantesMesmoCurso(dados.ids_participantes);
    if (!mesmoCurso.valido) {
        Utilidades.notificacao(mesmoCurso.mensagem, 'erro');
        return null;
    }

    const lote = montarPagamentoLote(dados, AppEstado.registroEmEdicao);
    await bd.salvar('pagamentos_lote', lote);

    await removerPagamentosDoLote(lote.id);
    for (const idParticipante of lote.ids_participantes) {
        await bd.salvar('pagamentos', {
            id: Utilidades.gerarId(),
            id_participante: idParticipante,
            tipo: lote.tipo,
            quantidade: lote.quantidade,
            descricao: lote.descricao,
            valor: lote.valor_unitario,
            data: lote.data,
            id_lote: lote.id
        });
    }

    if (opcoes.notificar !== false) {
        Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Pagamento em lote atualizado!' : 'Pagamento em lote salvo com sucesso!', 'sucesso');
    }
    if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
    if (opcoes.renderizar !== false) await renderizarAbaAtual();

    return lote;
}

async function salvarPagamentoLoteEGerarRecibo() {
    const lote = await salvarPagamentoLote({ fecharJanela: true, renderizar: true, notificar: true });
    if (lote) await acionarReciboDiretoLote(lote.id);
}

async function excluirPagamentoLote(id) {
    if (!confirm('Deseja realmente excluir este pagamento em lote?')) return;

    await removerPagamentosDoLote(id);
    await bd.excluir('pagamentos_lote', id);
    Utilidades.notificacao('Pagamento em lote excluído!', 'sucesso');
    await renderizarAbaAtual();
}

async function acionarReciboDireto(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) return;

    const participante = await bd.obter('participantes', pagamento.id_participante);
    gerarReciboGenerico(
        participante?.nome || 'Participante',
        pagamento.valor,
        pagamento.descricao || pagamento.tipo,
        pagamento.data
    );
}

async function acionarReciboDiretoLote(idLote) {
    const lote = await bd.obter('pagamentos_lote', idLote);
    if (!lote) return;

    const paroquia = await bd.obter('paroquias', lote.id_paroquia);
    gerarReciboLoteTemplate(
        paroquia?.nome || 'Paróquia',
        lote.nomes_participantes || [],
        lote.valor_total,
        lote.descricao || lote.tipo,
        lote.data
    );
}

function renderizarTabelaPagamentosIndividuais(pagamentos, participantes) {
    let codigo = '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos Individuais</h3>';
    if (pagamentos.length === 0) {
        return codigo + criarMensagemVazia('Nenhum pagamento individual cadastrado ainda.');
    }

    pagamentos.sort((a, b) => {
        const participanteA = participantes.find(item => String(item.id) === String(a.id_participante));
        const participanteB = participantes.find(item => String(item.id) === String(b.id_participante));
        const nomeA = participanteA?.nome || '';
        const nomeB = participanteB?.nome || '';
        const compararNome = nomeA.localeCompare(nomeB);
        if (compararNome !== 0) return compararNome;
        return new Date(a.data) - new Date(b.data);
    });

    const linhas = pagamentos.map((pagamento, indice) => {
        const participante = participantes.find(item => String(item.id) === String(pagamento.id_participante));
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const descricao = pagamento.id_lote
            ? `${pagamento.descricao || '-'} <span class="etiqueta">Lote</span>`
            : Utilidades.escaparHtml(pagamento.descricao || '-');

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${participante?.nome || ''} ${pagamento.tipo || ''} ${pagamento.descricao || ''}`)}">
            <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.escaparHtml(participante?.nome || 'Participante não encontrado')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(pagamento.tipo || '-')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${descricao}</td>
            <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(pagamento.valor)}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(pagamento.data)}</td>
            <td class="p-md texto-esquerda">${criarAcoesTabela([
                { rotulo: 'Recibo', acao: `acionarReciboDireto('${pagamento.id}')` },
                { rotulo: 'Editar', acao: `editarPagamento('${pagamento.id}')` },
                { rotulo: 'Excluir', acao: `excluirPagamento('${pagamento.id}')`, perigo: true }
            ])}</td>
        </tr>`;
    }).join('');

    return codigo + criarContainerTabela(
        ['Participante', 'Tipo', 'Descrição', 'Valor', 'Data', 'Ações'],
        linhas,
        'tabela-pagamentos',
        'corpo-tabela-pagamentos'
    );
}

function renderizarTabelaLotesPagamento(lotes, paroquias) {
    if (lotes.length === 0) return '';

    lotes.sort((a, b) => new Date(b.data) - new Date(a.data));
    const linhas = lotes.map((lote, indice) => {
        const paroquia = paroquias.find(item => String(item.id) === String(lote.id_paroquia));
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${paroquia?.nome || ''} ${lote.tipo || ''} ${lote.descricao || ''}`)}">
            <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.escaparHtml(paroquia?.nome || 'Paróquia não encontrada')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(lote.tipo || '-')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(lote.descricao || '-')}</td>
            <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(lote.valor_total)}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(lote.data)}</td>
            <td class="p-md texto-esquerda">${criarAcoesTabela([
                { rotulo: 'Recibo', acao: `acionarReciboDiretoLote('${lote.id}')` },
                { rotulo: 'Editar', acao: `editarPagamentoLote('${lote.id}')` },
                { rotulo: 'Excluir', acao: `excluirPagamentoLote('${lote.id}')`, perigo: true }
            ])}</td>
        </tr>`;
    }).join('');

    return '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Recibos em Lote (Paróquias)</h3>'
        + criarContainerTabela(
            ['Paróquia', 'Tipo', 'Descrição', 'Valor Total', 'Data', 'Ações'],
            linhas,
            'tabela-lotes',
            'corpo-tabela-lotes',
            'mb-lg'
        );
}

function vincularEventosFormularioPagamento() {
    ['id_participante', 'tipo', 'quantidade'].forEach(idCampo => {
        document.getElementById(idCampo)?.addEventListener('change', atualizarValorPagamentoIndividual);
        document.getElementById(idCampo)?.addEventListener('input', atualizarValorPagamentoIndividual);
    });
}

async function atualizarValorPagamentoIndividual() {
    const idParticipante = document.getElementById('id_participante')?.value || '';
    const tipo = document.getElementById('tipo')?.value || '';
    const campoQuantidade = document.getElementById('quantidade');
    let quantidade = Number(campoQuantidade?.value || 1);
    const campoValor = document.getElementById('valor');
    const containerQuantidade = document.getElementById('container-quantidade');
    if (!campoValor) return;

    containerQuantidade?.classList.toggle('oculto', tipo !== 'Mensalidade');
    campoValor.readOnly = tipo !== 'Outros' && tipo !== '';

    if (campoQuantidade) {
        campoQuantidade.disabled = tipo !== 'Mensalidade';
        campoQuantidade.min = '1';
        campoQuantidade.removeAttribute('max');
    }

    if (idParticipante && tipo === 'Mensalidade' && campoQuantidade) {
        const restantes = await calcularMensalidadesRestantes(idParticipante, { ignorarPagamentoId: AppEstado.registroEmEdicao });
        campoQuantidade.max = String(restantes);

        if (restantes <= 0) {
            campoQuantidade.value = '1';
            quantidade = 1;
            campoValor.value = 0;
            Utilidades.notificacao('Este participante já quitou todas as mensalidades.', 'aviso');
            return;
        }

        if (quantidade > restantes) {
            quantidade = restantes;
            campoQuantidade.value = String(restantes);
            Utilidades.notificacao(`Restam apenas ${restantes} mensalidade(s) para este participante.`, 'aviso');
        }
    }

    if (idParticipante && tipo && tipo !== 'Outros') {
        campoValor.value = await obterValorPagamentoParticipante(idParticipante, tipo, quantidade);
    }
}

async function obterDadosFormularioPagamento() {
    const idParticipante = document.getElementById('id_participante')?.value || '';
    const tipo = document.getElementById('tipo')?.value || '';
    const quantidade = Number(document.getElementById('quantidade')?.value || 1);
    const valor = await obterValorPagamentoParticipante(idParticipante, tipo, quantidade, document.getElementById('valor')?.value || 0);

    return {
        id_participante: idParticipante,
        tipo,
        quantidade: tipo === 'Mensalidade' ? quantidade : 1,
        descricao: document.getElementById('descricao')?.value.trim() || tipo,
        valor,
        data: document.getElementById('data')?.value || new Date().toISOString().split('T')[0],
        id_lote: document.getElementById('id_lote_pagamento')?.value || null
    };
}

function montarPagamento(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_participante: dados.id_participante,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        descricao: dados.descricao,
        valor: dados.valor,
        data: dados.data,
        id_lote: dados.id_lote || null
    };
}

function validarFormularioPagamento(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Participante', valor: dados.id_participante },
        { nome: 'Tipo', valor: dados.tipo },
        { nome: 'Valor', valor: dados.valor },
        { nome: 'Data', valor: dados.data }
    ])) {
        return false;
    }

    if (dados.tipo === 'Mensalidade' && !Validacao.numeroInteiro(dados.quantidade, 1)) {
        Utilidades.notificacao('A quantidade de mensalidades deve ser um número inteiro maior que zero.', 'erro');
        return false;
    }

    return true;
}

function renderizarParticipantesLotePagamento(participantes, lote = null) {
    const idParoquia = document.getElementById('id_paroquia_lote')?.value || '';
    const recipiente = document.getElementById('recipiente-participantes-lote');
    if (!recipiente) return;

    const idsMarcados = new Set((lote?.ids_participantes || []).map(String));
    const participantesParoquia = participantes
        .filter(participante => String(participante.id_paroquia) === String(idParoquia))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (!idParoquia) {
        recipiente.innerHTML = '<p class="texto-sm cor-texto-claro m-zero">Selecione uma paróquia para listar os participantes.</p>';
        return;
    }

    if (participantesParoquia.length === 0) {
        recipiente.innerHTML = '<p class="texto-sm cor-texto-claro m-zero">Nenhum participante encontrado nesta paróquia.</p>';
        return;
    }

    recipiente.innerHTML = `
        <h3 class="texto-md peso-bold cor-texto-primario mb-sm">Participantes do lote</h3>
        <div class="lista-selecao flex flex-coluna gap-xs">
            ${participantesParoquia.map(participante => `
                <label class="flex itens-centro gap-sm p-sm fundo-branco hover-fundo-superficie-2 raio-xxs cursor-apontador transicao">
                    <input type="checkbox" class="checkbox-padrao marcador-participante-lote" value="${participante.id}" ${idsMarcados.has(String(participante.id)) ? 'checked' : ''}>
                    <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(participante.nome)}</span>
                </label>
            `).join('')}
        </div>
    `;
}

async function atualizarValorPagamentoLote() {
    const tipo = document.getElementById('tipo_lote')?.value || '';
    const campoQuantidade = document.getElementById('quantidade_lote');
    let quantidade = Number(campoQuantidade?.value || 1);
    const idsParticipantes = obterIdsParticipantesLoteMarcados();
    const campoValorUnitario = document.getElementById('valor_unitario_lote');
    const campoValorTotal = document.getElementById('valor_total_lote');
    const containerQuantidade = document.getElementById('container-quantidade-lote');
    if (!campoValorUnitario || !campoValorTotal) return;

    containerQuantidade?.classList.toggle('oculto', tipo !== 'Mensalidade');
    campoValorUnitario.readOnly = tipo !== 'Outros' && tipo !== '';

    if (campoQuantidade) {
        campoQuantidade.disabled = tipo !== 'Mensalidade';
        campoQuantidade.min = '1';
        campoQuantidade.removeAttribute('max');
    }

    if (tipo === 'Mensalidade' && idsParticipantes.length > 0 && campoQuantidade) {
        const restantesLista = [];

        for (const idParticipante of idsParticipantes) {
            restantesLista.push(await calcularMensalidadesRestantes(idParticipante, { ignorarLoteId: AppEstado.registroEmEdicao }));
        }

        const menorRestante = Math.min(...restantesLista);
        campoQuantidade.max = String(menorRestante);

        if (menorRestante <= 0) {
            campoQuantidade.value = '1';
            quantidade = 1;
            campoValorUnitario.value = 0;
            campoValorTotal.value = Utilidades.formatarMoeda(0);
            Utilidades.notificacao('Ao menos um participante selecionado já quitou todas as mensalidades.', 'aviso');
            return;
        }

        if (quantidade > menorRestante) {
            quantidade = menorRestante;
            campoQuantidade.value = String(menorRestante);
            Utilidades.notificacao(`O lote permite no máximo ${menorRestante} mensalidade(s) para os selecionados.`, 'aviso');
        }
    }

    let valorUnitario = Utilidades.normalizarValorMonetario(campoValorUnitario.value);
    if (idsParticipantes.length > 0 && tipo && tipo !== 'Outros') {
        valorUnitario = await obterValorPagamentoParticipante(idsParticipantes[0], tipo, quantidade);
        campoValorUnitario.value = valorUnitario;
    }

    campoValorTotal.value = Utilidades.formatarMoeda(valorUnitario * idsParticipantes.length);
}

async function obterDadosFormularioPagamentoLote() {
    const idsParticipantes = obterIdsParticipantesLoteMarcados();
    const tipo = document.getElementById('tipo_lote')?.value || '';
    const quantidade = tipo === 'Mensalidade'
        ? Number(document.getElementById('quantidade_lote')?.value || 1)
        : 1;
    const valorUnitario = idsParticipantes.length > 0
        ? await obterValorPagamentoParticipante(idsParticipantes[0], tipo, quantidade, document.getElementById('valor_unitario_lote')?.value || 0)
        : 0;
    const participantes = await bd.obterTodos('participantes');
    const nomes = idsParticipantes.map(id => participantes.find(participante => String(participante.id) === String(id))?.nome || id);

    return {
        id_paroquia: document.getElementById('id_paroquia_lote')?.value || '',
        ids_participantes: idsParticipantes,
        nomes_participantes: nomes,
        tipo,
        quantidade,
        descricao: document.getElementById('descricao_lote')?.value.trim() || tipo,
        valor_unitario: valorUnitario,
        valor_total: valorUnitario * idsParticipantes.length,
        data: document.getElementById('data_lote')?.value || new Date().toISOString().split('T')[0]
    };
}

function montarPagamentoLote(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_paroquia: dados.id_paroquia,
        ids_participantes: dados.ids_participantes,
        nomes_participantes: dados.nomes_participantes,
        tipo: dados.tipo,
        quantidade: dados.quantidade,
        descricao: dados.descricao,
        valor_unitario: dados.valor_unitario,
        valor_total: dados.valor_total,
        data: dados.data
    };
}

function validarFormularioPagamentoLote(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Paróquia', valor: dados.id_paroquia },
        { nome: 'Tipo', valor: dados.tipo },
        { nome: 'Participantes', valor: dados.ids_participantes.length },
        { nome: 'Data', valor: dados.data }
    ])) {
        return false;
    }

    if (!Validacao.listaNaoVazia(dados.ids_participantes)) {
        Utilidades.notificacao('Selecione ao menos um participante para o lote.', 'erro');
        return false;
    }

    if (dados.tipo === 'Mensalidade' && !Validacao.numeroInteiro(dados.quantidade, 1)) {
        Utilidades.notificacao('A quantidade de mensalidades deve ser um número inteiro maior que zero.', 'erro');
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

    for (const pagamento of pagamentosLote) {
        await bd.excluir('pagamentos', pagamento.id);
    }
}
