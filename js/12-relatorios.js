async function renderizarRelatorios(conteudo) {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');
    const cursos = await bd.obterTodos('cursos');
    const pagamentos = await bd.obterTodos('pagamentos');
    const despesas = await bd.obterTodos('financas');
    const frequencias = await bd.obterTodos('frequencia');
    const atividades = await bd.obterTodos('atividades');
    const disciplinas = await bd.obterTodos('disciplinas');

    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
    disciplinas.sort((a, b) => a.nome_disciplina.localeCompare(b.nome_disciplina));

    let codigoEstrutura = '<div class="fundo-branco borda-padrao raio-md p-md mb-lg">';
    
    codigoEstrutura += '<div class="flex justifica-espaco itens-centro mb-lg md-flex-coluna md-itens-esquerda gap-sm">';
    codigoEstrutura += '<h2 class="texto-lg peso-bold cor-texto-primario m-zero">Painel Estatístico e Relatórios Consolidados</h2>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="fundo-cinza borda-padrao raio-md p-md mb-lg">';
    codigoEstrutura += '<h3 class="texto-md peso-bold cor-texto-primario mb-md">Gerar Relatórios Oficiais</h3>';
    codigoEstrutura += '<div class="grid grid-auto-adaptavel gap-sm">';

    codigoEstrutura += '<div class="borda-padrao raio-md p-md fundo-branco pdf-card">';
    codigoEstrutura += '<h4 class="texto-md peso-bold cor-texto-escuro mb-xs">Livro Caixa (Finanças)</h4>';
    codigoEstrutura += criarCampoFormulario('Mês de Referência', 'month', 'filtro-mes-caixa', new Date().toISOString().substring(0, 7), '', false);
    codigoEstrutura += '<button class="btn btn-primario largura-total" onclick="gerarPDFLivroCaixa()">Gerar PDF</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="borda-padrao raio-md p-md fundo-branco pdf-card">';
    codigoEstrutura += '<h4 class="texto-md peso-bold cor-texto-escuro mb-xs">Ficha de Mensalidades</h4>';
    codigoEstrutura += '<button class="btn btn-primario largura-total" onclick="gerarPDFMensalidades()">Gerar PDF Completo</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="borda-padrao raio-md p-md fundo-branco pdf-card">';
    codigoEstrutura += '<h4 class="texto-md peso-bold cor-texto-escuro mb-xs">Relatório Geral de Atividades</h4>';
    codigoEstrutura += '<button class="btn btn-primario largura-total" onclick="gerarPDFAtividades()">Gerar PDF</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '<div class="borda-padrao raio-md p-md fundo-branco pdf-card">';
    codigoEstrutura += '<h4 class="texto-md peso-bold cor-texto-escuro mb-xs">Relatório de Frequência</h4>';
    codigoEstrutura += criarSeletor('Tipo de Relatório', 'filtro-tipo-frequencia', [{id: 'geral', nome: 'Geral'}, {id: 'disciplina', nome: 'Por Disciplina'}], 'geral', false);
    codigoEstrutura += '<div id="wrapper-filtro-disciplina-frequencia" class="oculto">';
    codigoEstrutura += criarSeletor('Selecione a Disciplina', 'filtro-disciplina-frequencia', disciplinas.map(d => ({id: d.id_disciplina, nome: d.nome_disciplina})), '', false);
    codigoEstrutura += '</div>';
    codigoEstrutura += '<button class="btn btn-primario largura-total" onclick="gerarPDFFrequencia()">Gerar PDF</button>';
    codigoEstrutura += '</div>';

    codigoEstrutura += '</div></div>';

    const totalEntradas = pagamentos.reduce((acc, p) => acc + parseFloat(String(p.valor || 0).replace('.', '').replace(',', '.')), 0);
    const totalSaidas = despesas.reduce((acc, d) => acc + parseFloat(String(d.valor || 0).replace('.', '').replace(',', '.')), 0);
    const saldoCaixa = totalEntradas - totalSaidas;

    codigoEstrutura += `<div class="mb-lg">
        <h3 class="texto-md peso-bold cor-texto-primario mb-md">1. Fluxo Financeiro Geral (Entradas vs Saídas)</h3>
        <div class="grid grid-auto-adaptavel gap-md">
            <div class="flex flex-coluna p-md borda-padrao raio-md borda-sucesso fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(+) TOTAL ENTRADAS</span>
                <h3 class="texto-xl peso-bold texto-sucesso mt-sm">${Utilidades.formatarMoeda(totalEntradas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-padrao raio-md borda-erro fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(-) TOTAL SAÍDAS</span>
                <h3 class="texto-xl peso-bold texto-erro mt-sm">${Utilidades.formatarMoeda(totalSaidas)}</h3>
            </div>
            <div class="flex flex-coluna p-md borda-padrao raio-md ${saldoCaixa >= 0 ? 'borda-sucesso' : 'borda-erro'} fundo-cinza">
                <span class="texto-sm peso-bold cor-texto-claro">(=) RESULTADO LÍQUIDO</span>
                <h3 class="texto-xl peso-bold ${saldoCaixa >= 0 ? 'texto-sucesso' : 'texto-erro'} mt-sm">${Utilidades.formatarMoeda(saldoCaixa)}</h3>
            </div>
        </div>
    </div>`;

    codigoEstrutura += `<div class="mb-lg">
        <h3 class="texto-md peso-bold cor-texto-primario mb-sm">2. Mapa de Inadimplência por Aluno</h3>`;
    
    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro texto-italico p-md fundo-cinza borda-padrao raio-md">Nenhum aluno ativo encontrado para cálculo financeiro.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base"><thead><tr>';
        codigoEstrutura += '<th>Nome do Participante</th><th class="texto-centro">Inscrição</th><th class="texto-centro">Mensalidades</th><th class="texto-direita">Situação Cadastral</th></tr></thead><tbody>';

        participantes.forEach(aluno => {
            const curso = cursos.find(c => c.id_curso === aluno.id_curso);
            if (!curso) {
                codigoEstrutura += `<tr>
                    <td class="peso-bold cor-texto-escuro">${aluno.nome_participante}</td>
                    <td colspan="3" class="texto-italico cor-texto-claro">Sem curso vinculado</td>
                </tr>`;
                return;
            }

            const pagtos = pagamentos.filter(p => p.id_participante === aluno.id_participante);
            const pagouInscricao = pagtos.some(p => p.tipo_pagamento === 'Inscrição');
            const valorInscricaoNum = parseFloat(String(curso.valor_inscricao || 0).replace('.', '').replace(',', '.'));
            const exigeInscricao = valorInscricaoNum > 0;

            const qtdMensalidadesPagas = pagtos.filter(p => p.tipo_pagamento === 'Mensalidade').length;
            const qtdExigidaCurso = parseInt(curso.quantidade_mensalidades || 0);

            let pendencias = [];
            if (exigeInscricao && !pagouInscricao) {
                pendencias.push('Falta Inscrição');
            }
            if (qtdMensalidadesPagas < qtdExigidaCurso) {
                pendencias.push(`Faltam ${qtdExigidaCurso - qtdMensalidadesPagas} mêns.`);
            }

            const estaEmDia = pendencias.length === 0;
            const textoSituacao = estaEmDia ? '✅ Regularizado' : `❌ Devendo (${pendencias.join(' / ')})`;
            const classeSituacao = estaEmDia ? 'texto-sucesso' : 'texto-erro';
            const classeInscricao = exigeInscricao ? (pagouInscricao ? 'texto-sucesso peso-bold' : 'texto-erro peso-bold') : 'cor-texto-claro';

            codigoEstrutura += `<tr>
                        <td class="peso-bold cor-texto-escuro">${aluno.nome_participante}</td>
                        <td class="texto-centro ${classeInscricao}">${exigeInscricao ? (pagouInscricao ? 'Paga' : 'Pendente') : 'Isenta'}</td>
                        <td class="texto-centro cor-texto-escuro">${qtdMensalidadesPagas} / ${qtdExigidaCurso}</td>
                        <td class="texto-direita peso-bold ${classeSituacao}">${textoSituacao}</td>
                     </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    codigoEstrutura += `<div class="mb-lg">
        <h3 class="texto-md peso-bold cor-texto-primario mb-sm">3. Relatório Estatístico de Frequência</h3>`;
    
    if (participantes.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro texto-italico p-md fundo-cinza borda-padrao raio-md">Nenhum registro de chamada processado.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base"><thead><tr>';
        codigoEstrutura += '<th>Nome do Aluno</th><th class="texto-centro">Presenças (C)</th><th class="texto-centro">Faltas (F)</th><th class="texto-direita">% Frequência</th></tr></thead><tbody>';

        participantes.forEach(aluno => {
            let presencas = 0;
            let faltas = 0;

            frequencias.forEach(f => {
                if (f.presencas && f.presencas[aluno.id_participante]) {
                    if (f.presencas[aluno.id_participante] === 'C') presencas++;
                    if (f.presencas[aluno.id_participante] === 'F') faltas++;
                }
            });

            const totalAulas = presencas + faltas;
            const taxaPresenca = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 100;
            const classeTaxa = taxaPresenca >= 75 ? 'texto-sucesso' : 'texto-erro';

            codigoEstrutura += `<tr>
                        <td class="peso-bold cor-texto-escuro">${aluno.nome_participante}</td>
                        <td class="texto-centro peso-bold texto-sucesso">${presencas}</td>
                        <td class="texto-centro peso-bold texto-erro">${faltas}</td>
                        <td class="texto-direita peso-bold ${classeTaxa}">${taxaPresenca}% de Assiduidade</td>
                     </tr>`;
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    codigoEstrutura += `<div>
        <h3 class="texto-md peso-bold cor-texto-primario mb-sm">4. Painel Individual de Entregas (Atividades)</h3>`;
    
    if (atividades.length === 0) {
        codigoEstrutura += '<p class="texto-md cor-texto-claro texto-italico p-md fundo-cinza borda-padrao raio-md">Nenhuma atividade avaliativa lançada no sistema.</p>';
    } else {
        codigoEstrutura += '<div class="rolagem-x borda-padrao raio-md fundo-branco"><table class="tabela-base"><thead><tr>';
        codigoEstrutura += '<th>Nome do Aluno</th><th class="texto-centro">Trabalhos Entregues</th><th>Último Registro (Disciplina e Data)</th></tr></thead><tbody>';

        participantes.forEach(aluno => {
            const entregasDoAluno = atividades.filter(atv => atv.id_participante === aluno.id_participante);

            if (entregasDoAluno.length > 0) {
                entregasDoAluno.sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega));
                const ultimaEntrega = entregasDoAluno[0];

                const disciplinaDaUltima = disciplinas.find(d => d.id_disciplina === ultimaEntrega.id_disciplina);
                const nomeDisc = disciplinaDaUltima ? disciplinaDaUltima.nome_disciplina : 'Disciplina Desconhecida';

                codigoEstrutura += `<tr>
                            <td class="peso-bold cor-texto-escuro">${aluno.nome_participante}</td>
                            <td class="texto-centro peso-bold texto-sucesso">${entregasDoAluno.length}</td>
                            <td class="cor-texto-escuro"><span class="peso-bold">${nomeDisc}</span> <br><span class="texto-sm cor-texto-claro">entregue em ${Utilidades.formatarData(ultimaEntrega.data_entrega)}</span></td>
                         </tr>`;
            } else {
                codigoEstrutura += `<tr>
                            <td class="cor-texto-escuro">${aluno.nome_participante}</td>
                            <td class="texto-centro peso-bold texto-erro">0</td>
                            <td class="texto-italico cor-texto-claro">Nenhuma entrega registrada</td>
                         </tr>`;
            }
        });
        codigoEstrutura += '</tbody></table></div>';
    }
    codigoEstrutura += '</div>';

    conteudo.innerHTML = codigoEstrutura;

    const tipoFrequencia = document.getElementById('filtro-tipo-frequencia');
    const wrapperDisciplina = document.getElementById('wrapper-filtro-disciplina-frequencia');

    const atualizarVisibilidadeDisciplina = () => {
        if (!tipoFrequencia || !wrapperDisciplina) return;
        wrapperDisciplina.classList.toggle('oculto', tipoFrequencia.value !== 'disciplina');
    };

    if (tipoFrequencia) {
        tipoFrequencia.addEventListener('change', atualizarVisibilidadeDisciplina);
    }

    atualizarVisibilidadeDisciplina();
}

// =========================================================================
// FUNÇÕES GERADORAS DE PDF
// =========================================================================

async function gerarPDFLivroCaixa() {
    const mesFiltro = document.getElementById('filtro-mes-caixa').value;
    if (!mesFiltro) {
        Utilidades.notificacao('Selecione um mês de referência.', 'erro');
        return;
    }

    const pagamentos = await bd.obterTodos('pagamentos');
    const despesas = await bd.obterTodos('financas');
    const participantes = await bd.obterTodos('participantes');

    const anoRef = mesFiltro.split('-')[0];
    const mesRef = mesFiltro.split('-')[1];

    let entradasFiltradas = [];
    pagamentos.forEach(p => {
        if (p.data_pagamento && p.data_pagamento.startsWith(mesFiltro)) {
            const aluno = participantes.find(al => al.id_participante === p.id_participante);
            const nome = aluno ? aluno.nome_participante : 'Geral';
            entradasFiltradas.push({
                data: p.data_pagamento,
                descricao: `Recebimento - Aluno: ${nome} (${p.tipo_pagamento || ''})`,
                valor: parseFloat(String(p.valor || 0).replace('.', '').replace(',', '.'))
            });
        }
    });

    let saidasFiltradas = [];
    despesas.forEach(d => {
        if (d.data && d.data.startsWith(mesFiltro)) {
            saidasFiltradas.push({
                data: d.data,
                descricao: `${d.descricao} [${d.categoria || 'Geral'}]`,
                valor: parseFloat(String(d.valor || 0).replace('.', '').replace(',', '.'))
            });
        }
    });

    entradasFiltradas.sort((a, b) => a.data.localeCompare(b.data));
    saidasFiltradas.sort((a, b) => a.data.localeCompare(b.data));

    const totalE = entradasFiltradas.reduce((acc, i) => acc + i.valor, 0);
    const totalS = saidasFiltradas.reduce((acc, i) => acc + i.valor, 0);

    let html = obterEstiloImpressao();
    html += `<h2>LIVRO CAIXA DOS ATIVOS FINANCEIROS</h2>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;
    html += `<p><strong>Período de Referência:</strong> ${mesRef}/${anoRef}</p>`;

    html += `<h3>ENTRADAS (RECEBIMENTOS)</h3>`;
    html += `<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>`;
    if (entradasFiltradas.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center;">Nenhum recebimento registrado neste mês.</td></tr>`;
    } else {
        entradasFiltradas.forEach(i => {
            html += `<tr><td>${Utilidades.formatarData(i.data)}</td><td>${i.descricao}</td><td class="alinhado-direita">${Utilidades.formatarMoeda(i.valor)}</td></tr>`;
        });
    }
    html += `<tr class="linha-total"><td colspan="2">Total de Entradas</td><td class="alinhado-direita">${Utilidades.formatarMoeda(totalE)}</td></tr>`;
    html += `</tbody></table>`;

    html += `<h3 style="margin-top: 30px;">SAÍDAS (DESPESAS)</h3>`;
    html += `<table><thead><tr><th>Data</th><th>Descrição</th><th class="alinhado-direita">Valor</th></tr></thead><tbody>`;
    if (saidasFiltradas.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center;">Nenhuma despesa de saída registrada neste mês.</td></tr>`;
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
    html += `<p><strong>Saldo Corrente Mensal:</strong> <span style="color: ${totalE - totalS >= 0 ? '#10b981' : '#ef4444'}">${Utilidades.formatarMoeda(totalE - totalS)}</span></p>`;
    html += `</div>`;

    dispararImpressao(html);
}

async function gerarPDFMensalidades() {
    const participantes = await bd.obterTodos('participantes');
    const paroquias = await bd.obterTodos('paroquias');
    const cursos = await bd.obterTodos('cursos');
    const pagamentos = await bd.obterTodos('pagamentos');

    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    let html = obterEstiloImpressao();
    html += `<h2>FICHA DE ACOMPANHAMENTO DE MENSALIDADES</h2>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    const cursosMap = {};
    cursos.forEach(c => {
        cursosMap[c.id_curso] = c;
    });

    const paroquiasMap = {};
    paroquias.forEach(p => {
        paroquiasMap[p.id_paroquia] = p.nome_paroquia;
    });

    const agrupados = {};
    participantes.forEach(aluno => {
        const idParo = aluno.id_paroquia || 'sem_paroquia';
        const capela = aluno.capela ? aluno.capela.trim() : 'Sem Capela';
        const chave = `${idParo}||${capela}`;
        if (!agrupados[chave]) agrupados[chave] = { idParo, capela, alunos: [] };
        agrupados[chave].alunos.push(aluno);
    });

    Object.values(agrupados)
        .sort((a, b) => {
            const nomeA = paroquiasMap[a.idParo] || 'Alunos Sem Vínculo Paroquial';
            const nomeB = paroquiasMap[b.idParo] || 'Alunos Sem Vínculo Paroquial';
            const cmpParo = nomeA.localeCompare(nomeB);
            if (cmpParo !== 0) return cmpParo;
            return a.capela.localeCompare(b.capela);
        })
        .forEach(grupo => {
            const nomeParoquia = paroquiasMap[grupo.idParo] || 'Alunos Sem Vínculo Paroquial';
            const maxMensalidades = Math.max(0, ...grupo.alunos.map(aluno => {
                const curso = cursosMap[aluno.id_curso];
                return curso ? parseInt(curso.quantidade_mensalidades || '0', 10) : 0;
            }));

            const colunasControle = ['Inscrição', ...Array.from({ length: maxMensalidades }, (_, index) => `Parc ${index + 1}`)];

            html += `<h3>Paróquia: ${nomeParoquia} / Capela: ${grupo.capela}</h3>`;
            html += `<table><thead><tr><th>Nome do Aluno</th>`;
            colunasControle.forEach(col => {
                html += `<th class="texto-centro">${col}</th>`;
            });
            html += `</tr></thead><tbody>`;

            grupo.alunos
                .sort((a, b) => a.nome_participante.localeCompare(b.nome_participante))
                .forEach(aluno => {
                    html += `<tr><td><strong>${aluno.nome_participante}</strong></td>`;

                    const pagamentosDoAluno = pagamentos.filter(p => p.id_participante === aluno.id_participante);
                    const temInscricao = pagamentosDoAluno.some(p => String(p.tipo_pagamento || p.descricao).toLowerCase().includes('inscrição') || String(p.tipo_pagamento || p.descricao).toLowerCase().includes('inscricao'));
                    html += `<td class="texto-centro">${temInscricao ? 'X' : ' '}</td>`;

                    const pagamentosParcelas = pagamentosDoAluno.filter(p => {
                        const termo = String(p.tipo_pagamento || p.descricao).toLowerCase();
                        return termo.includes('parcela') || termo.includes('mensalidade') || termo.includes('parc');
                    });

                    pagamentosParcelas.sort((a, b) => {
                        const dataA = a.data_pagamento || '';
                        const dataB = b.data_pagamento || '';
                        return dataA.localeCompare(dataB);
                    });

                    for (let i = 0; i < maxMensalidades; i++) {
                        const pago = pagamentosParcelas[i] ? true : false;
                        html += `<td class="texto-centro">${pago ? 'X' : ' '}</td>`;
                    }

                    html += `</tr>`;
                });

            html += `</tbody></table><div style="page-break-after: auto; margin-bottom: 20px;"></div>`;
        });

    dispararImpressao(html);
}

async function gerarPDFAtividades() {
    const disciplinas = await bd.obterTodos('disciplinas');
    const participantes = await bd.obterTodos('participantes');
    const atividades = await bd.obterTodos('atividades');
    const paroquias = await bd.obterTodos('paroquias');

    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => a.nome_disciplina.localeCompare(b.nome_disciplina));
    const paroquiasMap = {};
    paroquias.forEach(p => {
        paroquiasMap[p.id_paroquia] = p.nome_paroquia;
    });

    const agrupados = {};
    participantes.forEach(aluno => {
        const idParoquia = aluno.id_paroquia || 'sem_paroquia';
        const capela = aluno.capela ? aluno.capela.trim() : 'Sem Capela';
        const chave = `${idParoquia}||${capela}`;
        if (!agrupados[chave]) agrupados[chave] = { idParoquia, capela, alunos: [] };
        agrupados[chave].alunos.push(aluno);
    });

    let html = obterEstiloImpressao();
    html += `<h2>RELATÓRIO GERAL DE ATIVIDADES</h2>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    if (disciplinasOrdenadas.length === 0) {
        html += `<p>Nenhuma disciplina cadastrada para a geração do relatório.</p>`;
        dispararImpressao(html);
        return;
    }

    Object.values(agrupados)
        .sort((a, b) => {
            const nomeA = paroquiasMap[a.idParoquia] || 'Alunos Sem Vínculo Paroquial';
            const nomeB = paroquiasMap[b.idParoquia] || 'Alunos Sem Vínculo Paroquial';
            const cmpParo = nomeA.localeCompare(nomeB);
            if (cmpParo !== 0) return cmpParo;
            return a.capela.localeCompare(b.capela);
        })
        .forEach(grupo => {
            const alunosGrupo = grupo.alunos.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
            if (alunosGrupo.length === 0) return;

            const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Alunos Sem Vínculo Paroquial';
            html += `<h3>Paróquia: ${nomeParoquia} / Capela: ${grupo.capela}</h3>`;
            html += `<div class="rolagem-x"><table><thead><tr><th>Nome do Aluno</th>`;
            disciplinasOrdenadas.forEach(d => {
                html += `<th class="texto-centro">${d.nome_disciplina}</th>`;
            });
            html += `</tr></thead><tbody>`;

            alunosGrupo.forEach(aluno => {
                html += `<tr><td><strong>${aluno.nome_participante}</strong></td>`;
                disciplinasOrdenadas.forEach(disc => {
                    const entregou = atividades.some(a => a.id_participante === aluno.id_participante && a.id_disciplina === disc.id_disciplina);
                    html += `<td class="texto-centro">${entregou ? 'X' : ''}</td>`;
                });
                html += `</tr>`;
            });

            html += `</tbody></table></div><div style="page-break-after: auto; margin-bottom: 20px;"></div>`;
        });

    dispararImpressao(html);
}

async function gerarPDFFrequencia() {
    const tipoRelatorio = document.getElementById('filtro-tipo-frequencia').value;
    const idDisciplina = document.getElementById('filtro-disciplina-frequencia').value;

    const disciplinas = await bd.obterTodos('disciplinas');
    const participantes = await bd.obterTodos('participantes');
    const frequencias = await bd.obterTodos('frequencia');
    const cursos = await bd.obterTodos('cursos');
    const paroquias = await bd.obterTodos('paroquias');

    participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));

    const cursosMap = {};
    cursos.forEach(c => {
        cursosMap[c.id_curso] = c.nome_curso;
    });

    const paroquiasMap = {};
    paroquias.forEach(p => {
        paroquiasMap[p.id_paroquia] = p.nome_paroquia;
    });

    let html = obterEstiloImpressao();
    html += `<h2>RELATÓRIO DE FREQUÊNCIA</h2>`;
    html += `<p><strong>Data de Emissão:</strong> ${Utilidades.formatarData(new Date().toISOString().split('T')[0])}</p>`;

    if (tipoRelatorio === 'geral') {
        if (disciplinas.length === 0) {
            html += `<p>Nenhuma disciplina cadastrada.</p>`;
            dispararImpressao(html);
            return;
        }

        participantes.sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
        const disciplinasOrdenadas = [...disciplinas].sort((a, b) => a.nome_disciplina.localeCompare(b.nome_disciplina));
        const agrupados = {};

        participantes.forEach(aluno => {
            const idParoquia = aluno.id_paroquia || 'sem_paroquia';
            if (!agrupados[idParoquia]) agrupados[idParoquia] = [];
            agrupados[idParoquia].push(aluno);
        });

        Object.keys(agrupados)
            .sort((a, b) => {
                const nomeA = paroquiasMap[a] || 'Alunos Sem Vínculo Paroquial';
                const nomeB = paroquiasMap[b] || 'Alunos Sem Vínculo Paroquial';
                return nomeA.localeCompare(nomeB);
            })
            .forEach(idParoquia => {
                const alunosGrupo = agrupados[idParoquia].sort((a, b) => a.nome_participante.localeCompare(b.nome_participante));
                const nomeParoquia = paroquiasMap[idParoquia] || 'Alunos Sem Vínculo Paroquial';

                html += `<h3>Paróquia: ${nomeParoquia}</h3>`;
                html += `<div class="rolagem-x"><table><thead><tr><th>Aluno</th><th>Curso</th>`;
                disciplinasOrdenadas.forEach(d => {
                    html += `<th class="texto-centro">${d.nome_disciplina}</th>`;
                });
                html += `</tr></thead><tbody>`;

                alunosGrupo.forEach(aluno => {
                    const nomeCurso = cursosMap[aluno.id_curso] || 'Sem curso';
                    html += `<tr><td><strong>${aluno.nome_participante}</strong></td><td>${nomeCurso}</td>`;

                    disciplinasOrdenadas.forEach(disc => {
                        let presencas = 0;
                        let faltas = 0;

                        frequencias.forEach(f => {
                            if (f.id_disciplina !== disc.id_disciplina || !f.presencas || f.presencas[aluno.id_participante] == null) return;
                            const estado = String(f.presencas[aluno.id_participante]).toUpperCase();
                            if (estado === 'C' || estado === 'P' || estado === 'PRESENTE') {
                                presencas += 1;
                            } else {
                                faltas += 1;
                            }
                        });

                        let valor = '';
                        if (presencas + faltas > 0) {
                            valor = faltas > presencas ? 'F' : 'C';
                        }

                        html += `<td class="texto-centro ${valor === 'C' ? 'texto-sucesso peso-bold' : valor === 'F' ? 'texto-erro peso-bold' : ''}">${valor}</td>`;
                    });

                    html += `</tr>`;
                });

                html += `</tbody></table></div>`;
            });

        dispararImpressao(html);
        return;
    }

    if (!idDisciplina) {
        Utilidades.notificacao('Selecione uma disciplina para gerar o relatório individual por curso.', 'erro');
        return;
    }

    const disciplinaSelecionada = disciplinas.find(d => d.id_disciplina === idDisciplina);
    const nomeDisc = disciplinaSelecionada ? disciplinaSelecionada.nome_disciplina : '';
    const registrosDisciplina = frequencias.filter(f => f.id_disciplina === idDisciplina);

    html += `<h3 style="font-size: 16px; margin-top: 18px;">Disciplina: ${nomeDisc}</h3>`;

    const presentes = new Set();
    const ausentes = new Set();

    registrosDisciplina.forEach(f => {
        if (!f.presencas || Object.keys(f.presencas).length === 0) return;

        Object.entries(f.presencas).forEach(([idParticipante, estado]) => {
            const nomeAluno = participantes.find(aluno => aluno.id_participante === idParticipante)?.nome_participante || idParticipante;
            const tipo = String(estado || '').trim().toUpperCase();
            if (tipo === 'C' || tipo === 'P' || tipo === 'PRESENTE') {
                presentes.add(nomeAluno);
                ausentes.delete(nomeAluno);
            } else {
                if (!presentes.has(nomeAluno)) {
                    ausentes.add(nomeAluno);
                }
            }
        });
    });

    if (presentes.size === 0 && ausentes.size === 0) {
        html += `<p>Nenhum registro de frequência encontrado para esta disciplina.</p>`;
        dispararImpressao(html);
        return;
    }

    html += `<div class="rolagem-x"><table><thead><tr><th class="texto-centro">Presente (${presentes.size})</th><th class="texto-centro">Faltou(${ausentes.size})</th></tr></thead><tbody>`;
    html += `<tr><td class="texto-centro">${[...presentes].sort().join('<br>') || 'Nenhum registro'}</td><td class="texto-centro">${[...ausentes].sort().join('<br>') || 'Nenhum registro'}</td></tr>`;
    html += `</tbody></table></div>`;

    dispararImpressao(html);
}

function obterEstiloImpressao() {
    return `<style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #191a1a; background-color: #ffffff; }
        h2 { text-align: center; font-size: 18px; margin-bottom: 5px; color: #1e3a8a; font-weight: bold; text-transform: uppercase; }
        h3 { font-size: 13px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e1e1e1; padding-bottom: 4px; color: #1e3a8a; font-weight: bold; }
        p { font-size: 11px; margin: 4px 0; color: #5f6060; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; page-break-inside: avoid; }
        th, td { border: 1px solid #e1e1e1; padding: 6px 8px; font-size: 11px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; color: #191a1a; }
        .texto-centro { text-align: center; }
        .alinhado-direita { text-align: right; }
        .linha-total { font-weight: bold; background-color: #fafafa; }
        .bloco-resumo { margin-top: 20px; padding: 12px; border: 1px solid #e1e1e1; border-radius: 6px; background-color: #fafafa; width: 300px; float: right; page-break-inside: avoid; }
        .bloco-resumo p { font-size: 12px; margin: 6px 0; }
        /* Força impressão de backgrounds coloridos */
        * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
    </style>`;
}

function dispararImpressao(html) {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
        Utilidades.notificacao('Por favor, permita pop-ups no seu navegador para visualizar o PDF.', 'alerta');
        return;
    }
    
    janelaImpressao.document.open();
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
    
    setTimeout(() => {
        janelaImpressao.focus();
        janelaImpressao.print();
    }, 300);
}