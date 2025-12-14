function ajustarConstelacao() {
    console.log(document.querySelector('.area-aluno'));

    const area = document.querySelector('.area-aluno');
    const rect = area.getBoundingClientRect();

    const tamConx = rect.width * 0.10;
    const tamCony = rect.height * 0.10;

    document.documentElement.style.setProperty('--tamanhoconstelacaox', tamConx + 'px');
    document.documentElement.style.setProperty('--tamanhoconstelacaoy', tamCony + 'px');
}

window.addEventListener('resize', ajustarConstelacao);
ajustarConstelacao();

function ajustarConstelacao() {
    console.log(document.querySelector('.area-aluno'));

    const area = document.querySelector('.area-aluno');
    const rect = area.getBoundingClientRect();

    const tamConx = rect.width / 1200;
    const tamCony = rect.height * 0.10;
    if (rect.height < 500) {
        document.documentElement.style.setProperty('--tamanhoconstelacaox', tamConx + '%');
        document.documentElement.style.setProperty('--tamanhoconstelacaoy', tamCony + '%');
    }
}