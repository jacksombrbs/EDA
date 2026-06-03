async function gerarListaFisicaFrequencia() {
    const idCurso = document.getElementById('freq-curso')?.value || '';
    const idDisciplina = document.getElementById('freq-disciplina')?.value || '';
    const data = document.getElementById('freq-data')?.value || new Date().toISOString().split('T')[0];

    if (!idCurso) return Utilidades.notificacao('Selecione um curso para imprimir a lista.', 'erro');
    if (!idDisciplina) return Utilidades.notificacao('Selecione uma disciplina para imprimir a lista.', 'erro');

    const html = await montarHtmlListaFrequencia(idCurso, idDisciplina, data);
    abrirDocumentoImpressao('Lista de Assinaturas', html, {
        orientacao: 'paisagem',
        estilosExtras: '.nome-assinatura { font-size: 14px; } .status-assinatura { margin-left: 6px; font-size: 11px; }'
    });
}

async function montarHtmlListaFrequencia(idCurso, idDisciplina, data) {
    const [curso, disciplina, participantes, paroquias] = await Promise.all([
        bd.obter('cursos', idCurso),
        bd.obter('disciplinas', idDisciplina),
        obterParticipantesDoCurso(idCurso, { mostrarTodos: true }),
        bd.obterTodos('paroquias')
    ]);

    const mapaParoquias = Object.fromEntries(paroquias.map(paroquia => [paroquia.id, paroquia.nome]));

    let html = '<h2>LISTA DE ASSINATURAS - TODOS OS PARTICIPANTES</h2>';
    html += `<p><strong>Curso:</strong> ${Utilidades.escaparHtml(curso?.nome || '-')}</p>`;
    html += `<p><strong>Disciplina:</strong> ${Utilidades.escaparHtml(disciplina?.nome || '-')}</p>`;
    html += `<p><strong>Data da Aula:</strong> ${Utilidades.formatarData(data)}</p>`;
    html += `<p><strong>Carga horária:</strong> ${formatarHorasCargaHoraria(obterCargaHorariaDisciplina(disciplina))}</p>`;

    if (participantes.length === 0) {
        html += '<p class="texto-centro">Nenhum participante cadastrado neste curso.</p>';
        return html;
    }

    html += '<table><thead><tr><th class="coluna-nome-documento">Nome do Participante</th><th>Paróquia</th><th class="coluna-assinatura">Assinatura</th></tr></thead><tbody>';
    participantes.forEach(participante => {
        const status = Utilidades.participanteEstaAtivo(participante) ? '' : '<span class="status-assinatura cor-texto-erro peso-bold">Desistente</span>';
        html += `<tr class="linha-assinatura"><td><strong class="nome-assinatura">${Utilidades.escaparHtml(participante.nome || '-')}</strong>${status}</td><td>${Utilidades.escaparHtml(mapaParoquias[participante.id_paroquia] || 'Não informada')}</td><td></td></tr>`;
    });
    html += '</tbody></table>';

    return html;
}
