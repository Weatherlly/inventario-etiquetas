const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 8080;

const CONFIG_FILE = './config.json';
const CURRENT_DB = './inventario_atual.json';
const HISTORY_FILE = './historico.json';
const ADMIN_PASSWORD = '1234'; // <--- ALTERE SUA SENHA AQUI

app.use(express.json());
app.use(express.static('public'));

const io = {
    read: (file, def) => {
        try {
            if (!fs.existsSync(file) || fs.statSync(file).size === 0) return def;
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (e) { return def; }
    },
    write: (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))
};

// --- ROTAS DE STATUS E LISTAGEM ---
app.get('/api/hub-status', (req, res) => {
    const current = io.read(CURRENT_DB, {});
    const history = io.read(HISTORY_FILE, []);
    res.json({
        rodando: Object.keys(current).length > 0,
        historico: history.map((h, index) => ({ ...h, id: index })).reverse()
    });
});

app.get('/api/secoes', (req, res) => {
    const config = io.read(CONFIG_FILE, { secoes: [] });
    const current = io.read(CURRENT_DB, {});
    const history = io.read(HISTORY_FILE, []);
    const result = config.secoes.map(s => {
        let ultimaRef = 0;
        if (history.length > 0) {
            const ultimoInv = history[history.length - 1];
            const dadoAntigo = ultimoInv.dados.find(d => d.secao === s.nome);
            if (dadoAntigo) ultimaRef = dadoAntigo.total;
        }
        const detalhes = current[s.id] || [];
        const contagem_atual = detalhes.reduce((acc, curr) => acc + (Number(curr.quantidade) || 0), 0);
        return {
            id: s.id, nome: s.nome, referencia: ultimaRef,
            contagem_atual, diferenca: contagem_atual - ultimaRef, detalhes
        };
    });
    res.json(result);
});

// --- SALVAMENTO E FINALIZAÇÃO ---
app.post('/api/salvar-rascunho', (req, res) => {
    const { secao_id, contagens } = req.body;
    const current = io.read(CURRENT_DB, {});
    current[secao_id] = contagens;
    io.write(CURRENT_DB, current);
    res.json({ success: true });
});

app.post('/api/finalizar', (req, res) => {
    const config = io.read(CONFIG_FILE, { secoes: [] });
    const current = io.read(CURRENT_DB, {});
    const history = io.read(HISTORY_FILE, []);
    const registro = {
        data: new Date().toLocaleString('pt-BR'),
        dados: config.secoes.map(s => {
            const detalhes = current[s.id] || [];
            const total = detalhes.reduce((acc, c) => acc + (Number(c.quantidade) || 0), 0);
            return { secao: s.nome, total, detalhes };
        })
    };
    history.push(registro);
    io.write(HISTORY_FILE, history);
    io.write(CURRENT_DB, {}); 
    res.json({ success: true });
});

// --- ROTAS DE EXCLUSÃO COM SEGURANÇA ---
app.post('/api/admin/limpar-atual', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Senha incorreta' });
    io.write(CURRENT_DB, {});
    res.json({ success: true });
});

app.post('/api/admin/excluir-historico', (req, res) => {
    const { password, id } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Senha incorreta' });
    
    let history = io.read(HISTORY_FILE, []);
    // O ID vem do front-end (baseado no índice original)
    history.splice(id, 1);
    io.write(HISTORY_FILE, history);
    res.json({ success: true });
});

app.get('/api/exportar-csv', (req, res) => {
    const history = io.read(HISTORY_FILE, []);
    const id = req.query.id;
    if (id === undefined || !history[id]) return res.status(404).send("Não encontrado");
    let csv = 'Secao;Total Final\n';
    history[id].dados.forEach(d => { csv += `${d.secao};${d.total}\n`; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_${id}.csv`);
    res.send('\uFEFF' + csv);
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));