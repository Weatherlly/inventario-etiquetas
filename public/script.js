// Função principal para carregar a tabela
async function carregarTabela() {
    try {
        const res = await fetch('/api/secoes');
        const secoes = await res.json();
        const corpo = document.getElementById('tabela-corpo');
        
        if (!corpo) return;
        corpo.innerHTML = '';

        secoes.forEach(s => {
            const tr = document.createElement('tr');
            
            // Lógica de cores para a diferença
            let estiloDif = "";
            if (s.diferenca < 0) estiloDif = "color: var(--danger); font-weight: bold;";
            if (s.diferenca > 0) estiloDif = "color: var(--success); font-weight: bold;";

            tr.innerHTML = `
                <td>${s.nome}</td>
                <td>${s.referencia}</td>
                <td>${s.contagem_atual}</td>
                <td style="${estiloDif}">${s.diferenca}</td>
                <td>
                    <button class="btn-primary btn-tab" onclick="abrirModal(${s.id}, '${s.nome}')">Contar</button>
                </td>
            `;
            corpo.appendChild(tr);
        });
    } catch (erro) {
        console.error("Erro ao carregar tabela:", erro);
    }
}

// Função para abrir o modal e carregar as prateleiras existentes
async function abrirModal(id, nome) {
    const modal = document.getElementById('modalContagem');
    document.getElementById('modal-titulo').innerText = nome;
    document.getElementById('modal-id-secao').value = id;
    const container = document.getElementById('linhas-prateleira');
    container.innerHTML = '';

    // Buscar dados atuais para preencher o modal
    const res = await fetch('/api/secoes');
    const secoes = await res.json();
    const secao = secoes.find(s => s.id === id);

    if (secao && secao.detalhes && secao.detalhes.length > 0) {
        secao.detalhes.forEach(d => adicionarLinha(d.nome, d.quantidade, d.status));
    } else {
        adicionarLinha(); // Adiciona uma linha vazia se não houver dados
    }

    modal.style.display = 'block';
}

function fecharModal() {
    document.getElementById('modalContagem').style.display = 'none';
}

function adicionarLinha(nome = '', qtd = '', status = 'Funcionando') {
    const div = document.createElement('div');
    div.className = 'linha-input';
    div.innerHTML = `
        <input type="text" placeholder="Prat." class="p-nome" value="${nome}">
        <input type="number" placeholder="Qtd" class="p-qtd" value="${qtd}" inputmode="numeric">
        <select class="p-status">
            <option value="Funcionando" ${status === 'Funcionando' ? 'selected' : ''}>OK</option>
            <option value="Quebrada" ${status === 'Quebrada' ? 'selected' : ''}>FALHA</option>
        </select>
        <button onclick="this.parentElement.remove()" style="color:var(--danger); background:none; font-size:1.2rem;">&times;</button>
    `;
    document.getElementById('linhas-prateleira').appendChild(div);
}

async function salvarModal() {
    const id = document.getElementById('modal-id-secao').value;
    const linhas = document.querySelectorAll('.linha-input');
    const contagens = [];

    linhas.forEach(linha => {
        const nome = linha.querySelector('.p-nome').value;
        const quantidade = linha.querySelector('.p-qtd').value;
        const status = linha.querySelector('.p-status').value;
        if (nome || quantidade) {
            contagens.push({ nome, quantidade, status });
        }
    });

    await fetch('/api/salvar-rascunho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secao_id: id, contagens })
    });

    fecharModal();
    carregarTabela();
}

async function finalizar() {
    if (!confirm("Deseja finalizar o inventário e salvar no histórico?")) return;
    
    const res = await fetch('/api/finalizar', { method: 'POST' });
    if (res.ok) {
        alert("Inventário finalizado com sucesso!");
        location.href = 'hub.html';
    }
}

// Iniciar a tabela ao carregar a página
carregarTabela();