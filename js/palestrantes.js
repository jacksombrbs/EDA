async function renderizarPalestrantes(conteudo) {
    const palestrantes = await bd.obterTodos('palestrantes');
    palestrantes.sort((a, b) => (a.nome_palestrante || '').localeCompare(b.nome_palestrante || ''));

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Palestrantes Cadastrados</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioPalestrante()">+ Novo Palestrante</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-palestrantes', 'Buscar por nome...');

    if (palestrantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum palestrante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-palestrantes"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Nome</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Email</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Telefone</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody id="corpo-tabela-palestrantes">';

        codigoEstrutura += gerarLinhasTabelaPalestrantes(palestrantes);

        codigoEstrutura += '</tbody></table></div>';
    }

    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    const campoBusca = document.getElementById('busca-palestrantes');
    if (campoBusca) {
        campoBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const linhas = document.querySelectorAll('#tabela-palestrantes tbody tr');
            linhas.forEach(linha => {
                const textoNome = linha.querySelector('td').textContent.toLowerCase();
                if (textoNome.includes(termo)) {
                    linha.classList.remove('oculto');
                } else {
                    linha.classList.add('oculto');
                }
            });
        });
    }
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
                <div class="flex gap-sm">
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarPalestrante('${palestrante.id_palestrante}')">Editar</button>
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirPalestrante('${palestrante.id_palestrante}')">Excluir</button>
                </div>
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

    formHTML += '<div class="flex justifica-fim gap-md pt-md w-total">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro" onclick="salvarPalestrante()">' + (idPalestrante ? 'Atualizar Palestrante' : 'Salvar Palestrante') + '</button>';
    formHTML += '</div>';
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
    if (!nome_palestrante) {
        Utilidades.notificacao('O nome do palestrante é obrigatório.', 'erro');
        return;
    }
    const palestrante = {
        id_palestrante: registroEmEdicao || Utilidades.gerarId(),
        nome_palestrante,
        email_palestrante: document.getElementById('email_palestrante').value.trim(),
        telefone_palestrante: document.getElementById('telefone_palestrante').value.trim()
    };
    await bd.salvar('palestrantes', palestrante);
    Utilidades.notificacao(registroEmEdicao ? 'Palestrante atualizado!' : 'Palestrante salvo!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}