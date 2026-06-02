async function renderizarPagamentos(conteudo) {
    const [pagamentos, lotes, participantes, paroquias, cursos] = await Promise.all([
        bd.obterTodos('pagamentos'),
        bd.obterTodos('pagamentos_lote'),
        bd.obterTodos('participantes'),
        bd.obterTodos('paroquias'),
        bd.obterTodos('cursos')
    ]);

    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna">'
        + criarBotao('Pagamento em Lote', 'abrirFormularioPagamentoLote()', 'secundario')
        + criarBotao('Novo Pagamento Individual', 'abrirFormularioPagamento()')
        + '</div>';

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Controle de Pagamentos', botoesCabecalho);
    codigo += Busca.criarCampoBusca('busca-pagamentos', 'Buscar por participante, curso, descrição...');
    codigo += renderizarTabelaLotesPagamento(lotes, paroquias, cursos);
    codigo += renderizarTabelaPagamentosIndividuais(pagamentos, participantes, cursos);
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

    const participantesDisponiveis = participantes
        .filter(participante => Utilidades.participanteEstaAtivo(participante) || String(participante.id) === String(pagamento?.id_participante || ''))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const data = pagamento?.data || new Date().toISOString().split('T')[0];

    document.getElementById('titulo-janela').textContent = id ? 'Editar Pagamento Individual' : 'Novo Pagamento Individual';

    let formulario = '<form id="formulario-pagamento" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamento(event)">';
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
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoEGerarRecibo()', 'secundario', 'md-w-total')
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


function obterOrdemTipoCobrancaPagamento(tipo = '') {
    const ordem = ['Inscrição', 'Mensalidade', 'Disciplina', 'Encontro', 'Outros'];
    const indice = ordem.indexOf(tipo);
    return indice === -1 ? ordem.length : indice;
}

function ordenarOpcoesCobrancaPagamento(opcoes = []) {
    return [...opcoes].sort((a, b) => {
        const ordemTipo = obterOrdemTipoCobrancaPagamento(a.tipo) - obterOrdemTipoCobrancaPagamento(b.tipo);
        if (ordemTipo !== 0) return ordemTipo;

        const dadosA = decodificarCobrancaPagamento(a.id);
        const dadosB = decodificarCobrancaPagamento(b.id);

        if (a.tipo === 'Mensalidade') {
            return Number(dadosA.referencia_indice || 0) - Number(dadosB.referencia_indice || 0);
        }

        const ordemNome = compararTextoFinanceiro(a.descricao || a.nome, b.descricao || b.nome);
        if (ordemNome !== 0) return ordemNome;

        return Number(dadosA.referencia_indice || 0) - Number(dadosB.referencia_indice || 0);
    });
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
    if (pagamento && pagamento.tipo !== 'Outros') {
        obrigacoes.unshift({
            tipo: pagamento.tipo,
            referencia_id: pagamento.referencia_id || '',
            referencia_indice: pagamento.referencia_indice || '',
            descricao: pagamento.descricao || pagamento.tipo,
            valor: pagamento.valor,
            pago: false
        });
    }

    const opcoes = obrigacoes.map(obrigacao => ({
        id: codificarCobrancaPagamento(obrigacao),
        tipo: obrigacao.tipo,
        nome: `${obrigacao.descricao} - ${Utilidades.formatarMoeda(obrigacao.valor)}`,
        descricao: obrigacao.descricao,
        valor: Utilidades.normalizarValorMonetario(obrigacao.valor)
    }));

    opcoes.push({ id: 'Outros||outros||', tipo: 'Outros', nome: 'Outros - valor manual', descricao: 'Outros', valor: 0 });
    return ordenarOpcoesCobrancaPagamento(opcoes);
}

function montarControleCobrancasPagamento(opcoes = [], marcadas = new Set(), classeMarcador = 'marcador-cobranca-pagamento', idSeletorTipo = 'tipo_cobranca_pagamento', tipoSelecionado = '') {
    if (!opcoes.length || (opcoes.length === 1 && !opcoes[0].id)) {
        return `<p class="texto-sm cor-texto-claro m-zero">${Utilidades.escaparHtml(opcoes[0]?.nome || 'Nenhuma cobrança disponível.')}</p>`;
    }

    const opcoesComId = opcoes.filter(opcao => opcao.id);
    const tiposDisponiveis = obterTiposCobrancaDisponiveis(opcoesComId);
    const tipoAtual = tiposDisponiveis.some(tipo => tipo.id === tipoSelecionado) ? tipoSelecionado : (tiposDisponiveis[0]?.id || '');

    return `
        <div class="flex flex-coluna gap-sm">
            ${criarSeletor('O que deseja pagar?', idSeletorTipo, tiposDisponiveis, tipoAtual, true)}
            ${tiposDisponiveis.map(tipo => montarGrupoCobrancasPagamento(tipo.id, opcoesComId, marcadas, classeMarcador, tipoAtual)).join('')}
            <p class="texto-sm cor-texto-claro m-zero">Selecione uma ou mais cobranças do grupo escolhido para registrar no mesmo recebimento.</p>
        </div>
    `;
}

function obterTiposCobrancaDisponiveis(opcoes = []) {
    const rotulos = {
        'Inscrição': 'Inscrição',
        'Mensalidade': 'Mensalidades',
        'Disciplina': 'Disciplinas',
        'Encontro': 'Encontros',
        'Outros': 'Outros'
    };
    const ordem = ['Inscrição', 'Mensalidade', 'Disciplina', 'Encontro', 'Outros'];
    const tipos = new Set(opcoes.map(opcao => opcao.tipo || decodificarCobrancaPagamento(opcao.id).tipo).filter(Boolean));
    return ordem
        .filter(tipo => tipos.has(tipo))
        .map(tipo => ({ id: tipo, nome: rotulos[tipo] || tipo }));
}

function obterTipoCobrancaSelecionado(opcoes = [], tipoPreferencial = '') {
    const tipos = obterTiposCobrancaDisponiveis(opcoes);
    if (tipoPreferencial && tipos.some(tipo => tipo.id === tipoPreferencial)) return tipoPreferencial;
    return tipos[0]?.id || '';
}

function montarGrupoCobrancasPagamento(tipo, opcoes = [], marcadas = new Set(), classeMarcador = 'marcador-cobranca-pagamento', tipoAtual = '') {
    const opcoesTipo = opcoes.filter(opcao => (opcao.tipo || decodificarCobrancaPagamento(opcao.id).tipo) === tipo);
    const oculto = tipo !== tipoAtual ? ' oculto' : '';
    const permiteMultiplas = tipo !== 'Inscrição' && tipo !== 'Outros';

    return `
        <div class="grupo-cobrancas-pagamento${oculto}" data-tipo-cobranca="${Utilidades.escaparHtml(tipo)}">
            <div class="lista-selecao flex flex-coluna gap-xs">
                ${opcoesTipo.map(opcao => `
                    <label class="flex itens-centro gap-sm p-sm fundo-branco hover-fundo-superficie-2 raio-xxs cursor-apontador transicao">
                        <input type="checkbox" class="checkbox-padrao ${classeMarcador}" value="${Utilidades.escaparHtml(opcao.id)}" data-tipo="${Utilidades.escaparHtml(tipo)}" data-descricao="${Utilidades.escaparHtml(opcao.descricao || '')}" data-valor="${Utilidades.escaparHtml(opcao.valor || 0)}" ${marcadas.has(opcao.id) ? 'checked' : ''}>
                        <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(opcao.nome)}</span>
                    </label>
                `).join('')}
            </div>
            ${permiteMultiplas ? '<p class="texto-sm cor-texto-claro m-zero mt-sm">Pode marcar mais de uma opção.</p>' : ''}
        </div>
    `;
}

function atualizarGrupoCobrancasPagamento(idSeletorTipo, classeMarcador) {
    const seletor = document.getElementById(idSeletorTipo);
    const tipoSelecionado = seletor?.value || '';
    const recipiente = seletor?.closest('.flex.flex-coluna.gap-sm');
    if (!recipiente) return;

    recipiente.querySelectorAll('.grupo-cobrancas-pagamento').forEach(grupo => {
        const ativo = grupo.dataset.tipoCobranca === tipoSelecionado;
        grupo.classList.toggle('oculto', !ativo);
        if (!ativo) grupo.querySelectorAll(`.${classeMarcador}`).forEach(campo => { campo.checked = false; });
    });
}

function codificarCobrancaPagamento(obrigacao) {
    return [obrigacao.tipo, obrigacao.referencia_id || '', obrigacao.referencia_indice || ''].join('||');
}

function montarValorOpcaoCobranca(pagamento = {}) {
    return [pagamento.tipo || '', pagamento.referencia_id || '', pagamento.referencia_indice || ''].join('||');
}

function decodificarCobrancaPagamento(valor = '') {
    const [tipo = '', referencia_id = '', referencia_indice = ''] = String(valor).split('||');
    return { tipo, referencia_id, referencia_indice };
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

function limparDescricaoItemPagamento(tipo, descricao = '') {
    let texto = String(descricao || tipo || '').trim();
    const expressoes = {
        'Inscrição': /^(à|a)\s+inscriç[aã]o:?\s*/i,
        'Mensalidade': /^às?\s+mensalidades?:?\s*/i,
        'Disciplina': /^às?\s+disciplinas?:?\s*/i,
        'Encontro': /^aos?\s+encontros?:?\s*/i,
        'Outros': /^a:?\s*/i
    };
    if (expressoes[tipo]) texto = texto.replace(expressoes[tipo], '').trim();
    return texto || tipo || 'Pagamento';
}

function montarDescricaoPagamento(cobrancas = []) {
    const validas = cobrancas.filter(cobranca => cobranca && cobranca.tipo);
    if (validas.length === 0) return '';

    const porTipo = validas.reduce((mapa, cobranca) => {
        if (!mapa[cobranca.tipo]) mapa[cobranca.tipo] = [];
        mapa[cobranca.tipo].push(limparDescricaoItemPagamento(cobranca.tipo, cobranca.descricao));
        return mapa;
    }, {});

    const partes = [];
    if (porTipo['Inscrição']) partes.push('à inscrição');
    if (porTipo['Mensalidade']) partes.push(`às mensalidades: ${porTipo['Mensalidade'].join(', ')}`);
    if (porTipo['Disciplina']) partes.push(`às disciplinas: ${porTipo['Disciplina'].join(', ')}`);
    if (porTipo['Encontro']) partes.push(`aos encontros: ${porTipo['Encontro'].join(', ')}`);
    if (porTipo['Outros']) partes.push(`a ${porTipo['Outros'].join(', ')}`);

    return partes.join('; ');
}


async function salvarPagamento(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function' ? {} : eventoOuOpcoes;
    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') eventoOuOpcoes.preventDefault();

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

    if (AppEstado.registroEmEdicao && dadosPagamentos.length > 1) {
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

    const dataLote = lote?.data || new Date().toISOString().split('T')[0];
    let formulario = '<form id="formulario-pagamento-lote" class="flex flex-coluna gap-md w-total" onsubmit="salvarPagamentoLote(event)">';
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
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarPagamentoLoteEGerarRecibo()', 'secundario', 'md-w-total')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    document.getElementById('valor_unitario_lote')?.setAttribute('step', '0.01');
    document.getElementById('id_curso_lote')?.addEventListener('change', () => atualizarFormularioPagamentoLote(participantes, lote));
    document.getElementById('id_paroquia_lote')?.addEventListener('change', () => atualizarFormularioPagamentoLote(participantes, lote));
    document.getElementById('recipiente-referencia-lote')?.addEventListener('change', evento => {
        if (evento.target?.id === 'tipo_cobranca_lote') atualizarGrupoCobrancasPagamento('tipo_cobranca_lote', 'marcador-cobranca-lote');
        atualizarValorPagamentoLote();
    });
    document.getElementById('valor_unitario_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('descricao_lote')?.addEventListener('input', atualizarValorPagamentoLote);
    document.getElementById('recipiente-participantes-lote')?.addEventListener('change', atualizarValorPagamentoLote);

    await atualizarFormularioPagamentoLote(participantes, lote);
    Interface.abrirJanela('janela-formulario');
}

async function atualizarFormularioPagamentoLote(participantes, lote = null) {
    await atualizarReferenciasPagamentoLote(lote);
    renderizarParticipantesLotePagamento(participantes, lote);
    await atualizarValorPagamentoLote();
}

async function atualizarReferenciasPagamentoLote(lote = null) {
    const idCurso = document.getElementById('id_curso_lote')?.value || '';
    const recipiente = document.getElementById('recipiente-referencia-lote');
    if (!recipiente) return;

    const curso = idCurso ? await bd.obter('cursos', idCurso) : null;
    const disciplinas = await bd.obterTodos('disciplinas');
    const opcoes = montarOpcoesCobrancaLote(curso, disciplinas.filter(disciplina => String(disciplina.id_curso) === String(idCurso)));
    const marcadas = new Set((lote?.cobrancas || []).map(codificarCobrancaPagamento));
    if (lote && marcadas.size === 0) marcadas.add(montarValorOpcaoCobranca(lote));
    const tipoSelecionado = obterTipoCobrancaSelecionado(opcoes, lote?.tipo === 'Múltiplas' ? '' : lote?.tipo);
    recipiente.innerHTML = montarControleCobrancasPagamento(opcoes, marcadas, 'marcador-cobranca-lote', 'tipo_cobranca_lote', tipoSelecionado);
    atualizarGrupoCobrancasPagamento('tipo_cobranca_lote', 'marcador-cobranca-lote');
}

function montarOpcoesCobrancaLote(curso = null, disciplinas = []) {
    if (!curso) return [{ id: '', nome: 'Selecione o curso para listar as cobranças disponíveis.', valor: 0, descricao: '' }];

    const opcoes = [];
    if (Utilidades.normalizarValorMonetario(curso.valor_inscricao) > 0) {
        opcoes.push({ id: 'Inscrição||inscricao||', tipo: 'Inscrição', nome: `Inscrição - ${Utilidades.formatarMoeda(curso.valor_inscricao)}`, descricao: 'Inscrição', valor: Utilidades.normalizarValorMonetario(curso.valor_inscricao) });
    }

    if (cursoCobraPorMensalidade(curso)) {
        const quantidade = Number(curso.quantidade_mensalidades || 0);
        for (let indice = 1; indice <= quantidade; indice++) {
            opcoes.push({ id: `Mensalidade||mensalidade-${indice}||${indice}`, tipo: 'Mensalidade', nome: `Mensalidade ${indice} - ${Utilidades.formatarMoeda(curso.valor_mensalidade)}`, descricao: `Mensalidade ${indice}`, valor: Utilidades.normalizarValorMonetario(curso.valor_mensalidade) });
        }
    }

    if (cursoCobraPorDisciplina(curso)) {
        [...disciplinas].sort((a, b) => compararTextoFinanceiro(a.nome, b.nome)).forEach(disciplina => {
            const valor = Utilidades.normalizarValorMonetario(disciplina.valor_disciplina);
            if (valor <= 0) return;
            opcoes.push({ id: `Disciplina||${disciplina.id}||`, tipo: 'Disciplina', nome: `${disciplina.nome} - ${Utilidades.formatarMoeda(valor)}`, descricao: disciplina.nome, valor });
        });
    }

    if (cursoCobraPorEncontro(curso)) {
        const valor = Utilidades.normalizarValorMonetario(curso.valor_encontro);
        [...disciplinas].sort((a, b) => compararTextoFinanceiro(a.nome, b.nome)).forEach(disciplina => {
            const quantidadeEncontros = Math.max(Number(disciplina.quantidade_encontros || 1), 1);
            for (let indice = 1; indice <= quantidadeEncontros; indice++) {
                if (encontroDisciplinaEhGratuito(disciplina, indice) || valor <= 0) continue;
                const descricao = `${disciplina.nome || 'Disciplina'} — Encontro ${indice}`;
                opcoes.push({
                    id: `Encontro||${disciplina.id}-encontro-${indice}||${indice}`,
                    tipo: 'Encontro',
                    nome: `${descricao} - ${Utilidades.formatarMoeda(valor)}`,
                    descricao,
                    valor
                });
            }
        });
    }

    opcoes.push({ id: 'Outros||outros||', tipo: 'Outros', nome: 'Outros - valor manual', descricao: 'Outros', valor: 0 });
    return ordenarOpcoesCobrancaPagamento(opcoes);
}

async function salvarPagamentoLote(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function' ? {} : eventoOuOpcoes;
    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') eventoOuOpcoes.preventDefault();

    const dados = await obterDadosFormularioPagamentoLote();
    if (!validarFormularioPagamentoLote(dados)) return null;

    for (const cobranca of dados.cobrancas) {
        if (cobranca.tipo === 'Outros') continue;
        for (const idParticipante of dados.ids_participantes) {
            const validacao = await validarPagamento(montarDadosPagamentoPorCobranca({ ...dados, id_participante: idParticipante }, cobranca), { ignorarLoteId: AppEstado.registroEmEdicao });
            if (!validacao.valido) {
                const participante = (await bd.obterTodos('participantes')).find(item => String(item.id) === String(idParticipante));
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

async function acionarReciboDireto(idPagamento) {
    const pagamento = await bd.obter('pagamentos', idPagamento);
    if (!pagamento) return;
    const participante = await bd.obter('participantes', pagamento.id_participante);
    gerarReciboGenerico(participante?.nome || 'Participante', pagamento.valor, montarDescricaoPagamento([pagamento]) || pagamento.descricao || pagamento.tipo, pagamento.data, participante?.cpf || '');
}

async function acionarReciboDiretoLote(idLote) {
    const lote = await bd.obter('pagamentos_lote', idLote);
    if (!lote) return;
    const paroquia = await bd.obter('paroquias', lote.id_paroquia);
    gerarReciboLoteTemplate(paroquia?.nome || 'Paróquia', lote.nomes_participantes || [], lote.valor_total, montarDescricaoPagamento(lote.cobrancas || []) || lote.descricao || lote.tipo, lote.data, paroquia?.cnpj || '');
}

function renderizarTabelaPagamentosIndividuais(pagamentos, participantes, cursos = []) {
    let codigo = '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos Individuais</h3>';
    const individuais = pagamentos.filter(pagamento => !pagamento.id_lote);
    if (individuais.length === 0) return codigo + criarMensagemVazia('Nenhum pagamento individual cadastrado ainda.');

    individuais.sort((a, b) => new Date(b.data) - new Date(a.data));
    const linhas = individuais.map((pagamento, indice) => montarLinhaPagamentoIndividual(pagamento, participantes, cursos, indice)).join('');
    return codigo + criarContainerTabela(['Participante', 'Curso', 'Tipo', 'Descrição', 'Valor', 'Data', 'Ações'], linhas, 'tabela-pagamentos', 'corpo-tabela-pagamentos');
}

function montarLinhaPagamentoIndividual(pagamento, participantes, cursos, indice) {
    const participante = participantes.find(item => String(item.id) === String(pagamento.id_participante));
    const curso = cursos.find(item => String(item.id) === String(participante?.id_curso));
    const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
    return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${participante?.nome || ''} ${curso?.nome || ''} ${pagamento.tipo || ''} ${pagamento.descricao || ''}`)}">
        <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.escaparHtml(participante?.nome || 'Participante não encontrado')}</td>
        <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(curso?.nome || '-')}</td>
        <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(pagamento.tipo || '-')}</td>
        <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(pagamento.descricao || '-')}</td>
        <td class="p-md texto-esquerda peso-bold cor-texto-sucesso">${Utilidades.formatarMoeda(pagamento.valor)}</td>
        <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.formatarData(pagamento.data)}</td>
        <td class="p-md texto-esquerda">${criarAcoesTabela([
            { rotulo: 'Recibo', acao: `acionarReciboDireto('${pagamento.id}')` },
            { rotulo: 'Editar', acao: `editarPagamento('${pagamento.id}')` },
            { rotulo: 'Excluir', acao: `excluirPagamento('${pagamento.id}')`, perigo: true }
        ])}</td>
    </tr>`;
}

function renderizarTabelaLotesPagamento(lotes, paroquias, cursos = []) {
    if (lotes.length === 0) return '';
    lotes.sort((a, b) => new Date(b.data) - new Date(a.data));
    const linhas = lotes.map((lote, indice) => {
        const paroquia = paroquias.find(item => String(item.id) === String(lote.id_paroquia));
        const curso = cursos.find(item => String(item.id) === String(lote.id_curso));
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${paroquia?.nome || ''} ${curso?.nome || ''} ${lote.tipo || ''} ${lote.descricao || ''}`)}">
            <td class="p-md texto-esquerda cor-texto-escuro peso-medium">${Utilidades.escaparHtml(paroquia?.nome || 'Paróquia não encontrada')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(curso?.nome || '-')}</td>
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
    return '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-md">Pagamentos em Lote</h3>'
        + criarContainerTabela(['Paróquia', 'Curso', 'Tipo', 'Descrição', 'Valor Total', 'Data', 'Ações'], linhas, 'tabela-lotes', 'corpo-tabela-lotes', 'mb-lg');
}

function renderizarParticipantesLotePagamento(participantes, lote = null) {
    const idCurso = document.getElementById('id_curso_lote')?.value || '';
    const idParoquia = document.getElementById('id_paroquia_lote')?.value || '';
    const recipiente = document.getElementById('recipiente-participantes-lote');
    if (!recipiente) return;

    const idsMarcados = new Set((lote?.ids_participantes || []).map(String));
    const filtrados = participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .filter(participante => String(participante.id_paroquia) === String(idParoquia))
        .filter(participante => Utilidades.participanteEstaAtivo(participante) || idsMarcados.has(String(participante.id)))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

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
                    <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(participante.nome)}${Utilidades.participanteEstaAtivo(participante) ? '' : ' <span class="etiqueta">Inativo</span>'}</span>
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

async function obterDadosFormularioPagamento() {
    const cobrancas = obterCobrancasPagamentoMarcadas();
    const valor = Utilidades.normalizarValorMonetario(document.getElementById('valor')?.value || 0);
    return {
        id_participante: document.getElementById('id_participante')?.value || '',
        cobrancas,
        descricao: document.getElementById('descricao')?.value.trim() || '',
        valor,
        data: document.getElementById('data')?.value || new Date().toISOString().split('T')[0],
        id_lote: document.getElementById('id_lote_pagamento')?.value || null
    };
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
        data: document.getElementById('data_lote')?.value || new Date().toISOString().split('T')[0]
    };
}

function obterReferenciaTipoPagamento(tipo) {
    if (tipo === 'Inscrição') return 'inscricao';
    if (tipo === 'Mensalidade') return 'mensalidade';
    if (tipo === 'Disciplina') return 'disciplina';
    if (tipo === 'Encontro') return 'encontro';
    return 'outros';
}

function montarPagamento(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_participante: dados.id_participante,
        tipo: dados.tipo,
        referencia_tipo: dados.referencia_tipo,
        referencia_id: dados.referencia_id || '',
        referencia_indice: dados.referencia_indice || null,
        quantidade: 1,
        descricao: dados.descricao,
        valor: dados.valor,
        data: dados.data,
        id_lote: dados.id_lote || null
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

function montarDadosPagamentoPorCobranca(dados, cobranca) {
    const cobrancasAutomaticas = dados.cobrancas.filter(item => item.tipo !== 'Outros');
    const valorAutomatico = cobrancasAutomaticas.reduce((total, item) => total + Utilidades.normalizarValorMonetario(item.valor), 0);
    const valorManual = Math.max(Utilidades.normalizarValorMonetario(dados.valor || dados.valor_unitario || 0) - valorAutomatico, 0);
    const valor = cobranca.tipo === 'Outros' ? valorManual : Utilidades.normalizarValorMonetario(cobranca.valor);

    return {
        id_participante: dados.id_participante,
        tipo: cobranca.tipo,
        referencia_tipo: obterReferenciaTipoPagamento(cobranca.tipo),
        referencia_id: cobranca.referencia_id,
        referencia_indice: cobranca.referencia_indice ? Number(cobranca.referencia_indice) : null,
        quantidade: 1,
        descricao: cobranca.tipo === 'Outros' ? (dados.descricao || 'Outros') : limparDescricaoItemPagamento(cobranca.tipo, cobranca.descricao),
        valor,
        data: dados.data,
        id_lote: dados.id_lote || null
    };
}

function validarFormularioPagamento(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Participante', valor: dados.id_participante },
        { nome: 'Cobranças', valor: dados.cobrancas.length },
        { nome: 'Descrição', valor: dados.descricao },
        { nome: 'Valor', valor: dados.valor },
        { nome: 'Data', valor: dados.data }
    ])) return false;

    if (!Validacao.listaNaoVazia(dados.cobrancas)) {
        Utilidades.notificacao('Selecione ao menos uma cobrança.', 'erro');
        return false;
    }

    if (dados.valor <= 0) {
        Utilidades.notificacao('Informe um valor maior que zero.', 'erro');
        return false;
    }

    const valorAutomatico = dados.cobrancas
        .filter(cobranca => cobranca.tipo !== 'Outros')
        .reduce((total, cobranca) => total + Utilidades.normalizarValorMonetario(cobranca.valor), 0);
    if (dados.cobrancas.some(cobranca => cobranca.tipo === 'Outros') && dados.valor <= valorAutomatico) {
        Utilidades.notificacao('Informe o valor adicional da cobrança manual.', 'erro');
        return false;
    }

    return true;
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
