const CARGA_HORARIA_PADRAO = 8;
const PERCENTUAL_MINIMO_FREQUENCIA_PADRAO = 75;
const ESTADOS_FREQUENCIA = {
    COMPARECEU: 'compareceu',
    FALTOU: 'faltou',
    PARCIAL: 'parcial'
};

async function obterParticipantesDoCurso(idCurso, opcoes = {}) {
    const participantes = await bd.obterTodos('participantes');
    return Utilidades.filtrarParticipantesDoCurso(participantes, idCurso, opcoes);
}

function selecionarParticipantesLancamento(participantes = [], mostrarTodos = false, idsObrigatorios = []) {
    const idsMantidos = new Set((idsObrigatorios || []).map(id => String(id)));
    return Utilidades.ordenarParticipantesPorNome(participantes.filter(participante =>
        mostrarTodos
        || Utilidades.participanteEstaAtivo(participante)
        || idsMantidos.has(String(participante.id))
    ));
}

function criarControleTodosParticipantesLancamento(idCampo, mostrarTodos = false, aoAlterar = '') {
    return `
        <label class="flex itens-centro gap-sm texto-sm cor-texto-claro cursor-apontador">
            <input type="checkbox" id="${idCampo}" class="checkbox-padrao" ${mostrarTodos ? 'checked' : ''} ${aoAlterar ? `onchange="${aoAlterar}(this.checked)"` : ''}>
            Mostrar todos, incluindo desistentes
        </label>
    `;
}

async function obterDisciplinasDoCurso(idCurso) {
    const disciplinas = await bd.obterTodos('disciplinas');
    return disciplinas
        .filter(disciplina => String(disciplina.id_curso) === String(idCurso))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

function normalizarCargaHoraria(valor, padrao = 0) {
    const numero = Number(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(numero) && numero > 0 ? numero : padrao;
}

function formatarHorasCargaHoraria(valor) {
    const numero = normalizarCargaHoraria(valor, 0);
    if (!numero) return '-';
    return `${Number.isInteger(numero) ? numero : numero.toFixed(1).replace('.', ',')}h`;
}

function obterCargaHorariaDisciplina(disciplina = null) {
    return normalizarCargaHoraria(disciplina?.carga_horaria, CARGA_HORARIA_PADRAO);
}

function obterCargaHorariaFrequencia(frequencia = null, disciplina = null) {
    return normalizarCargaHoraria(frequencia?.carga_horaria, obterCargaHorariaDisciplina(disciplina));
}

function obterPercentualMinimoCurso(curso = null) {
    const percentual = Number(curso?.percentual_minimo_frequencia);
    return Number.isFinite(percentual) && percentual > 0 && percentual <= 100
        ? Math.round(percentual)
        : PERCENTUAL_MINIMO_FREQUENCIA_PADRAO;
}

function calcularLimiteHorasFaltaCurso(curso = null) {
    const cargaHorariaTotal = normalizarCargaHoraria(curso?.carga_horaria_total, 0);
    if (!cargaHorariaTotal) return Infinity;

    const percentualMinimo = obterPercentualMinimoCurso(curso);
    return cargaHorariaTotal * ((100 - percentualMinimo) / 100);
}

function montarEstadoPresenca(estado = ESTADOS_FREQUENCIA.COMPARECEU, horas = CARGA_HORARIA_PADRAO, cargaHoraria = CARGA_HORARIA_PADRAO) {
    const estadoNormalizado = normalizarEstadoFrequencia(estado);
    const cargaHorariaNormalizada = normalizarCargaHoraria(cargaHoraria, CARGA_HORARIA_PADRAO);
    const horasNormalizadas = normalizarHorasFrequencia(horas);

    if (estadoNormalizado === ESTADOS_FREQUENCIA.COMPARECEU) {
        return { estado: ESTADOS_FREQUENCIA.COMPARECEU, horas: cargaHorariaNormalizada };
    }

    if (estadoNormalizado === ESTADOS_FREQUENCIA.FALTOU) {
        return { estado: ESTADOS_FREQUENCIA.FALTOU, horas: 0 };
    }

    return {
        estado: ESTADOS_FREQUENCIA.PARCIAL,
        horas: Math.min(Math.max(horasNormalizadas, 0), cargaHorariaNormalizada)
    };
}

function normalizarEstadoFrequencia(estado) {
    const texto = String(estado || '').trim().toLowerCase();
    if (texto === ESTADOS_FREQUENCIA.FALTOU) return ESTADOS_FREQUENCIA.FALTOU;
    if (texto === ESTADOS_FREQUENCIA.PARCIAL) return ESTADOS_FREQUENCIA.PARCIAL;
    return ESTADOS_FREQUENCIA.COMPARECEU;
}

function normalizarHorasFrequencia(valor) {
    const numero = Number(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 0;
}

function obterTextoEstadoFrequencia(estado) {
    const estadoNormalizado = normalizarEstadoFrequencia(estado);
    if (estadoNormalizado === ESTADOS_FREQUENCIA.FALTOU) return 'Faltou';
    if (estadoNormalizado === ESTADOS_FREQUENCIA.PARCIAL) return 'Parcial';
    return 'Compareceu';
}

function obterProximoEstadoFrequencia(estado) {
    const estadoNormalizado = normalizarEstadoFrequencia(estado);
    if (estadoNormalizado === ESTADOS_FREQUENCIA.COMPARECEU) return ESTADOS_FREQUENCIA.FALTOU;
    if (estadoNormalizado === ESTADOS_FREQUENCIA.FALTOU) return ESTADOS_FREQUENCIA.PARCIAL;
    return ESTADOS_FREQUENCIA.COMPARECEU;
}

function obterClasseEstadoFrequencia(estado) {
    const estadoNormalizado = normalizarEstadoFrequencia(estado);
    if (estadoNormalizado === ESTADOS_FREQUENCIA.FALTOU) return 'fundo-erro hover-fundo-erro-escuro cor-texto-branco';
    if (estadoNormalizado === ESTADOS_FREQUENCIA.PARCIAL) return 'fundo-aviso hover-fundo-aviso-escuro cor-texto-branco';
    return 'fundo-sucesso hover-fundo-sucesso-escuro cor-texto-branco';
}

function montarRegistroFrequencia(idCurso, idDisciplina, data, participantes, presencas, cargaHoraria, id = null) {
    const cargaHorariaNormalizada = normalizarCargaHoraria(cargaHoraria, CARGA_HORARIA_PADRAO);

    return {
        id: id || Utilidades.gerarId(),
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data,
        carga_horaria: cargaHorariaNormalizada,
        presencas: participantes.map(participante => {
            const presenca = montarEstadoPresenca(
                presencas[participante.id]?.estado,
                presencas[participante.id]?.horas,
                cargaHorariaNormalizada
            );

            return {
                id_participante: participante.id,
                estado: presenca.estado,
                horas: presenca.horas
            };
        })
    };
}

function obterPresencaParticipante(frequencia, idParticipante) {
    const presencas = frequencia?.presencas;
    if (!Array.isArray(presencas)) return null;

    const registro = presencas.find(item => String(item.id_participante) === String(idParticipante));
    if (!registro) return null;

    return montarEstadoPresenca(registro.estado, registro.horas, obterCargaHorariaFrequencia(frequencia));
}

function presencaContaComoComparecimento(presenca) {
    if (!presenca) return false;
    return presenca.estado === ESTADOS_FREQUENCIA.COMPARECEU || presenca.estado === ESTADOS_FREQUENCIA.PARCIAL;
}

function calcularHorasFaltaPresenca(presenca, cargaHoraria = CARGA_HORARIA_PADRAO) {
    if (!presenca) return 0;

    return Math.max(normalizarCargaHoraria(cargaHoraria, CARGA_HORARIA_PADRAO) - Number(presenca.horas || 0), 0);
}

function calcularHorasFaltaParticipante(idParticipante, frequencias = []) {
    return frequencias.reduce((total, frequencia) => {
        const presenca = obterPresencaParticipante(frequencia, idParticipante);
        return total + calcularHorasFaltaPresenca(presenca, obterCargaHorariaFrequencia(frequencia));
    }, 0);
}

async function atualizarDesistentesPorFalta(idCurso = '') {
    const [curso, participantes, frequencias] = await Promise.all([
        bd.obter('cursos', idCurso),
        bd.obterTodos('participantes'),
        bd.obterTodos('frequencias')
    ]);

    const limiteHorasFalta = calcularLimiteHorasFaltaCurso(curso);
    if (!Number.isFinite(limiteHorasFalta)) return [];

    const frequenciasCurso = frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(idCurso));
    const participantesCurso = participantes.filter(participante => String(participante.id_curso || '') === String(idCurso));
    const atualizados = [];

    for (const participante of participantesCurso) {
        const horasFalta = calcularHorasFaltaParticipante(participante.id, frequenciasCurso);
        const novoStatus = horasFalta > limiteHorasFalta ? 'Desistente' : 'Ativo';
        if (String(participante.status || 'Ativo') === novoStatus) continue;

        const participanteAtualizado = { ...participante, status: novoStatus };
        await bd.salvar('participantes', participanteAtualizado);
        atualizados.push(participanteAtualizado);
    }

    return atualizados;
}

function calcularResumoFrequencia(registro) {
    const presencas = Array.isArray(registro?.presencas) ? registro.presencas : [];
    const cargaHoraria = obterCargaHorariaFrequencia(registro);
    const total = presencas.length;
    const horasPrevistas = total * cargaHoraria;
    const horasPresentes = presencas.reduce((totalHoras, item) => {
        const presenca = montarEstadoPresenca(item.estado, item.horas, cargaHoraria);
        return totalHoras + presenca.horas;
    }, 0);
    const comparecimentos = presencas.filter(item => presencaContaComoComparecimento(montarEstadoPresenca(item.estado, item.horas, cargaHoraria))).length;
    const faltas = presencas.filter(item => montarEstadoPresenca(item.estado, item.horas, cargaHoraria).estado === ESTADOS_FREQUENCIA.FALTOU).length;

    return {
        total,
        comparecimentos,
        faltas,
        horasPrevistas,
        horasPresentes,
        percentual: horasPrevistas ? Math.round((horasPresentes / horasPrevistas) * 100) : 0
    };
}
