const TIPOS_COBRANCA_CURSO = {
    MENSAL: 'Mensal',
    ENCONTRO: 'Por encontro',
    DISCIPLINA: 'Por disciplina',
    GRATUITO: 'Gratuito'
};

const TIPOS_PAGAMENTO = ['Inscrição', 'Mensalidade', 'Encontro', 'Disciplina', 'Outros'];

function compararTextoFinanceiro(a = '', b = '') {
    return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
}

function obterOrdemTipoObrigacao(tipo = '') {
    const ordem = ['Inscrição', 'Mensalidade', 'Disciplina', 'Encontro', 'Outros'];
    const indice = ordem.indexOf(tipo);
    return indice === -1 ? ordem.length : indice;
}

function ordenarObrigacoesFinanceiras(obrigacoes = []) {
    return [...obrigacoes].sort((a, b) => {
        const ordemTipo = obterOrdemTipoObrigacao(a.tipo) - obterOrdemTipoObrigacao(b.tipo);
        if (ordemTipo !== 0) return ordemTipo;

        if (a.tipo === 'Mensalidade') {
            return Number(a.referencia_indice || 0) - Number(b.referencia_indice || 0);
        }

        const ordemDescricao = compararTextoFinanceiro(a.descricao, b.descricao);
        if (ordemDescricao !== 0) return ordemDescricao;

        return Number(a.referencia_indice || 0) - Number(b.referencia_indice || 0);
    });
}

function obterTipoCobrancaCurso(curso = null) {
    const tipo = String(curso?.tipo_cobranca || '').trim();
    return Object.values(TIPOS_COBRANCA_CURSO).includes(tipo) ? tipo : TIPOS_COBRANCA_CURSO.MENSAL;
}

function cursoCobraPorMensalidade(curso = null) {
    return obterTipoCobrancaCurso(curso) === TIPOS_COBRANCA_CURSO.MENSAL;
}

function cursoCobraPorEncontro(curso = null) {
    return obterTipoCobrancaCurso(curso) === TIPOS_COBRANCA_CURSO.ENCONTRO;
}

function cursoCobraPorDisciplina(curso = null) {
    return obterTipoCobrancaCurso(curso) === TIPOS_COBRANCA_CURSO.DISCIPLINA;
}

function cursoEhGratuito(curso = null) {
    return obterTipoCobrancaCurso(curso) === TIPOS_COBRANCA_CURSO.GRATUITO;
}

async function obterParticipantePagamento(idParticipante) {
    return idParticipante ? await bd.obter('participantes', idParticipante) : null;
}

async function obterCursoParticipante(idParticipante) {
    const participante = await obterParticipantePagamento(idParticipante);
    if (!participante?.id_curso) return null;
    return await bd.obter('cursos', participante.id_curso);
}

function obterValorDisciplina(disciplina = null) {
    return Utilidades.normalizarValorMonetario(disciplina?.valor_disciplina || 0);
}

function obterValorEncontroCurso(curso = null) {
    return Utilidades.normalizarValorMonetario(curso?.valor_encontro || 0);
}

function obterQuantidadeEncontrosGratuitos(disciplina = null) {
    const total = Math.max(Number(disciplina?.quantidade_encontros || 1), 1);
    const gratuitos = Math.max(Number(disciplina?.encontros_gratuitos || 0), 0);
    return Math.min(gratuitos, total);
}

function encontroDisciplinaEhGratuito(disciplina = null, indiceEncontro = 1) {
    return Number(indiceEncontro || 0) <= obterQuantidadeEncontrosGratuitos(disciplina);
}

function obterFrequenciasDisciplinaOrdenadas(frequencias = [], idDisciplina = '') {
    return frequencias
        .filter(frequencia => String(frequencia.id_disciplina || '') === String(idDisciplina))
        .sort((a, b) => {
            const comparacaoData = String(a.data || '').localeCompare(String(b.data || ''));
            if (comparacaoData !== 0) return comparacaoData;
            return String(a.id || '').localeCompare(String(b.id || ''));
        });
}

function obterFrequenciaEncontroDisciplina(frequencias = [], idDisciplina = '', indiceEncontro = 1) {
    return obterFrequenciasDisciplinaOrdenadas(frequencias, idDisciplina)[Number(indiceEncontro || 1) - 1] || null;
}

function obterSituacaoEncontroParticipante(idParticipante, disciplina = null, indiceEncontro = 1, frequencias = []) {
    const frequencia = obterFrequenciaEncontroDisciplina(frequencias, disciplina?.id, indiceEncontro);
    if (!frequencia) return 'previsto';

    const presenca = obterPresencaParticipante(frequencia, idParticipante);
    if (!presenca) return 'previsto';
    if (presenca.estado === ESTADOS_FREQUENCIA.FALTOU) return 'faltou';
    return 'compareceu';
}

function normalizarReferenciaIndicePagamento(valor = null) {
    if (valor === null || valor === undefined || String(valor).trim() === '') return '';
    const numero = Number(valor);
    return Number.isFinite(numero) ? String(numero) : String(valor).trim();
}

function obterChaveCobrancaFinanceira(tipo = '', referenciaId = '', referenciaIndice = null) {
    return [
        String(tipo || '').trim(),
        String(referenciaId || '').trim(),
        normalizarReferenciaIndicePagamento(referenciaIndice)
    ].join('||');
}

function obterChavePagamentoFinanceiro(pagamento = {}) {
    return obterChaveCobrancaFinanceira(pagamento.tipo, pagamento.referencia_id, pagamento.referencia_indice);
}

function obterChaveObrigacaoFinanceira(obrigacao = {}) {
    return obterChaveCobrancaFinanceira(obrigacao.tipo, obrigacao.referencia_id, obrigacao.referencia_indice);
}

function pagamentoPertenceAoParticipante(pagamento, idParticipante, contexto = {}) {
    const ignorarPagamentoId = String(contexto.ignorarPagamentoId || '');
    const ignorarLoteId = String(contexto.ignorarLoteId || '');

    return String(pagamento.id_participante) === String(idParticipante)
        && (!ignorarPagamentoId || String(pagamento.id) !== ignorarPagamentoId)
        && (!ignorarLoteId || String(pagamento.id_lote || '') !== ignorarLoteId);
}

function pagamentoQuitaReferencia(pagamento, tipo, referenciaId = '', referenciaIndice = null) {
    return obterChavePagamentoFinanceiro(pagamento) === obterChaveCobrancaFinanceira(tipo, referenciaId, referenciaIndice);
}

function obterPagamentoObrigacao(obrigacao, pagamentos = [], contexto = {}) {
    const chaveObrigacao = obterChaveObrigacaoFinanceira(obrigacao);
    return pagamentos.find(item =>
        pagamentoPertenceAoParticipante(item, obrigacao.id_participante, contexto)
        && obterChavePagamentoFinanceiro(item) === chaveObrigacao
    ) || null;
}

function obterDataPagamentoObrigacao(obrigacao, pagamentos = [], contexto = {}) {
    return obterPagamentoObrigacao(obrigacao, pagamentos, contexto)?.data || '';
}

function montarObrigacaoFinanceira(dados, pagamentos = [], contexto = {}) {
    const dataPagamento = obterDataPagamentoObrigacao(dados, pagamentos, contexto);
    return {
        ...dados,
        pago: Boolean(dataPagamento),
        data_pagamento: dataPagamento
    };
}

function calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas = [], frequencias = [], pagamentos = [], contexto = {}) {
    if (!participante || !curso) return [];

    const obrigacoes = [];
    const idParticipante = participante.id;
    const valorInscricao = Utilidades.normalizarValorMonetario(curso.valor_inscricao || 0);
    const tipoCobranca = obterTipoCobrancaCurso(curso);

    if (valorInscricao > 0) {
        obrigacoes.push(montarObrigacaoFinanceira({
            id: `inscricao-${idParticipante}`,
            id_participante: idParticipante,
            tipo: 'Inscrição',
            referencia_tipo: 'inscricao',
            referencia_id: 'inscricao',
            descricao: 'Inscrição',
            valor: valorInscricao,
            ordem: 0
        }, pagamentos, contexto));
    }

    if (tipoCobranca === TIPOS_COBRANCA_CURSO.MENSAL) {
        const quantidade = Number(curso.quantidade_mensalidades || 0);
        const valor = Utilidades.normalizarValorMonetario(curso.valor_mensalidade || 0);
        for (let indice = 1; indice <= quantidade; indice++) {
            obrigacoes.push(montarObrigacaoFinanceira({
                id: `mensalidade-${idParticipante}-${indice}`,
                id_participante: idParticipante,
                tipo: 'Mensalidade',
                referencia_tipo: 'mensalidade',
                referencia_id: `mensalidade-${indice}`,
                referencia_indice: indice,
                descricao: `Mensalidade ${indice}`,
                valor,
                ordem: indice
            }, pagamentos, contexto));
        }
    }

    if (tipoCobranca === TIPOS_COBRANCA_CURSO.ENCONTRO) {
        const valor = obterValorEncontroCurso(curso);
        let ordem = 1;
        disciplinas
            .filter(disciplina => String(disciplina.id_curso) === String(curso.id))
            .sort((a, b) => compararTextoFinanceiro(a.nome, b.nome))
            .forEach(disciplina => {
                const quantidadeEncontros = Math.max(Number(disciplina.quantidade_encontros || 1), 1);
                for (let indice = 1; indice <= quantidadeEncontros; indice++) {
                    if (encontroDisciplinaEhGratuito(disciplina, indice) || valor <= 0) continue;
                    const situacaoEncontro = obterSituacaoEncontroParticipante(idParticipante, disciplina, indice, frequencias);
                    obrigacoes.push(montarObrigacaoFinanceira({
                        id: `encontro-${idParticipante}-${disciplina.id}-${indice}`,
                        id_participante: idParticipante,
                        tipo: 'Encontro',
                        referencia_tipo: 'encontro',
                        referencia_id: `${disciplina.id}-encontro-${indice}`,
                        referencia_indice: indice,
                        descricao: `${disciplina.nome || 'Disciplina'} — Encontro ${indice}`,
                        valor,
                        ordem,
                        situacao_encontro: situacaoEncontro,
                        cobranca_pendente: situacaoEncontro === 'compareceu'
                    }, pagamentos, contexto));
                    ordem++;
                }
            });
    }

    if (tipoCobranca === TIPOS_COBRANCA_CURSO.DISCIPLINA) {
        disciplinas
            .filter(disciplina => String(disciplina.id_curso) === String(curso.id))
            .sort((a, b) => compararTextoFinanceiro(a.nome, b.nome))
            .forEach((disciplina, indice) => {
                const valor = obterValorDisciplina(disciplina);
                if (valor <= 0) return;
                obrigacoes.push(montarObrigacaoFinanceira({
                    id: `disciplina-${idParticipante}-${disciplina.id}`,
                    id_participante: idParticipante,
                    tipo: 'Disciplina',
                    referencia_tipo: 'disciplina',
                    referencia_id: disciplina.id,
                    descricao: disciplina.nome || 'Disciplina',
                    valor,
                    ordem: indice + 1
                }, pagamentos, contexto));
            });
    }

    return ordenarObrigacoesFinanceiras(obrigacoes);
}

function obrigacaoContaAReceber(obrigacao = {}) {
    if (obrigacao.pago) return false;
    if (obrigacao.tipo === 'Encontro') return obrigacao.situacao_encontro !== 'faltou';
    return obrigacao.cobranca_pendente !== false;
}

function obrigacaoEstaAtrasada(obrigacao = {}) {
    if (!obrigacaoContaAReceber(obrigacao)) return false;
    if (obrigacao.tipo === 'Encontro') return obrigacao.situacao_encontro === 'compareceu';
    return true;
}

function calcularResumoObrigacoes(obrigacoes = []) {
    return obrigacoes.reduce((resumo, obrigacao) => {
        const valor = Utilidades.normalizarValorMonetario(obrigacao.valor);
        resumo.total += valor;
        if (obrigacao.pago) {
            resumo.pago += valor;
        } else if (obrigacaoContaAReceber(obrigacao)) {
            resumo.aPagar += valor;
            resumo.obrigacoesAPagar++;
            if (obrigacaoEstaAtrasada(obrigacao)) {
                resumo.atrasado += valor;
                resumo.atrasos++;
            } else {
                resumo.pendente += valor;
                resumo.pendentes++;
            }
        }
        return resumo;
    }, { total: 0, pago: 0, aPagar: 0, obrigacoesAPagar: 0, atrasado: 0, atrasos: 0, pendente: 0, pendentes: 0 });
}

function ajustarResumoObrigacoesPorStatusParticipante(participante, resumo = {}) {
    if (Utilidades.participanteEstaAtivo(participante)) return resumo;

    return {
        ...resumo,
        aPagar: 0,
        obrigacoesAPagar: 0,
        pendente: 0,
        pendentes: 0,
        atrasado: resumo.aPagar,
        atrasos: resumo.obrigacoesAPagar
    };
}

function obrigacaoPodeSerPaga(obrigacao = {}) {
    return obrigacaoContaAReceber(obrigacao);
}

function obterObrigacoesAbertasParticipante(participante, curso, disciplinas = [], frequencias = [], pagamentos = [], contexto = {}) {
    return calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos, contexto)
        .filter(obrigacaoPodeSerPaga);
}

async function obterContextoObrigacoesParticipante(idParticipante, contexto = {}) {
    const participante = await obterParticipantePagamento(idParticipante);
    const curso = participante?.id_curso ? await bd.obter('cursos', participante.id_curso) : null;
    const [disciplinas, frequencias, pagamentos] = await Promise.all([
        bd.obterTodos('disciplinas'),
        bd.obterTodos('frequencias'),
        bd.obterTodos('pagamentos')
    ]);

    return {
        participante,
        curso,
        disciplinas: disciplinas.filter(disciplina => String(disciplina.id_curso) === String(curso?.id || '')),
        frequencias: frequencias.filter(frequencia => String(frequencia.id_curso || '') === String(curso?.id || '')),
        pagamentos,
        contexto
    };
}

async function obterObrigacoesAbertasPagamento(idParticipante, contexto = {}) {
    const dados = await obterContextoObrigacoesParticipante(idParticipante, contexto);
    if (!dados.participante || !dados.curso) return [];
    return obterObrigacoesAbertasParticipante(dados.participante, dados.curso, dados.disciplinas, dados.frequencias, dados.pagamentos, contexto);
}

async function validarPagamento(dados, contexto = {}) {
    if (!TIPOS_PAGAMENTO.includes(dados.tipo)) {
        return { valido: false, mensagem: 'Tipo de pagamento inválido.' };
    }

    if (dados.tipo === 'Outros') return { valido: true };

    if (!dados.id_participante) {
        return { valido: false, mensagem: 'Selecione o participante.' };
    }

    const { participante, curso, disciplinas, frequencias, pagamentos } = await obterContextoObrigacoesParticipante(dados.id_participante, contexto);
    if (!participante || !curso) {
        return { valido: false, mensagem: 'Participante ou curso não encontrado.' };
    }

    const chavePagamento = obterChavePagamentoFinanceiro(dados);
    const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos, contexto);
    const obrigacao = obrigacoes.find(item => obterChaveObrigacaoFinanceira(item) === chavePagamento);

    if (!obrigacao) {
        return { valido: false, mensagem: 'Esta cobrança não existe para o participante.' };
    }

    const pagamentoExistente = obterPagamentoObrigacao(obrigacao, pagamentos, contexto);
    if (pagamentoExistente) {
        return { valido: false, mensagem: 'Esta cobrança já foi paga para o participante.' };
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

async function obterValorPagamentoParticipante(idParticipante, tipo, quantidade = 1, valorManual = 0, referencia = {}) {
    if (tipo === 'Outros') return Utilidades.normalizarValorMonetario(valorManual);

    const abertas = await obterObrigacoesAbertasPagamento(idParticipante, {
        ignorarPagamentoId: AppEstado.registroEmEdicao,
        ignorarLoteId: AppEstado.registroEmEdicao
    });

    const obrigacao = abertas.find(item =>
        item.tipo === tipo
        && (!referencia.referencia_id || String(item.referencia_id || '') === String(referencia.referencia_id || ''))
        && (!referencia.referencia_indice || Number(item.referencia_indice || 0) === Number(referencia.referencia_indice || 0))
    );

    return obrigacao ? Utilidades.normalizarValorMonetario(obrigacao.valor) : 0;
}
