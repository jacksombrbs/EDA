function montarHtmlPDF(titulo, corpo) {
    return `<h2>${Utilidades.escaparHtml(titulo)}</h2>${corpo}`;
}

async function gerarPDFFrequencia() {
    return gerarPDFFrequenciaAcademico();
}

async function gerarPDFAtividades() {
    return gerarPDFAtividadesAcademico();
}

async function gerarPDFLivroCaixa() {
    return gerarPDFLivroCaixaFinanceiro();
}

async function gerarPDFMensalidades() {
    return gerarPDFMensalidadesFinanceiro();
}

async function gerarPDFPagamentos() {
    return gerarPDFPagamentosFinanceiro();
}

async function gerarPDFInadimplentes() {
    return gerarPDFInadimplentesFinanceiro();
}
