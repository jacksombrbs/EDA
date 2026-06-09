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
                ${criarItemFichaPDF('Cobranças', financeiro.textoCobrancas)}
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
                    ['Cobranças', financeiro.textoCobrancas],
                    ['Valor da cobrança', financeiro.textoValorCobranca],
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
                <p><strong>Resumo:</strong> inscrição ${financeiro.inscricaoTexto.toLowerCase()}; cobranças ${financeiro.textoCobrancas}; valor-base ${financeiro.textoValorCobranca}; total pago ${Utilidades.formatarMoeda(financeiro.totalGeral)}; valor a pagar ${Utilidades.formatarMoeda(financeiro.valorPendente)}; valor em atraso ${Utilidades.formatarMoeda(financeiro.valorAtrasado)}; frequência ${frequencia.percentualTexto} (${frequencia.situacao}); ${atividades.total} atividade(s) registrada(s).</p>
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
