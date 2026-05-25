async function renderizarPalestrantes(conteudo) {
    const palestrantes = await bd.obterTodos('palestrantes');
    palestrantes.sort((a, b) => (a.nome_palestrante || '').localeCompare(b.nome_palestrante || ''));

    let codigoEstrutura = '<div class="pagina-conteudo">';
    codigoEstrutura += criarCabecalhoSecao('Palestrantes Cadastrados', criarBotao('+ Novo Palestrante', 'abrirFormularioPalestrante()'));

    codigoEstrutura += Busca.criarCampoBusca('busca-palestrantes', 'Buscar por nome...');

    if (palestrantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum palestrante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += criarContainerTabela(
            ['Nome', 'Email', 'Telefone', 'Ações'],
            gerarLinhasTabelaPalestrantes(palestrantes),
            'tabela-palestrantes',
            'corpo-tabela-palestrantes'
        );
    }

    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    Busca.vincularFiltro('busca-palestrantes', 'corpo-tabela-palestrantes');
}

function gerarLinhasTabelaPalestrantes(palestrantes) {
    let linhas = '';
    palestrantes.forEach((palestrante, index) => {
        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        linhas += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
            <td class="p-md texto-esquerda"><strong>${palestrante.nome_palestrante}</strong></td>
            <td class="p-md texto-esquerda">${palestrante.email_palestrante || '-'}</td>
            <td class="p-md texto-esquerda">${palestrante.telefone_palestrante || '-'}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarPalestrante('${palestrante.id_palestrante}')` },
                    { rotulo: 'Excluir', acao: `excluirPalestrante('${palestrante.id_palestrante}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    });
    return linhas;
}

async function abrirFormularioPalestrante(idPalestrante = null) {
    modoEdicao = 'palestrantes';
    registroEmEdicao = idPalestrante;
    
    let palestrante = {};
    if (idPalestrante) {
        palestrante = await bd.obter('palestrantes', idPalestrante);
        document.getElementById('titulo-janela').textContent = 'Editar Palestrante';
    } else {
        document.getElementById('titulo-janela').textContent = 'Novo Palestrante';
    }

    let formHTML = '<form id="formulario-palestrante" class="flex flex-coluna w-total">';
    formHTML += criarCampoFormulario('Nome do Palestrante', 'text', 'nome_palestrante', palestrante.nome_palestrante || '', 'Ex: João da Silva', true);

    formHTML += '<div class="flex gap-md md-flex-coluna mb-md">';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Email', 'email', 'email_palestrante', palestrante.email_palestrante || '', 'Ex: joao@email.com') + '</div>';
    formHTML += '<div class="flex-1">' + criarCampoFormulario('Telefone', 'text', 'telefone_palestrante', palestrante.telefone_palestrante || '', 'Ex: 00 00000-0000') + '</div>';
    formHTML += '</div>';

    formHTML += criarRodapeFormulario('salvarPalestrante()', idPalestrante ? 'Atualizar Palestrante' : 'Salvar Palestrante');
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');
}

async function editarPalestrante(idPalestrante) {
    await abrirFormularioPalestrante(idPalestrante);
}

async function excluirPalestrante(idPalestrante) {
    if (confirm('Deseja realmente excluir este palestrante?')) {
        await bd.excluir('palestrantes', idPalestrante);
        Utilidades.notificacao('Palestrante excluído!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarPalestrante() {
    const nome_palestrante = document.getElementById('nome_palestrante').value.trim();
    const email_palestrante = document.getElementById('email_palestrante').value.trim();
    const telefone_palestrante = document.getElementById('telefone_palestrante').value.trim();

    if (!Validacao.notificarCamposObrigatorios([{ nome: 'Nome do Palestrante', valor: nome_palestrante }])) {
        return;
    }

    if (!Validacao.validarEmail(email_palestrante)) {
        Utilidades.notificacao('Informe um email válido para o palestrante.', 'erro');
        return;
    }

    if (!Validacao.validarTelefone(telefone_palestrante)) {
        Utilidades.notificacao('Informe um telefone válido para o palestrante.', 'erro');
        return;
    }

    const palestrante = {
        id_palestrante: registroEmEdicao || Utilidades.gerarId(),
        nome_palestrante,
        email_palestrante,
        telefone_palestrante
    };
    await bd.salvar('palestrantes', palestrante);
    Utilidades.notificacao(registroEmEdicao ? 'Palestrante atualizado!' : 'Palestrante salvo!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}
