const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// Armazena os bots ativos em memória
const botsAtivos = {};

// Rota para o site (Frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota que o site chama para ligar o bot
app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja } = req.body;

    if (!token) return res.status(400).send({ erro: "Token inválido" });

    try {
        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });

        client.on('ready', () => {
            console.log(`Bot ${client.user.tag} está online!`);
            botsAtivos[token] = client;
        });

        // Lógica básica de venda/resposta
        client.on('messageCreate', (msg) => {
            if (msg.author.bot) return;
            if (msg.content === '!loja') {
                msg.reply(`Bem-vindo à **${nomeLoja}**! Temos itens de Blox Fruits disponíveis.`);
            }
        });

        await client.login(token);
        res.send({ status: "Sucesso!", msg: `Bot ${nomeLoja} ligado!` });

    } catch (err) {
        res.status(500).send({ erro: "Falha ao ligar o bot. Verifique o Token." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Site rodando na porta ${PORT}`));
