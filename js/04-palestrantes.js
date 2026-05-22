async function renderizarPalestrantes(conteudo) {
    const palestrantes = await bd.obterTodos('palestrantes');    palestrantes.sort((a, b) => (a.nome_palestrante || '').localeCompare(b.nome_palestrante || ''));
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Palestrantes Cadastrados</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioPalestrante()">+ Novo Palestrante</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-palestrantes', 'Buscar por nome...');

    if (palestrantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum palestrante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-palestrantes"><thead><tr>';
        codigoEstrutura += '<th>Nome</th><th>Email</th><th>Telefone</th><th>Ações</th></tr></thead><tbody>';

        palestrantes.forEach((palestrante) => {
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${palestrante.nome_palestrante}</td>
                    <td class="cor-texto-escuro">${palestrante.email_palestrante || '-'}</td>
                    <td class="cor-texto-escuro">${palestrante.telefone_palestrante || '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarPalestrante('${palestrante.id_palestrante}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirPalestrante('${palestrante.id_palestrante}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-palestrantes')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-palestrantes tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioPalestrante() {
    modoEdicao = 'palestrantes';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Palestrante';

    let codigoEstrutura = '<form id="formulario-palestrante" class="grid grid-auto-adaptavel gap-md">';
    codigoEstrutura += criarCampoFormulario('Nome do Palestrante', 'text', 'nome_palestrante', '', '', true);
    codigoEstrutura += criarCampoFormulario('Email', 'email', 'email_palestrante', '');
    codigoEstrutura += criarCampoFormulario('Telefone', 'tel', 'telefone_palestrante', '');
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPalestrante()">Salvar</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

async function editarPalestrante(idPalestrante) {
    const palestrante = await bd.obter('palestrantes', idPalestrante);
    if (palestrante) {
        modoEdicao = 'palestrantes';
        registroEmEdicao = idPalestrante;
        document.getElementById('titulo-janela').textContent = 'Editar Palestrante';

        let codigoEstrutura = '<form id="formulario-palestrante" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome do Palestrante', 'text', 'nome_palestrante', palestrante.nome_palestrante, '', true);
        codigoEstrutura += criarCampoFormulario('Email', 'email', 'email_palestrante', palestrante.email_palestrante || '');
        codigoEstrutura += criarCampoFormulario('Telefone', 'tel', 'telefone_palestrante', palestrante.telefone_palestrante || '');
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarPalestrante()">Atualizar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
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
    Utilidades.notificacao(registroEmEdicao ? 'Palestrante atualizado!' : 'Palestrante cadastrado com sucesso!', 'sucesso');
    
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}