async function renderizarFrequencia(conteudo) {
    const cursos = await bd.obterTodos('cursos');
    const disciplinas = await bd.obterTodos('disciplinas');
    const todasFrequencias = await bd.obterTodos('frequencia');

    let codigoEstrutura = '<div class="pagina-conteudo">';
    codigoEstrutura += criarCabecalhoSecao('Frequência');
    
    codigoEstrutura += '<div class="flex flex-linha md-flex-coluna gap-md mb-lg itens-fim">';
    codigoEstrutura += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'freq-curso', cursos.map(c => ({ id: c.id_curso, nome: c.nome_curso })), '') + '</div>';
    
    codigoEstrutura += '<div class="flex-1 w-total" id="recipiente-disciplina-frequencia">';
    codigoEstrutura += criarSeletor('Disciplina', 'freq-disciplina', [{id: '', nome: 'Selecione um curso primeiro...'}], '');
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex flex-coluna mb-md flex-1 w-total">';
    codigoEstrutura += '<label class="peso-bold mb-sm cor-texto-escuro texto-md">Data da Aula</label>';
    codigoEstrutura += '<input type="text" id="freq-data" readonly class="campo-somente-leitura">';
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '<div class="flex-1 w-total flex gap-sm md-flex-coluna mb-md">';
    codigoEstrutura += criarBotao('Iniciar Chamada', 'iniciarNovaChamada()', 'primario', 'w-total');
    codigoEstrutura += criarBotao('Imprimir Lista Física', 'gerarListaFisicaFrequencia()', 'secundario', 'w-total');
    codigoEstrutura += '</div>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="pt-md">';
    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-sm">Histórico de Diários Lançados</h3>';
    
    if (todasFrequencias.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro py-md texto-centro">Nenhum diário de classe foi lançado até o momento.</p>';
    } else {
        let linhasFrequencias = '';

        todasFrequencias.forEach((freq, idx) => {
            const curso = cursos.find(c => String(c.id_curso) === String(freq.id_curso));
            const disc = disciplinas.find(d => String(d.id_disciplina) === String(freq.id_disciplina));
            const classeFundo = idx % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhasFrequencias += `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md peso-medium">${Utilidades.formatarData(freq.data)}</td>
                <td class="p-md">${curso ? curso.nome_curso : 'Não encontrado'}</td>
                <td class="p-md peso-bold">${disc ? disc.nome_disciplina : 'Não encontrada'}</td>
                <td class="p-md">
                    ${criarAcoesTabela([
                        { rotulo: 'Editar', acao: `editarFrequenciaAntiga('${freq.id_frequencia}')` },
                        { rotulo: 'Excluir', acao: `excluirFrequencia('${freq.id_frequencia}')`, perigo: true }
                    ])}
                </td>
            </tr>`;
        });
        codigoEstrutura += criarContainerTabela(
            ['Data', 'Curso', 'Disciplina', 'Ações'],
            linhasFrequencias
        );
    }
    codigoEstrutura += '</div>';
    
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    setTimeout(() => {
        const elData = document.getElementById('freq-data');
        if (elData) {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            elData.dataset.valorReal = `${ano}-${mes}-${dia}`;
            elData.value = `${dia}/${mes}/${ano}`;
        }

        SeletorDinamico.vincular('freq-curso', 'recipiente-disciplina-frequencia', 'Disciplina', 'freq-disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...');
    }, 50);
}

async function gerarListaFisicaFrequencia() {
    const idCurso = document.getElementById('freq-curso').value;
    const idDisciplina = document.getElementById('freq-disciplina').value;
    const dataAula = document.getElementById('freq-data').dataset.valorReal;

    if (!idCurso) return Utilidades.notificacao('Selecione um curso para imprimir a lista.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina para imprimir a lista.', 'erro');

    const [curso, disciplina, participantes, paroquias] = await Promise.all([
        bd.obter('cursos', idCurso),
        bd.obter('disciplinas', idDisciplina),
        bd.obterTodos('participantes'),
        bd.obterTodos('paroquias')
    ]);

    const participantesCurso = participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    const mapaParoquias = {};
    paroquias.forEach(paroquia => {
        mapaParoquias[paroquia.id_paroquia] = paroquia.nome_paroquia;
    });

    const dataFormatada = dataAula ? Utilidades.formatarData(dataAula) : '____/____/________';
    let html = `<h2>LISTA DE ASSINATURAS (PRESENÇA FÍSICA)</h2>`;
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso ? curso.nome_curso : '-')}</p>`;
    html += `<p><strong>Disciplina:</strong> ${Utilidades.escaparHtml(disciplina ? disciplina.nome_disciplina : '-')}</p>`;
    html += `<p><strong>Data da Aula:</strong> ____/____/________ </p>`;

    if (participantesCurso.length === 0) {
        html += '<p class="texto-centro">Nenhum participante cadastrado neste curso.</p>';
        abrirDocumentoImpressao('Lista de Assinaturas', html);
        return;
    }

    html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th><th>Paróquia</th><th class="coluna-assinatura">Assinatura</th></tr></thead><tbody>';
    participantesCurso.forEach(participante => {
        const paroquia = mapaParoquias[participante.id_paroquia] || 'Não informada';
        html += `<tr class="linha-assinatura"><td><strong>${Utilidades.escaparHtml(participante.nome_participante || '-')}</strong></td><td>${Utilidades.escaparHtml(paroquia)}</td><td></td></tr>`;
    });
    html += '</tbody></table>';

    abrirDocumentoImpressao('Lista de Assinaturas', html);
}

async function iniciarNovaChamada() {
    const idCurso = document.getElementById('freq-curso').value;
    const idDisciplina = document.getElementById('freq-disciplina').value;
    const dataAula = document.getElementById('freq-data').dataset.valorReal;

    if (!idCurso) return Utilidades.notificacao('Selecione um curso para iniciar a chamada.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina.', 'erro');
    if (!dataAula) return Utilidades.notificacao('A data da aula não pode estar vazia.', 'erro');

    const participantes = await bd.obterTodos('participantes');
    const participantesDoCurso = participantes.filter(p => String(p.id_curso) === String(idCurso));

    if (participantesDoCurso.length === 0) {
        return Utilidades.notificacao('Nenhum participante matriculado neste curso.', 'aviso');
    }

    participantesDoCurso.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    frequenciaEmEdicao = null;
    frequenciaTemporaria = {};
    participantesDoCurso.forEach(a => frequenciaTemporaria[a.id_participante] = 'C');
    dadosAulaAtual = { idCurso, idDisciplina, dataAula };

    abrirModalChamada(participantesDoCurso);
}

async function editarFrequenciaAntiga(idFrequencia) {
    const todasFrequencias = await bd.obterTodos('frequencia');
    const frequencia = todasFrequencias.find(f => String(f.id_frequencia) === String(idFrequencia));

    if (!frequencia) return Utilidades.notificacao('Frequência não encontrada.', 'erro');

    const participantes = await bd.obterTodos('participantes');
    const participantesDoCurso = participantes.filter(p => String(p.id_curso) === String(frequencia.id_curso));

    participantesDoCurso.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));

    frequenciaEmEdicao = frequencia;
    frequenciaTemporaria = { ...frequencia.presencas };
    dadosAulaAtual = { 
        idCurso: frequencia.id_curso, 
        idDisciplina: frequencia.id_disciplina, 
        dataAula: frequencia.data 
    };

    abrirModalChamada(participantesDoCurso);
}

async function abrirModalChamada(participantes) {
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

    let linhasChamada = '';

    participantes.forEach((participante, index) => {
        const statusAtual = frequenciaTemporaria[participante.id_participante] || 'C';
        const botaoClasse = statusAtual === 'C' ? 'fundo-sucesso hover-fundo-sucesso-escuro cor-texto-branco' : 'fundo-erro hover-fundo-erro-escuro cor-texto-branco';
        const botaoTexto = statusAtual === 'C' ? 'Compareceu' : 'Faltou';
        const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        linhasChamada += `
            <tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md texto-esquerda texto-md peso-medium cor-texto-escuro">${participante.nome_participante || participante.nome}</td>
                <td class="p-md texto-direita">
                    ${criarBotao(botaoTexto, `alternarFrequenciaParticipante('${participante.id_participante}')`, 'neutro', `botao-pequeno w-total ${botaoClasse}`, 'button', `id="botao-frequencia-${participante.id_participante}"`)}
                </td>
            </tr>
        `;
    });

    html += criarContainerTabela(
        ['Nome do Participante', 'Presença'],
        linhasChamada,
        '',
        '',
        'lista-rolagem-modal mb-md'
    );

    html += criarRodapeFormulario('salvarDiarioFrequencia()', frequenciaEmEdicao ? 'Atualizar Frequência' : 'Salvar Frequência', {
        classesExtras: 'md-flex-coluna',
        botoesExtras: '',
        varianteSalvar: 'primario'
    });

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}

function alternarFrequenciaParticipante(idParticipante) {
    const botao = document.getElementById(`botao-frequencia-${idParticipante}`);
    if (!botao) return;

    if (frequenciaTemporaria[idParticipante] === 'C') {
        frequenciaTemporaria[idParticipante] = 'F';
        botao.textContent = 'Faltou';
        botao.classList.remove('fundo-sucesso', 'hover-fundo-sucesso-escuro');
        botao.classList.add('fundo-erro', 'hover-fundo-erro-escuro');
    } else {
        frequenciaTemporaria[idParticipante] = 'C';
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
