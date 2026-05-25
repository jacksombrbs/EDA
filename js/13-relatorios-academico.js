function renderizarControlesAcademico(disciplinas, participantes = [], frequencias = [], atividades = []) {
    return '';
}

function renderizarDashboardAcademico(participantes, frequencias, atividades, disciplinas) {
    let dash = '';
    const stats = calcularEstatisticasAcademicas(participantes, frequencias, atividades);
    const faixasFrequencia = agruparFrequenciasPorFaixa(participantes, frequencias);

    const cardsMetricas = [
        { titulo: 'Total de Participantes', valor: stats.totalParticipantes, classe: 'primario', icone: 'participantes' },
        { titulo: 'Frequência Média', valor: stats.frequenciaMedia + '%', classe: stats.frequenciaMedia >= 75 ? 'sucesso' : (stats.frequenciaMedia >= 50 ? 'aviso' : 'erro'), icone: 'frequencia' },
        { titulo: 'Em Risco (<75%)', valor: stats.participantesEmRisco, classe: stats.participantesEmRisco > 0 ? 'erro' : 'sucesso', icone: 'frequencia' },
        { titulo: 'Total de Entregas', valor: stats.entregasTotal, classe: 'primario', icone: 'atividades' }
    ];
    
    dash += criarGradeMetricas(cardsMetricas, 4);

    const labelsFreq = Object.keys(faixasFrequencia);
    const valoresFreq = Object.values(faixasFrequencia);

    const graficosAcademico = [
        {
            id: 'grafico-frequencia-academico',
            titulo: 'Distribuição de Frequência',
            tipo: 'doughnut',
            labels: labelsFreq,
            datasets: [{ 
                label: 'Distribuição de Frequência',
                data: valoresFreq,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderWidth: 0,
                hoverBorderWidth: 0
            }],
            opcoes: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } } 
            }
        }
    ];
    
    const htmlGrafico = criarGradeGraficos(graficosAcademico);

    let htmlRelatorios = `
        <div class="lista-relatorios-dashboard">
            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFFrequencia()', 'contorno', 'botao-pequeno')}
                </div>
                <div class="flex gap-md md-flex-coluna w-total mt-sm">
                    <div class="flex-1 w-total">${criarSeletor('Tipo', 'filtro-tipo-frequencia', [{ id: 'geral', nome: 'Geral (Todos)' }, { id: 'disciplina', nome: 'Por Disciplina' }], 'geral', false)}</div>
                    <div id="recipiente-filtro-disciplina-frequencia" class="oculto flex-1 w-total">${criarSeletor('Disciplina', 'filtro-disciplina-freq', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), '', false)}</div>
                </div>
            </div>

            <div class="cartao-geracao-relatorio">
                <div class="cabecalho-relatorio">
                    <h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Atividades</h3>
                    ${criarBotao('Gerar Relatório', 'gerarPDFAtividades()', 'contorno', 'botao-pequeno')}
                </div>
                ${criarMetricasRelatorio([
                    { rotulo: 'Disciplinas', valor: disciplinas.length },
                    { rotulo: 'Entregas', valor: atividades.length }
                ])}
            </div>
        </div>
    `;

    dash += `
    <div class="painel-dashboard-relatorio">
        <div class="area-grafico-relatorio">
            ${htmlGrafico}
        </div>
        <div class="coluna-relatorios-dashboard">
            ${htmlRelatorios}
        </div>
    </div>
    `;

    dash += '<div class="flex flex-coluna gap-sm mb-md w-total">';
    dash += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Resumo Geral Acadêmico</h3>';
    dash += '<div class="w-total">' + criarCampoFormulario('', 'text', 'busca-tabela-acad', '', 'Pesquisar por participante...', false) + '</div>';
    dash += '</div>';

    let linhasResumoAcademico = '';

    if (participantes.length === 0) {
        linhasResumoAcademico += '<tr><td colspan="4" class="p-md texto-centro cor-texto-claro">Nenhum participante cadastrado.</td></tr>';
    } else {
        participantes.forEach((participante, index) => {
            let presencas = 0, faltas = 0;
            frequencias.forEach(f => {
                if (f.presencas && f.presencas[participante.id_participante]) {
                    const p = f.presencas[participante.id_participante];
                    if (p === 'C' || p === 'P' || p === 'PRESENTE') presencas++;
                    else faltas++;
                }
            });
            const totalAulas = presencas + faltas;
            const taxa = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 100;
            const classeTaxa = taxa >= 75 ? 'cor-texto-sucesso' : 'cor-texto-erro';

            const entregasDoParticipante = atividades.filter(atv => atv.id_participante === participante.id_participante);
            let textoUltima = '-';

            if (entregasDoParticipante.length > 0) {
                entregasDoParticipante.sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega));
                const disc = disciplinas.find(d => d.id_disciplina === entregasDoParticipante[0].id_disciplina);
                let dataAtv = entregasDoParticipante[0].data_entrega;
                if (dataAtv && dataAtv.includes('-')) dataAtv = dataAtv.split('-').reverse().join('/');
                textoUltima = `${disc ? disc.nome_disciplina : 'Avaliação'} (${dataAtv})`;
            }

            const classeFundo = index % 2 === 0 ? 'fundo-branco' : 'fundo-superficie-2';

            linhasResumoAcademico += `<tr class="linha-participante-acad ${classeFundo} transicao hover-fundo-superficie-3" data-busca="${(participante.nome_participante || '').toLowerCase()}">
                <td class="p-md texto-esquerda peso-bold cor-texto-escuro coluna-nome-tabela">${participante.nome_participante || '-'}</td>
                <td class="p-md texto-centro peso-bold ${classeTaxa}">${taxa}%</td>
                <td class="p-md texto-centro peso-bold cor-texto-escuro">${entregasDoParticipante.length}</td>
                <td class="p-md texto-esquerda cor-texto-escuro">${textoUltima}</td>
            </tr>`;
        });
    }
    dash += criarContainerTabela(
        [
            { rotulo: 'Nome do Participante', classes: 'coluna-nome-tabela' },
            'Frequência (%)',
            'Entregas (Total)',
            'Última Atividade'
        ],
        linhasResumoAcademico,
        '',
        'corpo-tabela-acad'
    );

    setTimeout(() => {
        Busca.vincularFiltro('busca-tabela-acad', 'corpo-tabela-acad');

        const tipoFreq = document.getElementById('filtro-tipo-frequencia');
        if (tipoFreq) {
            tipoFreq.addEventListener('change', (e) => {
                const recipienteFiltro = document.getElementById('recipiente-filtro-disciplina-frequencia');
                if (recipienteFiltro) {
                    if (e.target.value === 'disciplina') {
                        recipienteFiltro.classList.remove('oculto');
                    } else {
                        recipienteFiltro.classList.add('oculto');
                        const elDisc = document.getElementById('filtro-disciplina-freq');
                        if (window.limparSeletorCustomizado) window.limparSeletorCustomizado('filtro-disciplina-freq');
                    }
                }
            });
        }
    }, 0);

    return dash;
}

async function gerarPDFFrequencia() {
    const elTipo = document.getElementById('filtro-tipo-frequencia');
    const elDisciplina = document.getElementById('filtro-disciplina-freq');
    const tipoRelatorio = elTipo ? elTipo.value : 'geral';
    const idDisciplina = elDisciplina ? elDisciplina.value : '';

    if (tipoRelatorio === 'disciplina' && !idDisciplina) {
        Utilidades.notificacao('Selecione uma disciplina para o relatório.', 'erro');
        return;
    }

    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, frequencias, paroquias } = dadosRelatorio;

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    const paroquiasMap = {};
    paroquias.forEach(p => { paroquiasMap[p.id_paroquia] = p.nome_paroquia; });
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    let html = `<h2>RELATÓRIO DE FREQUÊNCIA</h2>`;
    html += `<p><strong>Curso:</strong> ${curso.nome_curso || '-'}</p>`;
    html += `<p><strong>Data de Emissão:</strong> ${dataHoje}</p>`;

    if (tipoRelatorio === 'geral') {
        if (disciplinas.length === 0) {
            html += `<p>Nenhuma disciplina cadastrada.</p>`;
            dispararImpressao('Relatório de Frequência Geral', html);
            return;
        }

        const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
        const agrupados = {};

        participantes.forEach(participante => {
            const idParoquia = participante.id_paroquia || 'sem_paroquia';
            if (!agrupados[idParoquia]) agrupados[idParoquia] = [];
            agrupados[idParoquia].push(participante);
        });

        Object.keys(agrupados).sort((a, b) => {
            const nomeA = paroquiasMap[a] || 'Sem Vínculo';
            const nomeB = paroquiasMap[b] || 'Sem Vínculo';
            return nomeA.localeCompare(nomeB);
        }).forEach((idParoquia, index) => {
            const participantesGrupo = agrupados[idParoquia].sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
            const nomeParoquia = paroquiasMap[idParoquia] || 'Participantes Sem Vínculo Paroquial';
            const quebra = index > 0 ? ' class="quebra-pagina-antes"' : '';
            
            html += `<div${quebra}><h3>Paróquia: ${nomeParoquia}</h3>`;
            html += `<table><thead><tr><th class="coluna-nome-documento">Participante</th>`;
            disciplinasOrdenadas.forEach(d => { html += `<th class="texto-centro">${d.nome_disciplina}</th>`; });
            html += `</tr></thead><tbody>`;

            participantesGrupo.forEach(participante => {
                html += `<tr><td><strong>${participante.nome_participante || '-'}</strong></td>`;
                disciplinasOrdenadas.forEach(disc => {
                    let presencas = 0, faltas = 0;
                    frequencias.forEach(f => {
                        if (String(f.id_disciplina) !== String(disc.id_disciplina) || !f.presencas || f.presencas[participante.id_participante] == null) return;
                        const estado = String(f.presencas[participante.id_participante]).toUpperCase();
                        if (estado === 'C' || estado === 'P' || estado === 'PRESENTE') presencas++;
                        else faltas++;
                    });
                    let valor = '';
                    if (presencas + faltas > 0) valor = faltas > presencas ? 'F' : 'C';
                    html += `<td class="texto-centro ${valor === 'C' ? 'cor-texto-sucesso peso-bold' : (valor === 'F' ? 'cor-texto-erro peso-bold' : '')}">${valor}</td>`;
                });
                html += `</tr>`;
            });
            html += `</tbody></table></div>`;
        });
        dispararImpressao('Relatório de Frequência Geral', html);
        return;
    }

    if (tipoRelatorio === 'disciplina') {
        const disciplinaSelecionada = disciplinas.find(d => String(d.id_disciplina) === String(idDisciplina));
        const nomeDisc = disciplinaSelecionada ? disciplinaSelecionada.nome_disciplina : '';
        const registrosDisciplina = frequencias.filter(f => String(f.id_disciplina) === String(idDisciplina));

        html += `<h3>Disciplina: ${nomeDisc}</h3>`;
        const presentes = new Set();
        const ausentes = new Set();

        registrosDisciplina.forEach(f => {
            if (!f.presencas || Object.keys(f.presencas).length === 0) return;
            Object.entries(f.presencas).forEach(([idParticipante, estado]) => {
                const participante = participantes.find(a => String(a.id_participante) === String(idParticipante));
                const nomeParticipante = participante ? (participante.nome_participante || participante.nome) : idParticipante;
                const tipo = String(estado || '').trim().toUpperCase();
                
                if (tipo === 'C' || tipo === 'P' || tipo === 'PRESENTE') { 
                    presentes.add(nomeParticipante); 
                    ausentes.delete(nomeParticipante); 
                } else { 
                    if (!presentes.has(nomeParticipante)) ausentes.add(nomeParticipante); 
                }
            });
        });

        html += `<table><thead><tr><th>Participantes Presentes (${presentes.size})</th></tr></thead><tbody>`;
        if (presentes.size > 0) {
            [...presentes].sort().forEach(nome => {
                html += `<tr><td><strong class="cor-texto-sucesso">P</strong> &nbsp; ${nome}</td></tr>`;
            });
        } else {
            html += `<tr><td class="texto-centro">Nenhum participante presente registrado.</td></tr>`;
        }
        html += `</tbody></table>`;

        html += `<table><thead><tr><th>Participantes Ausentes (${ausentes.size})</th></tr></thead><tbody>`;
        if (ausentes.size > 0) {
            [...ausentes].sort().forEach(nome => {
                html += `<tr><td><strong class="cor-texto-erro">F</strong> &nbsp; ${nome}</td></tr>`;
            });
        } else {
            html += `<tr><td class="texto-centro">Nenhum participante ausente registrado.</td></tr>`;
        }
        html += `</tbody></table>`;
        
        dispararImpressao('Relatório de Frequência - ' + nomeDisc, html);
    }
}

async function gerarPDFAtividades() {
    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, atividades, paroquias } = dadosRelatorio;

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    const disciplinasOrdenadas = [...disciplinas].sort((a, b) => (a.nome_disciplina || '').localeCompare(b.nome_disciplina || ''));
    const paroquiasMap = {};
    paroquias.forEach(p => { paroquiasMap[p.id_paroquia] = p.nome_paroquia; });

    const agrupados = {};
    participantes.forEach(participante => {
        const idParoquia = participante.id_paroquia || 'sem_paroquia';
        const capela = participante.capela ? participante.capela.trim() : 'Sem Capela';
        const chave = `${idParoquia}||${capela}`;
        if (!agrupados[chave]) agrupados[chave] = { idParoquia, capela, participantes: [] };
        agrupados[chave].participantes.push(participante);
    });

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let html = `<h2>RELATÓRIO GERAL DE ATIVIDADES (ENTREGAS)</h2><p><strong>Curso:</strong> ${curso.nome_curso || '-'}</p><p><strong>Data de Emissão:</strong> ${dataHoje}</p>`;

    if (disciplinasOrdenadas.length === 0) { html += `<p>Nenhuma disciplina cadastrada.</p>`; dispararImpressao('Atividades', html); return; }

    Object.values(agrupados).sort((a, b) => {
        const nomeA = paroquiasMap[a.idParoquia] || 'Sem Vínculo';
        const nomeB = paroquiasMap[b.idParoquia] || 'Sem Vínculo';
        const cmpParo = nomeA.localeCompare(nomeB);
        if (cmpParo !== 0) return cmpParo;
        return a.capela.localeCompare(b.capela);
    }).forEach((grupo, index) => {
        const participantesGrupo = grupo.participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
        if (participantesGrupo.length === 0) return;

        const nomeParoquia = paroquiasMap[grupo.idParoquia] || 'Participantes Sem Vínculo Paroquial';
        const quebra = index > 0 ? ' class="quebra-pagina-antes"' : '';

        html += `<div${quebra}><h3>Paróquia: ${nomeParoquia} / Capela: ${grupo.capela}</h3><table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th>`;
        disciplinasOrdenadas.forEach(d => { html += `<th class="texto-centro">${d.nome_disciplina}</th>`; });
        html += `</tr></thead><tbody>`;

        participantesGrupo.forEach(participante => {
            html += `<tr><td><strong>${participante.nome_participante || '-'}</strong></td>`;
            disciplinasOrdenadas.forEach(disc => {
                const entregou = atividades.some(a => String(a.id_participante) === String(participante.id_participante) && String(a.id_disciplina) === String(disc.id_disciplina));
                html += `<td class="texto-centro"><strong>${entregou ? 'X' : ''}</strong></td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
    });
    dispararImpressao('Relatório Geral de Atividades', html);
}

