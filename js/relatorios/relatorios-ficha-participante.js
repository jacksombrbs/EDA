async function renderizarSecaoFichaParticipante(contexto) {
    const participantes = [...(contexto?.participantes || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (participantes.length === 0) {
        return `
            <section>
                <div class="cartao-suave">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Ficha Individual do Participante</h3>
                    <p class="texto-md cor-texto-claro m-zero">Cadastre participantes neste curso para consultar fichas individuais.</p>
                </div>
            </section>
        `;
    }

    const idSelecionado = participantes.some(participante => String(participante.id) === String(AppEstado.participanteAtual))
        ? AppEstado.participanteAtual
        : participantes[0].id;
    AppEstado.participanteAtual = idSelecionado;

    const dadosFicha = await montarDadosFichaParticipante(idSelecionado, contexto);
    const participanteSelecionado = participantes.find(participante => String(participante.id) === String(idSelecionado));

    setTimeout(() => vincularEventosFichaParticipante(participantes, contexto?.paroquias || []), 0);

    return `
        <section>
            <div class="flex flex-coluna gap-md">
                <div class="flex itens-centro justifica-espaco gap-md md-flex-coluna md-itens-esquerda">
                    <div class="flex-1">
                        <h3 class="texto-md peso-bold cor-texto-primario m-zero">Ficha Individual do Participante</h3>
                    </div>
                    <div class="flex-2">
                        <div class="campo-busca-wrapper pos-relativa">
                            <input type="text" id="busca-ficha-participante" class="campo-padrao campo-busca" value="${Utilidades.escaparHtml(participanteSelecionado?.nome || '')}" placeholder="Buscar por nome, código ou paróquia..." aria-label="Buscar participante" autocomplete="off">
                            <button type="button" id="busca-ficha-participante-limpar" class="botao-limpar-busca" aria-label="Limpar busca" title="Limpar busca" onclick="limparBuscaFichaParticipante()">
                                ${criarIcone('cancelar')}
                            </button>
                            <input type="hidden" id="ficha-participante-id" value="${Utilidades.escaparHtml(idSelecionado)}">
                            <div id="resultados-busca-ficha" class="opcoes-seletor-customizado seletor-opcoes pos-absoluta borda-1 borda-solida borda-cor-padrao raio-sm rolagem-y z-maximo w-total oculto"></div>
                        </div>
                    </div>
                    <div class="flex gap-sm md-w-total md-flex-coluna">
                        ${criarBotao('Imprimir Ficha', 'gerarPDFFichaParticipante()', 'contorno', 'md-w-total')}
                        ${criarBotao('Imprimir Todas', 'gerarPDFFichasTodosParticipantes()', 'contorno', 'md-w-total')}
                    </div>
                </div>

                <div id="visualizacao-ficha-participante" class="flex flex-coluna gap-sm">
                    ${dadosFicha ? montarHtmlConsultaFichaParticipante(dadosFicha) : criarMensagemVazia('Não foi possível carregar a ficha do participante.')}
                </div>
            </div>
        </section>
    `;
}

function limparBuscaFichaParticipante() {
    const campoBusca = document.getElementById('busca-ficha-participante');
    const campoId = document.getElementById('ficha-participante-id');
    const resultados = document.getElementById('resultados-busca-ficha');

    if (campoBusca) {
        campoBusca.value = '';
        campoBusca.dispatchEvent(new Event('input', { bubbles: true }));
        campoBusca.focus();
    }
    if (campoId) campoId.value = '';
    resultados?.classList.add('oculto');
    atualizarBotaoLimparBuscaFicha();
}

function atualizarBotaoLimparBuscaFicha() {
    const campoBusca = document.getElementById('busca-ficha-participante');
    const botaoLimpar = document.getElementById('busca-ficha-participante-limpar');
    if (!campoBusca || !botaoLimpar) return;

    botaoLimpar.classList.toggle('oculto', !campoBusca.value);
}

function vincularEventosFichaParticipante(participantes = [], paroquias = []) {
    const campoBusca = document.getElementById('busca-ficha-participante');
    const campoId = document.getElementById('ficha-participante-id');
    const resultados = document.getElementById('resultados-busca-ficha');

    if (!campoBusca || !campoId || !resultados || campoBusca.dataset.fichaVinculada === 'sim') return;

    campoBusca.dataset.fichaVinculada = 'sim';

    const atualizarResultados = () => {
        const encontrados = filtrarParticipantesBuscaFicha(participantes, paroquias, campoBusca.value).slice(0, 8);
        resultados.innerHTML = montarHtmlResultadosBuscaFicha(encontrados, paroquias);
        resultados.classList.toggle('oculto', encontrados.length === 0);
        atualizarBotaoLimparBuscaFicha();
    };

    campoBusca.addEventListener('input', () => {
        campoId.value = '';
        atualizarResultados();
    });

    campoBusca.addEventListener('focus', atualizarResultados);

    campoBusca.addEventListener('blur', () => {
        setTimeout(() => resultados.classList.add('oculto'), 160);
    });

    campoBusca.addEventListener('keydown', evento => {
        if (evento.key !== 'Enter') return;

        const primeiroResultado = resultados.querySelector('[data-id-participante]');
        if (!primeiroResultado) return;

        evento.preventDefault();
        selecionarParticipanteFicha(primeiroResultado.dataset.idParticipante, primeiroResultado.dataset.nomeParticipante);
    });

    resultados.addEventListener('click', evento => {
        const botao = evento.target.closest('[data-id-participante]');
        if (!botao) return;

        selecionarParticipanteFicha(botao.dataset.idParticipante, botao.dataset.nomeParticipante);
    });

}

async function atualizarFichaParticipanteRelatorio(idParticipante = '') {
    const idSelecionado = idParticipante || document.getElementById('ficha-participante-id')?.value || '';
    const recipiente = document.getElementById('visualizacao-ficha-participante');

    if (!idSelecionado || !recipiente) return;

    AppEstado.participanteAtual = idSelecionado;
    recipiente.innerHTML = '<p class="p-md texto-centro cor-texto-claro">Carregando ficha...</p>';

    const contexto = await carregarContextoRelatorios();
    const dadosFicha = await montarDadosFichaParticipante(idSelecionado, contexto);
    recipiente.innerHTML = dadosFicha
        ? montarHtmlConsultaFichaParticipante(dadosFicha)
        : criarMensagemVazia('Não foi possível carregar a ficha do participante.');
}

function filtrarParticipantesBuscaFicha(participantes = [], paroquias = [], termo = '') {
    const termoNormalizado = normalizarTextoBuscaFicha(termo);
    const mapaParoquias = criarMapaParoquiasBuscaFicha(paroquias);

    if (!termoNormalizado) return participantes;

    return participantes.filter(participante => {
        const textoBusca = [
            participante.nome,
            participante.codigo_acesso,
            mapaParoquias[String(participante.id_paroquia)] || '',
            participante.capela,
            participante.status || 'Ativo'
        ].join(' ');

        return normalizarTextoBuscaFicha(textoBusca).includes(termoNormalizado);
    });
}

function montarHtmlResultadosBuscaFicha(participantes = [], paroquias = []) {
    const mapaParoquias = criarMapaParoquiasBuscaFicha(paroquias);

    return participantes.map(participante => {
        const paroquia = mapaParoquias[String(participante.id_paroquia)] || 'Paróquia não informada';

        return `
            <div role="button" tabindex="0" class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador" data-id-participante="${Utilidades.escaparHtml(participante.id)}" data-nome-participante="${Utilidades.escaparHtml(participante.nome || '')}">
                <strong class="block">${Utilidades.escaparHtml(participante.nome || '-')}</strong>
                <span class="texto-sm cor-texto-claro">${Utilidades.escaparHtml(paroquia)} · Código ${Utilidades.escaparHtml(participante.codigo_acesso || '-')} · ${Utilidades.escaparHtml(participante.status || 'Ativo')}</span>
            </div>
        `;
    }).join('');
}

async function selecionarParticipanteFicha(idParticipante, nomeParticipante = '') {
    const campoBusca = document.getElementById('busca-ficha-participante');
    const campoId = document.getElementById('ficha-participante-id');
    const resultados = document.getElementById('resultados-busca-ficha');

    if (campoBusca) campoBusca.value = nomeParticipante || '';
    if (campoId) campoId.value = idParticipante || '';
    resultados?.classList.add('oculto');
    atualizarBotaoLimparBuscaFicha();

    await atualizarFichaParticipanteRelatorio(idParticipante);
}

function criarMapaParoquiasBuscaFicha(paroquias = []) {
    return paroquias.reduce((mapa, paroquia) => {
        mapa[String(paroquia.id)] = paroquia.nome || '';
        return mapa;
    }, {});
}

function normalizarTextoBuscaFicha(valor = '') {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

async function abrirFichaParticipante(idParticipante) {
    await gerarPDFFichaParticipante(idParticipante);
}

async function gerarPDFFichaParticipante(idParticipante = '') {
    const campoBusca = document.getElementById('busca-ficha-participante');
    const campoId = document.getElementById('ficha-participante-id');
    const idSelecionado = idParticipante || campoId?.value || '';

    if (!idSelecionado) {
        Utilidades.notificacao(campoBusca?.value ? 'Escolha um participante na lista de resultados.' : 'Busque um participante para imprimir a ficha.', 'aviso');
        return;
    }

    const dadosFicha = await montarDadosFichaParticipante(idSelecionado);
    if (!dadosFicha) return;

    dispararImpressao(
        `Ficha Individual - ${dadosFicha.participante.nome || 'Participante'}`,
        montarHtmlFichaParticipante(dadosFicha),
        { incluirCabecalho: false, estilosExtras: criarEstilosFichaParticipante() }
    );
}

async function gerarPDFFichasTodosParticipantes() {
    const contexto = await carregarContextoRelatorios();
    const participantes = [...(contexto.participantes || [])].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

    if (participantes.length === 0) {
        Utilidades.notificacao('Não há participantes para imprimir fichas.', 'aviso');
        return;
    }

    const fichas = [];
    for (const participante of participantes) {
        const dadosFicha = await montarDadosFichaParticipante(participante.id, contexto);
        if (dadosFicha) fichas.push(dadosFicha);
    }

    if (fichas.length === 0) {
        Utilidades.notificacao('Não foi possível montar as fichas dos participantes.', 'erro');
        return;
    }

    dispararImpressao(
        'Fichas Individuais dos Participantes',
        montarHtmlFichasTodosParticipantes(fichas),
        { incluirCabecalho: false, estilosExtras: criarEstilosFichaParticipante() }
    );
}

async function montarDadosFichaParticipante(idParticipante, contexto = null) {
    const dados = contexto || await carregarContextoFichaParticipante();
    const participante = (dados.participantes || []).find(item => String(item.id) === String(idParticipante))
        || await bd.obter('participantes', idParticipante);

    if (!participante) {
        Utilidades.notificacao('Participante não encontrado.', 'erro');
        return null;
    }

    const curso = (dados.cursos || []).find(item => String(item.id) === String(participante.id_curso)) || null;
    const paroquia = (dados.paroquias || []).find(item => String(item.id) === String(participante.id_paroquia)) || null;
    const disciplinasCurso = (dados.disciplinas || []).filter(item => String(item.id_curso) === String(participante.id_curso));
    const pagamentos = obterPagamentosFichaParticipante(participante, dados.pagamentos || [], dados.pagamentos_lote || []);
    const frequencias = filtrarFrequenciasFichaParticipante(participante, dados.frequencias || [], disciplinasCurso);
    const atividades = listarAtividadesEntreguesPorParticipante(participante.id, dados.atividades || []);

    return {
        participante,
        curso,
        paroquia,
        disciplinas: disciplinasCurso,
        financeiro: calcularResumoFinanceiroParticipante(participante, curso, disciplinasCurso, frequencias, pagamentos),
        frequencia: calcularResumoFrequenciaParticipante(participante, frequencias, curso),
        atividades: calcularResumoAtividadesParticipante(participante, atividades, disciplinasCurso),
        dataGeracao: new Date().toISOString().split('T')[0]
    };
}

async function carregarContextoFichaParticipante() {
    const [cursos, paroquias, disciplinas, participantes, frequencias, atividades, pagamentos, pagamentos_lote] = await Promise.all([
        bd.obterTodos('cursos'),
        bd.obterTodos('paroquias'),
        bd.obterTodos('disciplinas'),
        bd.obterTodos('participantes'),
        bd.obterTodos('frequencias'),
        bd.obterTodos('atividades'),
        bd.obterTodos('pagamentos'),
        bd.obterTodos('pagamentos_lote')
    ]);

    return { cursos, paroquias, disciplinas, participantes, frequencias, atividades, pagamentos, pagamentos_lote };
}

function obterPagamentosFichaParticipante(participante, pagamentos = [], lotes = []) {
    const pagamentosParticipante = pagamentos.filter(pagamento => String(pagamento.id_participante) === String(participante.id));
    const idsLotesRegistrados = new Set(pagamentosParticipante.map(pagamento => String(pagamento.id_lote || '')).filter(Boolean));
    const pagamentosDerivados = lotes
        .filter(lote =>
            Array.isArray(lote.ids_participantes)
            && lote.ids_participantes.map(String).includes(String(participante.id))
            && !idsLotesRegistrados.has(String(lote.id))
        )
        .map(lote => ({
            id: `lote-${lote.id}-${participante.id}`,
            id_participante: participante.id,
            tipo: lote.tipo,
            quantidade: lote.quantidade,
            descricao: lote.descricao || lote.tipo,
            valor: lote.valor_unitario || (Number(lote.valor_total || 0) / Math.max((lote.ids_participantes || []).length, 1)),
            data: lote.data,
            id_lote: lote.id
        }));

    return [...pagamentosParticipante, ...pagamentosDerivados];
}

function filtrarFrequenciasFichaParticipante(participante, frequencias = [], disciplinas = []) {
    const idsDisciplinas = new Set(disciplinas.map(disciplina => String(disciplina.id)));

    return frequencias.filter(frequencia => {
        const pertenceAoCurso = String(frequencia.id_curso || '') === String(participante.id_curso || '');
        const pertenceADisciplina = idsDisciplinas.has(String(frequencia.id_disciplina || ''));
        return pertenceAoCurso || pertenceADisciplina;
    });
}

function calcularResumoFinanceiroParticipante(participante, curso, disciplinas = [], frequencias = [], pagamentos = []) {
    const obrigacoes = calcularObrigacoesFinanceirasParticipante(participante, curso, disciplinas, frequencias, pagamentos);
    const resumo = calcularResumoObrigacoes(obrigacoes);
    const inscricao = obrigacoes.find(item => item.tipo === 'Inscrição');
    const pagamentosOutros = pagamentos.filter(pagamento => pagamento.tipo === 'Outros');
    const totalOutros = pagamentosOutros.reduce((total, pagamento) => total + Utilidades.normalizarValorMonetario(pagamento.valor), 0);
    const pagos = obrigacoes.filter(item => item.pago).length;

    return {
        inscricaoPaga: Boolean(inscricao?.pago),
        inscricaoTexto: inscricao ? (inscricao.pago ? 'Paga' : 'Pendente') : 'Não cobrada',
        valorInscricao: inscricao?.valor || 0,
        dataInscricao: inscricao?.data_pagamento || '',
        tipoCobranca: obterTipoCobrancaCurso(curso),
        obrigacoes,
        obrigacoesPagas: pagos,
        obrigacoesTotal: obrigacoes.length,
        obrigacoesPendentes: resumo.obrigacoesAPagar,
        obrigacoesAtrasadas: resumo.atrasos,
        valorPendente: resumo.aPagar,
        valorAtrasado: resumo.atrasado,
        totalObrigacoes: resumo.total,
        totalPagoObrigacoes: resumo.pago,
        outrasEntradas: pagamentosOutros,
        totalOutros,
        totalGeral: resumo.pago + totalOutros
    };
}

function calcularResumoFrequenciaParticipante(participante, frequencias = [], curso = null) {
    let total = 0;
    let comparecimentos = 0;
    let faltas = 0;
    let horasPrevistas = 0;
    let horasPresentes = 0;

    frequencias.forEach(frequencia => {
        const presenca = obterPresencaParticipante(frequencia, participante.id);
        if (presenca === null) return;

        total++;
        horasPrevistas += obterCargaHorariaFrequencia(frequencia);
        horasPresentes += presenca.horas;
        if (presencaContaComoComparecimento(presenca)) comparecimentos++;
        if (presenca.estado === ESTADOS_FREQUENCIA.FALTOU) faltas++;
    });

    const percentual = horasPrevistas > 0 ? Math.round((horasPresentes / horasPrevistas) * 100) : null;

    return {
        total,
        comparecimentos,
        presencas: comparecimentos,
        faltas,
        horasPrevistas,
        horasPresentes,
        percentual,
        percentualTexto: percentual === null ? 'Sem registros' : `${percentual}%`,
        situacao: percentual === null ? 'Sem registros' : (percentual >= obterPercentualMinimoCurso(curso) ? 'Regular' : 'Atenção')
    };
}

function calcularResumoAtividadesParticipante(participante, atividades = [], disciplinas = []) {
    const totalEntregues = atividades.length;
    const lista = [...atividades]
        .sort((a, b) => (b.data_entrega || '').localeCompare(a.data_entrega || ''))
        .map(atividade => {
            const disciplina = disciplinas.find(item => String(item.id) === String(atividade.id_disciplina));
            return {
                disciplina: disciplina?.nome || 'Disciplina não informada',
                data_entrega: atividade.data_entrega || '',
                estado: atividade.estado || 'Entregue',
                observacoes: atividade.observacoes || ''
            };
        });

    return {
        total: totalEntregues,
        lista
    };
}

function montarHtmlConsultaFichaParticipante(dadosFicha) {
    const { participante, curso, paroquia, financeiro, frequencia, atividades } = dadosFicha;

    return `
        <div class="flex itens-centro justifica-espaco gap-md md-flex-coluna md-itens-esquerda">
            <div>
                <span class="texto-sm cor-texto-claro">Participante</span>
                <h3 class="texto-xl peso-bold cor-texto-escuro m-zero">${Utilidades.escaparHtml(participante.nome || '-')}</h3>
            </div>
            <div class="texto-md cor-texto-claro">Código: <strong class="cor-texto-escuro">${Utilidades.escaparHtml(participante.codigo_acesso || '-')}</strong></div>
        </div>

        <div class="grade-metricas-painel grade-4-colunas">
            ${criarCardMetrica('Inscrição', financeiro.inscricaoTexto, financeiro.inscricaoPaga ? 'sucesso' : 'aviso')}
            ${criarCardMetrica('A pagar', Utilidades.formatarMoeda(financeiro.valorPendente), financeiro.valorAtrasado > 0 ? 'erro' : (financeiro.valorPendente > 0 ? 'aviso' : 'sucesso'))}
            ${criarCardMetrica('Frequência', frequencia.percentualTexto, frequencia.situacao === 'Atenção' ? 'aviso' : 'sucesso')}
            ${criarCardMetrica('Atividades', atividades.total, 'primario')}
        </div>

        <div class="grade-metricas-painel grade-2-colunas">
            ${montarCartaoConsultaFicha('Identificação', [
                ['Status', participante.status || '-'],
                ['Curso', curso?.nome || '-'],
                ['Paróquia', paroquia?.nome || '-'],
                ['Capela', participante.capela || '-'],
                ['Setor', paroquia?.setor || '-']
            ])}
            ${montarCartaoConsultaFicha('Financeiro', [
                ['Inscrição', financeiro.inscricaoTexto],
                ['Valor da inscrição', Utilidades.formatarMoeda(financeiro.valorInscricao)],
                ['Cobranças a pagar', financeiro.obrigacoesPendentes],
                ['Total pago', Utilidades.formatarMoeda(financeiro.totalGeral)],
                ['Valor a pagar', Utilidades.formatarMoeda(financeiro.valorPendente)],
                ['Valor em atraso', Utilidades.formatarMoeda(financeiro.valorAtrasado)]
            ])}
            ${montarCartaoConsultaFicha('Frequência', [
                ['Aulas registradas', frequencia.total],
                ['Horas presentes', `${frequencia.horasPresentes}/${frequencia.horasPrevistas}h`],
                ['Aulas com presença', frequencia.comparecimentos],
                ['Faltas', frequencia.faltas],
                ['Situação', frequencia.situacao]
            ])}
            <div class="cartao-suave flex flex-coluna gap-sm">
                <h4 class="texto-lg peso-bold cor-texto-primario m-zero">Atividades</h4>
                ${montarListaAtividadesConsultaFicha(atividades.lista)}
            </div>
        </div>
    `;
}

function montarCartaoConsultaFicha(titulo, linhas = []) {
    return `
        <div class="cartao-suave flex flex-coluna gap-sm">
            <h4 class="texto-lg peso-bold cor-texto-primario m-zero">${Utilidades.escaparHtml(titulo)}</h4>
            <div class="flex flex-coluna gap-xs">
                ${linhas.map(([rotulo, valor]) => `
                    <div class="flex itens-centro justifica-espaco gap-sm">
                        <span class="texto-sm cor-texto-claro">${Utilidades.escaparHtml(rotulo)}</span>
                        <strong class="texto-md cor-texto-escuro texto-direita">${Utilidades.escaparHtml(valor)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function montarListaAtividadesConsultaFicha(atividades = []) {
    if (atividades.length === 0) return '<p class="cor-texto-claro m-zero">Nenhuma atividade registrada.</p>';

    return `
        <div class="flex flex-coluna gap-xs">
            ${atividades.map(atividade => `
                <div class="p-sm raio-sm fundo-superficie-2">
                    <strong class="block cor-texto-escuro">${Utilidades.escaparHtml(atividade.disciplina)}</strong>
                    <span class="block texto-sm cor-texto-claro">${atividade.data_entrega ? Utilidades.formatarData(atividade.data_entrega) : '-'} · ${Utilidades.escaparHtml(atividade.estado || 'Entregue')}</span>
                    ${atividade.observacoes ? `<small class="block texto-sm cor-texto-claro">${Utilidades.escaparHtml(atividade.observacoes)}</small>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function montarHtmlFichaParticipante(dadosFicha) {
    const { participante, curso, paroquia, financeiro, frequencia, atividades } = dadosFicha;
    const atividadesPdf = atividades.lista.slice(0, 5);
    const atividadesRestantes = Math.max(atividades.lista.length - atividadesPdf.length, 0);

    return `
        <section class="ficha-participante-pdf">
            ${criarCabecalhoDocumento()}
            <div class="topo-ficha-pdf">
                <div>
                    <h1>FICHA INDIVIDUAL DO PARTICIPANTE</h1>
                    <p><strong>Gerada em:</strong> ${Utilidades.formatarData(dadosFicha.dataGeracao)}</p>
                </div>
                <div class="codigo-ficha-pdf">Código: <strong>${Utilidades.escaparHtml(participante.codigo_acesso || '-')}</strong></div>
            </div>

            <div class="nome-ficha-pdf">
                <span>Participante</span>
                <strong>${Utilidades.escaparHtml(participante.nome || '-')}</strong>
            </div>

            <div class="grade-resumo-ficha-pdf">
                ${criarItemFichaPDF('Inscrição', financeiro.inscricaoTexto)}
                ${criarItemFichaPDF('Cobranças', `${financeiro.obrigacoesPagas}/${financeiro.obrigacoesTotal}`)}
                ${criarItemFichaPDF('Frequência', frequencia.percentualTexto)}
                ${criarItemFichaPDF('Atividades', atividades.total)}
            </div>

            <div class="corpo-ficha-pdf">
                ${montarBlocoFichaPDF('Identificação', [
                    ['Status', participante.status || '-'],
                    ['Curso', curso?.nome || '-'],
                    ['Paróquia', paroquia?.nome || '-'],
                    ['Capela', participante.capela || '-'],
                    ['Setor', paroquia?.setor || '-']
                ])}

                ${montarBlocoFichaPDF('Inscrição e pagamentos', [
                    ['Inscrição', financeiro.inscricaoTexto],
                    ['Valor da inscrição', Utilidades.formatarMoeda(financeiro.valorInscricao)],
                    ['Cobranças a pagar', financeiro.obrigacoesPendentes],
                    ['Cobranças em atraso', financeiro.obrigacoesAtrasadas],
                    ['Total em cobranças', Utilidades.formatarMoeda(financeiro.totalObrigacoes)],
                    ['Outras entradas', Utilidades.formatarMoeda(financeiro.totalOutros)],
                    ['Total pago', Utilidades.formatarMoeda(financeiro.totalGeral)],
                    ['Valor a pagar', Utilidades.formatarMoeda(financeiro.valorPendente)],
                    ['Valor em atraso', Utilidades.formatarMoeda(financeiro.valorAtrasado)]
                ])}

                ${montarBlocoFichaPDF('Frequência', [
                    ['Aulas registradas', frequencia.total],
                    ['Horas presentes', `${frequencia.horasPresentes}/${frequencia.horasPrevistas}h`],
                    ['Aulas com presença', frequencia.comparecimentos],
                    ['Faltas', frequencia.faltas],
                    ['Percentual', frequencia.percentualTexto],
                    ['Situação', frequencia.situacao]
                ])}

                <section class="bloco-ficha-pdf bloco-atividades-ficha">
                    <h2>Atividades</h2>
                    ${montarLinhasAtividadesFichaPDF(atividadesPdf)}
                    ${atividadesRestantes > 0 ? `<p class="observacao-ficha-pdf">Mais ${atividadesRestantes} atividade(s) registrada(s) no sistema.</p>` : ''}
                </section>
            </div>

            <div class="resumo-final-ficha">
                <p><strong>Resumo:</strong> inscrição ${financeiro.inscricaoTexto.toLowerCase()}; cobranças ${financeiro.obrigacoesPagas} pagas e ${financeiro.obrigacoesPendentes} a pagar; total pago ${Utilidades.formatarMoeda(financeiro.totalGeral)}; valor a pagar ${Utilidades.formatarMoeda(financeiro.valorPendente)}; valor em atraso ${Utilidades.formatarMoeda(financeiro.valorAtrasado)}; frequência ${frequencia.percentualTexto} (${frequencia.situacao}); ${atividades.total} atividade(s) registrada(s).</p>
            </div>
        </section>
    `;
}

function montarHtmlFichasTodosParticipantes(listaFichas) {
    return listaFichas.map(dadosFicha => montarHtmlFichaParticipante(dadosFicha)).join('');
}

function criarItemFichaPDF(rotulo, valor) {
    return `
        <div class="item-ficha-pdf">
            <span>${Utilidades.escaparHtml(rotulo)}</span>
            <strong>${Utilidades.escaparHtml(valor)}</strong>
        </div>
    `;
}

function montarBlocoFichaPDF(titulo, linhas = []) {
    return `
        <section class="bloco-ficha-pdf">
            <h2>${Utilidades.escaparHtml(titulo)}</h2>
            <div class="linhas-ficha-pdf">
                ${linhas.map(([rotulo, valor]) => `
                    <div class="linha-ficha-pdf">
                        <span>${Utilidades.escaparHtml(rotulo)}</span>
                        <strong>${Utilidades.escaparHtml(valor)}</strong>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function montarLinhasAtividadesFichaPDF(atividades = []) {
    if (atividades.length === 0) {
        return '<p class="observacao-ficha-pdf">Nenhuma atividade registrada.</p>';
    }

    return atividades.map(atividade => `
        <div class="atividade-ficha-pdf">
            <strong>${Utilidades.escaparHtml(atividade.disciplina)}</strong>
            <span>${atividade.data_entrega ? Utilidades.formatarData(atividade.data_entrega) : '-'} · ${Utilidades.escaparHtml(atividade.estado || 'Entregue')}</span>
            ${atividade.observacoes ? `<small>${Utilidades.escaparHtml(atividade.observacoes)}</small>` : ''}
        </div>
    `).join('');
}

function criarEstilosFichaParticipante() {
    return `
        @page { size: A4 portrait; margin: 9mm; }
        body { margin: 0; font-size: 11px; }
        .ficha-participante-pdf { width: 100%; max-width: 190mm; min-height: 279mm; margin: 0 auto; display: flex; flex-direction: column; gap: 7px; page-break-after: always; }
        .cabecalho-documento { margin-bottom: 2px; padding-bottom: 6px; border-bottom-width: 2px; }
        .logo-documento { width: 42px; margin-bottom: 3px; }
        .marca-documento { font-size: 13px; }
        .submarca-documento { font-size: 9px; margin-top: 2px; }
        .ficha-participante-pdf:last-child { page-break-after: auto; }
        .topo-ficha-pdf { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .topo-ficha-pdf h1 { margin: 0 0 3px; font-size: 15px; text-align: left; }
        .topo-ficha-pdf p { margin: 0; font-size: 10px; }
        .codigo-ficha-pdf { padding: 7px 10px; border: 1px solid var(--cor-documento-borda); border-radius: 6px; background: var(--cor-documento-fundo); font-size: 11px; white-space: nowrap; }
        .nome-ficha-pdf { padding: 10px 12px; border-left: 5px solid var(--cor-documento-vinho); background: var(--cor-documento-fundo); color: var(--cor-documento-vinho); }
        .nome-ficha-pdf span { display: block; margin-bottom: 2px; color: var(--cor-documento-claro); font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .nome-ficha-pdf strong { display: block; font-size: 19px; line-height: 1.1; }
        .grade-resumo-ficha-pdf { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
        .item-ficha-pdf { padding: 8px; border: 1px solid var(--cor-documento-borda); border-radius: 6px; background: var(--cor-documento-fundo); }
        .item-ficha-pdf span { display: block; margin-bottom: 3px; color: var(--cor-documento-claro); font-size: 8px; text-transform: uppercase; }
        .item-ficha-pdf strong { color: var(--cor-documento-texto); font-size: 14px; }
        .corpo-ficha-pdf { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(48mm, auto); gap: 7px; }
        .bloco-ficha-pdf { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--cor-documento-borda); border-radius: 7px; background: #ffffff; }
        .bloco-ficha-pdf h2 { margin: 0; padding-bottom: 5px; border-bottom: 1px solid var(--cor-documento-borda); color: var(--cor-documento-vinho); font-size: 12px; text-align: left; }
        .linhas-ficha-pdf { display: flex; flex-direction: column; gap: 4px; }
        .linha-ficha-pdf { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px solid color-mix(in srgb, var(--cor-documento-borda) 65%, transparent); }
        .linha-ficha-pdf span { color: var(--cor-documento-claro); font-size: 9px; }
        .linha-ficha-pdf strong { color: var(--cor-documento-texto); font-size: 10px; text-align: right; }
        .bloco-atividades-ficha { grid-column: 1 / -1; min-height: 54mm; }
        .atividade-ficha-pdf { display: grid; grid-template-columns: 36mm 1fr; gap: 4px 8px; padding: 5px 0; border-bottom: 1px solid var(--cor-documento-borda); }
        .atividade-ficha-pdf strong { color: var(--cor-documento-azul); font-size: 10px; }
        .atividade-ficha-pdf span, .atividade-ficha-pdf small, .observacao-ficha-pdf { color: var(--cor-documento-claro); font-size: 9px; }
        .atividade-ficha-pdf small { grid-column: 2; }
        .resumo-final-ficha { padding: 9px 10px; border-left: 4px solid var(--cor-documento-vinho); background: var(--cor-documento-fundo); }
        .resumo-final-ficha p { margin: 0; font-size: 10px; line-height: 1.45; }
        @media print {
            .ficha-participante-pdf { page-break-after: always; }
            .ficha-participante-pdf:last-child { page-break-after: auto; }
        }
    `;
}
