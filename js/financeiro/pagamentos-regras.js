const TIPOS_PAGAMENTO = ['Inscrição', 'Mensalidade', 'Outros'];

async function obterParticipantePagamento(idParticipante) {
    return idParticipante ? await bd.obter('participantes', idParticipante) : null;
}

async function obterCursoParticipante(idParticipante) {
    const participante = await obterParticipantePagamento(idParticipante);
    if (!participante?.id_curso) return null;
    return await bd.obter('cursos', participante.id_curso);
}

async function participanteJaPagouInscricao(idParticipante, contexto = {}) {
    const pagamentos = await bd.obterTodos('pagamentos');
    const lotes = await bd.obterTodos('pagamentos_lote');

    const emPagamentoIndividual = pagamentos.some(pagamento =>
        String(pagamento.id_participante) === String(idParticipante)
        && pagamento.tipo === 'Inscrição'
        && String(pagamento.id) !== String(contexto.ignorarPagamentoId || '')
        && String(pagamento.id_lote || '') !== String(contexto.ignorarLoteId || '')
    );

    const emLote = lotes.some(lote =>
        lote.tipo === 'Inscrição'
        && Array.isArray(lote.ids_participantes)
        && lote.ids_participantes.map(String).includes(String(idParticipante))
        && String(lote.id) !== String(contexto.ignorarLoteId || '')
    );

    return emPagamentoIndividual || emLote;
}

async function validarInscricaoUnica(dados, contexto = {}) {
    const idsParticipantes = dados.ids_participantes || [dados.id_participante];
    const participantesBloqueados = [];

    for (const idParticipante of idsParticipantes) {
        if (await participanteJaPagouInscricao(idParticipante, contexto)) {
            const participante = await bd.obter('participantes', idParticipante);
            participantesBloqueados.push(participante?.nome || idParticipante);
        }
    }

    if (participantesBloqueados.length > 0) {
        return {
            valido: false,
            mensagem: `Não foi possível salvar. Os seguintes participantes já quitaram a inscrição: ${participantesBloqueados.join(', ')}.`
        };
    }

    return { valido: true };
}

async function calcularMensalidadesPagas(idParticipante, contexto = {}) {
    const pagamentos = await bd.obterTodos('pagamentos');

    return pagamentos
        .filter(pagamento =>
            String(pagamento.id_participante) === String(idParticipante)
            && pagamento.tipo === 'Mensalidade'
            && String(pagamento.id) !== String(contexto.ignorarPagamentoId || '')
            && String(pagamento.id_lote || '') !== String(contexto.ignorarLoteId || '')
        )
        .reduce((total, pagamento) => total + (Number(pagamento.quantidade) || 1), 0);
}

async function calcularMensalidadesRestantes(idParticipante, contexto = {}) {
    const curso = await obterCursoParticipante(idParticipante);
    const quantidadeCurso = Number(curso?.quantidade_mensalidades || 0);
    const pagas = await calcularMensalidadesPagas(idParticipante, contexto);
    return Math.max(quantidadeCurso - pagas, 0);
}

async function validarLimiteMensalidades(dados, contexto = {}) {
    const idsParticipantes = dados.ids_participantes || [dados.id_participante];
    const quantidade = Number(dados.quantidade || 1);
    const bloqueados = [];

    for (const idParticipante of idsParticipantes) {
        const restantes = await calcularMensalidadesRestantes(idParticipante, contexto);
        if (quantidade > restantes) {
            const participante = await bd.obter('participantes', idParticipante);
            bloqueados.push(`${participante?.nome || idParticipante} resta ${restantes}`);
        }
    }

    if (bloqueados.length > 0) {
        return {
            valido: false,
            mensagem: `Não foi possível salvar. Os seguintes participantes não possuem mensalidades suficientes em aberto: ${bloqueados.join(', ')}.`
        };
    }

    return { valido: true };
}

async function validarParticipantesMesmoCurso(idsParticipantes) {
    const participantes = [];

    for (const idParticipante of idsParticipantes) {
        const participante = await bd.obter('participantes', idParticipante);
        if (participante) participantes.push(participante);
    }

    const cursos = new Set(participantes.map(participante => participante.id_curso).filter(Boolean));
    if (cursos.size > 1) {
        return {
            valido: false,
            mensagem: 'Não foi possível salvar. Pagamentos em lote precisam ter participantes do mesmo curso.'
        };
    }

    return { valido: true, id_curso: participantes[0]?.id_curso || '' };
}

async function obterValorPagamentoParticipante(idParticipante, tipo, quantidade = 1, valorManual = 0) {
    if (tipo === 'Outros') return Utilidades.normalizarValorMonetario(valorManual);

    const curso = await obterCursoParticipante(idParticipante);
    if (!curso) return 0;

    if (tipo === 'Inscrição') return Utilidades.normalizarValorMonetario(curso.valor_inscricao);
    if (tipo === 'Mensalidade') return Utilidades.normalizarValorMonetario(curso.valor_mensalidade) * (Number(quantidade) || 1);

    return 0;
}

async function validarPagamento(dados, contexto = {}) {
    if (!TIPOS_PAGAMENTO.includes(dados.tipo)) {
        return { valido: false, mensagem: 'Tipo de pagamento inválido.' };
    }

    if (dados.tipo === 'Inscrição') {
        return await validarInscricaoUnica(dados, contexto);
    }

    if (dados.tipo === 'Mensalidade') {
        return await validarLimiteMensalidades(dados, contexto);
    }

    return { valido: true };
}
