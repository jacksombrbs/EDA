function criarGrafico(id, tipo, labels, datasets, opcoes = {}) {
    if (!window.Chart) return '';

    const ehGraficoLinear = tipo === 'line';
    const configuracao = {
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
                ...dataset
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                    ticks: { color: 'rgba(25, 26, 26, 0.5)', font: { size: 11 } }
                },
                x: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false },
                    ticks: { color: 'rgba(25, 26, 26, 0.5)', font: { size: 11 } }
                }
            },
            ...opcoes
        }
    };

    setTimeout(() => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        if (canvas._grafico) canvas._grafico.destroy();
        canvas._grafico = new Chart(canvas, configuracao);
    }, 100);

    return `<canvas id="${id}"></canvas>`;
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

function montarGraficoFrequencia(participantes = [], frequencias = [], percentualMinimo = PERCENTUAL_MINIMO_FREQUENCIA_PADRAO) {
    const faixas = agruparFrequenciasPorFaixa(participantes, frequencias, percentualMinimo);

    return {
        id: 'grafico-frequencia-academico',
        titulo: 'Distribuição de Frequência',
        tipo: 'doughnut',
        labels: Object.keys(faixas),
        datasets: [{
            label: 'Distribuição de Frequência',
            data: Object.values(faixas),
            backgroundColor: [
                'rgba(239, 68, 68, 0.78)',
                'rgba(245, 158, 11, 0.78)',
                'rgba(59, 130, 246, 0.78)',
                'rgba(16, 185, 129, 0.78)'
            ],
            borderWidth: 0,
            hoverBorderWidth: 0
        }],
        opcoes: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    };
}

function montarGraficoPagamentos(participantes = [], pagamentos = [], cursos = [], disciplinas = [], frequencias = []) {
    const status = agruparPagamentosPorStatus(participantes, pagamentos, cursos, disciplinas, frequencias);

    return {
        id: 'grafico-pagamentos-financeiro',
        titulo: 'Status de Pagamentos',
        tipo: 'pie',
        labels: Object.keys(status),
        datasets: [{
            label: 'Status de Pagamentos',
            data: Object.values(status),
            backgroundColor: [
                'rgba(16, 185, 129, 0.78)',
                'rgba(245, 158, 11, 0.78)',
                'rgba(239, 68, 68, 0.78)'
            ],
            borderWidth: 0,
            hoverBorderWidth: 0
        }],
        opcoes: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    };
}

function montarGraficoEntradasSaidas(estatisticas = {}) {
    return {
        id: 'grafico-entradas-saidas',
        titulo: 'Entradas e Saídas',
        tipo: 'bar',
        labels: ['Total'],
        datasets: [
            {
                label: 'Entradas',
                data: [Utilidades.normalizarValorMonetario(estatisticas.totalEntradas) / 1000],
                backgroundColor: 'rgba(16, 185, 129, 0.78)',
                borderWidth: 0,
                hoverBorderWidth: 0
            },
            {
                label: 'Saídas',
                data: [Utilidades.normalizarValorMonetario(estatisticas.totalSaidas) / 1000],
                backgroundColor: 'rgba(239, 68, 68, 0.78)',
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
    };
}
