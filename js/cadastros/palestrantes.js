async function renderizarPalestrantes(conteudo) {
    const palestrantes = await bd.obterTodos('palestrantes');
    palestrantes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Palestrantes Cadastrados', criarBotao('+ Novo Palestrante', 'abrirFormularioPalestrante()'));
    codigo += Busca.criarCampoBusca('busca-palestrantes', 'Buscar por nome...');
    codigo += palestrantes.length
        ? renderizarTabelaPalestrantes(palestrantes)
        : criarMensagemVazia('Nenhum palestrante cadastrado ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-palestrantes', 'corpo-tabela-palestrantes');
}

async function abrirFormularioPalestrante(id = null) {
    AppEstado.modoEdicao = 'palestrantes';
    AppEstado.registroEmEdicao = id;

    const palestrante = id ? await bd.obter('palestrantes', id) : {};
    document.getElementById('titulo-janela').textContent = id ? 'Editar Palestrante' : 'Novo Palestrante';

    let formulario = '<form id="formulario-palestrante" class="flex flex-coluna w-total" onsubmit="salvarPalestrante(event)">';
    formulario += criarCampoFormulario('Nome do Palestrante', 'text', 'nome', palestrante?.nome || '', 'Ex: João da Silva', true);
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Email', 'email', 'email', palestrante?.email || '', 'Ex: joao@email.com') + '</div>';
    formulario += '<div class="flex-1">' + criarCampoFormulario('Telefone', 'text', 'telefone', palestrante?.telefone || '', 'Ex: 00 00000-0000') + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md md-flex-coluna mb-md">';
    formulario += '<div class="flex-1">' + criarCampoFormulario('CPF', 'text', 'cpf', palestrante?.cpf || '', '000.000.000-00') + '</div>';
    formulario += '</div>';
    formulario += criarRodapeFormulario('', id ? 'Atualizar Palestrante' : 'Salvar Palestrante', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    Interface.abrirJanela('janela-formulario');
}

async function editarPalestrante(id) {
    await abrirFormularioPalestrante(id);
}

async function salvarPalestrante(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioPalestrante();
    const validacao = validarPalestrante(dados);
    if (!validacao.valido) return;

    await bd.salvar('palestrantes', montarPalestrante(validacao.dados, AppEstado.registroEmEdicao));
    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Palestrante atualizado!' : 'Palestrante salvo!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirPalestrante(id) {
    if (!confirm('Deseja realmente excluir este palestrante?')) return;

    await bd.excluir('palestrantes', id);
    Utilidades.notificacao('Palestrante excluído!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioPalestrante() {
    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        telefone: document.getElementById('telefone')?.value.trim() || '',
        cpf: document.getElementById('cpf')?.value.trim() || ''
    };
}

function validarPalestrante(dados) {
    if (!Validacao.notificarCamposObrigatorios([{ nome: 'Nome do Palestrante', valor: dados.nome }])) {
        return { valido: false };
    }

    if (!Validacao.email(dados.email)) {
        Utilidades.notificacao('Informe um email válido para o palestrante.', 'erro');
        return { valido: false };
    }

    if (!Validacao.validarTelefone(dados.telefone)) {
        Utilidades.notificacao('Informe um telefone válido para o palestrante.', 'erro');
        return { valido: false };
    }

    if (dados.cpf && !Validacao.cpf(dados.cpf)) {
        Utilidades.notificacao('Informe um CPF válido para o palestrante.', 'erro');
        return { valido: false };
    }

    return { valido: true, dados };
}

function montarPalestrante(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        cpf: dados.cpf
    };
}

function renderizarTabelaPalestrantes(palestrantes) {
    const linhas = palestrantes.map((palestrante, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${palestrante.nome || ''} ${palestrante.cpf || ''}`)}">
            <td class="p-md texto-esquerda"><strong>${Utilidades.escaparHtml(palestrante.nome)}</strong></td>
            <td class="p-md texto-esquerda">${Utilidades.escaparHtml(palestrante.email || '-')}</td>
            <td class="p-md texto-esquerda">${Utilidades.escaparHtml(palestrante.telefone || '-')}</td>
            <td class="p-md texto-esquerda">${Utilidades.escaparHtml(palestrante.cpf || '-')}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarPalestrante('${palestrante.id}')` },
                    { rotulo: 'Excluir', acao: `excluirPalestrante('${palestrante.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Nome', 'Email', 'Telefone', 'CPF', 'Ações'],
        linhas,
        'tabela-palestrantes',
        'corpo-tabela-palestrantes'
    );
}
