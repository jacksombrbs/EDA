async function renderizarParoquias(conteudo) {
    const paroquias = await bd.obterTodos('paroquias');
    paroquias.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    const botoesCabecalho = '<div class="flex gap-sm md-flex-coluna md-w-total">'
        + criarBotao('Importar Dados', 'abrirModalImportacaoParoquias()', 'secundario', 'md-w-total')
        + criarBotao('+ Nova Paróquia', 'abrirFormularioParoquia()', 'primario', 'md-w-total')
        + '</div>';

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Paróquias Cadastradas', botoesCabecalho);
    codigo += Busca.criarCampoBusca('busca-paroquias', 'Buscar por nome...');
    codigo += paroquias.length
        ? renderizarTabelaParoquias(paroquias)
        : criarMensagemVazia('Nenhuma paróquia cadastrada ainda.');
    codigo += '</div>';

    conteudo.innerHTML = codigo;
    Busca.vincularFiltro('busca-paroquias', 'corpo-tabela-paroquias');
}

async function abrirFormularioParoquia(id = null) {
    AppEstado.modoEdicao = 'paroquias';
    AppEstado.registroEmEdicao = id;

    const paroquia = id ? await bd.obter('paroquias', id) : { capelas: [] };
    if (!Array.isArray(paroquia.capelas)) paroquia.capelas = [];

    document.getElementById('titulo-janela').textContent = id ? 'Editar Paróquia' : 'Nova Paróquia';

    let formulario = '<form id="formulario-paroquia" class="flex flex-coluna gap-md w-total" onsubmit="salvarParoquia(event)">';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('Nome da Paróquia', 'text', 'nome', paroquia?.nome || '', 'Ex: Paróquia São José', true) + '</div>';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('Setor', 'text', 'setor', paroquia?.setor || '', 'Ex: Setor Portão') + '</div>';
    formulario += '</div>';
    formulario += '<div class="flex gap-md md-flex-coluna">';
    formulario += '<div class="flex-1 w-total">' + criarCampoFormulario('CNPJ', 'text', 'cnpj', paroquia?.cnpj || '', '00.000.000/0000-00') + '</div>';
    formulario += '</div>';

    formulario += '<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm p-md mt-sm">';
    formulario += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm">Capelas / Comunidades</h3>';
    formulario += '<div class="flex gap-sm mb-md md-flex-coluna">';
    formulario += '<input type="text" id="nova_capela" class="campo-padrao" placeholder="Nome da nova capela">';
    formulario += criarBotao('Adicionar', 'adicionarCapelaNaInterface()');
    formulario += '</div>';
    formulario += '<div id="lista-capelas" class="flex flex-coluna gap-xs lista-rolagem-media">';
    formulario += paroquia.capelas.length
        ? paroquia.capelas.map((capela, indice) => criarItemCapela(capela, indice)).join('')
        : '<p class="texto-sm cor-texto-claro" id="msg-sem-capelas">Nenhuma capela adicionada.</p>';
    formulario += '</div>';
    formulario += '</div>';
    formulario += criarRodapeFormulario('', id ? 'Atualizar Paróquia' : 'Salvar Paróquia', { tipoSalvar: 'submit' });
    formulario += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formulario;
    AppEstado.capelasAtuais = [...paroquia.capelas];
    Interface.abrirJanela('janela-formulario');
}

async function editarParoquia(id) {
    await abrirFormularioParoquia(id);
}

async function salvarParoquia(evento) {
    if (evento) evento.preventDefault();

    const dados = obterDadosFormularioParoquia();
    const validacao = validarParoquia(dados);
    if (!validacao.valido) return;

    await bd.salvar('paroquias', montarParoquia(validacao.dados, AppEstado.registroEmEdicao));
    Utilidades.notificacao(AppEstado.registroEmEdicao ? 'Paróquia atualizada!' : 'Paróquia salva com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirParoquia(id) {
    if (!confirm('Deseja realmente excluir esta paróquia?')) return;

    await bd.excluir('paroquias', id);
    Utilidades.notificacao('Paróquia excluída!', 'sucesso');
    await renderizarAbaAtual();
}

function obterDadosFormularioParoquia() {
    return {
        nome: document.getElementById('nome')?.value.trim() || '',
        setor: document.getElementById('setor')?.value.trim() || '',
        cnpj: document.getElementById('cnpj')?.value.trim() || '',
        capelas: AppEstado.capelasAtuais || []
    };
}

function validarParoquia(dados) {
    if (!Validacao.notificarCamposObrigatorios([{ nome: 'Nome da Paróquia', valor: dados.nome }])) {
        return { valido: false };
    }

    if (dados.cnpj && !Validacao.cnpj(dados.cnpj)) {
        Utilidades.notificacao('Informe um CNPJ válido.', 'erro');
        return { valido: false };
    }

    return { valido: true, dados };
}

function montarParoquia(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        nome: dados.nome,
        setor: dados.setor,
        cnpj: dados.cnpj,
        capelas: dados.capelas
    };
}

function renderizarTabelaParoquias(paroquias) {
    const linhas = paroquias.map((paroquia, indice) => {
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';
        const capelas = Array.isArray(paroquia.capelas) && paroquia.capelas.length
            ? `${paroquia.capelas.length} capela(s)`
            : '<span class="cor-texto-claro">Nenhuma</span>';

        return `<tr class="${classeFundo} transicao hover-fundo-superficie-3" data-busca="${Utilidades.escaparHtml(`${paroquia.nome || ''} ${paroquia.setor || ''} ${paroquia.cnpj || ''}`)}">
            <td class="p-md texto-esquerda peso-bold cor-texto-escuro">${Utilidades.escaparHtml(paroquia.nome || 'Sem nome')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(paroquia.setor || '-')}</td>
            <td class="p-md texto-esquerda cor-texto-escuro">${Utilidades.escaparHtml(paroquia.cnpj || '-')}</td>
            <td class="p-md texto-esquerda">${capelas}</td>
            <td class="p-md texto-esquerda">
                ${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarParoquia('${paroquia.id}')` },
                    { rotulo: 'Excluir', acao: `excluirParoquia('${paroquia.id}')`, perigo: true }
                ])}
            </td>
        </tr>`;
    }).join('');

    return criarContainerTabela(
        ['Paróquia', 'Setor', 'CNPJ', 'Capelas', 'Ações'],
        linhas,
        'tabela-paroquias',
        'corpo-tabela-paroquias'
    );
}

function criarItemCapela(nomeCapela, indice) {
    return `
        <div class="flex justifica-espaco itens-centro p-sm fundo-branco borda-1 borda-solida borda-cor-padrao raio-xxs item-capela" data-index="${indice}">
            <span class="texto-md cor-texto-escuro peso-medium">${Utilidades.escaparHtml(nomeCapela)}</span>
            ${criarBotao('Remover', `removerCapelaDaInterface(${indice})`, 'perigo', 'botao-pequeno')}
        </div>
    `;
}

function adicionarCapelaNaInterface() {
    const input = document.getElementById('nova_capela');
    const nome = input?.value.trim() || '';

    if (!nome) {
        Utilidades.notificacao('Digite o nome da capela.', 'aviso');
        return;
    }

    if (!AppEstado.capelasAtuais) AppEstado.capelasAtuais = [];

    if (AppEstado.capelasAtuais.includes(nome)) {
        Utilidades.notificacao('Esta capela já foi adicionada.', 'aviso');
        return;
    }

    AppEstado.capelasAtuais.push(nome);
    input.value = '';
    atualizarListaCapelasNaInterface();
}

function removerCapelaDaInterface(indice) {
    if (!AppEstado.capelasAtuais || AppEstado.capelasAtuais.length <= indice) return;

    AppEstado.capelasAtuais.splice(indice, 1);
    atualizarListaCapelasNaInterface();
}

function atualizarListaCapelasNaInterface() {
    const lista = document.getElementById('lista-capelas');
    if (!lista) return;

    if (!AppEstado.capelasAtuais || AppEstado.capelasAtuais.length === 0) {
        lista.innerHTML = '<p class="texto-sm cor-texto-claro" id="msg-sem-capelas">Nenhuma capela adicionada.</p>';
        return;
    }

    lista.innerHTML = AppEstado.capelasAtuais
        .map((capela, indice) => criarItemCapela(capela, indice))
        .join('');
}
