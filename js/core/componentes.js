const Busca = {
    buscarEmLista(lista, termo, campos) {
        if (!termo) return lista;

        const termoMinusculo = termo.toLowerCase();
        return lista.filter(item => campos.some(campo => {
            const valor = item[campo];
            return valor && valor.toString().toLowerCase().includes(termoMinusculo);
        }));
    },

    criarCampoBusca(id, textoExemplo = 'Buscar...') {
        const idBotaoLimpar = `${id}-limpar`;
        return `
            <div class="campo-busca-wrapper flex mb-md pos-relativa">
                <input type="text" id="${id}" class="campo-padrao campo-busca" placeholder="${textoExemplo}" autocomplete="off">
                <button type="button" id="${idBotaoLimpar}" class="botao-limpar-busca oculto" aria-label="Limpar busca" title="Limpar busca" onclick="Busca.limparCampo('${id}')">
                    ${criarIcone('cancelar')}
                </button>
            </div>
        `;
    },

    limparCampo(idCampo) {
        const campoBusca = document.getElementById(idCampo);
        if (!campoBusca) return;

        campoBusca.value = '';
        campoBusca.dispatchEvent(new Event('input', { bubbles: true }));
        campoBusca.focus();
    },

    atualizarBotaoLimpar(idCampo) {
        const campoBusca = document.getElementById(idCampo);
        const botaoLimpar = document.getElementById(`${idCampo}-limpar`);
        if (!campoBusca || !botaoLimpar) return;

        botaoLimpar.classList.toggle('oculto', !campoBusca.value);
    },

    vincularFiltro(idCampo, idCorpoTabela) {
        const campoBusca = document.getElementById(idCampo);
        const corpoTabela = document.getElementById(idCorpoTabela);
        if (!campoBusca || !corpoTabela) return;

        const filtrar = () => {
            const termo = (campoBusca.value || '').toLowerCase();
            corpoTabela.querySelectorAll('tr').forEach(linha => {
                const textoBusca = (linha.dataset.busca || linha.textContent || '').toLowerCase();
                linha.classList.toggle('oculto', !textoBusca.includes(termo));
            });
            Busca.atualizarBotaoLimpar(idCampo);
        };

        campoBusca.addEventListener('input', filtrar);
        filtrar();
    }
};

function criarBotao(rotulo, acao, variante = 'primario', classesExtras = '', tipo = 'button', atributosExtras = '') {
    const classesPorVariante = {
        neutro: 'botao-padrao',
        primario: 'botao-padrao botao-primario',
        secundario: 'botao-padrao botao-secundario',
        contorno: 'botao-padrao botao-contorno',
        perigo: 'botao-padrao botao-perigo',
        sucesso: 'botao-padrao botao-sucesso'
    };

    const classeBase = classesPorVariante[variante] || classesPorVariante.primario;
    const classesBotao = `${classeBase} ${classesExtras}`.trim();
    const atributoAcao = acao ? ` onclick="${acao}"` : '';
    const atributos = atributosExtras ? ` ${atributosExtras}` : '';

    return `<button type="${tipo}" class="${classesBotao}"${atributoAcao}${atributos}>${rotulo}</button>`;
}

function criarIcone(nome, classesExtras = '') {
    const classes = `icone-inline ${classesExtras}`.trim();
    return `<span class="${classes}" data-icone="${nome}" aria-hidden="true"></span>`;
}

function criarRodapeModal(acoes = [], opcoes = {}) {
    const classesExtras = opcoes.classesExtras || 'md-flex-coluna';
    const atributoId = opcoes.id ? ` id="${opcoes.id}"` : '';
    const conteudoAcoes = acoes.map(acao => {
        if (!acao) return '';
        if (acao.html) return acao.html;

        return criarBotao(
            acao.rotulo,
            acao.acao || '',
            acao.variante || 'primario',
            acao.classesExtras || 'md-w-total',
            acao.tipo || 'button',
            acao.atributosExtras || ''
        );
    }).join('');

    return `
        <div${atributoId} class="rodape-modal flex justifica-fim gap-sm pt-sm w-total ${classesExtras}">
            ${conteudoAcoes}
        </div>
    `;
}

function criarRodapeFormulario(acaoSalvar, textoSalvar = 'Salvar', opcoes = {}) {
    const textoCancelar = opcoes.textoCancelar || 'Cancelar';
    const acaoCancelar = opcoes.acaoCancelar || "Interface.fecharJanela('janela-formulario')";
    const botoesExtras = opcoes.botoesExtras || '';

    return criarRodapeModal([
        { rotulo: textoCancelar, acao: acaoCancelar, variante: 'secundario' },
        botoesExtras ? { html: botoesExtras } : null,
        {
            rotulo: textoSalvar,
            acao: acaoSalvar,
            variante: opcoes.varianteSalvar || 'primario',
            tipo: opcoes.tipoSalvar || 'button',
            atributosExtras: opcoes.atributosSalvar || ''
        }
    ], {
        id: opcoes.id,
        classesExtras: opcoes.classesExtras || 'md-flex-coluna'
    });
}

function criarAcoesTabela(acoes = []) {
    const botoes = acoes.map(acao => {
        const variante = acao.variante || (acao.perigo ? 'perigo' : 'contorno');
        const classesExtras = `botao-pequeno ${acao.classesExtras || ''}`.trim();
        return criarBotao(acao.rotulo, acao.acao, variante, classesExtras);
    }).join('');

    return `<div class="acoes-tabela">${botoes}</div>`;
}

function criarCartao(conteudo, classesExtras = '') {
    return `<div class="cartao-padrao ${classesExtras}">${conteudo}</div>`;
}

function criarCabecalhoSecao(titulo, botoes = '') {
    return `
        <div class="cabecalho-secao md-flex-coluna md-itens-esquerda">
            <h2 class="texto-lg peso-bold cor-texto-primario">${titulo}</h2>
            ${botoes}
        </div>
    `;
}

function criarContainerTabela(cabecalhos, linhas, idTabela = '', idCorpo = '', classesExtras = '') {
    const atributoTabela = idTabela ? ` id="${idTabela}"` : '';
    const atributoCorpo = idCorpo ? ` id="${idCorpo}"` : '';
    const ths = cabecalhos.map(cabecalho => {
        if (typeof cabecalho === 'object') {
            return `<th class="${cabecalho.classes || ''}">${cabecalho.rotulo}</th>`;
        }

        return `<th>${cabecalho}</th>`;
    }).join('');

    return `
        <div class="recipiente-tabela ${classesExtras}">
            <table class="tabela-padrao"${atributoTabela}>
                <thead><tr>${ths}</tr></thead>
                <tbody${atributoCorpo}>${linhas}</tbody>
            </table>
        </div>
    `;
}

function criarMensagemVazia(mensagem) {
    return `<p class="texto-md cor-texto-claro p-md texto-centro">${mensagem}</p>`;
}

function criarCampoSomenteLeitura(rotulo, id, valor = '', dados = {}) {
    const atributosDados = Object.entries(dados)
        .map(([chave, conteudo]) => `data-${chave}="${Utilidades.escaparHtml(conteudo)}"`)
        .join(' ');

    return `
        <div class="flex flex-coluna mb-md w-total">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <input type="text" id="${id}" value="${Utilidades.escaparHtml(valor)}" readonly class="campo-somente-leitura" ${atributosDados}>
        </div>
    `;
}

function criarEstilosDocumento() {
    return `
        :root {
            --cor-documento-vinho: #7A1C2C;
            --cor-documento-azul: #343860;
            --cor-documento-dourado: #C3956C;
            --cor-documento-texto: #191a1a;
            --cor-documento-claro: #6b7280;
            --cor-documento-borda: #e6ded8;
            --cor-documento-fundo: #fbfaf8;
            --fonte-documento: "Segoe UI", Arial, sans-serif;
        }

        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 24px; color: var(--cor-documento-texto); background: #ffffff; font-family: var(--fonte-documento); }
        .cabecalho-documento { margin-bottom: 24px; padding-bottom: 14px; border-bottom: 3px solid var(--cor-documento-vinho); text-align: center; }
        .logo-documento { display: block; width: 84px; height: auto; margin: 0 auto 8px; }
        .marca-documento { margin: 0; color: var(--cor-documento-vinho); font-size: 18px; font-weight: 800; text-transform: uppercase; }
        .submarca-documento { margin: 4px 0 0; color: var(--cor-documento-azul); font-size: 12px; font-weight: 700; text-transform: uppercase; }
        h1, h2 { margin: 0 0 12px; color: var(--cor-documento-azul); font-size: 18px; font-weight: 800; text-align: center; text-transform: uppercase; page-break-after: avoid; }
        h3 { margin: 22px 0 10px; padding-bottom: 5px; border-bottom: 1px solid var(--cor-documento-borda); color: var(--cor-documento-vinho); font-size: 14px; font-weight: 800; page-break-after: avoid; }
        p { margin: 6px 0; color: var(--cor-documento-texto); font-size: 12px; line-height: 1.55; }
        table { width: 100%; margin: 10px 0 16px; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th, td { padding: 8px; border: 1px solid var(--cor-documento-borda); font-size: 12px; text-align: left; vertical-align: top; }
        th { color: var(--cor-documento-azul); background: var(--cor-documento-fundo); font-weight: 800; }
        .texto-centro { text-align: center; }
        .texto-direita, .alinhado-direita { text-align: right; }
        .linha-total { font-weight: 800; background: var(--cor-documento-fundo); }
        .texto-sucesso, .cor-texto-sucesso { color: #047857; }
        .texto-erro, .cor-texto-erro { color: #b91c1c; }
        .peso-bold { font-weight: 800; }
        .quebra-pagina-antes { page-break-before: always; }
        .espaco-topo-grande { margin-top: 30px; }
        .coluna-nome-documento { min-width: 250px; }
        .coluna-assinatura { width: 50%; }
        .linha-assinatura td { height: 45px; }
        .recipiente-recibo { max-width: 720px; margin: 0 auto; padding: 30px; border: 2px solid var(--cor-documento-vinho); border-radius: 8px; }
        .titulo-recibo { margin-top: 4px; letter-spacing: 1.5px; }
        .valor-recibo { margin: 22px 0 28px; padding: 14px 18px; border-left: 5px solid var(--cor-documento-dourado); background: var(--cor-documento-fundo); color: var(--cor-documento-vinho); font-size: 22px; font-weight: 800; text-align: right; }
        .conteudo-recibo { font-size: 17px; line-height: 1.8; text-align: justify; }
        .conteudo-recibo p { font-size: 17px; }
        .conteudo-recibo strong { text-transform: uppercase; }
        .lista-participantes { margin: 15px 0; padding-left: 20px; column-count: 2; font-size: 14px; }
        .rodape-recibo { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 52px; }
        .assinatura-recibo { width: 280px; padding-top: 10px; border-top: 1px solid var(--cor-documento-texto); text-align: center; font-size: 14px; }
        .assinatura-nome { display: block; margin-top: 4px; color: var(--cor-documento-azul); font-size: 12px; font-weight: 800; }

        @media print {
            body { margin: 16px; }
            .recipiente-recibo { border-color: var(--cor-documento-vinho); box-shadow: none; }
        }
    `;
}

function criarCabecalhoDocumento() {
    const caminhoMarca = new URL(CAMINHO_MARCA_INSTITUCIONAL, window.location.href).href;

    return `
        <header class="cabecalho-documento">
            <img src="${caminhoMarca}" alt="${NOME_INSTITUCIONAL}" class="logo-documento">
            <p class="marca-documento">${NOME_INSTITUCIONAL}</p>
            <p class="submarca-documento">${SUBTITULO_INSTITUCIONAL}</p>
        </header>
    `;
}

function abrirDocumentoImpressao(titulo, htmlConteudo, opcoes = {}) {
    const janelaDocumento = window.open('', '_blank');
    if (!janelaDocumento) {
        Utilidades.notificacao('Permita pop-ups no navegador para visualizar o documento.', 'aviso');
        return;
    }

    const incluirCabecalho = opcoes.incluirCabecalho !== false;
    const estilosExtras = opcoes.estilosExtras || '';
    const orientacaoPagina = opcoes.orientacao === 'paisagem' ? 'landscape' : 'portrait';
    const estilosPagina = `@page { size: A4 ${orientacaoPagina}; margin: 10mm; } @media print { body { margin: 10mm; } }`;

    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${titulo}</title>
            <style>${criarEstilosDocumento()}${estilosPagina}${estilosExtras}</style>
        </head>
        <body>
            ${incluirCabecalho ? criarCabecalhoDocumento() : ''}
            ${htmlConteudo}
            <script>
                window.onload = function() { window.focus(); setTimeout(function() { window.print(); }, 300); };
                window.onafterprint = function() { window.close(); };
            </script>
        </body>
        </html>
    `;

    janelaDocumento.document.open();
    janelaDocumento.document.write(htmlCompleto);
    janelaDocumento.document.close();
}

function gerarReciboPadrao(tituloJanela, opcoes) {
    const htmlConteudo = `
        <section class="recipiente-recibo">
            <h1 class="titulo-recibo">${opcoes.titulo || 'RECIBO'}</h1>
            <div class="valor-recibo">${opcoes.rotuloValor || 'Valor'}: ${opcoes.valorFormatado}</div>
            <div class="conteudo-recibo">
                ${opcoes.conteudo}
            </div>
            <footer class="rodape-recibo">
                <div>
                    <p>Local e Data: <strong>Curitiba, ${opcoes.data}</strong></p>
                </div>
                <div class="assinatura-recibo">
                    ${opcoes.rotuloAssinatura || 'Assinatura'}
                    <span class="assinatura-nome">${opcoes.nomeAssinatura || NOME_INSTITUCIONAL}</span>
                </div>
            </footer>
        </section>
    `;

    abrirDocumentoImpressao(tituloJanela, htmlConteudo);
}

function criarSeletor(rotulo, id, opcoes, selecionado = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';
    const listaOpcoes = Array.isArray(opcoes) ? opcoes : [];
    const codificarArgumento = valor => JSON.stringify(String(valor ?? '')).replace(/"/g, '&quot;');
    const argumentoId = codificarArgumento(id);
    const obterValorOpcao = opcao => typeof opcao === 'object' ? opcao.id : opcao;
    const obterRotuloOpcao = opcao => typeof opcao === 'object' ? opcao.nome : opcao;
    const opcaoVazia = listaOpcoes.find(opcao => String(obterValorOpcao(opcao)) === '');
    const rotuloPadrao = opcaoVazia ? obterRotuloOpcao(opcaoVazia) : 'Selecione';
    const opcoesVisiveis = listaOpcoes
        .filter(opcao => String(obterValorOpcao(opcao)) !== '')
        .sort((a, b) => String(obterRotuloOpcao(a) || '').localeCompare(String(obterRotuloOpcao(b) || ''), 'pt-BR', { sensitivity: 'base', numeric: true }));

    let textoSelecionado = rotuloPadrao;
    if (selecionado) {
        const itemEncontrado = listaOpcoes.find(opcao => String(obterValorOpcao(opcao)) === String(selecionado));
        if (itemEncontrado) textoSelecionado = obterRotuloOpcao(itemEncontrado);
    }

    let codigoEstrutura = `
        <div class="flex flex-coluna mb-md pos-relativa w-total">
            <label class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <div class="cursor-apontador sem-selecao pos-relativa" onclick="window.alternarSeletorCustomizado(this, event)">
                <div class="campo-padrao flex itens-centro justifica-espaco" id="acionador-${id}">
                    <span>${Utilidades.escaparHtml(textoSelecionado)}</span>
                    <span class="texto-sm cor-texto-claro">▼</span>
                </div>
                <div class="opcoes-seletor-customizado seletor-opcoes pos-absoluta borda-1 borda-solida borda-cor-padrao raio-sm rolagem-y z-maximo w-total oculto">
                    <div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador ${selecionado ? '' : 'cor-texto-primario peso-bold'}" onclick="window.atualizarSeletorCustomizado(${argumentoId}, &quot;&quot;, ${codificarArgumento(rotuloPadrao)}, event)">${Utilidades.escaparHtml(rotuloPadrao)}</div>`;

    let opcoesNativas = `<option value="">${Utilidades.escaparHtml(rotuloPadrao)}</option>`;

    opcoesVisiveis.forEach(opcao => {
        const valor = obterValorOpcao(opcao);
        const rotuloOpcao = obterRotuloOpcao(opcao);
        const valorEscapado = Utilidades.escaparHtml(valor);
        const rotuloEscapado = Utilidades.escaparHtml(rotuloOpcao);
        const classesAtivas = String(valor) === String(selecionado) ? 'cor-texto-primario peso-bold' : '';

        codigoEstrutura += `<div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador ${classesAtivas}" onclick="window.atualizarSeletorCustomizado(${argumentoId}, ${codificarArgumento(valor)}, ${codificarArgumento(rotuloOpcao)}, event)">${rotuloEscapado}</div>`;
        opcoesNativas += `<option value="${valorEscapado}" ${String(valor) === String(selecionado) ? 'selected' : ''}>${rotuloEscapado}</option>`;
    });

    codigoEstrutura += `
                </div>
            </div>
            <select id="${id}" class="oculto" ${obrigatorioHtml}>
                ${opcoesNativas}
            </select>
        </div>`;

    return codigoEstrutura;
}

window.alternarSeletorCustomizado = function (elemento, evento) {
    evento.stopPropagation();
    const caixaOpcoes = elemento.querySelector('.opcoes-seletor-customizado');
    if (!caixaOpcoes) return;

    const jaAberto = !caixaOpcoes.classList.contains('oculto');
    document.querySelectorAll('.opcoes-seletor-customizado').forEach(opcoes => opcoes.classList.add('oculto'));

    if (!jaAberto) caixaOpcoes.classList.remove('oculto');
};

window.atualizarSeletorCustomizado = function (idSeletor, valor, rotulo, evento) {
    if (evento) evento.stopPropagation();

    const seletorNativo = document.getElementById(idSeletor);
    if (!seletorNativo) return;

    seletorNativo.value = valor;

    const acionador = document.getElementById(`acionador-${idSeletor}`);
    if (acionador) acionador.querySelector('span').textContent = rotulo;

    const recipiente = acionador?.closest('.cursor-apontador');
    if (recipiente) {
        const caixaOpcoes = recipiente.querySelector('.opcoes-seletor-customizado');
        if (caixaOpcoes) caixaOpcoes.classList.add('oculto');

        recipiente.querySelectorAll('.opcao-customizada').forEach(opcao => {
            opcao.classList.remove('cor-texto-primario', 'peso-bold');
        });

        if (evento?.target) evento.target.classList.add('cor-texto-primario', 'peso-bold');
    }

    seletorNativo.dispatchEvent(new Event('change', { bubbles: true }));
};

window.limparSeletorCustomizado = function (idSeletor, rotulo = 'Selecione') {
    const seletorNativo = document.getElementById(idSeletor);
    if (seletorNativo) seletorNativo.value = '';

    const acionador = document.getElementById(`acionador-${idSeletor}`);
    if (!acionador) return;

    const textoAcionador = acionador.querySelector('span');
    if (textoAcionador) textoAcionador.textContent = rotulo;

    const recipiente = acionador.closest('.cursor-apontador');
    if (!recipiente) return;

    recipiente.querySelectorAll('.opcao-customizada').forEach((opcao, indice) => {
        opcao.classList.remove('cor-texto-primario', 'peso-bold');
        if (indice === 0) opcao.classList.add('cor-texto-primario', 'peso-bold');
    });
};

document.addEventListener('click', () => {
    document.querySelectorAll('.opcoes-seletor-customizado').forEach(opcoes => {
        opcoes.classList.add('oculto');
    });
});

function criarCampoFormulario(rotulo, tipo, id, valor = '', textoExemplo = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';

    return `
        <div class="flex flex-coluna mb-md">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <input type="${tipo}" id="${id}" class="campo-padrao" value="${Utilidades.escaparHtml(valor)}" placeholder="${textoExemplo}" ${obrigatorioHtml}>
        </div>
    `;
}

function criarAreaTexto(rotulo, id, valor = '', linhas = 3, obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';

    return `
        <div class="flex flex-coluna mb-md coluna-total">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <textarea id="${id}" class="campo-padrao" rows="${linhas}" ${obrigatorioHtml}>${Utilidades.escaparHtml(valor)}</textarea>
        </div>
    `;
}

const SeletorDinamico = {
    vincular(idSeletorPai, idContainerFilho, labelFilho, idSeletorFilho, dadosTodos, campoFiltro, textoPadrao, valorInicialFilho = '', aoMudarOFilho = null) {
        const elementoPai = document.getElementById(idSeletorPai);
        if (!elementoPai) return;

        const executarFiltragem = (manterSelecao = false) => {
            const valorPai = elementoPai.value;
            const container = document.getElementById(idContainerFilho);
            if (!container) return;

            if (!valorPai) {
                container.innerHTML = criarSeletor(labelFilho, idSeletorFilho, [{ id: '', nome: 'Selecione o curso primeiro...' }], '');
                if (aoMudarOFilho) aoMudarOFilho('');
                return;
            }

            const filtrados = dadosTodos.filter(item => String(item[campoFiltro]) === String(valorPai));
            const opcoes = [{ id: '', nome: filtrados.length === 0 ? 'Nenhum registro encontrado...' : textoPadrao }];

            filtrados.forEach(item => {
                opcoes.push({
                    id: item.id || '',
                    nome: item.nome || ''
                });
            });

            const elementoFilhoAtual = document.getElementById(idSeletorFilho);
            const valorAtual = elementoFilhoAtual ? elementoFilhoAtual.value : '';
            const valorFinal = manterSelecao ? (valorInicialFilho || valorAtual || '') : '';
            const valido = filtrados.some(item => String(item.id) === String(valorFinal));

            container.innerHTML = criarSeletor(labelFilho, idSeletorFilho, opcoes, valido ? valorFinal : '');

            const elementoFilhoNovo = document.getElementById(idSeletorFilho);
            if (elementoFilhoNovo && aoMudarOFilho) {
                elementoFilhoNovo.addEventListener('change', () => aoMudarOFilho(elementoFilhoNovo.value));
                aoMudarOFilho(elementoFilhoNovo.value);
            }
        };

        elementoPai.addEventListener('change', () => executarFiltragem(false));
        executarFiltragem(true);
    }
};
