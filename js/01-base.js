const ABA_INICIAL = 'cursos';
const NOME_INSTITUCIONAL = 'Comissão Bíblico-Catequética';
const SUBTITULO_INSTITUCIONAL = 'Escola de Catequistas e Cursos de Formação';
const CAMINHO_MARCA_INSTITUCIONAL = 'marca-comissao-desenho.svg';
const VERSAO_APLICATIVO = '1.1.0';
const VERSAO_DADOS_APLICATIVO = 1;

const ICONES_BOTOES_MODAL = [
    { termos: ['Cancelar', 'Fechar'], icone: 'cancelar' },
    { termos: ['Enviar via WhatsApp'], icone: 'enviar' },
    { termos: ['Salvar', 'Atualizar'], icone: 'salvar' },
    { termos: ['Gerar Recibo'], icone: 'recibo' },
    { termos: ['Validar Planilha'], icone: 'validar-planilha' }
];

const ROTAS_ABAS = {
    cursos: conteudo => renderizarCursos(conteudo),
    paroquias: conteudo => renderizarParoquias(conteudo),
    palestrantes: conteudo => renderizarPalestrantes(conteudo),
    disciplinas: conteudo => renderizarDisciplinas(conteudo),
    participantes: conteudo => renderizarParticipantes(conteudo),
    frequencia: conteudo => renderizarFrequencia(conteudo),
    atividades: conteudo => renderizarAtividades(conteudo),
    pagamentos: conteudo => renderizarPagamentos(conteudo),
    avisos: conteudo => renderizarAvisos(conteudo),
    financas: conteudo => renderizarFinancas(conteudo),
    relatorios: conteudo => renderizarRelatorios(conteudo)
};

let abaAtual = ABA_INICIAL;
let participanteAtual = null;
let modoEdicao = null;
let registroEmEdicao = null;
let frequenciaAtual = {};
let cursoSelecionado = '';
let elementoFocoAntesJanela = null;

document.addEventListener('DOMContentLoaded', async () => {
    await bd.inicializar();
    Interface.fecharJanela('janela-formulario');
    const formularioConteudo = document.getElementById('conteudo-formulario');
    if (formularioConteudo) formularioConteudo.innerHTML = '';

    const paginaInicio = document.getElementById('pagina-inicio');
    const bloquearScrollInicial = (evento) => {
        if (paginaInicio && !paginaInicio.classList.contains('oculto')) {
            evento.preventDefault();
        }
    };

    document.addEventListener('wheel', bloquearScrollInicial, { passive: false });
    document.addEventListener('touchmove', bloquearScrollInicial, { passive: false });

    console.log('Aplicativo iniciado com IndexedDB');
});

const Utilidades = {
    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    formatarData(data) {
        if (!data) return '';
        if (typeof data === 'number') {
            const d = new Date((data - 25569) * 86400 * 1000);
            return d.toLocaleDateString('pt-BR');
        }
        const partes = data.split('-');
        if (partes.length !== 3) return data;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },

    normalizarValorMonetario(valor) {
        if (typeof valor === 'number') return valor;

        const texto = String(valor || '0').trim();
        if (!texto) return 0;

        const textoNormalizado = texto.includes(',') && texto.includes('.')
            ? texto.replace(/\./g, '').replace(',', '.')
            : texto.replace(',', '.');

        const numero = parseFloat(textoNormalizado);
        return Number.isFinite(numero) ? numero : 0;
    },

    formatarMoeda(valor) {
        return this.normalizarValorMonetario(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    notificacao(mensagem, tipo = 'sucesso') {
        const div = document.createElement('div');
        div.className = `aviso-flutuante pos-fixa direita-30 base-30 p-md raio-sm sombra-2 texto-lg peso-bold z-maximo fundo-toast-${tipo} cor-texto-${tipo} animacao-deslize`;
        
        div.textContent = mensagem;
        document.body.appendChild(div);

        setTimeout(() => {
            div.remove();
        }, 3000);
    },

    copiarParaClipboard(texto) {
        navigator.clipboard.writeText(texto).then(() => {
            this.notificacao('Copiado para a área de transferência!', 'sucesso');
        });
    }
};

const Interface = {
    mostrarPagina(idPagina) {
        document.querySelectorAll('.pagina, [id^="pagina-"]').forEach(p => {
            p.classList.add('oculto');
        });

        const paginaAlvo = document.getElementById(idPagina);
        if (paginaAlvo) {
            paginaAlvo.classList.remove('oculto');
        }
    },

    fecharJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (janela) {
            janela.classList.add('oculto');
            janela.setAttribute('aria-hidden', 'true');
            janela.removeEventListener('keydown', this.tratarTeclaJanela);
            window.atualizarBotaoTopo?.();

            if (elementoFocoAntesJanela && document.contains(elementoFocoAntesJanela)) {
                elementoFocoAntesJanela.focus({ preventScroll: true });
            }
            elementoFocoAntesJanela = null;
        }
    },

    abrirJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (janela) {
            elementoFocoAntesJanela = document.activeElement;
            janela.classList.remove('oculto');
            janela.setAttribute('aria-hidden', 'false');
            this.decorarBotoesModal();
            this.configurarAcessibilidadeJanela(janela);
            window.atualizarBotaoTopo?.();
        }
    },

    configurarAcessibilidadeJanela(janela) {
        janela.setAttribute('role', 'dialog');
        janela.setAttribute('aria-modal', 'true');
        janela.setAttribute('aria-labelledby', 'titulo-janela');
        janela.setAttribute('tabindex', '-1');
        janela.removeEventListener('keydown', this.tratarTeclaJanela);
        janela.addEventListener('keydown', this.tratarTeclaJanela);

        setTimeout(() => {
            const focaveis = Interface.obterElementosFocaveis(janela);
            const primeiroFoco = focaveis[0] || janela;
            primeiroFoco.focus({ preventScroll: true });
        }, 0);
    },

    obterElementosFocaveis(raiz) {
        const seletor = [
            'button:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');

        return Array.from(raiz.querySelectorAll(seletor)).filter(elemento => {
            const estilo = window.getComputedStyle(elemento);
            return estilo.display !== 'none' && estilo.visibility !== 'hidden' && elemento.offsetParent !== null;
        });
    },

    tratarTeclaJanela(evento) {
        if (evento.key === 'Escape') {
            evento.preventDefault();
            Interface.fecharJanela(evento.currentTarget.id);
            return;
        }

        if (evento.key !== 'Tab') return;

        const focaveis = Interface.obterElementosFocaveis(evento.currentTarget);
        if (focaveis.length === 0) {
            evento.preventDefault();
            evento.currentTarget.focus({ preventScroll: true });
            return;
        }

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
            evento.preventDefault();
            ultimo.focus({ preventScroll: true });
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primeiro.focus({ preventScroll: true });
        }
    },

    decorarBotoesModal() {
        const modal = document.getElementById('janela-formulario');
        if (!modal) return;

        modal.querySelectorAll('button').forEach(button => {
            const texto = button.textContent.replace(/\s+/g, ' ').trim();

            if (button.querySelector('.icone-inline')) return;

            const configuracao = ICONES_BOTOES_MODAL.find(item =>
                item.termos.some(termo => texto.includes(termo))
            );

            if (configuracao) button.insertAdjacentHTML('afterbegin', criarIcone(configuracao.icone));
        });
    },

    trocarAba(aba) {
        document.querySelectorAll('.item-menu[data-aba]').forEach(item => {
            const ehAtivo = item.dataset.aba === aba;

            item.classList.toggle('fundo-superficie-3', ehAtivo);
            item.classList.toggle('cor-texto-primario', ehAtivo);
            item.classList.toggle('peso-bold', ehAtivo);
            item.classList.toggle('fundo-transparente', !ehAtivo);
            item.classList.toggle('ativo', ehAtivo);

            if (ehAtivo) item.setAttribute('aria-current', 'page');
            else item.removeAttribute('aria-current');
        });
    },

    criarTabela(colunas, dados, aoClique) {
        let linhas = '';

        dados.forEach((linha, indice) => {
            linhas += '<tr>';
            Object.values(linha).forEach(valor => {
                linhas += `<td>${valor || '-'}</td>`;
            });
            linhas += `<td>${criarAcoesTabela([
                { rotulo: 'Editar', acao: `aoClique('editar', ${indice})` },
                { rotulo: 'Excluir', acao: `aoClique('excluir', ${indice})`, perigo: true }
            ])}</td></tr>`;
        });

        return criarContainerTabela([...colunas, 'Ações'], linhas, '', '', 'mb-lg');
    }
};

const Validacao = {
    campoObrigatorio(valor) {
        if (typeof valor === 'number' && Number.isNaN(valor)) return false;
        return valor !== null && valor !== undefined && String(valor).trim() !== '';
    },

    camposObrigatorios(campos) {
        return campos
            .filter(campo => !this.campoObrigatorio(campo.valor))
            .map(campo => campo.nome);
    },

    notificarCamposObrigatorios(campos, mensagem = 'Preencha os campos obrigatórios.') {
        const faltantes = this.camposObrigatorios(campos);
        if (faltantes.length === 0) return true;

        Utilidades.notificacao(`${mensagem} ${faltantes.join(', ')}.`, 'erro');
        return false;
    },

    validarEmail(email) {
        if (!email) return true;
        const expressao = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return expressao.test(String(email).trim());
    },

    validarTelefone(telefone) {
        if (!telefone) return true;
        const numerico = String(telefone).replace(/\D/g, '');
        return numerico.length >= 10 && numerico.length <= 11;
    },

    validarCPF(cpf) {
        if (!cpf) return true;

        const numerico = String(cpf).replace(/\D/g, '');
        if (numerico.length !== 11 || /^(\d)\1+$/.test(numerico)) return false;

        const calcularDigito = tamanho => {
            let soma = 0;
            for (let i = 0; i < tamanho; i++) {
                soma += parseInt(numerico.charAt(i), 10) * (tamanho + 1 - i);
            }
            const resto = (soma * 10) % 11;
            return resto === 10 ? 0 : resto;
        };

        return calcularDigito(9) === parseInt(numerico.charAt(9), 10)
            && calcularDigito(10) === parseInt(numerico.charAt(10), 10);
    },

    validarData(data) {
        if (!data) return false;
        const expressao = /^\d{4}-\d{2}-\d{2}$/;
        if (!expressao.test(data)) return false;

        const [ano, mes, dia] = data.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);

        return dataObj.getFullYear() === ano
            && dataObj.getMonth() === mes - 1
            && dataObj.getDate() === dia;
    },

    validarValorMonetario(valor, permitirZero = true) {
        if (valor === null || valor === undefined || String(valor).trim() === '') {
            return { valido: false, valor: 0 };
        }

        const texto = String(valor).trim();
        const textoNormalizado = texto.includes(',') && texto.includes('.')
            ? texto.replace(/\./g, '').replace(',', '.')
            : texto.replace(',', '.');
        const numero = Number(textoNormalizado);
        const valido = Number.isFinite(numero) && (permitirZero ? numero >= 0 : numero > 0);

        return { valido, valor: valido ? numero : 0 };
    },

    validarCampoMonetario(valor, rotulo = 'Valor', permitirZero = false) {
        const resultado = this.validarValorMonetario(valor, permitirZero);
        if (!resultado.valido) {
            Utilidades.notificacao(`${rotulo} inválido.`, 'erro');
        }
        return resultado;
    },

    validarCampoData(data, rotulo = 'Data') {
        if (this.validarData(data)) return true;

        Utilidades.notificacao(`${rotulo} inválida.`, 'erro');
        return false;
    }
};

const Busca = {
    buscarEmLista(lista, termo, campos) {
        if (!termo) return lista;

        const termoMinusculo = termo.toLowerCase();
        return lista.filter(item => {
            return campos.some(campo => {
                const valor = item[campo];
                return valor && valor.toString().toLowerCase().includes(termoMinusculo);
            });
        });
    },

    criarCampoBusca(id, textoExemplo = 'Buscar...') {
        return `
            <div class="flex mb-md">
                <input type="text" id="${id}" class="campo-padrao" placeholder="${textoExemplo}">
            </div>
        `;
    },

    vincularFiltro(idCampo, idCorpoTabela) {
        const campoBusca = document.getElementById(idCampo);
        const corpoTabela = document.getElementById(idCorpoTabela);
        if (!campoBusca || !corpoTabela) return;

        campoBusca.addEventListener('input', (evento) => {
            const termo = (evento.target.value || '').toLowerCase();
            corpoTabela.querySelectorAll('tr').forEach(linha => {
                const textoBusca = (linha.dataset.busca || linha.textContent || '').toLowerCase();
                linha.classList.toggle('oculto', !textoBusca.includes(termo));
            });
        });
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
    const classesExtras = opcoes.classesExtras || 'md-flex-coluna';
    const botoesExtras = opcoes.botoesExtras || '';
    const varianteSalvar = opcoes.varianteSalvar || 'primario';
    const tipoSalvar = opcoes.tipoSalvar || 'button';
    const atributosSalvar = opcoes.atributosSalvar || '';

    return criarRodapeModal([
        { rotulo: textoCancelar, acao: acaoCancelar, variante: 'secundario' },
        botoesExtras ? { html: botoesExtras } : null,
        {
            rotulo: textoSalvar,
            acao: acaoSalvar,
            variante: varianteSalvar,
            tipo: tipoSalvar,
            atributosExtras: atributosSalvar
        }
    ], {
        id: opcoes.id,
        classesExtras
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

function criarCampoSomenteLeitura(rotulo, id, valor = '', dados = {}) {
    const atributosDados = Object.entries(dados)
        .map(([chave, conteudo]) => `data-${chave}="${conteudo}"`)
        .join(' ');

    return `
        <div class="flex flex-coluna mb-md w-total">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <input type="text" id="${id}" value="${valor}" readonly class="campo-somente-leitura" ${atributosDados}>
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

function abrirDocumentoImpressao(titulo, htmlConteudo) {
    const janelaDocumento = window.open('', '_blank');
    if (!janelaDocumento) {
        Utilidades.notificacao('Permita pop-ups no navegador para visualizar o documento.', 'aviso');
        return;
    }

    const htmlCompleto = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${titulo}</title>
            <style>${criarEstilosDocumento()}</style>
        </head>
        <body>
            ${criarCabecalhoDocumento()}
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

function criarSeletor(rotulo, id, opções, selecionado = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';

    let textoSelecionado = 'Selecione';
    if (selecionado) {
        const itemEncontrado = opções.find(op => (typeof op === 'object' ? op.id : op) === selecionado);
        if (itemEncontrado) {
            textoSelecionado = typeof itemEncontrado === 'object' ? itemEncontrado.nome : itemEncontrado;
        }
    }

    let codigoEstrutura = `
        <div class="flex flex-coluna mb-md pos-relativa w-total">
            <label class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <div class="cursor-apontador sem-selecao pos-relativa" onclick="window.alternarSeletorCustomizado(this, event)">
                <div class="campo-padrao flex itens-centro justifica-espaco" id="acionador-${id}">
                    <span>${textoSelecionado}</span>
                    <span class="texto-sm cor-texto-claro">▼</span>
                </div>
                <div class="opcoes-seletor-customizado seletor-opcoes pos-absoluta fundo-branco borda-1 borda-solida borda-cor-padrao raio-sm rolagem-y z-maximo w-total oculto">
                    <div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador hover-fundo-superficie-3" onclick="window.atualizarSeletorCustomizado('${id}', '', 'Selecione', event)">Selecione</div>`;

    let opcoesNativasEstrutura = `<option value="">Selecione</option>`;

    opções.forEach(opção => {
        const valor = typeof opção === 'object' ? opção.id : opção;
        const rotuloOpcao = typeof opção === 'object' ? opção.nome : opção;
        const classesAtivas = valor === selecionado ? 'fundo-marca-700 cor-texto-branco peso-bold' : '';

        codigoEstrutura += `<div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador hover-fundo-superficie-3 ${classesAtivas}" onclick="window.atualizarSeletorCustomizado('${id}', '${valor}', '${rotuloOpcao}', event)">${rotuloOpcao}</div>`;
        opcoesNativasEstrutura += `<option value="${valor}" ${valor === selecionado ? 'selected' : ''}>${rotuloOpcao}</option>`;
    });

    codigoEstrutura += `
                </div>
            </div>
            <select id="${id}" class="oculto" ${obrigatorioHtml}>
                ${opcoesNativasEstrutura}
            </select>
        </div>`;

    return codigoEstrutura;
}

window.alternarSeletorCustomizado = function (elemento, evento) {
    evento.stopPropagation();
    const caixaOpcoes = elemento.querySelector('.opcoes-seletor-customizado');
    if (!caixaOpcoes) return;
    
    const jaAberto = !caixaOpcoes.classList.contains('oculto');

    document.querySelectorAll('.opcoes-seletor-customizado').forEach(el => {
        el.classList.add('oculto');
    });

    if (!jaAberto) {
        caixaOpcoes.classList.remove('oculto');
    }
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

        recipiente.querySelectorAll('.opcao-customizada').forEach(opt => {
            opt.classList.remove('fundo-marca-700', 'cor-texto-branco', 'peso-bold');
        });
        if (evento?.target) {
            evento.target.classList.add('fundo-marca-700', 'cor-texto-branco', 'peso-bold');
        }
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
        opcao.classList.remove('fundo-marca-700', 'cor-texto-branco', 'peso-bold');
        if (indice === 0) opcao.classList.add('fundo-marca-700', 'cor-texto-branco', 'peso-bold');
    });
};

document.addEventListener('click', function () {
    document.querySelectorAll('.opcoes-seletor-customizado').forEach(el => {
        el.classList.add('oculto');
    });
});

function criarCampoFormulario(rotulo, tipo, id, valor = '', textoExemplo = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';
    return `
        <div class="flex flex-coluna mb-md">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <input type="${tipo}" id="${id}" class="campo-padrao" value="${valor}" placeholder="${textoExemplo}" ${obrigatorioHtml}>
        </div>
    `;
}

function criarAreaTexto(rotulo, id, valor = '', linhas = 3, obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required aria-required="true"' : '';
    return `
        <div class="flex flex-coluna mb-md coluna-total">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}</label>
            <textarea id="${id}" class="campo-padrao" rows="${linhas}" ${obrigatorioHtml}>${valor}</textarea>
        </div>
    `;
}

function irParaAdministracao() {
    Interface.mostrarPagina('pagina-administracao');
    abaAtual = ABA_INICIAL;
    renderizarAbaAtual().then(() => window.atualizarBotaoTopo?.());
}

function sairAdministracao() {
    Interface.mostrarPagina('pagina-inicio');
    setTimeout(() => window.atualizarBotaoTopo?.(), 0);
}

function trocarAba(aba) {
    abaAtual = aba;
    Interface.trocarAba(aba);
    renderizarAbaAtual().then(() => window.atualizarBotaoTopo?.());
}

function fecharJanela(idJanela) {
    Interface.fecharJanela(idJanela);
}

function configurarBotaoTopo() {
    const botaoTopo = document.getElementById('botao-topo');
    if (!botaoTopo) return;

    const obterAreaRolagem = () => {
        const paginaAdministracao = document.getElementById('pagina-administracao');
        const areaAdministracao = paginaAdministracao?.querySelector('main');

        if (paginaAdministracao && !paginaAdministracao.classList.contains('oculto') && areaAdministracao) {
            return areaAdministracao;
        }

        return document.scrollingElement || document.documentElement;
    };

    const obterPosicaoRolagem = areaRolagem => {
        if (areaRolagem === document.scrollingElement || areaRolagem === document.documentElement) {
            return window.scrollY || areaRolagem.scrollTop;
        }

        return areaRolagem.scrollTop;
    };

    window.atualizarBotaoTopo = function() {
        const formularioAberto = document.getElementById('janela-formulario');
        if (formularioAberto && !formularioAberto.classList.contains('oculto')) {
            botaoTopo.classList.add('oculto');
            return;
        }

        const areaRolagem = obterAreaRolagem();
        botaoTopo.classList.toggle('oculto', obterPosicaoRolagem(areaRolagem) <= 300);
    };

    window.voltarAoTopo = function() {
        const areaRolagem = obterAreaRolagem();
        areaRolagem.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        setTimeout(window.atualizarBotaoTopo, 220);
    };

    window.addEventListener('scroll', window.atualizarBotaoTopo, { passive: true });
    document.querySelectorAll('.rolagem-y').forEach(area => {
        area.addEventListener('scroll', window.atualizarBotaoTopo, { passive: true });
    });
    window.atualizarBotaoTopo();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configurarBotaoTopo);
} else {
    configurarBotaoTopo();
}

async function renderizarAbaAtual() {
    const conteudo = document.getElementById('conteudo-administracao');
    if (!conteudo) return;
    Interface.fecharJanela('janela-formulario');
    conteudo.innerHTML = '';

    const renderizarAba = ROTAS_ABAS[abaAtual] || ROTAS_ABAS[ABA_INICIAL];
    await renderizarAba(conteudo);
}

const SeletorDinamico = {
    vincular(idSeletorPai, idContainerFilho, labelFilho, idSeletorFilho, dadosTodos, campoFiltro, textoPadrao, valorInicialFilho = '', aoMudarOFilho = null) {
        const elPai = document.getElementById(idSeletorPai);
        if (!elPai) return;

        const executarFiltragem = (manterSelecao = false) => {
            const valorPai = elPai.value;
            const container = document.getElementById(idContainerFilho);
            if (!container) return;

            if (!valorPai) {
                container.innerHTML = criarSeletor(labelFilho, idSeletorFilho, [{ id: '', nome: 'Selecione o curso primeiro...' }], '');
                if (aoMudarOFilho) aoMudarOFilho('');
                return;
            }

            const filtrados = dadosTodos.filter(item => String(item[campoFiltro]) === String(valorPai));
            let opcoes = [{ id: '', nome: filtrados.length === 0 ? 'Nenhum registro encontrado...' : textoPadrao }];
            
            filtrados.forEach(item => {
                const nome = item.nome_disciplina || item.nome_participante || item.nome_palestrante || item.nome || '';
                const id = item[idSeletorFilho] || item.id_disciplina || item.id_participante || item.id_palestrante || item.id || '';
                opcoes.push({ id, nome });
            });

            const elFilhoAtual = document.getElementById(idSeletorFilho);
            const valorAtual = elFilhoAtual ? elFilhoAtual.value : '';
            const valorFinal = manterSelecao ? (valorInicialFilho || valorAtual || '') : '';
            const valido = filtrados.some(item => String(item[idSeletorFilho] || item.id_disciplina || item.id_participante || item.id) === String(valorFinal));

            container.innerHTML = criarSeletor(labelFilho, idSeletorFilho, opcoes, valido ? valorFinal : '');

            const elFilhoNovo = document.getElementById(idSeletorFilho);
            if (elFilhoNovo && aoMudarOFilho) {
                elFilhoNovo.addEventListener('change', () => aoMudarOFilho(elFilhoNovo.value));
                aoMudarOFilho(elFilhoNovo.value);
            }
        };

        elPai.addEventListener('change', () => executarFiltragem(false));
        executarFiltragem(true);
    }
};
