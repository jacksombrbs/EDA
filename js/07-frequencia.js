async function renderizarFrequencia(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    const disciplinas = await bd.obterTodos('disciplinas');
    const todasFrequencias = await bd.obterTodos('frequencia');

    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<div class="mb-md">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario">Diário de Classe / Frequência</h2>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '<div class="grid grid-auto-adaptavel gap-md mb-lg" style="align-items: end;">';
    codigoEstrutura += criarSeletor('Curso / Turma', 'freq-curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '');
    codigoEstrutura += criarSeletor('Disciplina', 'freq-disciplina', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), '');
    codigoEstrutura += '<div class="flex flex-coluna mb-md">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data da Aula</label>';
    codigoEstrutura += '<input type="text" id="freq-data" class="entrada-padrao fundo-secundario cor-texto-claro" readonly>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '<div class="flex flex-coluna mb-md">';
    codigoEstrutura += '<button class="btn btn-primario" style="height: 44px;" onclick="window.carregarGradeChamada()">Carregar Diário</button>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';
    codigoEstrutura += '<div id="grade-chamada-alunos"></div>';
    codigoEstrutura += '<div class="mt-lg pt-md borda-topo">';
    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-md">Histórico de Frequências</h3>';
    codigoEstrutura += '<div id="lista-historico-frequencia"></div>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    setTimeout(() => {
        const freqDisciplina = document.getElementById('freq-disciplina');
        if (freqDisciplina) {
            freqDisciplina.addEventListener('change', function () {
                const disciplina = disciplinas.find(d => d.id_disciplina === this.value);
                if (disciplina && disciplina.data_disciplina) {
                    document.getElementById('freq-data').value = disciplina.data_disciplina;
                } else {
                    document.getElementById('freq-data').value = new Date().toISOString().split('T')[0];
                }
            });
        }

        todasFrequencias.sort((a, b) => new Date(a.data) - new Date(b.data));
        window.carregarHistoricoFrequencia(todasFrequencias, cursos, disciplinas);
    }, 100);
}

window.carregarHistoricoFrequencia = function (todasFrequencias, cursos, disciplinas) {
    const recipiente = document.getElementById('lista-historico-frequencia');
    if (!recipiente) return;

    if (todasFrequencias.length === 0) {
        recipiente.innerHTML = '<p class="texto-md cor-texto-claro p-md texto-centro">Nenhuma frequência registrada ainda.</p>';
        return;
    }

    let codigoEstrutura = '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base"><thead><tr><th>Curso</th><th>Disciplina</th><th>Data</th><th>Ações</th></tr></thead><tbody>';

    todasFrequencias.forEach(freq => {
        const curso = cursos.find(c => String(c.id_curso) === String(freq.id_curso));
        const disciplina = disciplinas.find(d => String(d.id_disciplina) === String(freq.id_disciplina));
        const nomeCurso = curso ? curso.nome_curso : 'Desconhecido';
        const nomeDisciplina = disciplina ? disciplina.nome_disciplina : 'Desconhecida';

        codigoEstrutura += `<tr>
            <td class="cor-texto-escuro">${nomeCurso}</td>
            <td class="peso-bold cor-texto-escuro">${nomeDisciplina}</td>
            <td class="cor-texto-escuro">${Utilidades.formatarData(freq.data)}</td>
            <td>
                <div class="flex gap-sm">
                    <button class="btn btn-secundario-2 btn-pequeno" onclick="window.editarFrequenciaAntiga('${freq.id_frequencia}')">Editar</button>
                    <button class="btn btn-secundario-2 btn-pequeno" onclick="window.excluirFrequencia('${freq.id_frequencia}')">Excluir</button>
                </div>
            </td>
        </tr>`;
    });

    codigoEstrutura += '</tbody></table></div>';
    recipiente.innerHTML = codigoEstrutura;
}

window.editarFrequenciaAntiga = async function (idFrequencia) {
    const todasFrequencias = await bd.obterTodos('frequencia');
    const frequencia = todasFrequencias.find(f => f.id_frequencia === idFrequencia);

    if (!frequencia) {
        Utilidades.notificacao('Frequência não encontrada.', 'erro');
        return;
    }

    const participantes = await bd.obterTodos('participantes');
    const alunosDoCurso = participantes.filter(p => String(p.id_curso) === String(frequencia.id_curso));

    alunosDoCurso.sort((a, b) => {
        const nomeA = (a.nome_participante || a.nome || '').toLowerCase();
        const nomeB = (b.nome_participante || b.nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
    });

    window.frequenciaTemporaria = { ...frequencia.presencas };
    window.idFrequenciaAtual = frequencia.id_frequencia;

    const selectCurso = document.getElementById('freq-curso');
    const selectDisciplina = document.getElementById('freq-disciplina');
    const inputData = document.getElementById('freq-data');

    const cursoSelecionado = String(frequencia.id_curso);
    const disciplinaSelecionada = String(frequencia.id_disciplina);

    if (selectCurso) {
        const cursos = await bd.obterTodos('cursos');
        const curso = cursos.find(c => String(c.id_curso) === cursoSelecionado);
        selectCurso.value = cursoSelecionado;
        const acionadorCurso = document.getElementById('acionador-freq-curso');
        if (acionadorCurso) {
            acionadorCurso.querySelector('span').textContent = curso ? curso.nome_curso : 'Selecione';
            acionadorCurso.closest('.cursor-apontador')?.querySelectorAll('.opcao-customizada').forEach(opt => opt.classList.remove('fundo-primario', 'cor-texto-branco', 'peso-bold'));
            acionadorCurso.closest('.cursor-apontador')?.querySelectorAll('.opcao-customizada').forEach(opt => {
                if (opt.textContent.trim() === (curso ? curso.nome_curso : 'Selecione')) {
                    opt.classList.add('fundo-primario', 'cor-texto-branco', 'peso-bold');
                }
            });
        }
    }
    if (selectDisciplina) {
        const disciplina = await bd.obterTodos('disciplinas').then(disciplinas => disciplinas.find(d => String(d.id_disciplina) === disciplinaSelecionada));
        selectDisciplina.value = disciplinaSelecionada;
        const acionadorDisciplina = document.getElementById('acionador-freq-disciplina');
        if (acionadorDisciplina) {
            acionadorDisciplina.querySelector('span').textContent = disciplina ? disciplina.nome_disciplina : 'Selecione';
            acionadorDisciplina.closest('.cursor-apontador')?.querySelectorAll('.opcao-customizada').forEach(opt => opt.classList.remove('fundo-primario', 'cor-texto-branco', 'peso-bold'));
            acionadorDisciplina.closest('.cursor-apontador')?.querySelectorAll('.opcao-customizada').forEach(opt => {
                if (opt.textContent.trim() === (disciplina ? disciplina.nome_disciplina : 'Selecione')) {
                    opt.classList.add('fundo-primario', 'cor-texto-branco', 'peso-bold');
                }
            });
        }
    }
    if (inputData) {
        inputData.value = frequencia.data || '';
    }

    const recipiente = document.getElementById('grade-chamada-alunos');

    let codigoEstrutura = '<div class="rolagem-x borda-padrao raio-md fundo-branco mb-md"><table class="tabela-base">';
    codigoEstrutura += '<thead><tr><th>Nome do Aluno</th><th><div class="flex justifica-centro">Situação da Presença</div></th></tr></thead><tbody>';

    alunosDoCurso.forEach(aluno => {
        const estado = window.frequenciaTemporaria[aluno.id_participante] || 'C';
        const classeEstado = estado === 'C' ? 'btn-sucesso' : 'btn-perigo';
        const textoBotao = estado === 'C' ? 'Compareceu' : 'Faltou';

        codigoEstrutura += `<tr>
            <td class="cor-texto-escuro"><strong>${aluno.nome_participante || aluno.nome}</strong></td>
            <td>
                <div class="flex justifica-centro">
                    <button id="botao-frequencia-${aluno.id_participante}" class="btn btn-pequeno largura-btn transicao ${classeEstado}" onclick="window.alternarFrequenciaAluno('${aluno.id_participante}')">
                        ${textoBotao}
                    </button>
                </div>
            </td>
        </tr>`;
    });

    codigoEstrutura += '</tbody></table></div>';
    codigoEstrutura += '<div class="flex justifica-fim">';
    codigoEstrutura += '<button class="btn btn-primario" onclick="window.salvarDiarioFrequencia()">Atualizar Frequência</button>';
    codigoEstrutura += '</div>';

    recipiente.innerHTML = codigoEstrutura;
}

window.carregarGradeChamada = async function () {
    const idCurso = String(document.getElementById('freq-curso').value);
    const idDisciplina = String(document.getElementById('freq-disciplina').value);
    const dataAula = document.getElementById('freq-data').value;
    const recipiente = document.getElementById('grade-chamada-alunos');

    if (!idCurso || !idDisciplina || !dataAula) {
        Utilidades.notificacao('Selecione Curso, Disciplina e Data da Aula.', 'aviso');
        return;
    }

    const participantes = await bd.obterTodos('participantes');
    const alunosDoCurso = participantes.filter(p => String(p.id_curso) === idCurso);

    if (alunosDoCurso.length === 0) {
        recipiente.innerHTML = '<p class="texto-md cor-texto-claro p-md texto-centro fundo-secundario borda-padrao raio-sm">Nenhum participante matriculado nesta turma.</p>';
        return;
    }

    alunosDoCurso.sort((a, b) => {
        const nomeA = (a.nome_participante || a.nome || '').toLowerCase();
        const nomeB = (b.nome_participante || b.nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
    });

    const todasFrequencias = await bd.obterTodos('frequencia');
    const freqExistente = todasFrequencias.find(f => String(f.id_curso) === idCurso && String(f.id_disciplina) === idDisciplina && f.data === dataAula);

    window.frequenciaTemporaria = freqExistente ? { ...freqExistente.presencas } : {};
    window.idFrequenciaAtual = freqExistente ? freqExistente.id_frequencia : Utilidades.gerarId();

    let codigoEstrutura = '<div class="rolagem-x borda-padrao raio-md fundo-branco mb-md"><table class="tabela-base">';
    codigoEstrutura += '<thead><tr><th>Nome do Aluno</th><th><div class="flex justifica-centro">Situação da Presença</div></th></tr></thead><tbody>';

    alunosDoCurso.forEach(aluno => {
        if (!window.frequenciaTemporaria[aluno.id_participante]) {
            window.frequenciaTemporaria[aluno.id_participante] = 'C';
        }

        const estado = window.frequenciaTemporaria[aluno.id_participante];
        const classeEstado = estado === 'C' ? 'btn-sucesso' : 'btn-perigo';
        const textoBotao = estado === 'C' ? 'Compareceu' : 'Faltou';

        codigoEstrutura += `<tr>
                    <td class="cor-texto-escuro"><strong>${aluno.nome_participante || aluno.nome}</strong></td>
                    <td>
                        <div class="flex justifica-centro">
                            <button id="botao-frequencia-${aluno.id_participante}" class="btn btn-pequeno largura-btn transicao ${classeEstado}" onclick="window.alternarFrequenciaAluno('${aluno.id_participante}')">
                                ${textoBotao}
                            </button>
                        </div>
                    </td>
                 </tr>`;
    });

    codigoEstrutura += '</tbody></table></div>';
    codigoEstrutura += '<div class="flex justifica-fim">';
    codigoEstrutura += '<button class="btn btn-primario" onclick="window.salvarDiarioFrequencia()">Salvar Diário de Frequência</button>';
    codigoEstrutura += '</div>';

    recipiente.innerHTML = codigoEstrutura;
};

window.excluirFrequencia = async function (idFrequencia) {
    if (!idFrequencia) {
        Utilidades.notificacao('ID da frequência inválido.', 'erro');
        return;
    }

    if (confirm('Tem certeza que deseja excluir definitivamente este registro de frequência do diário?')) {
        try {
            await bd.excluir('frequencia', idFrequencia);
            Utilidades.notificacao('Registro de frequência removido com sucesso!', 'sucesso');
            renderizarAbaAtual();
        } catch (erro) {
            console.error('Erro ao tentar excluir frequência:', erro);
            Utilidades.notificacao('Não foi possível excluir o registro.', 'erro');
        }
    }
};

window.alternarFrequenciaAluno = function (idAluno) {
    const botao = document.getElementById(`botao-frequencia-${idAluno}`);
    if (!botao) return;

    if (window.frequenciaTemporaria[idAluno] === 'C') {
        window.frequenciaTemporaria[idAluno] = 'F';
        botao.textContent = 'Faltou';
        botao.classList.remove('btn-sucesso');
        botao.classList.add('btn-perigo');
    } else {
        window.frequenciaTemporaria[idAluno] = 'C';
        botao.textContent = 'Compareceu';
        botao.classList.remove('btn-perigo');
        botao.classList.add('btn-sucesso');
    }
};

window.salvarDiarioFrequencia = async function () {
    const idCurso = String(document.getElementById('freq-curso').value);
    const idDisciplina = String(document.getElementById('freq-disciplina').value);
    const dataAula = document.getElementById('freq-data').value;

    const registro = {
        id_frequencia: window.idFrequenciaAtual,
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data: dataAula,
        presencas: window.frequenciaTemporaria
    };

    await bd.salvar('frequencia', registro);

    Utilidades.notificacao('Diário de frequência armazenado com sucesso!', 'sucesso');

    await renderizarAbaAtual();
};
