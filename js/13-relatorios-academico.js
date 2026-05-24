function renderizarControlesAcademico(disciplinas) {
    let html = '<div class="flex gap-md mb-lg md-flex-coluna itens-esticar">';

    html += '<div class="flex-1 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md p-md flex flex-coluna justifica-espaco">';
    html += '<div class="flex justifica-espaco itens-centro mb-sm gap-sm">';
    html += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Relatório de Frequência</h3>';
    html += criarBotao('Gerar Relatório', 'gerarPDFFrequencia()');
    html += '</div>';
    html += '<div class="flex gap-md md-flex-coluna w-total">';
    html += '<div class="flex-1 w-total">' + criarSeletor('Tipo', 'filtro-tipo-frequencia', [{ id: 'geral', nome: 'Geral (Todos)' }, { id: 'disciplina', nome: 'Por Disciplina' }], 'geral', false) + '</div>';
    html += '<div id="recipiente-filtro-disciplina-frequencia" class="oculto flex-1 w-total">' + criarSeletor('Disciplina', 'filtro-disciplina-freq', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), '', false) + '</div>';
    html += '</div></div>';

    html += '<div class="flex-1 fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md p-md flex flex-coluna justifica-espaco">';
    html += '<div class="flex justifica-espaco itens-centro mb-sm gap-sm">';
    html += '<h3 class="texto-md peso-bold cor-texto-primario m-zero">Lista de Assinatura (Física)</h3>';
    html += criarBotao('Gerar Relatório', 'gerarPDFAssinaturas()');
    html += '</div>';
    html += '<div class="flex gap-md md-flex-coluna w-total">';
    html += '<div class="flex-1 w-total">' + criarSeletor('Selecione a Disciplina', 'filtro-disciplina-ass', disciplinas.map(d => ({ id: d.id_disciplina, nome: d.nome_disciplina })), '', false) + '</div>';
    html += '</div></div>';

    html += '<div class="fundo-superficie-2 borda-1 borda-solida borda-cor-padrao raio-md p-md flex flex-coluna justifica-espaco md-w-total">';
    html += '<h3 class="texto-md peso-bold cor-texto-primario mb-sm m-zero">Relatório de Atividades</h3>';
    html += '<div class="flex gap-md md-flex-coluna w-total h-total">';
    html += '<div class="flex flex-coluna justifica-fim w-total h-total">' + criarBotao('Gerar Relatório', 'gerarPDFAtividades()', 'primario', 'w-total mt-auto') + '</div>';
    html += '</div></div>';

    html += '</div>';

    setTimeout(() => {
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

    return html;
}

function renderizarDashboardAcademico(participantes, frequencias, atividades, disciplinas) {
    let dash = '<div class="flex flex-coluna gap-sm mb-md w-total">';
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
    }, 0);

    return dash;
}

async function gerarPDFAssinaturas() {
    const elDisciplina = document.getElementById('filtro-disciplina-ass');
    const idDisciplina = elDisciplina ? elDisciplina.value : '';
    if (!idDisciplina) { Utilidades.notificacao('Selecione uma disciplina.', 'aviso'); return; }

    const dadosRelatorio = await obterDadosCursoRelatorio();
    if (!dadosRelatorio) return;

    const { curso, disciplinas, participantes, paroquias } = dadosRelatorio;

    participantes.sort((a, b) => (a.nome_participante || '').localeCompare(b.nome_participante || ''));
    const disciplinaSelecionada = disciplinas.find(d => String(d.id_disciplina) === String(idDisciplina));
    const nomeDisc = disciplinaSelecionada ? disciplinaSelecionada.nome_disciplina : '';
    const paroquiasMap = {};
    paroquias.forEach(p => { paroquiasMap[p.id_paroquia] = p.nome_paroquia; });

    let html = `<h2>LISTA DE ASSINATURAS (PRESENÇA FÍSICA)</h2><p><strong>Curso:</strong> ${curso.nome_curso || '-'}</p><p><strong>Disciplina:</strong> ${nomeDisc}</p><p><strong>Data da Aula:</strong> ____/____/________</p>`;
    if (participantes.length === 0) { html += `<p class="texto-centro">Nenhum participante cadastrado.</p>`; dispararImpressao('Lista', html); return; }

    html += `<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th><th>Paróquia</th><th class="coluna-assinatura">Assinatura</th></tr></thead><tbody>`;
    participantes.forEach(participante => {
        const paroquia = paroquiasMap[participante.id_paroquia] || 'Não informada';
        html += `<tr class="linha-assinatura"><td><strong>${participante.nome_participante || '-'}</strong></td><td>${paroquia}</td><td></td></tr>`;
    });
    html += `</tbody></table>`;
    dispararImpressao('Lista de Assinaturas', html);
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

