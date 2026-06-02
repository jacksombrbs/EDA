const ESTADO_ATIVIDADE_ENTREGUE = 'Entregue';
const ESTADO_ATIVIDADE_NAO_ENTREGUE = 'Não Entregue';

function normalizarEstadoAtividade(estado = '') {
    const texto = String(estado || '').trim().toLowerCase();
    return ['entregue', 'sim', 's'].includes(texto)
        ? ESTADO_ATIVIDADE_ENTREGUE
        : ESTADO_ATIVIDADE_NAO_ENTREGUE;
}

function atividadeEstaEntregue(registro = {}) {
    return normalizarEstadoAtividade(registro.estado) === ESTADO_ATIVIDADE_ENTREGUE;
}

function obterRegistrosAtividade(atividade = null) {
    if (!atividade || !Array.isArray(atividade.registros)) return [];
    return atividade.registros;
}

function montarRegistroAtividade(idParticipante, estado = ESTADO_ATIVIDADE_NAO_ENTREGUE, observacoes = '') {
    return {
        id_participante: idParticipante,
        estado: normalizarEstadoAtividade(estado),
        observacoes: observacoes || ''
    };
}

function montarAtividade(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_curso: dados.id_curso,
        id_disciplina: dados.id_disciplina,
        data_entrega: dados.data_entrega,
        registros: (dados.registros || []).map(registro => montarRegistroAtividade(
            registro.id_participante,
            registro.estado,
            registro.observacoes
        ))
    };
}

function validarLancamentoAtividades(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Curso', valor: dados.id_curso },
        { nome: 'Disciplina', valor: dados.id_disciplina },
        { nome: 'Data de Entrega', valor: dados.data_entrega }
    ])) {
        return false;
    }

    return Validacao.validarCampoData(dados.data_entrega, 'Data de Entrega');
}

function filtrarAtividadesDoLancamento(atividades = [], idCurso = '', idDisciplina = '', dataEntrega = '') {
    return atividades.filter(atividade =>
        String(atividade.id_curso) === String(idCurso)
        && String(atividade.id_disciplina) === String(idDisciplina)
        && String(atividade.data_entrega) === String(dataEntrega)
    );
}



function calcularResumoLancamentoAtividade(atividade = {}) {
    const registros = obterRegistrosAtividade(atividade);
    const entregues = registros.filter(atividadeEstaEntregue).length;

    return {
        total: registros.length,
        entregues,
        naoEntregues: registros.length - entregues
    };
}

function expandirRegistrosAtividades(atividades = [], opcoes = {}) {
    const somenteEntregues = opcoes.somenteEntregues === true;
    const registros = [];

    atividades.forEach(atividade => {
        obterRegistrosAtividade(atividade).forEach(registro => {
            const item = {
                id: `${atividade.id || 'atividade'}-${registro.id_participante}`,
                id_lancamento: atividade.id,
                id_participante: registro.id_participante,
                id_curso: atividade.id_curso,
                id_disciplina: atividade.id_disciplina,
                data_entrega: atividade.data_entrega,
                estado: normalizarEstadoAtividade(registro.estado),
                observacoes: registro.observacoes || ''
            };

            if (!somenteEntregues || atividadeEstaEntregue(item)) registros.push(item);
        });
    });

    return registros;
}

function listarRegistrosAtividadesEntregues(atividades = []) {
    return expandirRegistrosAtividades(atividades, { somenteEntregues: true });
}

function listarAtividadesEntreguesPorParticipante(idParticipante, atividades = []) {
    return listarRegistrosAtividadesEntregues(atividades)
        .filter(registro => String(registro.id_participante) === String(idParticipante));
}
