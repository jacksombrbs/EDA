function obterDadosFormularioAtividade() {
    return {
        id_participante: document.getElementById('id_participante')?.value || '',
        id_curso: document.getElementById('id_curso')?.value || '',
        id_disciplina: document.getElementById('id_disciplina')?.value || '',
        data_entrega: document.getElementById('data_entrega')?.value || '',
        descricao: document.getElementById('descricao')?.value.trim() || 'Entrega de atividade',
        observacoes: document.getElementById('observacoes')?.value.trim() || ''
    };
}

function validarAtividade(dados) {
    if (!Validacao.notificarCamposObrigatorios([
        { nome: 'Curso', valor: dados.id_curso },
        { nome: 'Participante', valor: dados.id_participante },
        { nome: 'Disciplina', valor: dados.id_disciplina },
        { nome: 'Data de Entrega', valor: dados.data_entrega }
    ])) {
        return false;
    }

    return Validacao.validarCampoData(dados.data_entrega, 'Data de Entrega');
}

function montarAtividade(dados, id = null) {
    return {
        id: id || Utilidades.gerarId(),
        id_participante: dados.id_participante,
        id_curso: dados.id_curso,
        id_disciplina: dados.id_disciplina,
        data_entrega: dados.data_entrega,
        descricao: dados.descricao,
        observacoes: dados.observacoes
    };
}
