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
    return obterChaveCobrancaFinanceira(obrigacao.tipo, obrigacao.referencia_id, obrigacao.referencia_indice);
}

function montarValorOpcaoCobranca(pagamento = {}) {
    return obterChaveCobrancaFinanceira(pagamento.tipo, pagamento.referencia_id, pagamento.referencia_indice);
}

function decodificarCobrancaPagamento(valor = '') {
    const [tipo = '', referencia_id = '', referencia_indice = ''] = String(valor).split('||');
    return { tipo, referencia_id, referencia_indice };
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

    ordenarPagamentosIndividuais(individuais, participantes, cursos);
    const linhas = individuais.map((pagamento, indice) => montarLinhaPagamentoIndividual(pagamento, participantes, cursos, indice)).join('');
    return codigo + criarContainerTabela(['Participante', 'Curso', 'Tipo', 'Descrição', 'Valor', 'Data', 'Ações'], linhas, 'tabela-pagamentos', 'corpo-tabela-pagamentos');
}

function ordenarPagamentosIndividuais(pagamentos = [], participantes = [], cursos = []) {
    return pagamentos.sort((a, b) => {
        const participanteA = participantes.find(item => String(item.id) === String(a.id_participante));
        const participanteB = participantes.find(item => String(item.id) === String(b.id_participante));
        const cursoA = cursos.find(item => String(item.id) === String(participanteA?.id_curso));
        const cursoB = cursos.find(item => String(item.id) === String(participanteB?.id_curso));

        return compararTextoFinanceiro(participanteA?.nome, participanteB?.nome)
            || compararTextoFinanceiro(cursoA?.nome, cursoB?.nome)
            || obterOrdemTipoCobrancaPagamento(a.tipo) - obterOrdemTipoCobrancaPagamento(b.tipo)
            || compararTextoFinanceiro(a.descricao, b.descricao)
            || String(b.data || '').localeCompare(String(a.data || ''));
    });
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
    ordenarPagamentosLote(lotes, paroquias, cursos);
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

function ordenarPagamentosLote(lotes = [], paroquias = [], cursos = []) {
    return lotes.sort((a, b) => {
        const paroquiaA = paroquias.find(item => String(item.id) === String(a.id_paroquia));
        const paroquiaB = paroquias.find(item => String(item.id) === String(b.id_paroquia));
        const cursoA = cursos.find(item => String(item.id) === String(a.id_curso));
        const cursoB = cursos.find(item => String(item.id) === String(b.id_curso));

        return compararTextoFinanceiro(paroquiaA?.nome, paroquiaB?.nome)
            || compararTextoFinanceiro(cursoA?.nome, cursoB?.nome)
            || obterOrdemTipoCobrancaPagamento(a.tipo) - obterOrdemTipoCobrancaPagamento(b.tipo)
            || compararTextoFinanceiro(a.descricao, b.descricao)
            || String(b.data || '').localeCompare(String(a.data || ''));
    });
}

async function obterDadosFormularioPagamento() {
    const cobrancas = obterCobrancasPagamentoMarcadas();
    const valor = Utilidades.normalizarValorMonetario(document.getElementById('valor')?.value || 0);
    return {
        id_participante: document.getElementById('id_participante')?.value || '',
        cobrancas,
        descricao: document.getElementById('descricao')?.value.trim() || '',
        valor,
        data: document.getElementById('data')?.value || Utilidades.obterDataAtual(),
        id_lote: document.getElementById('id_lote_pagamento')?.value || null
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

function cobrancasPossuemDuplicidade(cobrancas = []) {
    const chaves = new Set();
    return cobrancas.some(cobranca => {
        if (!cobranca || cobranca.tipo === 'Outros') return false;
        const chave = obterChaveCobrancaFinanceira(cobranca.tipo, cobranca.referencia_id, cobranca.referencia_indice);
        if (chaves.has(chave)) return true;
        chaves.add(chave);
        return false;
    });
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

    if (cobrancasPossuemDuplicidade(dados.cobrancas)) {
        Utilidades.notificacao('A mesma cobrança foi selecionada mais de uma vez.', 'erro');
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

