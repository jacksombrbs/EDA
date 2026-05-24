function renderizarControlesFinanceiro() {
    const mesAtual = new Date().toISOString().substring(0, 7);
    let html = '<div class="flex gap-md mb-lg md-flex-coluna itens-esticar">';
    
    html += '<div class="flex-1 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md p-md flex flex-coluna justifica-espaco">';
    html += '<div class="flex justifica-espaco itens-centro mb-sm gap-sm">';
    html += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Livro Caixa (Demonstrativo)</h3>';
    html += criarBotao('Gerar Relatório', 'gerarPDFLivroCaixa()');
    html += '</div>';
    html += '<div class="flex gap-md md-flex-coluna w-total">';
    html += '<div class="flex-1 w-total">' + criarCampoFormulario('Mês de Referência', 'month', 'filtro-mes-caixa', mesAtual, '', false) + '</div>';
    html += '</div></div>';

    html += '<div class="flex-1 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md p-md flex flex-coluna justifica-espaco">';
    html += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm m-zero">Ficha de Mensalidades</h3>';
    html += '<div class="flex gap-md md-flex-coluna w-total h-total">';
    html += '<div class="flex flex-coluna justifica-fim w-total h-total">' + criarBotao('Gerar Relatório', 'gerarPDFMensalidades()', 'primario', 'w-total mt-auto') + '</div>';
    html += '</div></div>';

    html += '</div>';
    return html;
}

function renderizarDashboardFinanceiro(participantes, pagamentos, despesas, cursos) {
    const totalEntradas = pagamentos.reduce((acc, p) => acc + Utilidades.normalizarValorMonetario(p.valor || p.valor_pago || 0), 0);
    const totalSaidas = despesas.reduce((acc, d) => acc + Utilidades.normalizarValorMonetario(d.valor || 0), 0);
    const saldoCaixa = totalEntradas - totalSaidas;
    const classeSaldo = saldoCaixa >= 0 ? 'cor-texto-sucesso' : 'cor-texto-erro';
    const bordaSaldo = saldoCaixa >= 0 ? 'borda-sucesso' : 'borda-erro';

let dash = `<div class="flex flex-linha gap-md mb-lg md-flex-coluna">
        <div class="cartao-resumo fundo-toast-sucesso flex-1">
            <span class="texto-sm peso-bold cor-texto-claro">Total Entradas</span>
            <h3 class="texto-xl peso-bold cor-texto-sucesso mt-sm">${Utilidades.formatarMoeda(totalEntradas)}</h3>
        </div>
        <div class="cartao-resumo fundo-toast-erro flex-1">
            <span class="texto-sm peso-bold cor-texto-claro">Total Saídas</span>
            <h3 class="texto-xl peso-bold cor-texto-erro mt-sm">${Utilidades.formatarMoeda(totalSaidas)}</h3>
        </div>
        <div class="cartao-resumo ${saldoCaixa >= 0 ? 'fundo-toast-sucesso' : 'fundo-toast-erro'} flex-1">
            <span class="texto-sm peso-bold cor-texto-claro">Saldo Líquido</span>
            <h3 class="texto-xl peso-bold ${saldoCaixa >= 0 ? 'cor-texto-sucesso' : 'cor-texto-erro'} mt-sm">${Utilidades.formatarMoeda(saldoCaixa)}</h3>
        </div>
    </div>`;

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

            const pagtosMensais = pagtosGerais.filter(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
            });
            const qtdMensalidadesPagas = pagtosMensais.length;
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
    const elMes = document.getElementById('filtro-mes-caixa');
    const mesFiltro = elMes ? elMes.value : '';
    if (!mesFiltro) { Utilidades.notificacao('Selecione um mês de referência.', 'aviso'); return; }

    const pagamentos = await bd.obterTodos('pagamentos');
    const despesas = await bd.obterTodos('financas');
    const participantes = await bd.obterTodos('participantes');

    const anoRef = mesFiltro.split('-')[0];
    const mesRef = mesFiltro.split('-')[1];

    let entradasFiltradas = [];
    pagamentos.forEach(p => {
        if (p.data_pagamento && p.data_pagamento.startsWith(mesFiltro)) {
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
        if (d.data && d.data.startsWith(mesFiltro)) {
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
    html += `<p><strong>Período de Referência:</strong> ${mesRef}/${anoRef}</p>`;

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

            const pagamentosParcelas = pagamentosDoParticipante.filter(p => {
                const termo = String(p.tipo_pagamento || p.descricao || '').toLowerCase();
                return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
            });
            pagamentosParcelas.sort((a, b) => (a.data_pagamento || '').localeCompare(b.data_pagamento || ''));

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
