async function renderizarParticipantes(conteudo) {
    const [participantes, paroquias] = await Promise.all([
        bd.obterTodos('participantes'),
        bd.obterTodos('paroquias')
    ]);

    participantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna md-w-total">'
        + criarBotao('Importar Dados', 'abrirModalImportacao()', 'secundario', 'md-w-total')
        + criarBotao('Imprimir Cartões', 'abrirModalCartoesParticipantes()', 'secundario', 'md-w-total')
        + criarBotao('+ Novo Participante', 'abrirFormularioParticipante()', 'primario', 'md-w-total')
        + '</div>';

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Participantes Cadastrados', botoesCabecalho);
    codigo += Busca.criarCampoBusca('busca-participantes', 'Buscar por nome...');
    codigo += participantes.length
        ? renderizarTabelaParticipantes(participantes, paroquias)
        : criarMensagemVazia('Nenhum participante cadastrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-participantes', 'corpo-tabela-participantes');
}

async function abrirFormularioParticipante(id = null) {
    AppEstado.modoEdicao = 'participantes';
    AppEstado.registroEmEdicao = id;

    const [paroquias, cursos] = await Promise.all([
        bd.obterTodos('paroquias'),
        bd.obterTodos('cursos')
    ]);

    const participante = id ? await bd.obter('participantes', id) : { status: 'Ativo' };
    const opcoesStatus = [
        { id: 'Ativo', nome: 'Ativo' },
        { id: 'Desistente', nome: 'Desistente' }
    ];

    document.getElementById('titulo-janela').textContent = id ? 'Editar Participante' : 'Novo Participante';

    let formulario = '<form id="formulario-participante" class="flex flex-coluna gap-md w-total" onsubmit="salvarParticipante(event)">';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Nome Completo', 'text', 'nome', participante?.nome || '', '', true) + '</div>';
    formulario += '<div class="flex-1">' + criarSeletor('Status', 'status', opcoesStatus, participante?.status || 'Ativo') + '</div>';
    formulario += '</div>';

    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(paroquia => ({ id: paroquia.id, nome: paroquia.nome })), participante?.id_paroquia || '', true) + '</div>';
    formulario += '<div class="flex-1" id="recipiente-seletor-capela">';
    formulario += criarSeletor('Capela / Comunidade', 'capela', [], participante?.capela || '');
    formulario += '</div>';
    formulario += '<div class="flex-1">' + criarSeletor('Curso Matriculado', 'id_curso', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), participante?.id_curso || '', true) + '</div>';
    formulario += '</div>';

    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Email', 'email', 'email', participante?.email || '', 'exemplo@email.com') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Telefone', 'tel', 'telefone', participante?.telefone || '', 'Ex: 41999999999') + '</div>';
    formulario += '</div>';

    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('CPF', 'text', 'cpf', participante?.cpf || '', '000.000.000-00') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('RG', 'text', 'rg', participante?.rg || '') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Nascimento', 'date', 'data_nascimento', participante?.data_nascimento || '') + '</div>';
    formulario += '</div>';

    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Endereço', 'text', 'endereco', participante?.endereco || '') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Bairro', 'text', 'bairro', participante?.bairro || '') + '</div>';
    formulario += '</div>';

    if (id) {
        formulario += `<div class="p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm mt-xs">Código de Acesso do Participante: <strong>${Utilidades.escaparHtml(participante?.codigo_acesso || '-')}</strong></div>`;
    }

    formulario += criarRodapeFormulario('', id ? 'Atualizar Participante' : 'Salvar Participante', {
        tipoSalvar: 'submit',
        botoesExtras: criarBotao('Salvar e Imprimir Cartão', 'salvarEImprimirCartaoParticipante()', 'secundario', 'md-w-total')
    });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;

    const seletorParoquia = document.getElementById('id_paroquia');
    if (seletorParoquia) {
        seletorParoquia.addEventListener('change', () => atualizarSeletorCapelas());
        await atualizarSeletorCapelas(participante?.capela || '');
    }

    Interface.abrirJanela('janela-formulario');
}

async function editarParticipante(id) {
    await abrirFormularioParticipante(id);
}

async function salvarParticipante(eventoOuOpcoes = {}) {
    const opcoes = eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function'
        ? {}
        : eventoOuOpcoes;

    if (eventoOuOpcoes && typeof eventoOuOpcoes.preventDefault === 'function') {
        eventoOuOpcoes.preventDefault();
    }

    const dados = obterDadosFormularioParticipante();
    const validacao = validarParticipante(dados);
    if (!validacao.valido) return null;

    const participante = await montarParticipante(validacao.dados, AppEstado.registroEmEdicao);
    await bd.salvar('participantes', participante);

    if (opcoes.notificar !== false) {
        Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Participante atualizado!' : 'Participante salvo com sucesso!', 'sucesso');
    }
    if (opcoes.fecharJanela !== false) Interface.fecharJanela('janela-formulario');
    if (opcoes.renderizar !== false) await renderizarAbaAtual();

    return participante;
}

async function excluirParticipante(id) {
    if (!confirm('Deseja realmente excluir este participante?')) return;

    await bd.excluir('participantes', id);
    Utilidades.notificacao('Participante excluído!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioParticipante() {
    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        status: document.getElementById('status')?.value || 'Ativo',
        id_paroquia: document.getElementById('id_paroquia')?.value || '',
        capela: document.getElementById('capela')?.value || '',
        id_curso: document.getElementById('id_curso')?.value || '',
        email: document.getElementById('email')?.value.trim() || '',
        telefone: document.getElementById('telefone')?.value.trim() || '',
        cpf: document.getElementById('cpf')?.value.trim() || '',
        rg: document.getElementById('rg')?.value.trim() || '',
        data_nascimento: document.getElementById('data_nascimento')?.value || '',
        endereco: document.getElementById('endereco')?.value.trim() || '',
        bairro: document.getElementById('bairro')?.value.trim() || ''
    };
}

function validarParticipante(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Nome Completo', valor: dados.nome },
        { nome: 'Paróquia de Origem', valor: dados.id_paroquia },
        { nome: 'Curso Matriculado', valor: dados.id_curso }
    ])) {
        return { valido: false };
    }

    if (dados.cpf && !Validacao.cpf(dados.cpf)) {
        Utilidades.notificacao('Informe um CPF válido.', 'erro');
        return { valido: false };
    }

    if (dados.email && !Validacao.email(dados.email)) {
        Utilidades.notificacao('Informe um email válido.', 'erro');
        return { valido: false };
    }

    if (dados.telefone && !Validacao.validarTelefone(dados.telefone)) {
        Utilidades.notificacao('Informe um telefone válido.', 'erro');
        return { valido: false };
    }

    if (dados.data_nascimento && !Validacao.validarCampoData(dados.data_nascimento, 'Nascimento')) {
        return { valido: false };
    }

    return { valido: true, dados };
}

async function montarParticipante(dados, id = null) {
    const participanteExistente = id ? await bd.obter('participantes', id) : null;

    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        status: dados.status || 'Ativo',
        id_paroquia: dados.id_paroquia,
        capela: dados.capela,
        id_curso: dados.id_curso,
        email: dados.email,
        telefone: dados.telefone,
        cpf: dados.cpf,
        rg: dados.rg,
        data_nascimento: dados.data_nascimento,
        endereco: dados.endereco,
        bairro: dados.bairro,
        codigo_acesso: participanteExistente?.codigo_acesso || await gerarCodigoAcessoUnico(id || '')
    };
}

function renderizarTabelaParticipantes(participantes, paroquias) {
    const linhas = participantes.map((participante, indice) => {
        const paroquia = paroquias.find(item => String(item.id) === String(participante.id_paroquia));
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const status = participante.status === 'Desistente'
            ? '<span class="cor-texto-claro peso-bold">Desistente</span>'
            : '<span class="cor-texto-escuro peso-bold">Ativo</span>';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${participante.nome || ''} ${participante.codigo_acesso || ''} ${paroquia?.nome || ''} ${participante.status || 'Ativo'}`)}">
            <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${Utilidades.escaparHtml(participante.nome)}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(participante.codigo_acesso || '-')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(paroquia?.nome || '-')}</td>
            <td class="p-md texto-esquerda">${status}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Cartão', acao: `imprimirCartaoParticipante('${participante.id}')` },
                    { rotulo: 'Ficha', acao: `gerarPDFFichaParticipante('${participante.id}')` },
                    { rotulo: 'Editar', acao: `editarParticipante('${participante.id}')` },
                    { rotulo: 'Excluir', acao: `excluirParticipante('${participante.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Nome', 'Código', 'Paróquia', 'Status', 'Ações'],
        linhas,
        'tabela-participantes',
        'corpo-tabela-participantes'
    );
}

async function atualizarSeletorCapelas(capelaSelecionada = '') {
    const idParoquia = document.getElementById('id_paroquia')?.value || '';
    const recipienteCapela = document.getElementById('recipiente-seletor-capela');
    if (!recipienteCapela) return;

    if (!idParoquia) {
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], capelaSelecionada);
        return;
    }

    const paroquia = await bd.obter('paroquias', idParoquia);
    const opcoesCapelas = Array.isArray(paroquia?.capelas)
        ? paroquia.capelas.map(capela => ({ id: capela, nome: capela }))
        : [];

    recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', opcoesCapelas, capelaSelecionada);
}

async function gerarCodigoAcessoUnico(idAtual = '') {
    const participantes = await bd.obterTodos('participantes');
    const codigosExistentes = new Set(
        participantes
            .filter(participante => String(participante.id) !== String(idAtual))
            .map(participante => participante.codigo_acesso)
            .filter(Boolean)
    );

    let codigo = '';
    do {
        codigo = Math.floor(100000 + Math.random() * 900000).toString();
    } while (codigosExistentes.has(codigo));

    return codigo;
}

async function salvarEImprimirCartaoParticipante() {
    const participante = await salvarParticipante({ fecharJanela: true, renderizar: true });
    if (participante) await imprimirCartaoParticipante(participante.id);
}
