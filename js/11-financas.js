async function renderizarFinancas(conteudo) {
    const despesas = await bd.obterTodos('financas');
    const pagamentos = await bd.obterTodos('pagamentos');
    let lotes = [];
    try { lotes = await bd.obterTodos('pagamentos_lote'); } catch (e) {}
    
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');

    const transacoes = montarTransacoes(despesas, pagamentos, lotes, participantes, paroquias);
    const resumo = calcularResumoFinancas(transacoes);

    let codigoEstrutura = '<div class="cartao-padrao mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Livro Caixa</h2>';
    codigoEstrutura += criarBotao('+ Nova Transação', 'abrirFormularioFinanca()');
    codigoEstrutura += '</div>';

    codigoEstrutura += `
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
        </div>`;

    codigoEstrutura += Busca.criarCampoBusca('busca-livro-caixa', 'Filtrar extrato...');

    if (transacoes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma transação anotada no livro caixa.</p>';
    } else {
        let linhasTransacoes = '';

        transacoes.forEach((t, index) => {
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
            const corTexto = t.tipo === 'Entrada' ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const prefixo = t.tipo === 'Entrada' ? '+' : '-';

            linhasTransacoes += `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${(t.descricao || '').toLowerCase()}">`;
            linhasTransacoes += `<td class="p-md cor-texto-escuro">${Utilidades.formatarData(t.data)}</td>`;
            linhasTransacoes += `<td class="p-md cor-texto-escuro">${t.descricao}</td>`;
            linhasTransacoes += `<td class="p-md texto-centro"><span class="etiqueta ${corTexto}">${t.tipo}</span></td>`;
            linhasTransacoes += `<td class="p-md texto-centro peso-bold ${corTexto}">${prefixo} ${Utilidades.formatarMoeda(t.valor)}</td>`;
            linhasTransacoes += `<td class="p-md">`;

            if (t.podeExcluir) {
                const acoes = [];
                if (t.categoria === 'Pagamento de Palestrante') {
                    acoes.push({ rotulo: 'Recibo', acao: `acionarReciboFinancaDireto('${t.id}')` });
                }

                acoes.push(
                    { rotulo: 'Editar', acao: `editarFinanca('${t.id}')` },
                    { rotulo: 'Excluir', acao: `excluirFinanca('${t.id}')`, perigo: true }
                );

                linhasTransacoes += criarAcoesTabela(acoes);
            } else {
                linhasTransacoes += `<span class="texto-sm texto-italico cor-texto-claro">${t.origem === 'lote' ? 'Pagamento em Lote' : 'Pagamento Individual'}</span>`;
            }

            linhasTransacoes += `</td></tr>`;
        });

        codigoEstrutura += criarContainerTabela(
            ['Data', 'Descrição', 'Natureza', 'Valor', 'Ações'],
            linhasTransacoes,
            'tabela-livro-caixa',
            'corpo-tabela-livro-caixa'
        );
    }

    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-livro-caixa', 'corpo-tabela-livro-caixa');
}

function montarTransacoes(despesas = [], pagamentos = [], lotes = [], participantes = [], paroquias = []) {
    const transacoes = [];

    pagamentos.forEach(p => {
        if (p.id_lote) return;

        const participante = participantes.find(al => String(al.id_participante) === String(p.id_participante));
        const nomeParticipante = participante ? (participante.nome_participante || participante.nome) : 'Participante Não Identificado';
        const valorLimpo = Utilidades.normalizarValorMonetario(p.valor || 0);
        transacoes.push({
            id: p.id_pagamento,
            data: p.data_pagamento || p.data || new Date().toISOString().split('T')[0],
            descricao: `Recebimento: ${p.tipo_pagamento || 'Pagamento'} - Participante: ${nomeParticipante}`,
            tipo: 'Entrada',
            origem: 'individual',
            valor: isNaN(valorLimpo) ? 0 : valorLimpo,
            podeExcluir: false
        });
    });

    lotes.forEach(l => {
        const paroquia = paroquias.find(p => String(p.id_paroquia) === String(l.id_paroquia));
        const nomeParoquia = paroquia ? paroquia.nome_paroquia : 'Paróquia Não Identificada';
        const valorLimpo = Utilidades.normalizarValorMonetario(l.valor_total || 0);
        transacoes.push({
            id: l.id_lote,
            data: l.data_pagamento || new Date().toISOString().split('T')[0],
            descricao: `Recebimento Lote: ${l.tipo_pagamento || 'Pagamento'} - ${nomeParoquia}`,
            tipo: 'Entrada',
            origem: 'lote',
            valor: isNaN(valorLimpo) ? 0 : valorLimpo,
            podeExcluir: false
        });
    });

    despesas.forEach(d => {
        const valorLimpo = Utilidades.normalizarValorMonetario(d.valor || 0);
        transacoes.push({
            id: d.id_despesa || d.id || Utilidades.gerarId(),
            data: d.data || d.data_despesa || new Date().toISOString().split('T')[0],
            descricao: d.descricao || 'Despesa',
            tipo: d.tipo || 'Saída',
            categoria: d.categoria || '',
            nome_palestrante: d.nome_palestrante || '',
            valor: isNaN(valorLimpo) ? 0 : valorLimpo,
            podeExcluir: true
        });
    });

    transacoes.sort((a, b) => new Date(b.data) - new Date(a.data));
    return transacoes;
}

function calcularResumoFinancas(transacoes = []) {
    const totalEntradas = transacoes.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + (t.valor || 0), 0);
    const totalSaidas = transacoes.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + (t.valor || 0), 0);
    const saldo = totalEntradas - totalSaidas;
    return { totalEntradas, totalSaidas, saldo };
}

async function abrirFormularioFinanca(idDespesa = null) {
    modoEdicao = 'financas';
    registroEmEdicao = idDespesa;
    document.getElementById('titulo-janela').textContent = idDespesa ? 'Editar Transação' : 'Nova Transação';

    const palestrantesCadastrados = await bd.obterTodos('palestrantes') || [];
    const disciplinasCadastradas = await bd.obterTodos('disciplinas') || [];
    const cursosCadastrados = await bd.obterTodos('cursos') || [];

    let opcoesPalestrantes = [{ id: '', nome: 'Selecione um Palestrante/Disciplina...' }];
    
    disciplinasCadastradas.forEach(disc => {
        let idsPalestrantesDaDisc = [];
        if (Array.isArray(disc.id_palestrantes)) {
            idsPalestrantesDaDisc = disc.id_palestrantes;
        } else if (disc.id_palestrante) { 
            idsPalestrantesDaDisc = [disc.id_palestrante];
        }

        if (idsPalestrantesDaDisc.length > 0) {
            const curso = cursosCadastrados.find(c => String(c.id_curso) === String(disc.id_curso));
            const nomeCurso = curso ? (curso.nome_curso || curso.nome) : 'Sem Curso';

            idsPalestrantesDaDisc.forEach(idPal => {
                const pal = palestrantesCadastrados.find(p => String(p.id_palestrante) === String(idPal));
                if (pal) {
                    const nomeP = pal.nome_palestrante || pal.nome;
                    const nomeD = disc.nome_disciplina || disc.nome;
                    opcoesPalestrantes.push({
                        id: `${nomeP} - ${nomeD}`, 
                        nome: `${nomeP} | ${nomeD} (${nomeCurso})`
                    });
                }
            });
        }
    });

    palestrantesCadastrados.forEach(pal => {
        const idPal = String(pal.id_palestrante);
        const temDisciplina = disciplinasCadastradas.some(d => {
            if (Array.isArray(d.id_palestrantes)) return d.id_palestrantes.includes(idPal);
            return String(d.id_palestrante) === idPal;
        });

        if (!temDisciplina) {
            const nomeP = pal.nome_palestrante || pal.nome;
            opcoesPalestrantes.push({
                id: nomeP,
                nome: `${nomeP} (Sem disciplina vinculada)`
            });
        }
    });

    const hojeIso = new Date().toISOString().split('T')[0];
    let despesa = { id_despesa: '', descricao: '', valor: '0,00', data: hojeIso, categoria: '', nome_palestrante: '', tipo: 'Saída' };

    if (idDespesa) {
        try {
            const obtido = await bd.obter('financas', idDespesa);
            if (obtido) {
                despesa = {
                    id_despesa: obtido.id_despesa || obtido.id || idDespesa,
                    descricao: obtido.descricao || '',
                    valor: String(obtido.valor || obtido.valor_despesa || 0).toString().replace('.', ','),
                    data: obtido.data || obtido.data_despesa || hojeIso,
                    categoria: obtido.categoria || '',
                    nome_palestrante: obtido.nome_palestrante || '',
                    tipo: obtido.tipo || 'Saída'
                };
            }
        } catch (err) {
            despesa.data = hojeIso;
        }
    }

    let formHTML = '<form id="formulario-despesa" class="flex flex-coluna gap-md" onsubmit="event.preventDefault();">';
    formHTML += `<input type="hidden" id="id_despesa" value="${despesa.id_despesa || ''}">`;

    const tiposOpcoes = [
        {id: 'Saída', nome: 'Saída'},
        {id: 'Entrada', nome: 'Entrada'}
    ];
    
    const categoriasDinâmicas = {
        'Entrada': [
            {id: 'Doação', nome: 'Doação'},
            {id: 'Outros', nome: 'Outros'}
        ],
        'Saída': [
            {id: 'Material', nome: 'Material'},
            {id: 'Pagamento de Palestrante', nome: 'Pagamento de Palestrante'},
            {id: 'Outros', nome: 'Outros'}
        ]
    };

    let opcoesIniciaisCategoria = categoriasDinâmicas[despesa.tipo] || categoriasDinâmicas['Saída'];
    let categoriaSelecionada = opcoesIniciaisCategoria.some(c => c.id === despesa.categoria) ? despesa.categoria : opcoesIniciaisCategoria[0].id;

    formHTML += '<div class="flex gap-md w-total md-flex-coluna">';
    formHTML += '<div class="flex-1">' + criarSeletor('Tipo', 'tipo_financa', tiposOpcoes, despesa.tipo, false) + '</div>';
    formHTML += '<div class="flex-1" id="recipiente-categoria">' + criarSeletor('Categoria', 'categoria_financa', opcoesIniciaisCategoria, categoriaSelecionada, false) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex gap-md w-total md-flex-coluna">';
    formHTML += '<div id="div-descricao" class="flex-1 transicao">' + criarCampoFormulario('Descrição / Referência', 'text', 'descricao', despesa.descricao || '', 'Ex: Compra de material', true) + '</div>';
    formHTML += '<div id="div-palestrante" class="flex-1 transicao oculto">' + criarSeletor('Palestrante e Disciplina', 'nome_palestrante', opcoesPalestrantes, despesa.nome_palestrante || '', false) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex flex-linha md-flex-coluna gap-md w-total">';
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Valor (R$)</label>';
    formHTML += `<input type="text" id="valor" value="${despesa.valor || '0,00'}" placeholder="0,00" class="campo-padrao">`;
    formHTML += '</div>';
    formHTML += '<div class="flex flex-coluna flex-1">';
    formHTML += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data</label>';
    let dataFormatada = '';
    try {
        dataFormatada = Utilidades.formatarData(despesa.data || hojeIso);
    } catch (e) {
        dataFormatada = despesa.data || hojeIso;
    }
    formHTML += `<input type="text" id="data" data-real="${despesa.data || hojeIso}" value="${dataFormatada}" readonly class="campo-somente-leitura">`;
    formHTML += '</div>';
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarFinanca()', idDespesa ? 'Atualizar' : 'Salvar', {
        botoesExtras: criarBotao('Gerar Recibo', 'acionarReciboFinanca()', 'secundario', 'md-w-total oculto', 'button', 'id="botao-recibo-financa"')
    });

    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;

    setTimeout(() => {
        const elTipo = document.getElementById('tipo_financa');
        const recipienteCategoria = document.getElementById('recipiente-categoria');

        function monitorarRegraPalestrante() {
            const elCategoria = document.getElementById('categoria_financa');
            const divPalestrante = document.getElementById('div-palestrante');
            const botaoRecibo = document.getElementById('botao-recibo-financa');
            
            if (elCategoria && elCategoria.value === 'Pagamento de Palestrante') {
                if (divPalestrante) divPalestrante.classList.remove('oculto');
                if (botaoRecibo) botaoRecibo.classList.remove('oculto');
            } else {
                if (divPalestrante) divPalestrante.classList.add('oculto');
                if (botaoRecibo) botaoRecibo.classList.add('oculto');
            }
        }

        elTipo.addEventListener('change', (e) => {
            const novoTipo = e.target.value;
            const novasOpcoes = categoriasDinâmicas[novoTipo] || categoriasDinâmicas['Saída'];
            
            recipienteCategoria.innerHTML = criarSeletor('Categoria', 'categoria_financa', novasOpcoes, novasOpcoes[0].id, false);
            
            const novoElCategoria = document.getElementById('categoria_financa');
            novoElCategoria.addEventListener('change', monitorarRegraPalestrante);
            
            monitorarRegraPalestrante();
        });

        const elCategoriaInicial = document.getElementById('categoria_financa');
        if (elCategoriaInicial) {
            elCategoriaInicial.addEventListener('change', monitorarRegraPalestrante);
            monitorarRegraPalestrante();
        }
    }, 0);

    Interface.abrirJanela('janela-formulario');
}

async function editarFinanca(idDespesa) {
    await abrirFormularioFinanca(idDespesa);
}

async function salvarFinanca() {
    const id_field = document.getElementById('id_despesa');
    const id_despesa = id_field && id_field.value ? id_field.value : (registroEmEdicao || Utilidades.gerarId());

    const descricao = document.getElementById('descricao').value.trim();
    const valorRaw = document.getElementById('valor').value;
    
    const dataElem = document.getElementById('data');
    const data = (dataElem && dataElem.dataset && dataElem.dataset.real) ? dataElem.dataset.real : new Date().toISOString().split('T')[0];
    
    const categoria = document.getElementById('categoria_financa') ? document.getElementById('categoria_financa').value : '';
    const tipo = document.getElementById('tipo_financa') ? document.getElementById('tipo_financa').value : 'Saída';

    let nome_palestrante = '';
    if (categoria === 'Pagamento de Palestrante') {
        const elPalestrante = document.getElementById('nome_palestrante');
        if (elPalestrante) nome_palestrante = elPalestrante.value.trim();
    }

    const camposObrigatorios = [
        { nome: 'Descrição / Referência', valor: descricao },
        { nome: 'Valor', valor: valorRaw },
        { nome: 'Data', valor: data }
    ];

    if (categoria === 'Pagamento de Palestrante') {
        camposObrigatorios.push({ nome: 'Palestrante e Disciplina', valor: nome_palestrante });
    }

    if (!Validacao.notificarCamposObrigatorios(camposObrigatorios)) return;
    if (!Validacao.validarCampoData(data, 'Data')) return;

    const valorValidado = Validacao.validarCampoMonetario(valorRaw, 'Valor');
    if (!valorValidado.valido) return;

    const transacao = {
        id_despesa,
        descricao,
        valor: valorValidado.valor,
        data,
        categoria,
        tipo,
        nome_palestrante
    };

    await bd.salvar('financas', transacao);
    Utilidades.notificacao(id_field && id_field.value ? 'Transação atualizada com sucesso!' : 'Transação registrada com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function excluirFinanca(idDespesa) {
    if (confirm('Deseja realmente excluir esta transação do livro caixa?')) {
        await bd.excluir('financas', idDespesa);
        Utilidades.notificacao('Transação excluída com sucesso!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function acionarReciboFinanca() {
    const palestranteValor = document.getElementById('nome_palestrante').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const valor = document.getElementById('valor').value;
    
    const dataElem = document.getElementById('data');
    const dataFinanca = (dataElem && dataElem.dataset && dataElem.dataset.real) ? dataElem.dataset.real : new Date().toISOString().split('T')[0];

    if (!palestranteValor || !valor) {
        Utilidades.notificacao('Preencha o nome do palestrante e o valor antes de gerar o recibo.', 'erro');
        return;
    }

    if (!Validacao.validarCampoData(dataFinanca, 'Data')) return;
    const valorValidado = Validacao.validarCampoMonetario(valor, 'Valor');
    if (!valorValidado.valido) return;

    const nomePalestrante = palestranteValor.includes(' - ') ? palestranteValor.split(' - ')[0] : palestranteValor;
    const nomeDisciplina = palestranteValor.includes(' - ') ? palestranteValor.split(' - ')[1] : '';

    const dataFormatada = Utilidades.formatarData(dataFinanca);
    gerarReciboPalestranteTemplate(nomePalestrante, nomeDisciplina, valorValidado.valor, descricao, dataFormatada);
}

async function acionarReciboFinancaDireto(idFinanca) {
    const financa = await bd.obter('financas', idFinanca);
    if (!financa || !financa.nome_palestrante) {
        Utilidades.notificacao('Este lançamento não possui recibo de palestrante disponível.', 'aviso');
        return;
    }

    const palestranteValor = financa.nome_palestrante;
    const nomePalestrante = palestranteValor.includes(' - ') ? palestranteValor.split(' - ')[0] : palestranteValor;
    const nomeDisciplina = palestranteValor.includes(' - ') ? palestranteValor.split(' - ')[1] : '';

    const dataFormatada = Utilidades.formatarData(financa.data || financa.data_despesa);
    gerarReciboPalestranteTemplate(nomePalestrante, nomeDisciplina, financa.valor, financa.descricao, dataFormatada);
}

function gerarReciboPalestranteTemplate(nomePalestrante, nomeDisciplina, valor, descricao, data) {
    const valorFormatado = Utilidades.formatarMoeda(valor);

    const textoReferencia = nomeDisciplina 
        ? `ministração da disciplina: <strong>${nomeDisciplina}</strong>` 
        : `atividade acadêmica / ministração de palestra: <strong>${descricao || 'Formação Catequética'}</strong>`;

    gerarReciboPadrao('Recibo de Pagamento - Prestador/Palestrante', {
        titulo: 'RECIBO DE PAGAMENTO',
        rotuloValor: 'Valor',
        valorFormatado,
        data,
        conteudo: `
            <p>Recebi de <strong>${NOME_INSTITUCIONAL}</strong>, a importância de <strong>${valorFormatado}</strong>, referente à ${textoReferencia}.</p>
            <p>Por ser expressão da verdade, firmo o presente dando plena e total quitação pelo serviço prestado.</p>
        `,
        rotuloAssinatura: 'Assinatura do(a) Palestrante',
        nomeAssinatura: nomePalestrante
    });
}
