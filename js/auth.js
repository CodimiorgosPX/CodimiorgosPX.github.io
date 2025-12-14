// Lógica do Login(Lgclg:1)
// Lgclg:1.1 Analisa se a página carregou, caso sim...
document.addEventListener('DOMContentLoaded', function () {
    // ...Lgclg:1.2 define a variável botão de entrada
    const loginBtn = document.getElementById('login-btn');

    // ...Lgclg:1.3 define o ouvinte de click de botão, caso sim...
    loginBtn.addEventListener('click', function (event) {

        // Lgclg:1.3.1 previne carregamento da página
        event.preventDefault();

        // Lgclg:1.3.2 cria as variáveis email e senha escritas, como se é professor ou login
        const email = document.getElementById('email').value;
        const senha = document.getElementById('password').value;
        const userType = document.getElementById('userType').value;

        // Lgclg:1.3.3 banco de dados de logins possíveis
        const usuarios = {
            aluno: [
                { email: "aluno@escola.com", senha: "123" },
                { email: "email1", senha: "senha1" },
                { email: "email2", senha: "senha2" },
                { email: "teste1", senha: "senhateste1" }
            ],
            professor: [
                { email: "professor@escola.com", senha: "admin123" },
                { email: "professorteste@teste.com", senha: "prof123" }]
        };

        // Lgclg:1.4.1 cria variável de análise de validade
        const listaUsuarios = usuarios[userType] || [];
        // Lgclg:1.4.2 variável true ou false que diz se está valido ou não, caso sim...
        const loginValido = listaUsuarios.some(user =>
            user.email === email && user.senha === senha
        );

        // ...Lgclg:1.4.3 reconhece o aluno como logado e quem ele é 
        if (loginValido) {
            // Salva no sessionStorage
            sessionStorage.setItem('logado', 'true');
            sessionStorage.setItem('tipoUsuario', userType);
            sessionStorage.setItem('emailUsuario', email);

            // ...Lgclg:1.4.4 redireciona o aluno para área de aluno, o mesmo com o professor
            if (userType === 'aluno') {
                window.location.href = 'aluno.html';
            } else {
                window.location.href = 'admin.html';
            }
            // ...Lgclg:1.5.3 explica que ele errou
        } else {
            document.getElementById('mensagem-erro').textContent =
                'Email ou senha incorretos!';
            document.getElementById('password').value = '';
        }
    });
});