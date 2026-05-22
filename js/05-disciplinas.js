async function renderizarDisciplinas(conteudo) {
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg"><div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Disciplinas Cadastradas</h2>';
    codigoEstrutura += '<button class="btn btn-primario" onclick="abrirFormularioDisciplina()">+ Nova Disciplina</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-disciplinas', 'Buscar por nome...');

    if (disciplinas.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma disciplina cadastrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base" id="tabela-disciplinas"><thead><tr>';
        codigoEstrutura += '<th>Nome</th><th>Curso</th><th>Palestrante</th><th>Ações</th></tr></thead><tbody>';

        disciplinas.forEach((disciplina) => {
            const curso = cursos.find(c => c.id_curso === disciplina.id_curso);
            const palestrante = palestrantes.find(p => p.id_palestrante === disciplina.id_palestrante);
            codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${disciplina.nome_disciplina}</td>
                    <td class="cor-texto-escuro">${curso ? curso.nome_curso : '-'}</td>
                    <td class="cor-texto-escuro">${palestrante ? palestrante.nome_palestrante : '-'}</td>
                    <td>
                        <div class="flex gap-sm">
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="editarDisciplina('${disciplina.id_disciplina}')">Editar</button>
                            <button class="btn btn-secundario-2 btn-pequeno" onclick="excluirDisciplina('${disciplina.id_disciplina}')">Excluir</button>
                        </div>
                    </td>
                </tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    document.getElementById('busca-disciplinas')?.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const linhas = document.querySelectorAll('#tabela-disciplinas tbody tr');
        linhas.forEach(linha => {
            const texto = linha.textContent.toLowerCase();
            linha.classList.toggle('oculto', !texto.includes(termo));
        });
    });
}

function abrirFormularioDisciplina() {
    modoEdicao = 'disciplinas';
    registroEmEdicao = null;
    document.getElementById('titulo-janela').textContent = 'Nova Disciplina';

    bd.obterTodos('cursos').then(cursos => {
        bd.obterTodos('palestrantes').then(palestrantes => {
            let codigoEstrutura = '<form id="formulario-disciplina" class="grid grid-auto-adaptavel gap-md">';
            codigoEstrutura += criarCampoFormulario('Nome da Disciplina', 'text', 'nome_disciplina', '', '', true);
            codigoEstrutura += criarSeletor('Curso', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '', true);
            codigoEstrutura += criarSeletor('Palestrante', 'id_palestrante', palestrantes.map(p => ({ id: p.id_palestrante, nome: p.nome_palestrante })), '', true);
            
            codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
            codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
            codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarDisciplina()">Salvar</button>';
            codigoEstrutura += '</div>';

            codigoEstrutura += '</form>';

            document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
            Interface.abrirJanela('janela-formulario');
        });
    });
}

async function editarDisciplina(idDisciplina) {
    const disciplina = await bd.obter('disciplinas', idDisciplina);
    if (disciplina) {
        const cursos = await bd.obterTodos('cursos');
        const palestrantes = await bd.obterTodos('palestrantes');

        modoEdicao = 'disciplinas';
        registroEmEdicao = idDisciplina;
        document.getElementById('titulo-janela').textContent = 'Editar Disciplina';

        let codigoEstrutura = '<form id="formulario-disciplina" class="grid grid-auto-adaptavel gap-md">';
        codigoEstrutura += criarCampoFormulario('Nome da Disciplina', 'text', 'nome_disciplina', disciplina.nome_disciplina, '', true);
        codigoEstrutura += criarSeletor('Curso', 'id_curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), disciplina.id_curso, true);
        codigoEstrutura += criarSeletor('Palestrante', 'id_palestrante', palestrantes.map(p => ({ id: p.id_palestrante, nome: p.nome_palestrante })), disciplina.id_palestrante, true);
        codigoEstrutura += '<div class="flex justifica-fim gap-md pt-md" style="grid-column: 1 / -1;">';
        codigoEstrutura += '<button type="button" class="btn btn-secundario" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
        codigoEstrutura += '<button type="button" class="btn btn-primario" onclick="salvarDisciplina()">Atualizar</button>';
        codigoEstrutura += '</div>';

        codigoEstrutura += '</form>';

        document.getElementById('conteudo-formulario').innerHTML = codigoEstrutura;
        Interface.abrirJanela('janela-formulario');
    }
}

async function excluirDisciplina(idDisciplina) {
    if (confirm('Deseja realmente excluir esta disciplina?')) {
        await bd.excluir('disciplinas', idDisciplina);
        Utilidades.notificacao('Disciplina excluída!', 'sucesso');
        renderizarAbaAtual();
    }
}

async function salvarDisciplina() {
    const nome_disciplina = document.getElementById('nome_disciplina').value.trim();
    const id_curso = document.getElementById('id_curso').value;
    const id_palestrante = document.getElementById('id_palestrante').value;
    
    if (!nome_disciplina) {
        Utilidades.notificacao('O nome da disciplina é obrigatório.', 'erro');
        return;
    }
    if (!id_curso) {
        Utilidades.notificacao('Selecione um curso válido.', 'erro');
        return;
    }
    if (!id_palestrante) {
        Utilidades.notificacao('Selecione um palestrante válido.', 'erro');
        return;
    }

    const disciplina = {
        id_disciplina: registroEmEdicao || Utilidades.gerarId(),
        nome_disciplina,
        id_curso,
        id_palestrante
    };

    await bd.salvar('disciplinas', disciplina);
    Utilidades.notificacao(registroEmEdicao ? 'Disciplina atualizada!' : 'Disciplina cadastrada!', 'sucesso');
    fecharJanela('janela-formulario');
    renderizarAbaAtual();
}