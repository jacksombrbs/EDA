async function renderizarFrequencia(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    const disciplinas = await bd.obterTodos('disciplinas');
    const todasFrequencias = await bd.obterTodos('frequencia');

    let codigoEstrutura = '<div class="fundo-branco borda-1 borda-solida borda-cor-padrao raio-md p-md mb-lg">';
    
    codigoEstrutura += '<div class="mb-md">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Diário de Classe / Frequência</h2>';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex flex-linha md-flex-coluna gap-md mb-lg" style="align-items: flex-end;">';
    codigoEstrutura += '<div class="flex-1 w-total">' + criarSeletor('Curso / Turma', 'freq-curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '') + '</div>';
    codigoEstrutura += '<div class="flex-1 w-total">' + criarSeletor('Disciplina', 'freq-disciplina', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), '') + '</div>';
    
    codigoEstrutura += '<div class="flex flex-coluna mb-md flex-1 w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data da Aula</label>';
    codigoEstrutura += '<input type="text" id="freq-data" readonly class="w-total p-sm px-md min-h-44 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm cor-texto-claro texto-md sem-outline" style="cursor: not-allowed;">';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex-1 w-total flex gap-sm md-flex-coluna mb-md">';
    codigoEstrutura += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 hover-fundo-marca-escuro w-total" onclick="iniciarNovaChamada()">Iniciar Chamada</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="pt-md">';
    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-sm">Histórico de Diários Lançados</h3>';
    
    if (todasFrequencias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro py-md texto-centro">Nenhum diário de classe foi lançado até o momento.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden"><table class="w-total borda-colapso texto-md"><thead><tr>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Data</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Curso / Turma</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Disciplina</th>';
        codigoEstrutura += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Ações</th></tr></thead><tbody>';

        todasFrequencias.forEach((freq, idx) => {
            const curso = cursos.find(c => String(c.id_curso) === String(freq.id_curso));
            const disc = disciplinas.find(d => String(d.id_disciplina) === String(freq.id_disciplina));
            const classeFundo = idx % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            codigoEstrutura += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md peso-medium">${Utilidades.formatarData(freq.data)}</td>
                <td class="p-md">${curso ? curso.nome_curso : 'Não encontrado'}</td>
                <td class="p-md peso-bold">${disc ? disc.nome_disciplina : 'Não encontrada'}</td>
                <td class="p-md">
                    <div class="flex gap-sm">
                        <button type="button" class="inline-flex itens-centro justifica-centro p-sm px-md raio-xxs texto-sm transicao cursor-apontador cor-texto-escuro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="editarFrequenciaAntiga('${freq.id_frequencia}')">Editar</button>
                        <button type="button" class="inline-flex itens-centro justifica-centro p-sm px-md raio-xxs texto-sm transicao cursor-apontador cor-texto-erro fundo-branco borda-1 borda-solida borda-cor-padrao hover-fundo-superficie-3" onclick="excluirFrequencia('${freq.id_frequencia}')">Excluir</button>
                    </div>
                </td>
            </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    setTimeout(() => {
        const campoData = document.getElementById('freq-data');
        if (campoData) {
            campoData.value = Utilidades.formatarData(new Date().toISOString().split('T')[0]);
            campoData.dataset.valorReal = new Date().toISOString().split('T')[0];
        }

        const freqDisciplina = document.getElementById('freq-disciplina');
        if (freqDisciplina) {
            freqDisciplina.addEventListener('change', function () {
                const disciplina = disciplinas.find(d => String(d.id_disciplina) === String(this.value));
                if (disciplina && disciplina.data_disciplina) {
                    campoData.value = Utilidades.formatarData(disciplina.data_disciplina);
                    campoData.dataset.valorReal = disciplina.data_disciplina;
                } else {
                    campoData.value = Utilidades.formatarData(new Date().toISOString().split('T')[0]);
                    campoData.dataset.valorReal = new Date().toISOString().split('T')[0];
                }
            });
        }
    }, 100);
}

async function iniciarNovaChamada() {
    const idCurso = document.getElementById('freq-curso').value;
    const idDisciplina = document.getElementById('freq-disciplina').value;
    const dataAula = document.getElementById('freq-data').dataset.valorReal;

    if (!idCurso) return Utilidades.notificacao('Selecione um curso/turma para iniciar a chamada.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina.', 'erro');
    if (!dataAula) return Utilidades.notificacao('A data da aula não pode estar vazia.', 'erro');

    const participantes = await bd.obterTodos('participantes');
    const alunosDoCurso = participantes.filter(p => String(p.id_curso) === String(idCurso));

    if (alunosDoCurso.length === 0) {
        return Utilidades.notificacao('Nenhum aluno matriculado neste curso.', 'aviso');
    }

    alunosDoCurso.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    frequenciaEmEdicao = null;
    frequenciaTemporaria = {};
    alunosDoCurso.forEach(a => frequenciaTemporaria[a.id_participante] = 'C');
    dadosAulaAtual = { idCurso, idDisciplina, dataAula };

    abrirModalChamada(alunosDoCurso);
}

async function editarFrequenciaAntiga(idFrequencia) {
    const todasFrequencias = await bd.obterTodos('frequencia');
    const frequencia = todasFrequencias.find(f => String(f.id_frequencia) === String(idFrequencia));

    if (!frequencia) return Utilidades.notificacao('Frequência não encontrada.', 'erro');

    const participantes = await bd.obterTodos('participantes');
    const alunosDoCurso = participantes.filter(p => String(p.id_curso) === String(frequencia.id_curso));

    alunosDoCurso.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    frequenciaEmEdicao = frequencia;
    frequenciaTemporaria = { ...frequencia.presencas };
    dadosAulaAtual = { 
        idCurso: frequencia.id_curso, 
        idDisciplina: frequencia.id_disciplina, 
        dataAula: frequencia.data 
    };

    abrirModalChamada(alunosDoCurso);
}

async function abrirModalChamada(alunos) {
    document.getElementById('titulo-janela').textContent = frequenciaEmEdicao ? 'Editar Diário de Classe' : 'Novo Diário de Classe';

    const cursos = await bd.obterTodos('cursos');
    const disciplinas = await bd.obterTodos('disciplinas');

    const cursoObj = cursos.find(c => String(c.id_curso) === String(dadosAulaAtual.idCurso));
    const discObj = disciplinas.find(d => String(d.id_disciplina) === String(dadosAulaAtual.idDisciplina));

    let html = `
        <div class="mb-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm flex justifica-espaco md-flex-coluna gap-sm">
            <div>
                <p class="texto-md cor-texto-escuro mb-xs"><strong>Curso:</strong> ${cursoObj ? cursoObj.nome_curso : 'Desconhecido'}</p>
                <p class="texto-md cor-texto-escuro"><strong>Disciplina:</strong> ${discObj ? discObj.nome_disciplina : 'Desconhecida'}</p>
            </div>
            <div class="md-texto-esquerda texto-direita">
                <p class="texto-md cor-texto-escuro"><strong>Data:</strong> ${Utilidades.formatarData(dadosAulaAtual.dataAula)}</p>
            </div>
        </div>
    `;

    html += '<div class="rolagem-y borda-1 borda-solida borda-cor-padrao raio-md overflow-hidden mb-md max-altura-rolagem" style="max-height: 50vh;">';
    html += '<table class="w-total borda-colapso texto-md"><thead><tr>';
    html += '<th class="p-md texto-esquerda peso-bold cor-texto-primario fundo-cinza">Nome do Aluno</th>';
    html += '<th class="p-md texto-direita peso-bold cor-texto-primario fundo-cinza" style="width: 150px;">Presença</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach((aluno, index) => {
        const statusAtual = frequenciaTemporaria[aluno.id_participante] || 'C';
        const botaoClasse = statusAtual === 'C' ? 'fundo-sucesso hover-fundo-sucesso-escuro cor-texto-branco' : 'fundo-erro hover-fundo-erro-escuro cor-texto-branco';
        const botaoTexto = statusAtual === 'C' ? 'Compareceu' : 'Faltou';
        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        html += `
            <tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md texto-esquerda texto-md peso-medium cor-texto-escuro">${aluno.nome_participante || aluno.nome}</td>
                <td class="p-md texto-direita">
                    <button type="button" id="botao-frequencia-${aluno.id_participante}" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-xxs texto-sm peso-bold transicao sem-borda cursor-apontador sombra-1 ${botaoClasse} w-total" onclick="alternarFrequenciaAluno('${aluno.id_participante}')">${botaoTexto}</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';

    html += '<div class="flex justifica-fim gap-sm pt-sm md-flex-coluna">';
    html += '<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-escuro fundo-superficie-2 hover-fundo-superficie-3 md-w-total" onclick="Interface.fecharJanela(\'janela-formulario\')">Cancelar</button>';
    html += `<button type="button" class="inline-flex itens-centro justifica-centro gap-sm p-sm px-md min-h-44 raio-sm texto-md peso-bold transicao sem-borda cursor-apontador cor-texto-branco fundo-marca-700 sombra-1 hover-fundo-marca-escuro md-w-total" style="width: 200px;" onclick="salvarDiarioFrequencia()">${frequenciaEmEdicao ? 'Atualizar Frequência' : 'Salvar Frequência'}</button>`;
    html += '</div>';

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

function alternarFrequenciaAluno(idAluno) {
    const botao = document.getElementById(`botao-frequencia-${idAluno}`);
    if (!botao) return;

    if (frequenciaTemporaria[idAluno] === 'C') {
        frequenciaTemporaria[idAluno] = 'F';
        botao.textContent = 'Faltou';
        botao.classList.remove('fundo-sucesso', 'hover-fundo-sucesso-escuro');
        botao.classList.add('fundo-erro', 'hover-fundo-erro-escuro');
    } else {
        frequenciaTemporaria[idAluno] = 'C';
        botao.textContent = 'Compareceu';
        botao.classList.remove('fundo-erro', 'hover-fundo-erro-escuro');
        botao.classList.add('fundo-sucesso', 'hover-fundo-sucesso-escuro');
    }
}

async function salvarDiarioFrequencia() {
    if (!dadosAulaAtual.idCurso || !dadosAulaAtual.idDisciplina || !dadosAulaAtual.dataAula) {
        return Utilidades.notificacao('Erro ao ler os dados da aula. Tente novamente.', 'erro');
    }

    const registro = {
        id_frequencia: frequenciaEmEdicao ? frequenciaEmEdicao.id_frequencia : Utilidades.gerarId(),
        id_curso: dadosAulaAtual.idCurso,
        id_disciplina: dadosAulaAtual.idDisciplina,
        data: dadosAulaAtual.dataAula,
        presencas: frequenciaTemporaria
    };

    try {
        await bd.salvar('frequencia', registro);
        Utilidades.notificacao(frequenciaEmEdicao ? 'Frequência atualizada com sucesso!' : 'Diário salvo com sucesso!', 'sucesso');
        
        frequenciaEmEdicao = null;
        frequenciaTemporaria = {};
        dadosAulaAtual = {};
        
        Interface.fecharJanela('janela-formulario');
        renderizarAbaAtual();
    } catch (e) {
        Utilidades.notificacao('Erro ao salvar diário de frequência.', 'erro');
    }
}

async function excluirFrequencia(idFrequencia) {
    if (confirm('Deseja realmente excluir este registo de frequência?')) {
        try {
            await bd.excluir('frequencia', idFrequencia);
            Utilidades.notificacao('Frequência excluída com sucesso!', 'sucesso');
            renderizarAbaAtual();
        } catch (erro) {
            Utilidades.notificacao('Não foi possível excluir o registo.', 'erro');
        }
    }
}