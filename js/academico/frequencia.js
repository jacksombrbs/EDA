async function renderizarFrequencia(conteudo) {
    const [cursos, disciplinas, frequencias] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('frequencias')
    ]);

    cursos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    let codigo = '<div class="pagina-conteudo">';
    codigo += criarCabecalhoSecao('Frequência');
    codigo += '<div class="flex flex-linha md-flex-coluna gap-md mb-lg itens-fim">';
    codigo += '<div class="flex-1 w-total">' + criarSeletor('Curso', 'freq-curso', cursos.map(curso => ({ id: curso.id, nome: curso.nome })), '') + '</div>';
    codigo += '<div class="flex-1 w-total" id="recipiente-disciplina-frequencia">' + criarSeletor('Disciplina', 'freq-disciplina', [{ id: '', nome: 'Selecione um curso primeiro...' }], '') + '</div>';
    const dataAula = new Date().toISOString().split('T')[0];
    codigo += '<input type="hidden" id="freq-data" value="' + dataAula + '">';
    codigo += '<div class="flex-1">' + criarCampoSomenteLeitura('Data da Aula', 'freq-data-visual', Utilidades.formatarData(dataAula)) + '</div>';
    codigo += '<div class="flex-1 w-total flex gap-sm md-flex-coluna mb-md">';
    codigo += criarBotao('Iniciar Chamada', 'abrirChamada()', 'primario', 'w-total');
    codigo += criarBotao('Imprimir Lista Física', 'gerarListaFisicaFrequencia()', 'secundario', 'w-total');
    codigo += '</div></div>';
    codigo += '<div class="pt-md"><h3 class="texto-md peso-bold cor-texto-primario mb-sm mt-sm">Histórico de Diários Lançados</h3>';
    codigo += frequencias.length ? renderizarTabelaFrequencias(frequencias, cursos, disciplinas) : criarMensagemVazia('Nenhum diário de classe foi lançado até o momento.');
    codigo += '</div></div>';

    conteudo.innerHTML = codigo;
    SeletorDinamico.vincular('freq-curso', 'recipiente-disciplina-frequencia', 'Disciplina', 'freq-disciplina', disciplinas, 'id_curso', 'Selecione a disciplina...');
}

async function abrirChamada() {
    const idCurso = document.getElementById('freq-curso')?.value || '';
    const idDisciplina = document.getElementById('freq-disciplina')?.value || '';
    const data = document.getElementById('freq-data')?.value || '';

    if (!idCurso) return Utilidades.notificacao('Selecione um curso para iniciar a chamada.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina.', 'erro');
    if (!data) return Utilidades.notificacao('Informe a data da aula.', 'erro');

    const [disciplina, participantes] = await Promise.all([
        bd.obter('disciplinas', idDisciplina),
        obterParticipantesDoCurso(idCurso)
    ]);
    if (!disciplina) return Utilidades.notificacao('Disciplina não encontrada.', 'erro');
    if (participantes.length === 0) return Utilidades.notificacao('Nenhum participante ativo matriculado neste curso.', 'aviso');

    const cargaHoraria = obterCargaHorariaDisciplina(disciplina);

    AppEstado.frequenciaAtual = {
        id: null,
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data,
        carga_horaria: cargaHoraria,
        participantes,
        presencas: Object.fromEntries(participantes.map(participante => [participante.id, montarEstadoPresenca(ESTADOS_FREQUENCIA.COMPARECEU, cargaHoraria, cargaHoraria)]))
    };

    await abrirJanelaFrequencia();
}

async function editarFrequencia(id) {
    const registro = await bd.obter('frequencias', id);
    if (!registro) return Utilidades.notificacao('Frequência não encontrada.', 'erro');

    const disciplina = await bd.obter('disciplinas', registro.id_disciplina);
    const cargaHoraria = obterCargaHorariaFrequencia(registro, disciplina);
    const idsRegistrados = new Set((registro.presencas || []).map(item => String(item.id_participante)));
    const todosParticipantes = await bd.obterTodos('participantes');
    const participantes = todosParticipantes
        .filter(participante =>
            String(participante.id_curso) === String(registro.id_curso)
            && (Utilidades.participanteEstaAtivo(participante) || idsRegistrados.has(String(participante.id)))
        )
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    const presencas = Object.fromEntries(participantes.map(participante => [participante.id, montarEstadoPresenca(ESTADOS_FREQUENCIA.FALTOU, 0, cargaHoraria)]));

    (registro.presencas || []).forEach(item => {
        presencas[item.id_participante] = montarEstadoPresenca(item.estado, item.horas, cargaHoraria);
    });

    AppEstado.frequenciaAtual = {
        id: registro.id,
        id_curso: registro.id_curso,
        id_disciplina: registro.id_disciplina,
        data: registro.data,
        carga_horaria: cargaHoraria,
        participantes,
        presencas
    };

    await abrirJanelaFrequencia();
}

async function salvarFrequencia() {
    if (!AppEstado.frequenciaAtual?.id_curso || !AppEstado.frequenciaAtual?.id_disciplina || !AppEstado.frequenciaAtual?.data) {
        return Utilidades.notificacao('Dados da chamada incompletos.', 'erro');
    }

    const cargaHoraria = normalizarCargaHoraria(AppEstado.frequenciaAtual.carga_horaria, CARGA_HORARIA_PADRAO);

    for (const participante of AppEstado.frequenciaAtual.participantes) {
        const presenca = AppEstado.frequenciaAtual.presencas[participante.id];
        if (presenca?.estado !== ESTADOS_FREQUENCIA.PARCIAL) continue;

        if (presenca.horas <= 0 || presenca.horas >= cargaHoraria) {
            return Utilidades.notificacao(`Informe uma carga horária parcial entre 1 e ${formatarHorasCargaHoraria(cargaHoraria)} para ${participante.nome}.`, 'erro');
        }
    }

    const registro = montarRegistroFrequencia(
        AppEstado.frequenciaAtual.id_curso,
        AppEstado.frequenciaAtual.id_disciplina,
        AppEstado.frequenciaAtual.data,
        AppEstado.frequenciaAtual.participantes,
        AppEstado.frequenciaAtual.presencas,
        cargaHoraria,
        AppEstado.frequenciaAtual.id
    );

    await bd.salvar('frequencias', registro);

    const desistentesAtualizados = await atualizarDesistentesPorFalta(AppEstado.frequenciaAtual.id_curso);
    const mensagemBase = AppEstado.frequenciaAtual.id ? 'Frequência atualizada com sucesso!' : 'Diário salvo com sucesso!';
    const mensagemDesistentes = desistentesAtualizados.length > 0
        ? ` ${desistentesAtualizados.length} participante(s) atualizado(s) como desistente(s) por faltas.`
        : '';

    Utilidades.notificacao(`${mensagemBase}${mensagemDesistentes}`, 'sucesso');
    AppEstado.frequenciaAtual = null;
    Interface.fecharJanela('janela-formulario');
    await renderizarAbaAtual();
}

async function excluirFrequencia(id) {
    if (!confirm('Deseja realmente excluir este registro de frequência?')) return;

    await bd.excluir('frequencias', id);
    Utilidades.notificacao('Frequência excluída com sucesso!', 'sucesso');
    await renderizarAbaAtual();
}

async function abrirJanelaFrequencia() {
    const [curso, disciplina] = await Promise.all([
        bd.obter('cursos', AppEstado.frequenciaAtual.id_curso),
        bd.obter('disciplinas', AppEstado.frequenciaAtual.id_disciplina)
    ]);
    const cargaHoraria = normalizarCargaHoraria(AppEstado.frequenciaAtual.carga_horaria, obterCargaHorariaDisciplina(disciplina));

    document.getElementById('titulo-janela').textContent = AppEstado.frequenciaAtual.id ? 'Editar Diário de Classe' : 'Novo Diário de Classe';

    let html = `
        <div class="mb-md p-md fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-sm flex justifica-espaco md-flex-coluna gap-sm">
            <div>
                <p class="texto-md cor-texto-escuro mb-xs"><strong>Curso:</strong> ${Utilidades.escaparHtml(curso?.nome || '-')}</p>
                <p class="texto-md cor-texto-escuro"><strong>Disciplina:</strong> ${Utilidades.escaparHtml(disciplina?.nome || '-')}</p>
            </div>
            <div class="md-texto-esquerda texto-direita">
                <p class="texto-md cor-texto-escuro"><strong>Data:</strong> ${Utilidades.formatarData(AppEstado.frequenciaAtual.data)}</p>
                <div class="flex itens-centro gap-sm justifica-fim md-justifica-inicio"><label for="carga-horaria-chamada" class="texto-sm cor-texto-claro">Carga horária do encontro</label><input type="number" min="0.5" step="0.5" id="carga-horaria-chamada" class="campo-padrao botao-pequeno" value="${cargaHoraria}" onchange="atualizarCargaHorariaChamada(this.value)" oninput="atualizarCargaHorariaChamada(this.value)"></div>
            </div>
        </div>
    `;

    const linhas = AppEstado.frequenciaAtual.participantes.map((participante, indice) => {
        const presenca = AppEstado.frequenciaAtual.presencas[participante.id] || montarEstadoPresenca(ESTADOS_FREQUENCIA.COMPARECEU, cargaHoraria, cargaHoraria);
        const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

        return `
            <tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md texto-esquerda texto-md peso-medium cor-texto-escuro">${Utilidades.escaparHtml(participante.nome)}</td>
                <td class="p-md texto-direita">
                    <div class="flex gap-sm itens-centro justifica-fim">
                        ${criarBotao(obterTextoEstadoFrequencia(presenca.estado), `alternarFrequenciaParticipante('${participante.id}')`, 'neutro', `botao-pequeno ${obterClasseEstadoFrequencia(presenca.estado)}`, 'button', `id="botao-frequencia-${participante.id}"`)}
                        <input type="number" min="0.5" max="${cargaHoraria - 0.5}" step="0.5" id="horas-frequencia-${participante.id}" class="campo-padrao botao-pequeno ${presenca.estado === ESTADOS_FREQUENCIA.PARCIAL ? '' : 'oculto'}" value="${presenca.estado === ESTADOS_FREQUENCIA.PARCIAL ? Utilidades.escaparHtml(presenca.horas || '') : ''}" placeholder="Horas" onchange="atualizarHorasFrequenciaParticipante('${participante.id}', this.value)" oninput="atualizarHorasFrequenciaParticipante('${participante.id}', this.value)" aria-label="Horas parciais">
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    html += criarContainerTabela(['Nome do Participante', 'Presença'], linhas, '', '', 'lista-rolagem-modal mb-md');
    html += criarRodapeFormulario('salvarFrequencia()', AppEstado.frequenciaAtual.id ? 'Atualizar Frequência' : 'Salvar Frequência');

    document.getElementById('conteudo-formulario').innerHTML = html;
    Interface.abrirJanela('janela-formulario');
}


function atualizarCargaHorariaChamada(valor) {
    if (!AppEstado.frequenciaAtual) return;

    const cargaHoraria = normalizarCargaHoraria(valor, AppEstado.frequenciaAtual.carga_horaria || CARGA_HORARIA_PADRAO);
    AppEstado.frequenciaAtual.carga_horaria = cargaHoraria;

    Object.keys(AppEstado.frequenciaAtual.presencas || {}).forEach(idParticipante => {
        const presenca = AppEstado.frequenciaAtual.presencas[idParticipante];
        if (!presenca) return;
        AppEstado.frequenciaAtual.presencas[idParticipante] = montarEstadoPresenca(presenca.estado, presenca.horas, cargaHoraria);

        const campoHoras = document.getElementById(`horas-frequencia-${idParticipante}`);
        if (campoHoras) campoHoras.max = String(Math.max(cargaHoraria - 0.5, 0.5));
    });
}

function alternarFrequenciaParticipante(idParticipante) {
    if (!AppEstado.frequenciaAtual) return;

    const cargaHoraria = normalizarCargaHoraria(AppEstado.frequenciaAtual.carga_horaria, CARGA_HORARIA_PADRAO);
    const atual = AppEstado.frequenciaAtual.presencas[idParticipante] || montarEstadoPresenca(ESTADOS_FREQUENCIA.COMPARECEU, cargaHoraria, cargaHoraria);
    const proximoEstado = obterProximoEstadoFrequencia(atual.estado);
    const horasParciais = atual.estado === ESTADOS_FREQUENCIA.PARCIAL ? atual.horas : '';
    AppEstado.frequenciaAtual.presencas[idParticipante] = montarEstadoPresenca(proximoEstado, proximoEstado === ESTADOS_FREQUENCIA.PARCIAL ? horasParciais : undefined, cargaHoraria);
    atualizarLinhaFrequenciaParticipante(idParticipante);
}

function atualizarHorasFrequenciaParticipante(idParticipante, valor) {
    if (!AppEstado.frequenciaAtual?.presencas?.[idParticipante]) return;

    const cargaHoraria = normalizarCargaHoraria(AppEstado.frequenciaAtual.carga_horaria, CARGA_HORARIA_PADRAO);
    const horas = Math.min(Math.max(normalizarHorasFrequencia(valor), 0), cargaHoraria);
    AppEstado.frequenciaAtual.presencas[idParticipante] = montarEstadoPresenca(ESTADOS_FREQUENCIA.PARCIAL, horas, cargaHoraria);
}

function atualizarLinhaFrequenciaParticipante(idParticipante) {
    const presenca = AppEstado.frequenciaAtual?.presencas?.[idParticipante];
    const botao = document.getElementById(`botao-frequencia-${idParticipante}`);
    const campoHoras = document.getElementById(`horas-frequencia-${idParticipante}`);

    if (!presenca || !botao || !campoHoras) return;

    botao.textContent = obterTextoEstadoFrequencia(presenca.estado);
    botao.className = `botao-padrao botao-neutro botao-pequeno ${obterClasseEstadoFrequencia(presenca.estado)}`;

    const parcial = presenca.estado === ESTADOS_FREQUENCIA.PARCIAL;
    campoHoras.classList.toggle('oculto', !parcial);
    if (parcial) {
        campoHoras.value = presenca.horas || '';
        campoHoras.focus();
    } else {
        campoHoras.value = '';
    }
}

function renderizarTabelaFrequencias(frequencias, cursos, disciplinas) {
    const linhas = frequencias
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((registro, indice) => {
            const curso = cursos.find(item => String(item.id) === String(registro.id_curso));
            const disciplina = disciplinas.find(item => String(item.id) === String(registro.id_disciplina));
            const resumo = calcularResumoFrequencia(registro);
            const cargaHoraria = obterCargaHorariaFrequencia(registro, disciplina);
            const classeFundo = indice % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            return `<tr class="${classeFundo} transicao hover-fundo-superficie-3">
                <td class="p-md peso-medium">${Utilidades.formatarData(registro.data)}</td>
                <td class="p-md">${Utilidades.escaparHtml(curso?.nome || 'Não encontrado')}</td>
                <td class="p-md peso-bold">${Utilidades.escaparHtml(disciplina?.nome || 'Não encontrada')}</td>
                <td class="p-md">${formatarHorasCargaHoraria(cargaHoraria)}</td>
                <td class="p-md">${resumo.comparecimentos}/${resumo.total}</td>
                <td class="p-md">${criarAcoesTabela([
                    { rotulo: 'Editar', acao: `editarFrequencia('${registro.id}')` },
                    { rotulo: 'Excluir', acao: `excluirFrequencia('${registro.id}')`, perigo: true }
                ])}</td>
            </tr>`;
        }).join('');

    return criarContainerTabela(['Data', 'Curso', 'Disciplina', 'Carga Horária', 'Comparecimentos', 'Ações'], linhas);
}

async function iniciarNovaChamada() {
    await abrirChamada();
}

async function salvarDiarioFrequencia() {
    await salvarFrequencia();
}
