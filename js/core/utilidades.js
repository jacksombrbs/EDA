const Utilidades = {
    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    obterDataAtual() {
        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    },

    formatarData(data) {
        if (!data) return '';

        if (typeof data === 'number') {
            const dataExcel = new Date((data - 25569) * 86400 * 1000);
            return dataExcel.toLocaleDateString('pt-BR');
        }

        const partes = String(data).split('-');
        if (partes.length !== 3) return data;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    },

    normalizarValorMonetario(valor) {
        if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

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
        const aviso = document.createElement('div');
        aviso.className = `aviso-flutuante pos-fixa direita-30 base-30 p-md raio-sm texto-lg peso-bold z-maximo fundo-toast-${tipo} cor-texto-${tipo} animacao-deslize`;
        aviso.textContent = mensagem;
        document.body.appendChild(aviso);

        const duracao = Math.min(12000, Math.max(5000, 2600 + String(mensagem || '').length * 45));
        setTimeout(() => aviso.remove(), duracao);
    },

    copiarParaClipboard(texto) {
        navigator.clipboard.writeText(texto).then(() => {
            this.notificacao('Copiado para a área de transferência!', 'sucesso');
        });
    },

    normalizarStatusParticipante(status) {
        return String(status || 'Ativo').trim().toLowerCase();
    },

    participanteEstaAtivo(participante) {
        return this.normalizarStatusParticipante(participante?.status) === 'ativo';
    },

    filtrarParticipantesAtivos(participantes = []) {
        return participantes.filter(participante => this.participanteEstaAtivo(participante));
    },

    ordenarParticipantesPorNome(participantes = []) {
        return [...participantes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    },

    filtrarParticipantesDoCurso(participantes = [], idCurso = '', opcoes = {}) {
        const mostrarTodos = opcoes.mostrarTodos === true;
        return this.ordenarParticipantesPorNome(
            participantes.filter(participante =>
                String(participante.id_curso || '') === String(idCurso || '')
                && (mostrarTodos || this.participanteEstaAtivo(participante))
            )
        );
    },

    montarNomeParticipanteComStatus(participante = {}, mostrarStatus = false) {
        const nome = this.escaparHtml(participante.nome || '-');
        const status = mostrarStatus && !this.participanteEstaAtivo(participante)
            ? '<span class="texto-xs cor-texto-erro peso-bold">desistente</span>'
            : '';

        return `<span class="nome-lancamento"><span>${nome}</span>${status}</span>`;
    },

    salvarDataUltimoBackup() {
        try {
            localStorage.setItem(CHAVE_ULTIMO_BACKUP, new Date().toISOString());
        } catch (erro) {
            console.warn('Não foi possível registrar a data do backup.', erro);
        }
    },

    obterDataUltimoBackup() {
        try {
            const valor = localStorage.getItem(CHAVE_ULTIMO_BACKUP);
            return valor ? new Date(valor) : null;
        } catch (erro) {
            return null;
        }
    },

    calcularDiasDesde(data) {
        if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null;
        const agora = new Date();
        const diferenca = agora.getTime() - data.getTime();
        return Math.max(0, Math.floor(diferenca / 86400000));
    },

    formatarDataHora(data) {
        if (!(data instanceof Date) || Number.isNaN(data.getTime())) return '';
        return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    },

    obterResumoUltimoBackup() {
        const data = this.obterDataUltimoBackup();
        if (!data) {
            return {
                existe: false,
                dias: null,
                classe: 'erro',
                titulo: 'Backup ainda não registrado',
                texto: 'Exporte um backup após concluir lançamentos importantes.'
            };
        }

        const dias = this.calcularDiasDesde(data);
        const atrasado = dias === null || dias >= DIAS_ALERTA_BACKUP;
        return {
            existe: true,
            dias,
            classe: atrasado ? 'aviso' : 'sucesso',
            titulo: atrasado ? 'Backup recomendado' : 'Backup em dia',
            texto: `Último backup: ${this.formatarDataHora(data)}${dias === 0 ? ' (hoje)' : ` (${dias} dia(s))`}.`
        };
    },

    escaparHtml(valor) {
        return String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
