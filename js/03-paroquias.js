async function renderizarParoquias(conteudo) {
    const paroquias = await bd.obterTodos('paroquias');    paroquias.sort((a, b) => (a.nome_paroquia || '').localeCompare(b.nome_paroquia || ''));
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Paróquias Cadastradas</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioParoquia()">+ Nova Paróquia</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-paroquias', 'Buscar por nome...');

    if (paroquias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma paróquia cadastrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-paroquias"><thead><tr>';
        codigoEstrutura += '<th>Nome da Matriz</th><th>Capelas Vinculadas</th><th>Ações</th></tr></thead><tbody>';

        paroquias.forEach((paroquia) => {
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${paroquia.nome_paroquia}</td>
                    <td>${paroquia.capelas || '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarParoquia('${paroquia.id_paroquia}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirParoquia('${paroquia.id_paroquia}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    const campoBusca = document.getElementById('busca-paroquias');
    if (campoBusca) {
        campoBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const linhas = document.querySelectorAll('#tabela-paroquias tbody tr');

            linhas.forEach(linha => {
                const texto = linha.textContent.toLowerCase();
                linha.classList.toggle('oculto', !texto.includes(termo));
            });
        });
    }
}

function abrirFormularioParoquia() {
    modoEdicao = 'paroquias';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Nova Paróquia';

    let codigoEstrutura = '<form id="formulario-paroquia" class="grade-formulario">';
    codigoEstrutura += criarCampoFormulario('Nome da Paróquia (Matriz)', 'text', 'nome_paroquia', '', '', true);
    codigoEstrutura += criarAreaTexto('Capelas (Separe por vírgula)', 'capelas', '', 3);
    
    codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
    codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarFormularioParoquia()">Salvar</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
    Interface.abrirJanela('janela-formulario');
}

async function editarParoquia(idParoquia) {
    const paroquia = await bd.obter('paroquias', idParoquia);
    if (paroquia) {
        modoEdicao = 'paroquias';
        registroEmEdicao = idParoquia;
        document.getElementById('titulo-janela').textContent = 'Editar Paróquia';

        let codigoEstrutura = '<form id="formulario-paroquia" class="grade-formulario">';
        codigoEstrutura += criarCampoFormulario('Nome da Paróquia (Matriz)', 'text', 'nome_paroquia', paroquia.nome_paroquia, '', true);
        codigoEstrutura += criarAreaTexto('Capelas (Separe por vírgula)', 'capelas', paroquia.capelas || '', 3);
        
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarFormularioParoquia()">Atualizar</button>';
        codigoEstrutura += '</div>';
        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
}

async function salvarFormularioParoquia() {
    const nome_paroquia = document.getElementById('nome_paroquia').value.trim();
    const capelas = document.getElementById('capelas').value.trim();

    if (!nome_paroquia) {
        Utilidades.notificacao('O nome da paróquia é obrigatório.', 'erro');
        return;
    }

    const dados = {
        id_paroquia: registroEmEdicao || Utilidades.gerarId(),
        nome_paroquia,
        capelas
    };

    await bd.salvar('paroquias', dados);
    Utilidades.notificacao(registroEmEdicao ? 'Paróquia atualizada!' : 'Paróquia cadastrada!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}

async function excluirParoquia(idParoquia) {
    if (confirm('Deseja realmente excluir esta paróquia?')) {
        await bd.excluir('paroquias', idParoquia);
        Utilidades.notificacao('Paróquia excluída!');
        renderizarAbaAtual();
    }
}

window.atualizarSeletorCapelas = async function (capelaSelecionada = '') {
    const idParoquia = document.getElementById('id_paroquia').value;
    const recipienteCapela = document.getElementById('recipiente-seletor-capela');

    if (!recipienteCapela) return;

    if (!idParoquia) {
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], '', true);
        return;
    }

    const paroquia = await bd.obter('paroquias', idParoquia);
    if (paroquia && paroquia.capelas) {
        const listaCapelas = paroquia.capelas.split(',').map(c => c.trim()).filter(c => c);
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', listaCapelas, capelaSelecionada, true);
    } else {
        recipienteCapela.innerHTML = criarSeletor('Capela / Comunidade', 'capela', [], '', true);
    }
};