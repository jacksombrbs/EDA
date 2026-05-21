async function renderizarParticipantes(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Participantes Cadastrados</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioParticipante()">+ Novo Participante</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += Busca.criarCampoBusca('busca-participantes', 'Buscar por nome...');

    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhum participante cadastrado ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-participantes"><thead><tr>';
        codigoEstrutura += '<th>Nome</th><th>Código</th><th>Paróquia</th><th>Estado</th><th>Ações</th></tr></thead><tbody>';

        participantes.forEach((participante) => {
            const paroquia = paroquias.find(p => p.id_paroquia === participante.id_paroquia);
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${participante.nome_participante}</td>
                    <td class="cor-texto-escuro"><strong>${participante.codigo_acesso || '-'}</strong></td>
                    <td class="cor-texto-escuro">${paroquia ? paroquia.nome_paroquia : '-'}</td>
                    <td class="cor-texto-escuro">${participante.estado || '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarParticipante('${participante.id_participante}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirParticipante('${participante.id_participante}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-participantes')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-participantes tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioParticipante() {
    modoEdicao = 'participantes';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Novo Participante';

    Promise.all([bd.obterTodos('paroquias'), bd.obterTodos('cursos')]).then(([paroquias, cursos]) => {
        let codigoEstrutura = '<form id="formulario-participante" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome Completo', 'text', 'nome_participante', '', '', true);
        codigoEstrutura += criarCampoFormulario('CPF', 'text', 'cpf', '', '000.000.000-00');
        codigoEstrutura += criarCampoFormulario('RG', 'text', 'rg', '');
        codigoEstrutura += criarCampoFormulario('Data de Nascimento', 'date', 'data_nascimento', '', '', true);
        codigoEstrutura += criarCampoFormulario('Email', 'email', 'email', 'exemplo@email.com');
        codigoEstrutura += criarCampoFormulario('Telefone / WhatsApp', 'tel', 'telefone', '(00) 00000-0000');
        codigoEstrutura += criarCampoFormulario('Endereço (Rua, Nº)', 'text', 'endereco', '');
        codigoEstrutura += criarCampoFormulario('Bairro', 'text', 'bairro', '');
        codigoEstrutura += criarCampoFormulario('Cidade', 'text', 'cidade', 'Curitiba');
        codigoEstrutura += criarCampoFormulario('Estado (UF)', 'text', 'estado', 'PR');
        codigoEstrutura += criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), '', true);
        codigoEstrutura += `<div id="recipiente-seletor-capela">`;
        codigoEstrutura += criarSeletor('Capela / Comunidade', 'capela', [], '', true);
        codigoEstrutura += `</div>`;
        codigoEstrutura += criarSeletor('Curso / Turma Matriculada', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '', true);
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParticipante()">Salvar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

        setTimeout(() => {
            const seletorParoquia = document.getElementById('id_paroquia');
            if (seletorParoquia) {
                seletorParoquia.addEventListener('change', () => window.atualizarSeletorCapelas());
            }
        }, 50);

        Interface.abrirJanela('janela-formulario');
    });
}

async function editarParticipante(idParticipante) {
    const participante = await bd.obter('participantes', idParticipante);
    if (participante) {
        const [paroquias, cursos] = await Promise.all([bd.obterTodos('paroquias'), bd.obterTodos('cursos')]);

        modoEdicao = 'participantes';
        registroEmEdicao = idParticipante;
        document.getElementById('titulo-janela').textContent = 'Editar Participante';
        let codigoEstrutura = '<form id="formulario-participante" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome Completo', 'text', 'nome_participante', participante.nome_participante, '', true);
        codigoEstrutura += criarCampoFormulario('CPF', 'text', 'cpf', participante.cpf || '');
        codigoEstrutura += criarCampoFormulario('RG', 'text', 'rg', participante.rg || '');
        codigoEstrutura += criarCampoFormulario('Data de Nascimento', 'date', 'data_nascimento', participante.data_nascimento || '', '', true);
        codigoEstrutura += criarCampoFormulario('Email', 'email', 'email', participante.email || '');
        codigoEstrutura += criarCampoFormulario('Telefone / WhatsApp', 'tel', 'telefone', participante.telefone || '');
        codigoEstrutura += criarCampoFormulario('Endereço (Rua, Nº)', 'text', 'endereco', participante.endereco || '');
        codigoEstrutura += criarCampoFormulario('Bairro', 'text', 'bairro', participante.bairro || '');
        codigoEstrutura += criarCampoFormulario('Cidade', 'text', 'cidade', participante.cidade || '');
        codigoEstrutura += criarCampoFormulario('Estado (UF)', 'text', 'estado', participante.estado || '');
        codigoEstrutura += criarSeletor('Paróquia de Origem', 'id_paroquia', paroquias.map(p => ({ id: p.id_paroquia, nome: p.nome_paroquia })), participante.id_paroquia, true);
        codigoEstrutura += `<div id="recipiente-seletor-capela" style="grid-column: 1 / -1;">`;
        codigoEstrutura += criarSeletor('Capela / Comunidade', 'capela', [], '', true);
        codigoEstrutura += `</div>`;
        codigoEstrutura += criarSeletor('Curso / Turma Matriculada', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), participante.id_curso, true);
        codigoEstrutura += `<div class="p-md fundo-secundario borda-padrao raio-sm mt-md" style="grid-column: 1 / -1;">Código de Acesso do Aluno: <strong>${participante.codigo_acesso || '-'}</strong></div>`;
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarParticipante()">Atualizar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;

        const seletorParoquia = document.getElementById('id_paroquia');
        if (seletorParoquia) {
            seletorParoquia.addEventListener('change', () => window.atualizarSeletorCapelas());
        }

        if (typeof window.atualizarSeletorCapelas === 'function') {
            await window.atualizarSeletorCapelas(participante.capela || '');
        }

        Interface.abrirJanela('janela-formulario');
    }
}

async function excluirParticipante(idParticipante) {
    if (confirm('Deseja realmente excluir este participante?')) {
        await bd.excluir('participantes', idParticipante);
        Utilidades.notificacao('Participante excluído!');
        renderizarAbaAtual();
    }
}

async function salvarParticipante() {
    const nome_participante = document.getElementById('nome_participante').value.trim();

    if (!nome_participante) {
        Utilidades.notificacao('O nome do participante é obrigatório.', 'erro');
        return;
    }

    const participante = {
        id_participante: registroEmEdicao || Utilidades.gerarId(),
        nome_participante,
        cpf: document.getElementById('cpf').value,
        rg: document.getElementById('rg').value,
        data_nascimento: document.getElementById('data_nascimento').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        id_paroquia: document.getElementById('id_paroquia').value,
        capela: document.getElementById('capela')?.value || '',
        id_curso: document.getElementById('id_curso').value,
        codigo_acesso: registroEmEdicao ? undefined : Math.floor(100000 + Math.random() * 900000).toString()
    };

    if (registroEmEdicao) {
        const pAntigo = await bd.obter('participantes', registroEmEdicao);
        if (pAntigo) participante.codigo_acesso = pAntigo.codigo_acesso;
    }

    await bd.salvar('participantes', participante);
    Utilidades.notificacao(registroEmEdicao ? 'Participante atualizado!' : 'Participante salvo com sucesso!', 'sucesso');
    Interface.fecharJanela('janela-formulario');
    renderizarAbaAtual();
}