let secoesCache = [];

async function carregarTabela() {
    const res = await fetch('/api/secoes');
    secoesCache = await res.json();
    document.getElementById('tabela-corpo').innerHTML = secoesCache.map(s => `
        <tr>
            <td><strong>${s.nome}</strong></td>
            <td>${s.referencia}</td>
            <td style="font-weight:bold">${s.contagem_atual}</td>
            <td style="color: ${s.diferenca < 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:bold">
                ${s.diferenca > 0 ? '+' : ''}${s.diferenca}
            </td>
            <td><button class="btn-primary" style="padding:6px 12px" onclick="abrirModal(${s.id})">Contar</button></td>
        </tr>
    `).join('');
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
        <input type="text" placeholder="Prateleira" class="p-nome" value="${nome}">
        <input type="number" placeholder="Qtd" class="p-qtd" value="${qtd}">
        <select class="p-status">
            <option value="Funcionando" ${status==='Funcionando'?'selected':''}>OK</option>
            <option value="Quebrada" ${status==='Quebrada'?'selected':''}>⚠️ Quebrada</option>
        </select>
        <button onclick="this.parentElement.remove()" style="color:red; background:none; font-size:1.2rem">×</button>
    `;
    document.getElementById('linhas-prateleira').appendChild(div);
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