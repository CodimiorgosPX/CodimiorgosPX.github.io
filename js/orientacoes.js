document.addEventListener('DOMContentLoaded', function () {
    const tipoUsuario = sessionStorage.getItem('tipoUsuario');
    if (tipoUsuario !== 'aluno') {
        alert('Por favor, faça login como aluno primeiro!');
        window.location.href = 'index.html';
    }
});