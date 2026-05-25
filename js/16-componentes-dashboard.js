function criarCardMetrica(titulo, valor, classe = '', icone = '') {
    const classesCor = classe ? ` cor-texto-${classe}` : ' cor-texto-primario';
    const iconeParte = icone ? `<span class="icone-inline" data-icone="${icone}" aria-hidden="true"></span>` : '';

    return `
        <div class="cartao-metrica">
            <span class="texto-sm peso-bold cor-texto-claro">${titulo}</span>
            <div class="flex itens-centro gap-sm mt-xs">
                ${iconeParte}
                <h3 class="texto-lg peso-bold${classesCor} m-zero">${valor}</h3>
            </div>
        </div>
    `;
}

function criarGradeMetricas(metricas = [], colunas = 4) {
    if (metricas.length === 0) return '';

    const classeColunas = colunas === 3 ? 'grade-3-colunas' : colunas === 2 ? 'grade-2-colunas' : 'grade-4-colunas';
    const cards = metricas.map(metrica => criarCardMetrica(
        metrica.titulo,
        metrica.valor,
        metrica.classe || '',
        metrica.icone || ''
    )).join('');

    return `<div class="grade-metricas-dashboard ${classeColunas} gap-md mb-lg">${cards}</div>`;
}

function criarGrafico(id, tipo, labels, datasets, opcoes = {}) {
    if (!window.Chart) {
        console.warn('Chart.js não está carregado');
        return '';
    }

    const ehGraficoLinear = tipo === 'line';
    const configChart = {
        type: tipo,
        data: {
            labels,
            datasets: datasets.map((dataset, indice) => ({
                label: dataset.label || '',
                data: dataset.data || [],
                backgroundColor: dataset.backgroundColor || obterCoresGrafico(indice),
                borderColor: ehGraficoLinear ? (dataset.borderColor || obterCoresGrafico(indice, true)) : 'transparent',
                borderWidth: ehGraficoLinear ? (dataset.borderWidth ?? 2) : 0,
                hoverBorderWidth: 0,
                tension: dataset.tension ?? 0.4,
                fill: dataset.fill ?? ehGraficoLinear,
                ...dataset,
                borderColor: ehGraficoLinear ? (dataset.borderColor || obterCoresGrafico(indice, true)) : 'transparent',
                borderWidth: ehGraficoLinear ? (dataset.borderWidth ?? 2) : 0,
                hoverBorderWidth: 0
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12, weight: '500' },
                        color: 'rgba(25, 26, 26, 0.7)'
                    }
                }
            },
            scales: tipo === 'pie' || tipo === 'doughnut' || tipo === 'radar' ? {} : {
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: 'rgba(25, 26, 26, 0.5)',
                        font: { size: 11 }
                    }
                },
                x: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: 'rgba(25, 26, 26, 0.5)',
                        font: { size: 11 }
                    }
                }
            },
            ...opcoes
        }
    };

    setTimeout(() => {
        const canvas = document.getElementById(id);
        if (canvas) new Chart(canvas, configChart);
    }, 100);

    return `<canvas id="${id}"></canvas>`;
}

function obterCoresGrafico(indice = 0, borda = false) {
    const coresPrimarias = [
        '122, 28, 44',
        '52, 56, 96',
        '16, 185, 129',
        '245, 158, 11',
        '195, 149, 108'
    ];
    const cor = coresPrimarias[indice % coresPrimarias.length];
    return `rgba(${cor}, ${borda ? '0.8' : '0.1'})`;
}

function calcularEstatisticasAcademicas(participantes = [], frequencias = [], atividades = []) {
    const estatisticas = {
        totalParticipantes: participantes.length,
        frequenciaMedia: 0,
        participantesEmRisco: 0,
        entregasTotal: atividades.length,
        taxaEntrega: 0,
        frequenciaPorFaixa: { excelente: 0, bom: 0, critico: 0 }
    };

    if (participantes.length === 0) return estatisticas;

    let somaFrequencias = 0;
    participantes.forEach(participante => {
        let presencas = 0;
        let faltas = 0;

        frequencias.forEach(frequencia => {
            const valor = frequencia.presencas?.[participante.id_participante];
            if (!valor) return;
            if (valor === 'C' || valor === 'P' || valor === 'PRESENTE') presencas++;
            else faltas++;
        });

        const total = presencas + faltas;
        const taxa = total > 0 ? (presencas / total) * 100 : 100;
        somaFrequencias += taxa;

        if (taxa < 75) estatisticas.participantesEmRisco++;
        if (taxa >= 90) estatisticas.frequenciaPorFaixa.excelente++;
        else if (taxa >= 75) estatisticas.frequenciaPorFaixa.bom++;
        else estatisticas.frequenciaPorFaixa.critico++;
    });

    estatisticas.frequenciaMedia = Math.round(somaFrequencias / participantes.length);
    estatisticas.taxaEntrega = Math.round((atividades.length / Math.max(participantes.length * 5, 1)) * 100);
    return estatisticas;
}

function calcularEstatisticasFinanceiras(participantes = [], pagamentos = [], despesas = []) {
    const estatisticas = {
        totalEntradas: pagamentos.reduce((acc, pagamento) => acc + Utilidades.normalizarValorMonetario(pagamento.valor || pagamento.valor_pago || 0), 0),
        totalSaidas: despesas.reduce((acc, despesa) => acc + Utilidades.normalizarValorMonetario(despesa.valor || 0), 0),
        saldoCaixa: 0,
        inadimplentes: 0,
        taxaInadimplencia: 0,
        statusSaude: 'saudavel'
    };

    estatisticas.saldoCaixa = estatisticas.totalEntradas - estatisticas.totalSaidas;

    const pagamentosPorParticipante = {};
    pagamentos.forEach(pagamento => {
        if (!pagamentosPorParticipante[pagamento.id_participante]) pagamentosPorParticipante[pagamento.id_participante] = 0;
        pagamentosPorParticipante[pagamento.id_participante] += 1;
    });

    estatisticas.inadimplentes = participantes.filter(participante => !pagamentosPorParticipante[participante.id_participante]).length;
    estatisticas.taxaInadimplencia = participantes.length > 0
        ? Math.round((estatisticas.inadimplentes / participantes.length) * 100)
        : 0;

    if (estatisticas.saldoCaixa > estatisticas.totalEntradas * 0.3) estatisticas.statusSaude = 'saudavel';
    else if (estatisticas.saldoCaixa > estatisticas.totalEntradas * 0.1) estatisticas.statusSaude = 'atencao';
    else estatisticas.statusSaude = 'critico';

    return estatisticas;
}

function agruparFrequenciasPorFaixa(participantes = [], frequencias = []) {
    const faixas = {
        '0-50%': 0,
        '50-75%': 0,
        '75-90%': 0,
        '90-100%': 0
    };

    participantes.forEach(participante => {
        let presencas = 0;
        let faltas = 0;

        frequencias.forEach(frequencia => {
            const valor = frequencia.presencas?.[participante.id_participante];
            if (!valor) return;
            if (valor === 'C' || valor === 'P' || valor === 'PRESENTE') presencas++;
            else faltas++;
        });

        const total = presencas + faltas;
        const taxa = total > 0 ? (presencas / total) * 100 : 100;

        if (taxa < 50) faixas['0-50%']++;
        else if (taxa < 75) faixas['50-75%']++;
        else if (taxa < 90) faixas['75-90%']++;
        else faixas['90-100%']++;
    });

    return faixas;
}

function agruparPagamentosPorStatus(participantes = [], pagamentos = [], cursos = []) {
    const status = {
        Completo: 0,
        Parcial: 0,
        Pendente: 0
    };

    participantes.forEach(participante => {
        const curso = cursos.find(item => String(item.id_curso) === String(participante.id_curso));
        const pagamentosParticipante = pagamentos.filter(pagamento => String(pagamento.id_participante) === String(participante.id_participante));
        const quantidadeExigida = curso ? parseInt(curso.quantidade_mensalidades || 0, 10) : 0;
        const quantidadePaga = pagamentosParticipante.reduce((acc, pagamento) => {
            const ehMensalidade = String(pagamento.tipo_pagamento || pagamento.descricao || '').toLowerCase().match(/parcela|mensalidade|parc/);
            return acc + (ehMensalidade ? (parseInt(pagamento.quantidade, 10) || 1) : 0);
        }, 0);

        if (quantidadePaga === 0) status.Pendente++;
        else if (quantidadePaga >= quantidadeExigida) status.Completo++;
        else status.Parcial++;
    });

    return status;
}

function criarGradeGraficos(graficos = []) {
    if (graficos.length === 0) return '';

    const itens = graficos.map(grafico => `
        <div class="grafico-item">
            ${grafico.titulo ? `<h4 class="texto-md peso-bold cor-texto-primario mb-sm">${grafico.titulo}</h4>` : ''}
            ${criarGrafico(grafico.id, grafico.tipo, grafico.labels, grafico.datasets, grafico.opcoes || {})}
        </div>
    `).join('');

    return `<div class="grade-graficos">${itens}</div>`;
}
