async function renderizarFinancas(conteudo) {
    const transacoes = await montarLivroCaixa();
    const resumo = calcularResumoLivroCaixa(transacoes);

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Livro Caixa', criarBotao('+ Nova Transação', 'abrirFormularioFinanca()', 'primario', '', 'button', ''));
    codigo += renderizarResumoLivroCaixa(resumo);
    codigo += renderizarCardRelatorioLivroCaixa();
    codigo += Busca.criarCampoBusca('busca-livro-caixa', 'Filtrar extrato...');
    codigo += transacoes.length
        ? renderizarTabelaLivroCaixa(transacoes)
        : criarMensagemVazia('Nenhuma transação anotada no livro caixa.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-livro-caixa', 'corpo-tabela-livro-caixa');
}

function renderizarCardRelatorioLivroCaixa() {
    const hoje = new Date();
    const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const dataAtual = Utilidades.obterDataAtual();

    return `
        <section class="cartao-geracao-relatorio mb-md">
            <div class="flex itens-centro justifica-espaco gap-md md-flex-coluna md-itens-esquerda">
                <div>
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Livro Caixa</h3>
                </div>
                ${criarBotao('Gerar Relatório', 'gerarPDFLivroCaixaFinanceiro()', 'secundario', 'md-w-total', 'button', '')}
            </div>
            <div class="flex gap-md md-flex-coluna w-total mt-sm">
                <div class="flex-1">${criarCampoFormulario('Data Início', 'date', 'filtro-data-inicio', primeiroDiaMes)}</div>
                <div class="flex-1">${criarCampoFormulario('Data Fim', 'date', 'filtro-data-fim', dataAtual)}</div>
            </div>
        </section>
    `;
}

async function abrirFormularioFinanca(id = null) {
    AppEstado.modoEdicao = 'financas';
    AppEstado.registroEmEdicao = id;
    document.getElementById('titulo-janela').textContent = id ? 'Editar Transação' : 'Nova Transação';

    const [financa, palestrantes, disciplinas, cursos] = await Promise.all([
        id ? bd.obter('financas', id) : Promise.resolve(null),
        bd.obterTodos('palestrantes'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('cursos')
    ]);

    const hoje = Utilidades.obterDataAtual();
    const dados = financa || {
        id: '',
        descricao: '',
        valor: '0,00',
        data: hoje,
        categoria: '',
        tipo: 'Saída',
        id_palestrante: '',
        id_disciplina: ''
    };

    const categorias = {
        Entrada: [
            { id: 'Doação', nome: 'Doação' },
            { id: 'Outros', nome: 'Outros' }
        ],
        Saída: [
            { id: 'Material', nome: 'Material' },
            { id: 'Pagamento de Palestrante', nome: 'Pagamento de Palestrante' },
            { id: 'Outros', nome: 'Outros' }
        ]
    };

    const tipoSelecionado = dados.tipo || 'Saída';
    const categoriasTipo = categorias[tipoSelecionado] || categorias.Saída;
    const categoriaSelecionada = categoriasTipo.some(categoria => categoria.id === dados.categoria)
        ? dados.categoria
        : categoriasTipo[0].id;
    const valorSelecionadoPalestrante = montarValorPalestranteDisciplina(dados.id_palestrante, dados.id_disciplina);

    let formulario = '<form novalidate id="formulario-financa" class="flex flex-coluna gap-md w-total" onsubmit="salvarFinanca(event)">';
    formulario += `<input type="hidden" id="id_financa" value="${dados.id || ''}">`;
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarSeletor('Tipo', 'tipo_financa', ['Saída', 'Entrada'], tipoSelecionado, true) + '</div>';
    formulario += '<div class="flex-1" id="recipiente-categoria-financa">' + criarSeletor('Categoria', 'categoria_financa', categoriasTipo, categoriaSelecionada, true) + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div id="recipiente-descricao-financa" class="flex-1">' + criarCampoFormulario('Descrição / Referência', 'text', 'descricao', dados.descricao || '', 'Ex: Compra de material', true) + '</div>';
    formulario += '<div id="recipiente-palestrante-financa" class="flex-1 oculto">' + criarSeletor('Palestrante e Disciplina', 'palestrante_disciplina_financa', montarOpcoesPalestrantesDisciplinas(palestrantes, disciplinas, cursos), valorSelecionadoPalestrante, false) + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md w-total md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Valor (R$)', 'text', 'valor', String(dados.valor || '0,00').replace('.', ','), '0,00', true) + '</div>';
    formulario += '<input type="hidden" id="data" value="' + (dados.data || hoje) + '">';
    formulario += '<div class="flex-1">' + criarCampoSomenteLeitura('Data', 'data_visual', Utilidades.formatarData(dados.data || hoje)) + '</div>';
    formulario += '</div>';
    formulario += criarRodapeFormulario('salvarFinanca()', id ? 'Atualizar' : 'Salvar', {
        botoesExtras: criarBotao('Salvar e Gerar Recibo', 'salvarFinancaEGerarRecibo()', 'secundario', 'md-w-total oculto', 'button', 'id="botao-recibo-financa"')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    document.getElementById('valor')?.setAttribute('inputmode', 'decimal');

    const atualizarCategoria = () => {
        const tipo = document.getElementById('tipo_financa')?.value || 'Saída';
        const novasCategorias = categorias[tipo] || categorias.Saída;
        document.getElementById('recipiente-categoria-financa').innerHTML = criarSeletor('Categoria', 'categoria_financa', novasCategorias, novasCategorias[0].id, true);
        document.getElementById('categoria_financa')?.addEventListener('change', atualizarRegraPalestranteFinanca);
        atualizarRegraPalestranteFinanca();
    };

    document.getElementById('tipo_financa')?.addEventListener('change', atualizarCategoria);
    document.getElementById('categoria_financa')?.addEventListener('change', atualizarRegraPalestranteFinanca);
    atualizarRegraPalestranteFinanca();

    Interface.abrirJanela('janela-formulario');
}

function montarOpcoesPalestrantesDisciplinas(palestrantes = [], disciplinas = [], cursos = []) {
    const opcoes = [{ id: '', nome: 'Selecione um Palestrante/Disciplina...' }];
    const palestrantesComDisciplina = new Set();

    disciplinas.forEach(disciplina => {
        const idsPalestrantes = Array.isArray(disciplina.ids_palestrantes) ? disciplina.ids_palestrantes : [];
        if (idsPalestrantes.length === 0) return;

        const curso = cursos.find(item => String(item.id) === String(disciplina.id_curso));
        idsPalestrantes.forEach(idPalestrante => {
            const palestrante = palestrantes.find(item => String(item.id) === String(idPalestrante));
            if (!palestrante) return;

            palestrantesComDisciplina.add(String(palestrante.id));
            opcoes.push({
                id: montarValorPalestranteDisciplina(palestrante.id, disciplina.id),
                nome: `${palestrante.nome} | ${disciplina.nome} (${curso?.nome || 'Sem curso'})`
            });
        });
    });

    palestrantes.forEach(palestrante => {
        if (palestrantesComDisciplina.has(String(palestrante.id))) return;
        opcoes.push({
            id: montarValorPalestranteDisciplina(palestrante.id, ''),
            nome: `${palestrante.nome} (Sem disciplina vinculada)`
        });
    });

    return opcoes;
}

function montarValorPalestranteDisciplina(idPalestrante = '', idDisciplina = '') {
    return `${idPalestrante || ''}::${idDisciplina || ''}`;
}

function separarValorPalestranteDisciplina(valor = '') {
    const [idPalestrante = '', idDisciplina = ''] = String(valor).split('::');
    return { idPalestrante, idDisciplina };
}

function atualizarRegraPalestranteFinanca() {
    const categoria = document.getElementById('categoria_financa')?.value || '';
    const ehPalestrante = categoria === 'Pagamento de Palestrante';

    document.getElementById('recipiente-palestrante-financa')?.classList.toggle('oculto', !ehPalestrante);
    document.getElementById('botao-recibo-financa')?.classList.toggle('oculto', !ehPalestrante);
}

async function editarFinanca(id) {
    await abrirFormularioFinanca(id);
}

async function salvarFinanca(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function'
        ? {}
        : eventoOuOpcoes;

    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') {
        eventoOuOpcoes.preventDefault();
    }

    const dados = obterDadosFormularioFinanca();
    const validacao = validarFinanca(dados);
    if (!validacao.valido) return null;

    const financa = montarFinanca(validacao.dados, AppEstado.registroEmEdicao);
    await bd.salvar('financas', financa);

    if (opcoes.notificar !== false) {
        Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!', 'sucesso');
    }
    if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
    if (opcoes.renderizar !== false) await renderizarAbaAtual();

    return financa;
}

async function salvarFinancaEGerarRecibo() {
    const financa = await salvarFinanca({ fecharJanela: false, renderizar: false });
    if (!financa) return;

    await acionarReciboFinancaDireto(financa.id);
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirFinanca(id) {
    if (!confirm('Deseja realmente excluir esta transação do livro caixa?')) return;

    await bd.excluir('financas', id);
    Utilidades.notificacao('Transação excluída com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

async function acionarReciboFinancaDireto(id) {
    const financa = await bd.obter('financas', id);
    if (!financa || financa.categoria !== 'Pagamento de Palestrante') {
        Utilidades.notificacao('Este lançamento não possui recibo de palestrante disponível.', 'aviso');
        return;
    }

    const [palestrante, disciplina] = await Promise.all([
        financa.id_palestrante ? bd.obter('palestrantes', financa.id_palestrante) : Promise.resolve(null),
        financa.id_disciplina ? bd.obter('disciplinas', financa.id_disciplina) : Promise.resolve(null)
    ]);

    gerarReciboPalestranteTemplate(
        palestrante?.nome || 'Palestrante',
        disciplina?.nome || '',
        financa.valor,
        financa.descricao,
        financa.data,
        palestrante?.cpf || ''
    );
}

function obterDadosFormularioFinanca() {
    const categoria = document.getElementById('categoria_financa')?.value || '';
    const selecao = separarValorPalestranteDisciplina(document.getElementById('palestrante_disciplina_financa')?.value || '');

    return {
        tipo: document.getElementById('tipo_financa')?.value || 'Saída',
        categoria,
        descricao: document.getElementById('descricao')?.value.trim() || '',
        valor: document.getElementById('valor')?.value || '0',
        data: document.getElementById('data')?.value || Utilidades.obterDataAtual(),
        id_palestrante: categoria === 'Pagamento de Palestrante' ? selecao.idPalestrante : '',
        id_disciplina: categoria === 'Pagamento de Palestrante' ? selecao.idDisciplina : ''
    };
}

function validarFinanca(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Tipo', valor: dados.tipo },
        { nome: 'Categoria', valor: dados.categoria },
        { nome: 'Descrição / Referência', valor: dados.descricao },
        { nome: 'Valor', valor: dados.valor },
        { nome: 'Data', valor: dados.data }
    ])) {
        return { valido: false };
    }

    if (dados.categoria === 'Pagamento de Palestrante' && !Validacao.notificarCamposObrigatorios([
        { nome: 'Palestrante e Disciplina', valor: dados.id_palestrante }
    ])) {
        return { valido: false };
    }

    if (!['Entrada', 'Saída'].includes(dados.tipo)) {
        Utilidades.notificacao('Tipo de transação inválido.', 'erro');
        return { valido: false };
    }

    const valor = Validacao.validarCampoMonetario(dados.valor, 'Valor', false);
    if (!valor.valido) return { valido: false };
    if (!Validacao.validarCampoData(dados.data, 'Data')) return { valido: false };

    return {
        valido: true,
        dados: {
            ...dados,
            valor: valor.valor
        }
    };
}

function montarFinanca(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        tipo: dados.tipo,
        categoria: dados.categoria,
        descricao: dados.descricao,
        valor: dados.valor,
        data: dados.data,
        id_palestrante: dados.id_palestrante || '',
        id_disciplina: dados.id_disciplina || ''
    };
}

function renderizarResumoLivroCaixa(resumo) {
    return `
        <div class="flex flex-linha gap-md mb-md md-flex-coluna">
            <div class="cartao-resumo fundo-toast-sucesso flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Total Entradas</span>
                <h3 class="texto-xl peso-bold cor-texto-sucesso mt-sm">${Utilidades.formatarMoeda(resumo.totalEntradas)}</h3>
            </div>
            <div class="cartao-resumo fundo-toast-erro flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Total Saídas</span>
                <h3 class="texto-xl peso-bold cor-texto-erro mt-sm">${Utilidades.formatarMoeda(resumo.totalSaidas)}</h3>
            </div>
            <div class="cartao-resumo ${resumo.saldo >= 0 ? 'fundo-toast-sucesso' : 'fundo-toast-erro'} flex-1">
                <span class="texto-sm peso-bold cor-texto-claro">Saldo em Caixa</span>
                <h3 class="texto-xl peso-bold ${resumo.saldo >= 0 ? 'cor-texto-sucesso' : 'cor-texto-erro'} mt-sm">${Utilidades.formatarMoeda(resumo.saldo)}</h3>
            </div>
        </div>
    `;
}

function renderizarTabelaLivroCaixa(transacoes) {
    const linhas = transacoes.map((transacao, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const corTexto = transacao.tipo === 'Entrada' ? 'cor-texto-sucesso' : 'cor-texto-erro';
        const prefixo = transacao.tipo === 'Entrada' ? '+' : '-';
        const acoes = transacao.podeExcluir
            ? criarAcoesTabela([
                transacao.categoria === 'Pagamento de Palestrante'
                    ? { rotulo: 'Recibo', acao: `acionarReciboFinancaDireto('${transacao.id}')` }
                    : null,
                { rotulo: 'Editar', acao: `editarFinanca('${transacao.id}')` },
                { rotulo: 'Excluir', acao: `excluirFinanca('${transacao.id}')`, perigo: true }
            ].filter(Boolean))
            : `<span class="texto-sm texto-italico cor-texto-claro">${transacao.origem === 'lote' ? 'Pagamento em Lote' : 'Pagamento Individual'}</span>`;

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${transacao.descricao || ''} ${transacao.categoria || ''}`)}">
            <td class="p-md cor-texto-escuro">${Utilidades.formatarData(transacao.data)}</td>
            <td class="p-md cor-texto-escuro">${Utilidades.escaparHtml(transacao.descricao)}</td>
            <td class="p-md texto-centro"><span class="etiqueta ${corTexto}">${transacao.tipo}</span></td>
            <td class="p-md texto-centro peso-bold ${corTexto}">${prefixo} ${Utilidades.formatarMoeda(transacao.valor)}</td>
            <td class="p-md">${acoes}</td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Data', 'Descrição', 'Natureza', 'Valor', 'Ações'],
        linhas,
        'tabela-livro-caixa',
        'corpo-tabela-livro-caixa'
    );
}
