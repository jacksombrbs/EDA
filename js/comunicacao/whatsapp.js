function normalizarTelefoneWhatsapp(telefone) {
    let numero = String(telefone || '').replace(/\D/g, '');
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
    return numero;
}

function montarMensagemWhatsApp(titulo, mensagem) {
    return encodeURIComponent(`*${titulo}*\n\n${mensagem}`);
}

function enviarAvisoWhatsApp(telefone, titulo, mensagem) {
    const numero = normalizarTelefoneWhatsapp(telefone);
    if (!numero) {
        Utilidades.notificacao('Este aviso não possui telefone registrado.', 'erro');
        return;
    }

    window.open(`https://api.whatsapp.com/send?phone=${numero}&text=${montarMensagemWhatsApp(titulo, mensagem)}`, '_blank');
}
