let secoesCache = [];

async function carregarTabela() {
    const res = await fetch('/api/secoes');
    const secoes = await res.json();
    const corpo = document.getElementById('tabela-corpo');
    corpo.innerHTML = '';

    secoes.forEach(s => {
        const tr = document.createElement('tr');
        // Define cores para a diferença (opcional)
        const corDif = s.diferenca < 0 ? 'color:red' : (s.diferenca > 0 ? 'color:green' : '');
        
        tr.innerHTML = `
            <td>${s.nome}</td>
            <td>${s.referencia}</td>
            <td>${s.contagem_atual}</td>
            <td style="${corDif}">${s.diferenca}</td>
            <td>
                <button class="btn-primary btn-tab" onclick="abrirModal(${s.id}, '${s.nome}')">Contar</button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

function abrirModal(id) {
    const secao = secoesCache.find(x => x.id === id);
    document.getElementById('modal-titulo').innerText = `Seção: ${secao.nome}`;
    document.getElementById('modal-id-secao').value = id;
    const container = document.getElementById('linhas-prateleira');
    container.innerHTML = '';

    if (secao.detalhes && secao.detalhes.length > 0) {
        secao.detalhes.forEach(d => adicionarLinha(d.identificador, d.quantidade, d.status));
    } else {
        adicionarLinha();
    }
    document.getElementById('modalContagem').style.display = 'block';
}

function adicionarLinha(nome='', qtd=0, status='Funcionando') {
    const div = document.createElement('div');
    div.className = 'linha-input';
    div.innerHTML = `
        <input type="text" placeholder="Prat." class="p-nome" value="${nome}">
        <input type="number" placeholder="Qtd" class="p-qtd" value="${qtd}" inputmode="numeric">
        <select class="p-status">
            <option value="Funcionando" ${status==='Funcionando'?'selected':''}>OK</option>
            <option value="Quebrada" ${status==='Quebrada'?'selected':''}>FALHA</option>
        </select>
        <button onclick="this.parentElement.remove()" style="color:var(--danger); background:none; font-size:1.5rem; padding:0 5px;">&times;</button>
    `;
    document.getElementById('linhas-prateleira').appendChild(div);
    
    // Auto-scroll para a nova linha adicionada
    const container = document.getElementById('linhas-prateleira');
    container.scrollTop = container.scrollHeight;
}

async function salvarModal() {
    const id = document.getElementById('modal-id-secao').value;
    const linhas = document.querySelectorAll('.linha-input');
    const contagens = Array.from(linhas).map(l => ({
        identificador: l.querySelector('.p-nome').value || "Geral",
        quantidade: parseInt(l.querySelector('.p-qtd').value) || 0,
        status: l.querySelector('.p-status').value
    }));

    await fetch('/api/salvar-rascunho', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ secao_id: id, contagens })
    });
    fecharModal();
    carregarTabela();
}

function fecharModal() { document.getElementById('modalContagem').style.display = 'none'; }

async function finalizar() {
    if (confirm("Deseja encerrar este inventário? As referências serão atualizadas.")) {
        await fetch('/api/finalizar', { method: 'POST' });
        location.href = 'hub.html';
    }
}

carregarTabela();