
const ABA_INICIAL = 'cursos';

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
let alunoAtual = null;
let modoEdicao = null;
let registroEmEdicao = null;
let frequenciaAtual = {};

document.addEventListener('DOMContentLoaded', async () => {
    await bd.inicializar();
    Interface.fecharJanela('janela-formulario');
    document.getElementById('conteudo-formulario').innerHTML = '';

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

    formatarMoeda(valor) {
        return parseFloat(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    notificacao(mensagem, tipo = 'sucesso') {
        const div = document.createElement('div');

        div.className = `mensagem-toast mensagem-${tipo} animacao-deslize z-maximo`;
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

        document.querySelectorAll('.pagina').forEach(p => {
            p.classList.add('oculto');
            p.classList.remove('flex', 'flex-coluna', 'altura-total', 'itens-centro', 'justifica-centro', 'altura-tela', 'largura-tela');
        });

        const pagina = document.getElementById(idPagina);
        if (pagina) {
            pagina.classList.remove('oculto');

            if (idPagina === 'pagina-inicio') {
                pagina.classList.add('flex', 'flex-coluna', 'itens-centro', 'justifica-centro', 'altura-tela', 'largura-tela');
            }
        }
    },

    fecharJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (janela) {
            janela.classList.add('oculto');
            janela.classList.remove('flex');
        }
    },

    abrirJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (janela) {
            janela.classList.remove('oculto');
            janela.classList.add('flex');
            this.decorarBotoesModal();
        }
    },

    decorarBotoesModal() {
        const modal = document.getElementById('janela-formulario');
        if (!modal) return;

        modal.querySelectorAll('button.btn').forEach(button => {
            const texto = button.textContent.replace(/\s+/g, ' ').trim();
            if (button.querySelector('.icone')) return;

            if (texto.includes('Cancelar')) {
                button.insertAdjacentHTML('afterbegin', '<span class="icone">&#xE711;</span>');
            } else if (texto.includes('Enviar via WhatsApp')) {
                button.insertAdjacentHTML('afterbegin', '<span class="icone">&#xE724;</span>');
            } else if (texto.includes('Salvar') || texto.includes('Atualizar')) {
                button.insertAdjacentHTML('afterbegin', '<span class="icone">&#xE74E;</span>');
            } else if (texto.includes('Gerar Recibo')) {
                button.insertAdjacentHTML('afterbegin', '<span class="icone">&#xE749;</span>');
            }
        });
    },

    trocarAba(aba) {
        document.querySelectorAll('.item-menu[data-aba]').forEach(item => {
    const ehAtivo = item.dataset.aba === aba;

    // mantém compatibilidade com classes antigas
    item.classList.toggle('fundo-primario-leve', ehAtivo);
    item.classList.toggle('cor-texto-primario', ehAtivo);
    item.classList.toggle('peso-bold', ehAtivo);
    item.classList.toggle('fundo-transparente', !ehAtivo);

    // nova marcação para o "risquinho"
    item.classList.toggle('ativo', ehAtivo);

    // aria-current para leitores de tela
    if (ehAtivo) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
    },

    criarTabela(colunas, dados, aoClique) {
        let codigoEstrutura = '<div class="rolagem-x borda-padrao raio-md fundo-branco mb-lg"><table class="tabela-base"><thead><tr>';

        colunas.forEach(coluna => {
            codigoEstrutura += `<th>${coluna}</th>`;
        });
        codigoEstrutura += '<th>Ações</th></tr></thead><tbody>';

        dados.forEach((linha, indice) => {
            codigoEstrutura += '<tr>';
            Object.values(linha).forEach(valor => {
                codigoEstrutura += `<td>${valor || '-'}</td>`;
            });
            codigoEstrutura += `<td class="flex gap-sm">
                <button class="btn btn-secundario-2 btn-pequeno" onclick="aoClique('editar', ${indice})">Editar</button>
                <button class="btn btn-secundario-2 btn-pequeno" onclick="aoClique('excluir', ${indice})">Excluir</button>
            </td></tr>`;
        });

        codigoEstrutura += '</tbody></table></div>';
        return codigoEstrutura;
    }
};

const Validacao = {
    validarEmail(email) {
        const expressao = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return expressao.test(email);
    },

    validarTelefone(telefone) {
        const expressao = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
        return expressao.test(telefone) || telefone.length >= 10;
    },

    validarCPF(cpf) {
        return cpf.replace(/\D/g, '').length === 11;
    },

    validarData(data) {
        const expressao = /^\d{4}-\d{2}-\d{2}$/;
        return expressao.test(data);
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
                <input type="text" id="${id}" class="entrada-padrao" placeholder="${textoExemplo}">
            </div>
        `;
    }
};

function criarSeletor(rotulo, id, opções, selecionado = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required' : '';
    const asterisco = obrigatorio ? ' *' : '';

    let textoSelecionado = 'Selecione';
    if (selecionado) {
        const itemEncontrado = opções.find(op => (typeof op === 'object' ? op.id : op) === selecionado);
        if (itemEncontrado) {
            textoSelecionado = typeof itemEncontrado === 'object' ? itemEncontrado.nome : itemEncontrado;
        }
    }

    let codigoEstrutura = `
        <div class="flex flex-coluna mb-md pos-relativa largura-total">
            <label class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}${asterisco}</label>
            <div class="cursor-apontador sem-selecao pos-relativa" onclick="window.alternarSeletorCustomizado(this, event)">
                <div class="entrada-padrao flex itens-centro justifica-espaco" id="acionador-${id}">
                    <span>${textoSelecionado}</span>
                    <span class="texto-sm cor-texto-claro">▼</span>
                </div>
                <div class="opcoes-seletor-customizado pos-absoluta fundo-branco borda-padrao raio-sm rolagem-oculta z-maximo largura-total oculto" style="top: 100%; margin-top: 4px;">
                    <div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador hover-fundo-secundario" onclick="window.atualizarSeletorCustomizado('${id}', '', 'Selecione', event)">Selecione</div>`;

    let opcoesNativasEstrutura = `<option value="">Selecione</option>`;

    opções.forEach(opção => {
        const valor = typeof opção === 'object' ? opção.id : opção;
        const rotuloOpcao = typeof opção === 'object' ? opção.nome : opção;
        const classesAtivas = valor === selecionado ? 'fundo-primario cor-texto-branco peso-bold' : '';

        codigoEstrutura += `<div class="opcao-customizada p-sm px-md cor-texto-escuro texto-md transicao cursor-apontador hover-fundo-secundario ${classesAtivas}" onclick="window.atualizarSeletorCustomizado('${id}', '${valor}', '${rotuloOpcao}', event)">${rotuloOpcao}</div>`;
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
    const jaAberto = !caixaOpcoes.classList.contains('oculto');

    document.querySelectorAll('.opcoes-seletor-customizado').forEach(el => {
        el.classList.add('oculto');
    });

    if (!jaAberto) {
        caixaOpcoes.classList.remove('oculto');
    }
};

window.atualizarSeletorCustomizado = function (idSeletor, valor, rotulo, evento) {
    evento.stopPropagation();
    const seletorNativo = document.getElementById(idSeletor);
    if (!seletorNativo) return;

    seletorNativo.value = valor;

    const acionador = document.getElementById(`acionador-${idSeletor}`);
    if (acionador) acionador.querySelector('span').textContent = rotulo;

    const recipiente = acionador.closest('.cursor-apontador');
    if (recipiente) {
        const caixaOpcoes = recipiente.querySelector('.opcoes-seletor-customizado');
        if (caixaOpcoes) caixaOpcoes.classList.add('oculto');

        recipiente.querySelectorAll('.opcao-customizada').forEach(opt => {
            opt.classList.remove('fundo-primario', 'cor-texto-branco', 'peso-bold');
        });
        evento.target.classList.add('fundo-primario', 'cor-texto-branco', 'peso-bold');
    }

    seletorNativo.dispatchEvent(new Event('change', { bubbles: true }));
};

document.addEventListener('click', function () {
    document.querySelectorAll('.opcoes-seletor-customizado').forEach(el => {
        el.classList.add('oculto');
    });
});

function criarCampoFormulario(rotulo, tipo, id, valor = '', textoExemplo = '', obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required' : '';
    const codigoEstrutura = `
        <div class="flex flex-coluna mb-md">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}${obrigatorio ? ' *' : ''}</label>
            <input type="${tipo}" id="${id}" class="entrada-padrao" value="${valor}" placeholder="${textoExemplo}" ${obrigatorioHtml}>
        </div>
    `;
    return codigoEstrutura;
}

function criarAreaTexto(rotulo, id, valor = '', linhas = 3, obrigatorio = false) {
    const obrigatorioHtml = obrigatorio ? 'required' : '';
    const codigoEstrutura = `
        <div class="flex flex-coluna mb-md" style="grid-column: 1 / -1;">
            <label for="${id}" class="peso-bold mb-sm cor-texto-escuro texto-md">${rotulo}${obrigatorio ? ' *' : ''}</label>
            <textarea id="${id}" class="entrada-padrao" rows="${linhas}" ${obrigatorioHtml}>${valor}</textarea>
        </div>
    `;
    return codigoEstrutura;
}

function irParaAdministracao() {
    Interface.mostrarPagina('pagina-administracao');
    abaAtual = ABA_INICIAL;
    renderizarAbaAtual();
}

function sairAdministracao() {
    Interface.mostrarPagina('pagina-inicio');
}

function trocarAba(aba) {
    abaAtual = aba;
    Interface.trocarAba(aba);
    renderizarAbaAtual();
}

function fecharJanela(idJanela) {
    Interface.fecharJanela(idJanela);
}

async function renderizarAbaAtual() {
    const conteudo = document.getElementById('conteudo-administracao');
    if (!conteudo) return;
    Interface.fecharJanela('janela-formulario');
    conteudo.innerHTML = '';

    const renderizarAba = ROTAS_ABAS[abaAtual] || ROTAS_ABAS[ABA_INICIAL];
    await renderizarAba(conteudo);
}