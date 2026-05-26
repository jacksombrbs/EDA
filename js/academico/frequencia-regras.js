async function obterParticipantesDoCurso(idCurso) {
    const participantes = await bd.obterTodos('participantes');
    return participantes
        .filter(participante => String(participante.id_curso) === String(idCurso))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

async function obterDisciplinasDoCurso(idCurso) {
    const disciplinas = await bd.obterTodos('disciplinas');
    return disciplinas
        .filter(disciplina => String(disciplina.id_curso) === String(idCurso))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

function montarRegistroFrequencia(idCurso, idDisciplina, data, participantes, presencas, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_curso: idCurso,
        id_disciplina: idDisciplina,
        data,
        presencas: participantes.map(participante => ({
            id_participante: participante.id,
            presente: Boolean(presencas[participante.id])
        }))
    };
}

function calcularResumoFrequencia(registro) {
    const presencas = Array.isArray(registro?.presencas) ? registro.presencas : [];
    const presentes = presencas.filter(item => item.presente).length;
    const total = presencas.length;

    return {
        total,
        presentes,
        faltas: total - presentes,
        percentual: total ? Math.round((presentes / total) * 100) : 0
    };
}
