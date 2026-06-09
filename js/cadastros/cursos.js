async function renderizarCursos(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Cursos Cadastrados', criarBotao('+ Novo Curso', 'abrirFormularioCurso()', 'primario', '', 'button', ''));
    codigo += Busca.criarCampoBusca('busca-cursos', 'Buscar por nome...');
    codigo += cursos.length
        ? renderizarTabelaCursos(cursos)
        : criarMensagemVazia('Nenhum curso cadastrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-cursos', 'corpo-tabela-cursos');
}

async function abrirFormularioCurso(id = null) {
    AppEstado.registroEmEdicao = id;
    AppEstado.modoEdicao = 'cursos';

    const curso = id
        ? await bd.obter('cursos', id)
        : {
            ano: new Date().getFullYear(),
            tipo_cobranca: TIPOS_COBRANCA_CURSO.MENSAL,
            quantidade_mensalidades: 12,
            percentual_minimo_frequencia: PERCENTUAL_MINIMO_FREQUENCIA_PADRAO,
            desistencia_automatica: true,
            cobrar_faltas: false,
            cobrar_desistentes: true,
            permitir_pagamento_antecipado: true
        };

    const selecionarBooleano = valor => valor ? 'sim' : 'nao';

    document.getElementById('titulo-janela').textContent = id ? 'Editar Curso' : 'Novo Curso';

    let formulario = '<form novalidate id="formulario-curso" class="formulario-compacto" onsubmit="salvarCurso(event)">';

    formulario += '<section class="grupo-formulario-compacto">';
    formulario += '<h3 class="titulo-grupo-formulario">Identificação</h3>';
    formulario += criarCampoFormulario('Nome do Curso', 'text', 'nome', curso?.nome || '', 'Ex: Teologia Básica', true);
    formulario += '<div class="grade-formulario-duas-colunas">';
    formulario += criarCampoFormulario('Ano', 'number', 'ano', curso?.ano || '', 'Ex: 2026', true);
    formulario += criarCampoFormulario('Valor da Inscrição (R$)', 'number', 'valor_inscricao', curso?.valor_inscricao || '', 'Ex: 50.00');
    formulario += '</div>';
    formulario += '</section>';

    formulario += '<section class="grupo-formulario-compacto">';
    formulario += '<h3 class="titulo-grupo-formulario">Frequência</h3>';
    formulario += '<div class="grade-formulario-curso">';
    formulario += criarCampoFormulario('Carga Horária Total', 'number', 'carga_horaria_total', curso?.carga_horaria_total || '', 'Ex: 120', true);
    formulario += criarCampoFormulario('Frequência Mínima (%)', 'number', 'percentual_minimo_frequencia', curso?.percentual_minimo_frequencia || PERCENTUAL_MINIMO_FREQUENCIA_PADRAO, 'Ex: 75', true);
    formulario += criarToggleSimNaoCurso('Desistência automática', 'desistencia_automatica', selecionarBooleano(curso?.desistencia_automatica !== false), 'Marca desistência conforme a regra de frequência mínima do curso.');
    formulario += '</div>';
    formulario += '</section>';

    formulario += '<section class="grupo-formulario-compacto">';
    formulario += '<h3 class="titulo-grupo-formulario">Cobrança</h3>';
    formulario += '<div class="grade-formulario-curso grade-cobranca-curso">';
    formulario += criarSeletor('Tipo de Cobrança', 'tipo_cobranca', Object.values(TIPOS_COBRANCA_CURSO), curso?.tipo_cobranca || TIPOS_COBRANCA_CURSO.MENSAL, true);
    formulario += '<div id="campos-cobranca-mensal" class="campos-cobranca-curso">';
    formulario += criarCampoFormulario('Valor da Mensalidade (R$)', 'number', 'valor_mensalidade', curso?.valor_mensalidade || '', 'Ex: 100.00');
    formulario += criarCampoFormulario('Quantidade de Mensalidades', 'number', 'quantidade_mensalidades', curso?.quantidade_mensalidades || '', 'Ex: 12');
    formulario += '</div>';
    formulario += '<div id="campos-cobranca-encontro" class="campos-cobranca-curso">';
    formulario += criarCampoFormulario('Valor por Encontro (R$)', 'number', 'valor_encontro', curso?.valor_encontro || '', 'Ex: 25.00');
    formulario += '</div>';
    formulario += '</div>';
    formulario += '</section>';

    formulario += '<section class="grupo-formulario-compacto">';
    formulario += '<h3 class="titulo-grupo-formulario">Financeiro</h3>';
    formulario += '<div class="grade-formulario-curso">';
    formulario += criarToggleSimNaoCurso('Cobrar faltas', 'cobrar_faltas', selecionarBooleano(curso?.cobrar_faltas === true), 'Quando ligado, faltas podem gerar cobrança conforme o tipo de cobrança do curso.');
    formulario += criarToggleSimNaoCurso('Cobrar desistentes', 'cobrar_desistentes', selecionarBooleano(curso?.cobrar_desistentes !== false), 'Quando ligado, participantes desistentes continuam entrando nas cobranças abertas.');
    formulario += criarToggleSimNaoCurso('Pagamento antecipado', 'permitir_pagamento_antecipado', selecionarBooleano(curso?.permitir_pagamento_antecipado !== false), 'Permite cobrar encontros previstos antes do lançamento da frequência.');
    formulario += '</div>';
    formulario += '</section>';

    formulario += criarRodapeFormulario('', id ? 'Atualizar Curso' : 'Salvar Curso', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;

    document.getElementById('carga_horaria_total')?.setAttribute('step', '0.5');
    document.getElementById('percentual_minimo_frequencia')?.setAttribute('step', '1');
    document.getElementById('valor_inscricao')?.setAttribute('step', '0.01');
    document.getElementById('valor_mensalidade')?.setAttribute('step', '0.01');
    document.getElementById('valor_encontro')?.setAttribute('step', '0.01');
    document.getElementById('tipo_cobranca')?.addEventListener('change', atualizarCamposCobrancaCurso);
    vincularTogglesCurso();
    atualizarCamposCobrancaCurso();

    Interface.abrirJanela('janela-formulario');
}

function criarToggleSimNaoCurso(rotulo, id, valor = 'nao', ajuda = '') {
    const ativo = valor === 'sim';
    const textoAjuda = ajuda ? ` data-tooltip="${Utilidades.escaparHtml(ajuda)}"` : '';
    return `
        <div class="grupo-campo grupo-chave-curso">
            <input type="hidden" id="${id}" value="${ativo ? 'sim' : 'nao'}">
            <label for="${id}" class="rotulo-chave-curso">${Utilidades.escaparHtml(rotulo)}</label>
            <button type="button" class="chave-toggle ${ativo ? 'ativo' : ''}" data-alvo="${id}" aria-pressed="${ativo ? 'true' : 'false'}"${textoAjuda}>
                <span class="trilho-chave"><span class="bolinha-chave"></span></span>
                <span class="texto-chave">${ativo ? 'Sim' : 'Não'}</span>
            </button>
        </div>
    `;
}

function vincularTogglesCurso() {
    document.querySelectorAll('.chave-toggle').forEach(botao => {
        const alvo = document.getElementById(botao.dataset.alvo || '');
        if (!alvo) return;

        botao.addEventListener('click', () => {
            const ativo = alvo.value !== 'sim';
            alvo.value = ativo ? 'sim' : 'nao';
            botao.classList.toggle('ativo', ativo);
            botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
            const texto = botao.querySelector('.texto-chave');
            if (texto) texto.textContent = ativo ? 'Sim' : 'Não';
        });
    });
}

async function editarCurso(id) {
    await abrirFormularioCurso(id);
}

async function salvarCurso(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioCurso();
    const validacao = validarCurso(dados);
    if (!validacao.valido) return;

    await bd.salvar('cursos', montarCurso(validacao.dados, AppEstado.registroEmEdicao));

    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Curso atualizado com sucesso!' : 'Curso cadastrado com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirCurso(id) {
    if (!confirm('Deseja realmente excluir este curso? Esta ação não pode ser desfeita.')) return;

    await bd.excluir('cursos', id);
    Utilidades.notificacao('Curso excluído com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioCurso() {
    const lerBooleano = id => document.getElementById(id)?.value === 'sim';

    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        ano: Number(document.getElementById('ano')?.value || new Date().getFullYear()),
        carga_horaria_total: normalizarCargaHoraria(document.getElementById('carga_horaria_total')?.value || 0),
        percentual_minimo_frequencia: Number(document.getElementById('percentual_minimo_frequencia')?.value || 0),
        desistencia_automatica: lerBooleano('desistencia_automatica'),
        tipo_cobranca: document.getElementById('tipo_cobranca')?.value || TIPOS_COBRANCA_CURSO.MENSAL,
        valor_inscricao: document.getElementById('valor_inscricao')?.value || '0',
        valor_mensalidade: document.getElementById('valor_mensalidade')?.value || '0',
        quantidade_mensalidades: Number(document.getElementById('quantidade_mensalidades')?.value || 0),
        valor_encontro: document.getElementById('valor_encontro')?.value || '0',
        cobrar_faltas: lerBooleano('cobrar_faltas'),
        cobrar_desistentes: lerBooleano('cobrar_desistentes'),
        permitir_pagamento_antecipado: lerBooleano('permitir_pagamento_antecipado')
    };
}

function validarCurso(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome do Curso', valor: dados.nome },
        { nome: 'Ano', valor: dados.ano },
        { nome: 'Carga Horária Total', valor: dados.carga_horaria_total },
        { nome: 'Frequência Mínima', valor: dados.percentual_minimo_frequencia },
        { nome: 'Tipo de Cobrança', valor: dados.tipo_cobranca }
    ])) {
        return { valido: false };
    }

    if (!Validacao.numeroInteiro(dados.ano, 2000) || dados.ano > 2100) {
        Utilidades.notificacao('Informe um ano válido para o curso.', 'erro');
        return { valido: false };
    }

    if (!Number.isFinite(dados.carga_horaria_total) || dados.carga_horaria_total <= 0) {
        Utilidades.notificacao('Informe uma carga horária total maior que zero.', 'erro');
        return { valido: false };
    }

    if (!Number.isInteger(dados.percentual_minimo_frequencia) || dados.percentual_minimo_frequencia <= 0 || dados.percentual_minimo_frequencia > 100) {
        Utilidades.notificacao('Informe uma frequência mínima entre 1% e 100%.', 'erro');
        return { valido: false };
    }

    if (!Object.values(TIPOS_COBRANCA_CURSO).includes(dados.tipo_cobranca)) {
        Utilidades.notificacao('Selecione um tipo de cobrança válido.', 'erro');
        return { valido: false };
    }

    if (dados.tipo_cobranca === TIPOS_COBRANCA_CURSO.MENSAL && !Validacao.numeroInteiro(dados.quantidade_mensalidades, 1)) {
        Utilidades.notificacao('A quantidade de mensalidades deve ser um número inteiro maior que zero.', 'erro');
        return { valido: false };
    }

    const inscricao = Validacao.validarCampoMonetario(dados.valor_inscricao, 'Valor da inscrição', true);
    if (!inscricao.valido) return { valido: false };

    const mensalidade = Validacao.validarCampoMonetario(dados.valor_mensalidade, 'Valor da mensalidade', true);
    if (!mensalidade.valido) return { valido: false };

    const encontro = Validacao.validarCampoMonetario(dados.valor_encontro, 'Valor por encontro', true);
    if (!encontro.valido) return { valido: false };

    return {
        valido: true,
        dados: {
            ...dados,
            valor_inscricao: inscricao.valor,
            valor_mensalidade: mensalidade.valor,
            valor_encontro: encontro.valor,
            quantidade_mensalidades: dados.tipo_cobranca === TIPOS_COBRANCA_CURSO.MENSAL ? dados.quantidade_mensalidades : 0,
            desistencia_automatica: dados.desistencia_automatica,
            cobrar_faltas: dados.cobrar_faltas,
            cobrar_desistentes: dados.cobrar_desistentes,
            permitir_pagamento_antecipado: dados.permitir_pagamento_antecipado
        }
    };
}

function montarCurso(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        ano: dados.ano,
        carga_horaria_total: dados.carga_horaria_total,
        percentual_minimo_frequencia: dados.percentual_minimo_frequencia,
        tipo_cobranca: dados.tipo_cobranca,
        valor_inscricao: dados.valor_inscricao,
        valor_mensalidade: dados.valor_mensalidade,
        quantidade_mensalidades: dados.quantidade_mensalidades,
        valor_encontro: dados.valor_encontro,
        desistencia_automatica: dados.desistencia_automatica !== false,
        cobrar_faltas: dados.cobrar_faltas === true,
        cobrar_desistentes: dados.cobrar_desistentes !== false,
        permitir_pagamento_antecipado: dados.permitir_pagamento_antecipado !== false
    };
}

function renderizarTabelaCursos(cursos) {
    const linhas = cursos.map((curso, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(curso.nome || '')}">
            <td class="p-md texto-esquerda"><strong>${Utilidades.escaparHtml(curso.nome)}</strong></td>
            <td class="p-md texto-esquerda">${curso.ano || '-'}</td>
            <td class="p-md texto-esquerda">${formatarHorasCargaHoraria(curso.carga_horaria_total)}</td>
            <td class="p-md texto-esquerda">${obterPercentualMinimoCurso(curso)}%</td>
            <td class="p-md texto-esquerda">${Utilidades.escaparHtml(obterTipoCobrancaCurso(curso))}</td>
            <td class="p-md texto-esquerda">${formatarResumoCobrancaCurso(curso)}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarCurso('${curso.id}')` },
                    { rotulo: 'Excluir', acao: `excluirCurso('${curso.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Nome', 'Ano', 'Carga Horária', 'Freq. Mínima', 'Cobrança', 'Valor', 'Ações'],
        linhas,
        'tabela-cursos',
        'corpo-tabela-cursos'
    );
}

function atualizarCamposCobrancaCurso() {
    const tipo = document.getElementById('tipo_cobranca')?.value || TIPOS_COBRANCA_CURSO.MENSAL;
    document.getElementById('campos-cobranca-mensal')?.classList.toggle('oculto', tipo !== TIPOS_COBRANCA_CURSO.MENSAL);
    document.getElementById('campos-cobranca-encontro')?.classList.toggle('oculto', tipo !== TIPOS_COBRANCA_CURSO.ENCONTRO);
}

function formatarResumoCobrancaCurso(curso = null) {
    const tipo = obterTipoCobrancaCurso(curso);
    if (tipo === TIPOS_COBRANCA_CURSO.MENSAL) return `${Utilidades.formatarMoeda(curso.valor_mensalidade)} x ${curso.quantidade_mensalidades || 0}`;
    if (tipo === TIPOS_COBRANCA_CURSO.ENCONTRO) return `${Utilidades.formatarMoeda(curso.valor_encontro)} por encontro`;
    if (tipo === TIPOS_COBRANCA_CURSO.DISCIPLINA) return 'Valores por disciplina';
    return 'Sem cobrança recorrente';
}
