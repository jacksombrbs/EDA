function criarCardMetrica(titulo, valor, classe = '', icone = '', acao = '') {
    const iconeHtml = icone ? `<span class="icone-metrica" data-icone="${Utilidades.escaparHtml(icone)}"></span>` : '';
    const atributos = acao ? ` role="button" tabindex="0" onclick="${Utilidades.escaparHtml(acao)}" onkeydown="if(event.key==='Enter'){${Utilidades.escaparHtml(acao)}}"` : '';
    const classeInterativa = acao ? ' cartao-metrica-interativo' : '';

    return `
        <div class="cartao-metrica ${classe}${classeInterativa}"${atributos}>
            ${iconeHtml}
            <span>${Utilidades.escaparHtml(titulo)}</span>
            <strong>${Utilidades.escaparHtml(valor)}</strong>
        </div>
    `;
}

function criarGradeMetricas(itens = [], colunas = 3) {
    const classeColunas = `grade-${colunas}-colunas`;
    const conteudo = itens.map(item => {
        if (typeof item === 'string') return item;
        return criarCardMetrica(item.titulo, item.valor, item.classe || '', item.icone || '', item.acao || '');
    }).join('');

    return `<div class="grade-metricas-painel ${classeColunas}">${conteudo}</div>`;
}

function criarMetricasRelatorio(itens = []) {
    return `
        <div class="grade-metricas-relatorio">
            ${itens.map(item => `
                <div class="metrica-relatorio">
                    <span>${Utilidades.escaparHtml(item.rotulo)}</span>
                    <strong>${Utilidades.escaparHtml(item.valor)}</strong>
                </div>
            `).join('')}
        </div>
    `;
}


function montarCabecalhoRelatorioImpresso(titulo, detalhes = []) {
    const linhas = detalhes
        .filter(item => item && item.valor !== undefined && item.valor !== null && item.valor !== '')
        .map(item => `<p><strong>${Utilidades.escaparHtml(item.rotulo)}:</strong> ${Utilidades.escaparHtml(item.valor)}</p>`)
        .join('');

    return `<h2>${Utilidades.escaparHtml(titulo)}</h2>${linhas}`;
}

function abrirGrupoParoquiaRelatorio(nomeParoquia, indice = 0) {
    const quebra = indice > 0 ? ' class="quebra-pagina-antes"' : '';
    return `<div${quebra}><h3>Paróquia: ${Utilidades.escaparHtml(nomeParoquia || 'Participantes Sem Vínculo Paroquial')}</h3>`;
}

function fecharGrupoParoquiaRelatorio() {
    return '</div>';
}
