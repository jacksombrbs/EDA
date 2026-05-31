const HORAS_AULA_FREQUENCIA = 8;
const ESTADOS_FREQUENCIA = {
    COMPARECEU: 'compareceu',
    FALTOU: 'faltou',
    PARCIAL: 'parcial'
};

async function obterParticipantesDoCurso(idCurso) {
    const participantes = await bd.obterTodos('participantes');
    return participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .filter(participante => Utilidades.participanteEstaAtivo(participante))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

async function obterDisciplinasDoCurso(idCurso) {
    const disciplinas = await bd.obterTodos('disciplinas');
    return disciplinas
        .filter(disciplina => String(disciplina.id_curso) === String(idCurso))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

function montarEstadoPresenca(estado = ESTADOS_FREQUENCIA.COMPARECEU, horas = HORAS_AULA_FREQUENCIA) {
    const estadoNormalizado = normalizarEstadoFrequencia(estado);
    const horasNormalizadas = normalizarHorasFrequencia(horas);

    if (estadoNormalizado === ESTADOS_FREQUENCIA.COMPARECEU) {
        return { estado: ESTADOS_FREQUENCIA.COMPARECEU, horas: HORAS_AULA_FREQUENCIA };
    }

    if (estadoNormalizado === ESTADOS_FREQUENCIA.FALTOU) {
        return { estado: ESTADOS_FREQUENCIA.FALTOU, horas: 0 };
    }

    return {
        estado: ESTADOS_FREQUENCIA.PARCIAL,
        horas: Math.min(Math.max(horasNormalizadas, 0), HORAS_AULA_FREQUENCIA)
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

function montarRegistroFrequencia(idCurso, idDisciplina, data, participantes, presencas, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data,
        presencas: participantes.map(participante => {
            const presenca = montarEstadoPresenca(
                presencas[participante.id]?.estado,
                presencas[participante.id]?.horas
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

    return montarEstadoPresenca(registro.estado, registro.horas);
}

function presencaContaComoComparecimento(presenca) {
    if (!presenca) return false;
    return presenca.estado === ESTADOS_FREQUENCIA.COMPARECEU || presenca.estado === ESTADOS_FREQUENCIA.PARCIAL;
}

function calcularResumoFrequencia(registro) {
    const presencas = Array.isArray(registro?.presencas) ? registro.presencas : [];
    const total = presencas.length;
    const horasPrevistas = total * HORAS_AULA_FREQUENCIA;
    const horasPresentes = presencas.reduce((totalHoras, item) => {
        const presenca = montarEstadoPresenca(item.estado, item.horas);
        return totalHoras + presenca.horas;
    }, 0);
    const comparecimentos = presencas.filter(item => presencaContaComoComparecimento(montarEstadoPresenca(item.estado, item.horas))).length;
    const faltas = presencas.filter(item => montarEstadoPresenca(item.estado, item.horas).estado === ESTADOS_FREQUENCIA.FALTOU).length;

    return {
        total,
        comparecimentos,
        faltas,
        horasPrevistas,
        horasPresentes,
        percentual: horasPrevistas ? Math.round((horasPresentes / horasPrevistas) * 100) : 0
    };
}
