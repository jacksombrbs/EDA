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

    notificarCamposObrigatorios(campos, mensagem = 'Preencha os campos obrigatórios:') {
        const faltantes = this.camposObrigatorios(campos);
        if (faltantes.length === 0) return true;

        Utilidades.notificacao(`${mensagem} ${faltantes.join(', ')}.`, 'erro');
        return false;
    },

    email(email) {
        if (!email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    },

    cpf(cpf) {
        if (!cpf) return true;

        const numerico = String(cpf).replace(/\D/g, '');
        if (numerico.length !== 11 || /^(\d)\1+$/.test(numerico)) return false;

        const calcularDigito = tamanho => {
            let soma = 0;
            for (let indice = 0; indice < tamanho; indice++) {
                soma += parseInt(numerico.charAt(indice), 10) * (tamanho + 1 - indice);
            }
            const resto = (soma * 10) % 11;
            return resto === 10 ? 0 : resto;
        };

        return calcularDigito(9) === parseInt(numerico.charAt(9), 10)
            && calcularDigito(10) === parseInt(numerico.charAt(10), 10);
    },

    data(data) {
        if (!data) return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

        const [ano, mes, dia] = data.split('-').map(Number);
        const dataObj = new Date(ano, mes - 1, dia);

        return dataObj.getFullYear() === ano
            && dataObj.getMonth() === mes - 1
            && dataObj.getDate() === dia;
    },

    valorMonetario(valor, permitirZero = true) {
        if (valor === null || valor === undefined || String(valor).trim() === '') {
            return { valido: false, valor: 0 };
        }

        const numero = Utilidades.normalizarValorMonetario(valor);
        const valido = Number.isFinite(numero) && (permitirZero ? numero >= 0 : numero > 0);
        return { valido, valor: valido ? numero : 0 };
    },

    numeroInteiro(valor, minimo = null) {
        const numero = Number(valor);
        if (!Number.isInteger(numero)) return false;
        return minimo === null || numero >= minimo;
    },

    listaNaoVazia(lista) {
        return Array.isArray(lista) && lista.length > 0;
    },

    validarEmail(email) {
        return this.email(email);
    },

    validarTelefone(telefone) {
        if (!telefone) return true;
        const numerico = String(telefone).replace(/\D/g, '');
        return numerico.length >= 10 && numerico.length <= 11;
    },

    validarCPF(cpf) {
        return this.cpf(cpf);
    },

    validarData(data) {
        return this.data(data);
    },

    validarValorMonetario(valor, permitirZero = true) {
        return this.valorMonetario(valor, permitirZero);
    },

    validarCampoMonetario(valor, rotulo = 'Valor', permitirZero = false) {
        const resultado = this.valorMonetario(valor, permitirZero);
        if (!resultado.valido) {
            Utilidades.notificacao(`${rotulo} inválido.`, 'erro');
        }
        return resultado;
    },

    validarCampoData(data, rotulo = 'Data') {
        if (this.data(data)) return true;

        Utilidades.notificacao(`${rotulo} inválida.`, 'erro');
        return false;
    }
};
