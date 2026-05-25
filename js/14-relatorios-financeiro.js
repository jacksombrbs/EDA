function renderizarControlesFinanceiro(curso, participantes = [], pagamentos = []) {
    return '';
}

function renderizarDashboardFinanceiro(participantes, pagamentos, despesas, cursos) {
    let dash = '';
    const dataHoje = new Date().toISOString().split('T')[0];
    const dataInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const stats = calcularEstatisticasFinanceiras(participantes, pagamentos, despesas);
    const statusPagamentos = agruparPagamentosPorStatus(participantes, pagamentos, cursos);
    const cursoDoPainel = cursos.find(curso => participantes.some(participante => String(participante.id_curso) === String(curso.id_curso)));
    const mensalidadesCurso = parseInt(cursoDoPainel?.quantidade_mensalidades || '0', 10) || 0;
    const pagamentosMensalidade = pagamentos.filter(pagamento => {
        const termo = String(pagamento.tipo_pagamento || pagamento.descricao || '').toLowerCase();
        return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
    });

    const cardsControle = [
        { titulo: 'Taxa de Inadimplência', valor: stats.taxaInadimplencia + '%', classe: stats.taxaInadimplencia > 20 ? 'erro' : (stats.taxaInadimplencia > 10 ? 'aviso' : 'sucesso'), icone: 'pagamentos' },
        { titulo: 'Inadimplentes', valor: stats.inadimplentes, classe: stats.inadimplentes > 0 ? 'erro' : 'sucesso', icone: 'participantes' },
        { titulo: 'Status de Saúde', valor: stats.statusSaude === 'saudavel' ? 'Saudável' : (stats.statusSaude === 'atencao' ? 'Atenção' : 'Crítico'), classe: stats.statusSaude === 'saudavel' ? 'sucesso' : (stats.statusSaude === 'atencao' ? 'aviso' : 'erro'), icone: 'financas' }
    ];
    
    dash += criarGradeMetricas(cardsControle, 3);
    
    const labelsPagto = Object.keys(statusPagamentos);
    const valoresPagto = Object.values(statusPagamentos);
    
    const graficosFinanceiro = [
        {
            id: 'grafico-pagamentos-financeiro',
            titulo: 'Status de Pagamentos',
            tipo: 'pie',
            labels: labelsPagto,
            datasets: [{ 
                label: 'Status de Pagamentos',
                data: valoresPagto,
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 0,
                hoverBorderWidth: 0
            }],
            opcoes: { 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } } 
            }
        },
        {
            id: 'grafico-entradas-saidas',
            titulo: 'Entradas vs Saídas',
            tipo: 'bar',
            labels: ['Total'],
            datasets: [
                { 
                    label: 'Entradas',
                    data: [stats.totalEntradas / 1000],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                },
                { 
                    label: 'Saídas',
                    data: [stats.totalSaidas / 1000],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderWidth: 0,
                    hoverBorderWidth: 0
                }
            ],
            opcoes: { 
                maintainAspectRatio: false,
                scales: {
                    y: {
                        border: { display: false },
                        grid: { display: false, drawBorder: false },
                        ticks: { callback: valor => valor.toFixed(1) + 'k' }
                    },
                    x: {
                        border: { display: false },
                        grid: { display: false, drawBorder: false }
                    }
                }
            }
        }
    ];

    const htmlGrafico1 = criarGradeGraficos([graficosFinanceiro[0]]);
    const htmlGrafico2 = criarGradeGraficos([graficosFinanceiro[1]]);

    let htmlRelatorios = `
        <div class="lista-relatorios-dashboard">
            <div class="cartao-geracao-relatorio">
                <div class="flex justifica-espaco itens-centro w-total gap-sm">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Livro Caixa</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFLivroCaixa()', 'contorno', 'botao-pequeno')}
                </div>
                <div class="flex gap-sm md-flex-coluna w-total mt-xs">
                    <div class="flex-1 w-total">${criarCampoFormulario('Início', 'date', 'filtro-data-inicio', dataInicio, '', false)}</div>
                    <div class="flex-1 w-total">${criarCampoFormulario('Fim', 'date', 'filtro-data-fim', dataHoje, '', false)}</div>
                </div>
            </div>

            <div class="cartao-geracao-relatorio">
                <div class="flex justifica-espaco itens-centro w-total gap-sm">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Mensalidades</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Participantes', valor: participantes.length },
                    { rotulo: 'Mensalidades', valor: mensalidadesCurso },
                    { rotulo: 'Pagamentos', valor: pagamentosMensalidade.length }
                ])}
            </div>
        </div>
    `;

    dash += `
    <div class="painel-dashboard-relatorio">
        <div class="area-grafico-relatorio">
            ${htmlGrafico1}
        </div>

        <div class="area-grafico-relatorio">
            ${htmlGrafico2}
        </div>
        
        <div class="coluna-relatorios-dashboard">
            ${htmlRelatorios}
        </div>
    </div>
    `;

    dash += '<div class="flex flex-coluna gap-sm mb-md w-total mt-lg">';
    dash += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo de Inadimplência</h3>';
    dash += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-fin', '', 'Pesquisar por participante...', false) + '</div>';
    dash += '</div>';

    let linhasResumoFinanceiro = '';

    if (participantes.length === 0) {
        linhasResumoFinanceiro += '<tr><td colspan="4" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';
    } else {
        participantes.forEach((participante, index) => {
            const curso = cursos.find(c => String(c.id_curso) === String(participante.id_curso));
            const pagtosGerais = pagamentos.filter(p => String(p.id_participante) === String(participante.id_participante));

            const pagouInscricao = pagtosGerais.some(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('inscrição') || termo.includes('inscricao');
            });
            const textoInscricao = pagouInscricao ? 'Paga' : 'Pendente';
            const classeInscricao = pagouInscricao ? 'cor-texto-sucesso' : 'cor-texto-erro';

            const pagtosMensaisFiltrados = pagtosGerais.filter(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
            });

            const qtdMensalidadesPagas = pagtosMensaisFiltrados.reduce((acc, p) => acc + (parseInt(p.quantidade) || 1), 0);
            const qtdExigidaCurso = curso ? parseInt(curso.quantidade_mensalidades || 0) : 0;

            const estaEmDia = qtdMensalidadesPagas >= qtdExigidaCurso;
            const textoSituacao = estaEmDia ? 'Em Dia' : `Pendente (${qtdExigidaCurso - qtdMensalidadesPagas})`;
            const classeSituacao = estaEmDia ? 'cor-texto-sucesso' : 'cor-texto-erro';
            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            const nomeLowerCase = (participante.nome_participante || '').toLowerCase();

            linhasResumoFinanceiro += `<tr class="linha-participante-fin ${classeFundo} transicao hover-fundo-superficie-3" data-busca="${nomeLowerCase}">
                <td class="p-md texto-esquerda peso-bold cor-texto-escuro coluna-nome-tabela">${participante.nome_participante || '-'}</td>
                <td class="p-md texto-centro peso-bold ${classeInscricao}">${textoInscricao}</td>
                <td class="p-md texto-centro cor-texto-escuro">${qtdMensalidadesPagas} de ${qtdExigidaCurso}</td>
                <td class="p-md texto-esquerda peso-bold ${classeSituacao}">${textoSituacao}</td>
            </tr>`;
        });
    }
    dash += criarContainerTabela(
        [
            { rotulo: 'Nome do Participante', classes: 'coluna-nome-tabela' },
            'Inscrição',
            'Mensalidades Pagas',
            'Situação Financeira'
        ],
        linhasResumoFinanceiro,
        '',
        'corpo-tabela-fin'
    );

    setTimeout(() => {
        Busca.vincularFiltro('busca-tabela-fin', 'corpo-tabela-fin');
    }, 0);

    return dash;
}
async function gerarPDFLivroCaixa() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;

    if (!dataInicio || !dataFim) { 
        Utilidades.notificacao('Selecione o intervalo de datas.', 'aviso'); 
        return; 
    }

    const pagamentos = await bd.obterTodos('pagamentos');
    const despesas = await bd.obterTodos('financas');
    const participantes = await bd.obterTodos('participantes');

    const estaNoIntervalo = (data) => data >= dataInicio && data <= dataFim;

    let entradasFiltradas = [];
    pagamentos.forEach(p => {
        if (p.data_pagamento && estaNoIntervalo(p.data_pagamento)) {
            const participante = participantes.find(al => al.id_participante === p.id_participante);
            const nome = participante ? participante.nome_participante : 'Geral';
            entradasFiltradas.push({
                data: p.data_pagamento,
                descricao: `Recebimento - Participante: ${nome} (${p.tipo_pagamento || ''})`,
                valor: Utilidades.normalizarValorMonetario(p.valor || p.valor_pago || 0)
            });
        }
    });

    let saidasFiltradas = [];
    despesas.forEach(d => {
        if (d.data && estaNoIntervalo(d.data)) {
            saidasFiltradas.push({
                data: d.data,
                descricao: `${d.descricao} [${d.categoria || 'Geral'}]`,
                valor: Utilidades.normalizarValorMonetario(d.valor || 0)
            });
        }
    });

    entradasFiltradas.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    saidasFiltradas.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    const totalE = entradasFiltradas.reduce((acc, i) => acc + i.valor, 0);
    const totalS = saidasFiltradas.reduce((acc, i) => acc + i.valor, 0);

    let html = `<h2>LIVRO CAIXA DOS ATIVOS FINANCEIROS</h2>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;
    html += `<p><strong>Período de Referência:</strong> ${Utilidades.formatarData(dataInicio)} - ${Utilidades.formatarData(dataFim)}</p>`;

    html += `<h3>ENTRADAS (RECEBIMENTOS)</h3>`;
    html += `<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>`;
    if (entradasFiltradas.length === 0) {
        html += `<tr><td colspan="3" class="texto-centro">Nenhum recebimento registrado neste mês.</td></tr>`;
    } else {
        entradasFiltradas.forEach(i => {
            html += `<tr><td>${Utilidades.formatarData(i.data)}</td><td>${i.descricao}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(i.valor)}</td></tr>`;
        });
    }
    html += `<tr class="linha-total"><td colspan="2">Total de Entradas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalE)}</td></tr>`;
    html += `</tbody></table>`;

    html += `<h3 class="espaco-topo-grande">SAÍDAS (DESPESAS)</h3>`;
    html += `<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>`;
    if (saidasFiltradas.length === 0) {
        html += `<tr><td colspan="3" class="texto-centro">Nenhuma despesa de saída registrada neste mês.</td></tr>`;
    } else {
        saidasFiltradas.forEach(i => {
            html += `<tr><td>${Utilidades.formatarData(i.data)}</td><td>${i.descricao}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(i.valor)}</td></tr>`;
        });
    }
    html += `<tr class="linha-total"><td colspan="2">Total de Saídas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalS)}</td></tr>`;
    html += `</tbody></table>`;

    html += `<div class="bloco-resumo">`;
    html += `<p><strong>Total de Entradas:</strong> ${Utilidades.formatarMoeda(totalE)}</p>`;
    html += `<p><strong>Total de Saídas:</strong> ${Utilidades.formatarMoeda(totalS)}</p>`;
    html += `<p><strong>Saldo Corrente Mensal:</strong> <span class="${totalE - totalS >= 0 ? 'texto-sucesso' : 'texto-erro'}">${Utilidades.formatarMoeda(totalE - totalS)}</span></p>`;
    html += `</div>`;

    dispararImpressao('Livro Caixa', html);
}

async function gerarPDFMensalidades() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, participantes, paroquias } = dadosRelatorio;
    const cursos = [curso];
    const pagamentos = await bd.obterTodos('pagamentos');

    const cursosMap = {};
    cursos.forEach(c => { cursosMap[c.id_curso] = c; });

    const paroquiasMap = {};
    paroquias.forEach(p => { paroquiasMap[p.id_paroquia] = p.nome_paroquia; });

    const agrupados = {};
    participantes.forEach(participante => {
        const idParo = participante.id_paroquia || 'sem_paroquia';
        const capela = participante.capela ? participante.capela.trim() : 'Sem Capela';
        const chave = `${idParo}||${capela}`;
        if (!agrupados[chave]) agrupados[chave] = { idParo, capela, participantes: [] };
        agrupados[chave].participantes.push(participante);
    });

    let html = `<h2>FICHA DE ACOMPANHAMENTO DE MENSALIDADES</h2>`;
    html += `<p><strong>Curso:</strong> ${curso.nome_curso || '-'}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    Object.values(agrupados).sort((a, b) => {
        const nomeA = paroquiasMap[a.idParo] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParo] || 'Sem Vínculo';
        const cmpParo = nomeA.localeCompare(nomeB);
        if (cmpParo !== 0) return cmpParo;
        return a.capela.localeCompare(b.capela);
    }).forEach((grupo, index) => {
        const nomeParoquia = paroquiasMap[grupo.idParo] || 'Participantes Sem Vínculo Paroquial';

        const maxMensalidades = Math.max(0, ...grupo.participantes.map(participante => {
            const curso = cursosMap[participante.id_curso];
            return curso ? parseInt(curso.quantidade_mensalidades || '0', 10) : 0;
        }));

        const colunasControle = ['Insc', ...Array.from({ length: maxMensalidades }, (_, index) => `P${index + 1}`)];
        const quebra = index > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${nomeParoquia} / Capela: ${grupo.capela}</h3><table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>`;
        colunasControle.forEach(col => { html += `<th class="texto-centro">${col}</th>`; });
        html += `</tr></thead><tbody>`;

        grupo.participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || '')).forEach(participante => {
            html += `<tr><td><strong>${participante.nome_participante}</strong></td>`;
            const pagamentosDoParticipante = pagamentos.filter(p => String(p.id_participante) === String(participante.id_participante));

            const temInscricao = pagamentosDoParticipante.some(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('inscrição') || termo.includes('inscricao');
            });
            html += `<td class="texto-centro"><strong>${temInscricao ? 'X' : ' '}</strong></td>`;

            const pagamentosParcelasFiltrados = pagamentosDoParticipante.filter(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
            });
            pagamentosParcelasFiltrados.sort((a, b) => (a.data_pagamento || '').localeCompare(b.data_pagamento || ''));

            const pagamentosParcelas = [];
            pagamentosParcelasFiltrados.forEach(p => {
                const qtd = parseInt(p.quantidade) || 1;
                for (let k = 0; k < qtd; k++) {
                    pagamentosParcelas.push(p);
                }
            });

            for (let i = 0; i < maxMensalidades; i++) {
                const pago = pagamentosParcelas[i] ? true : false;
                html += `<td class="texto-centro"><strong>${pago ? 'X' : ' '}</strong></td>`;
            }
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
    });

    dispararImpressao('Ficha de Mensalidades', html);
}
