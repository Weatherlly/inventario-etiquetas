async function carregarTabela() {
    try {
        const res = await fetch('/api/secoes');
        const secoes = await res.json();
        const corpo = document.getElementById('tabela-corpo');
        if (!corpo) return;
        corpo.innerHTML = '';

        secoes.forEach(s => {
            const tr = document.createElement('tr');
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
    } catch (e) { console.error("Erro ao carregar:", e); }
}

async function abrirModal(id, nome) {
    const modal = document.getElementById('modalContagem');
    const inputId = document.getElementById('modal-id-secao');
    const titulo = document.getElementById('modal-titulo');
    const container = document.getElementById('linhas-prateleira');

    // Verifica se todos os elementos existem antes de usar
    if (!modal || !inputId || !titulo || !container) {
        console.error("Erro: Elementos do modal não encontrados no HTML!");
        return;
    }

    titulo.innerText = nome;
    inputId.value = id; // Linha 39 que estava dando erro
    container.innerHTML = '';

    const res = await fetch('/api/secoes');
    const secoes = await res.json();
    const secao = secoes.find(s => s.id === id);

    if (secao && secao.detalhes && secao.detalhes.length > 0) {
        secao.detalhes.forEach(d => adicionarLinha(d.nome, d.quantidade, d.status));
    } else {
        adicionarLinha();
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
        <button onclick="this.parentElement.remove()" style="color:var(--danger); background:none; font-size:1.5rem; border:none;">&times;</button>
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
    if (!confirm("Deseja finalizar o inventário?")) return;
    const res = await fetch('/api/finalizar', { method: 'POST' });
    if (res.ok) { alert("Sucesso!"); location.href = 'hub.html'; }
}

carregarTabela();