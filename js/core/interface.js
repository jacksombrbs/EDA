const Interface = {
    mostrarPagina(idPagina) {
        document.querySelectorAll('.pagina, [id^="pagina-"]').forEach(pagina => {
            pagina.classList.add('oculto');
        });

        const paginaAlvo = document.getElementById(idPagina);
        if (paginaAlvo) paginaAlvo.classList.remove('oculto');
    },

    fecharJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (!janela) return;

        janela.classList.add('oculto');
        janela.setAttribute('aria-hidden', 'true');
        janela.removeEventListener('keydown', this.tratarTeclaJanela);
        window.atualizarBotaoTopo?.();

        if (AppEstado.elementoFocoAntesJanela && document.contains(AppEstado.elementoFocoAntesJanela)) {
            AppEstado.elementoFocoAntesJanela.focus({ preventScroll: true });
        }
        AppEstado.elementoFocoAntesJanela = null;
    },

    abrirJanela(idJanela) {
        const janela = document.getElementById(idJanela);
        if (!janela) return;

        AppEstado.elementoFocoAntesJanela = document.activeElement;
        janela.classList.remove('oculto');
        janela.setAttribute('aria-hidden', 'false');
        this.decorarBotoesModal();
        this.configurarAcessibilidadeJanela(janela);
        window.atualizarBotaoTopo?.();
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

        modal.querySelectorAll('button').forEach(botao => {
            const texto = botao.textContent.replace(/\s+/g, ' ').trim();
            if (botao.querySelector('.icone-inline')) return;

            const configuracao = ICONES_BOTOES_MODAL.find(item =>
                item.termos.some(termo => texto.includes(termo))
            );

            if (configuracao) botao.insertAdjacentHTML('afterbegin', criarIcone(configuracao.icone));
        });
    },

    trocarAba(aba) {
        document.querySelectorAll('.item-menu[data-aba]').forEach(item => {
            const ehAtivo = item.dataset.aba === aba;
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

document.addEventListener('DOMContentLoaded', async () => {
    await bd.inicializar();
    Interface.fecharJanela('janela-formulario');

    const conteudoFormulario = document.getElementById('conteudo-formulario');
    if (conteudoFormulario) conteudoFormulario.innerHTML = '';

    const paginaInicio = document.getElementById('pagina-inicio');
    const bloquearScrollInicial = evento => {
        if (paginaInicio && !paginaInicio.classList.contains('oculto')) {
            evento.preventDefault();
        }
    };

    document.addEventListener('wheel', bloquearScrollInicial, { passive: false });
    document.addEventListener('touchmove', bloquearScrollInicial, { passive: false });
});

function irParaAdministracao() {
    Interface.mostrarPagina('pagina-administracao');
    AppEstado.abaAtual = ABA_INICIAL;
    Interface.trocarAba(AppEstado.abaAtual);
    renderizarAbaAtual().then(() => window.atualizarBotaoTopo?.());
}

function sairAdministracao() {
    Interface.mostrarPagina('pagina-inicio');
    setTimeout(() => window.atualizarBotaoTopo?.(), 0);
}

function trocarAba(aba) {
    AppEstado.abaAtual = aba;
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
        areaRolagem.scrollTo({ top: 0, behavior: 'smooth' });
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
