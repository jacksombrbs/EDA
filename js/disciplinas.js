async function renderizarDisciplinas(conteudo) {
    const disciplinas = await bd.obterTodos('disciplinas');
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');    
    
    disciplinas.sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
    
    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-md md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Disciplinas Cadastradas</h2>';
    codigoEstrutura += '<button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-medium transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro" onclick="abrirFormularioDisciplina()">+ Nova Disciplina</button>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += Busca.criarCampoBusca('busca-disciplinas', 'Buscar por nome...');

    if (disciplinas.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma disciplina cadastrada ainda.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden pos-relativa"><table class="w-total borda-colapso texto-md" id="tabela-disciplinas"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Nome</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Curso</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Palestrante</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody id="corpo-tabela-disciplinas">';

        codigoEstrutura += gerarLinhasTabelaDisciplinas(disciplinas, cursos, palestrantes);

        codigoEstrutura += '</tbody></table></div>';
    }
    
    codigoEstrutura += '</div>';
    conteudo.innerHTML = codigoEstrutura;

    const campoBusca = document.getElementById('busca-disciplinas');
    if (campoBusca) {
        campoBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const linhas = document.querySelectorAll('#tabela-disciplinas tbody tr');
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

function gerarLinhasTabelaDisciplinas(disciplinas, cursos, palestrantes) {
    let linhas = '';
    disciplinas.forEach((disciplina, index) => {
        const curso = cursos.find(c => c.id_curso === disciplina.id_curso) || { nome_curso: 'Não encontrado' };
        const palestrante = palestrantes.find(p => p.id_palestrante === disciplina.id_palestrante) || { nome_palestrante: 'Não encontrado' };
        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        linhas += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
            <td class="p-md texto-esquerda"><strong>${disciplina.nome_disciplina}</strong></td>
            <td class="p-md texto-esquerda">${curso.nome_curso}</td>
            <td class="p-md texto-esquerda">${palestrante.nome_palestrante}</td>
            <td class="p-md texto-esquerda">
                <div class="flex gap-sm">
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarDisciplina('${disciplina.id_disciplina}')">Editar</button>
                    <button class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md raio-xxs texto-sm peso-medium transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirDisciplina('${disciplina.id_disciplina}')">Excluir</button>
                </div>
            </td>
        </tr>`;
    });
    return linhas;
}

async function abrirFormularioDisciplina(idDisciplina = null) {
    modoEdicao = 'disciplinas';
    registroEmEdicao = idDisciplina;
    
    const cursos = await bd.obterTodos('cursos');
    const palestrantes = await bd.obterTodos('palestrantes');
    
    const opcoesCursos = cursos.map(c => ({id: c.id_curso, nome: c.nome_curso}));
    const opcoesPalestrantes = palestrantes.map(p => ({id: p.id_palestrante, nome: p.nome_palestrante}));

    let disciplina = {};
    if (idDisciplina) {
        disciplina = await bd.obter('disciplinas', idDisciplina);
        document.getElementById('titulo-janela').textContent = 'Editar Disciplina';
    } else {
        document.getElementById('titulo-janela').textContent = 'Nova Disciplina';
    }

    let formHTML = '<form id="formulario-disciplina" class="flex flex-coluna w-total gap-sm">';
    
    formHTML += criarCampoFormulario('Nome da Disciplina', 'text', 'nome_disciplina', disciplina.nome_disciplina || '', 'Ex: História da Igreja', true);
    
    formHTML += '<div class="flex gap-md md-flex-coluna w-total mb-sm">';
    formHTML += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'id_curso', opcoesCursos, disciplina.id_curso || '', true) + '</div>';
    formHTML += '<div class="flex-1 w-total">' + criarSeletor('Palestrante', 'id_palestrante', opcoesPalestrantes, disciplina.id_palestrante || '', true) + '</div>';
    formHTML += '</div>';

    formHTML += '<div class="flex justifica-fim gap-md pt-md w-total">';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3" onclick="fecharJanela(\'janela-formulario\')">Cancelar</button>';
    formHTML += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-md peso-regular transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro" onclick="salvarDisciplina()">' + (idDisciplina ? 'Atualizar Disciplina' : 'Salvar Disciplina') + '</button>';
    formHTML += '</div>';
    formHTML += '</form>';

    document.getElementById('conteudo-formulario').innerHTML = formHTML;
    Interface.abrirJanela('janela-formulario');
}

async function editarDisciplina(idDisciplina) {
    await abrirFormularioDisciplina(idDisciplina);
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
    
    if (!nome_disciplina) return Utilidades.notificacao('O nome da disciplina é obrigatório.', 'erro');
    if (!id_curso) return Utilidades.notificacao('Selecione um curso válido.', 'erro');
    if (!id_palestrante) return Utilidades.notificacao('Selecione um palestrante válido.', 'erro');

    const disciplina = {
        id_disciplina: registroEmEdicao || Utilidades.gerarId(),
        nome_disciplina,
        id_curso,
        id_palestrante
    };

    await bd.salvar('disciplinas', disciplina);
    Utilidades.notificacao(registroEmEdicao ? 'Disciplina atualizada!' : 'Disciplina salva!', 'sucesso');
    fecharJanela('janela-formulario');
    renderizarAbaAtual();
}