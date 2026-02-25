const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

const CONFIG_FILE = './config.json';
const CURRENT_DB = './inventario_atual.json';
const HISTORY_FILE = './historico.json';

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

// API: Status do Hub
app.get('/api/hub-status', (req, res) => {
    const current = io.read(CURRENT_DB, {});
    const history = io.read(HISTORY_FILE, []);
    res.json({
        rodando: Object.keys(current).length > 0,
        historico: history.map((h, index) => ({ ...h, id: index })).reverse()
    });
});

// API: Listar Seções com Ref. Dinâmica
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
        const quebradas = detalhes.reduce((acc, curr) => acc + (curr.status === 'Quebrada' ? (Number(curr.quantidade) || 0) : 0), 0);

        return {
            id: s.id, nome: s.nome, referencia: ultimaRef,
            contagem_atual, diferenca: contagem_atual - ultimaRef,
            total_quebradas: quebradas, detalhes
        };
    });
    res.json(result);
});

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

app.get('/api/exportar-csv', (req, res) => {
    const history = io.read(HISTORY_FILE, []);
    const id = req.query.id;
    if (id === undefined || !history[id]) return res.status(404).send("Não encontrado");

    let csv = 'Secao;Total Final;Detalhes\n';
    history[id].dados.forEach(d => {
        const prateleiras = d.detalhes.map(p => `${p.identificador}(${p.quantidade})`).join(' | ');
        csv += `${d.secao};${d.total};${prateleiras}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_${id}.csv`);
    res.send('\uFEFF' + csv);
});

app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}/hub.html`));