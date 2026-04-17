const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, SlashCommandBuilder 
} = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// BANCO DE DADOS TEMPORÁRIO (Ideal seria usar MongoDB depois)
let db = {
    config: { pix: "SUA_CHAVE_PIX", banner: "https://i.imgur.com/vWb6XyS.png", nome: "Sirius Store" },
    estoque: [
        { label: "LV 2800: God + Cdk + SG + Frutas", value: "item1", preco: "9.99", qtd: 62, emoji: "⚔️" },
        { label: "LV 2800: God + Shark Anchor + Frutas", value: "item2", preco: "11.99", qtd: 94, emoji: "⚓" },
        { label: "LV 2800: God Human + Frutas", value: "item3", preco: "4.99", qtd: 27, emoji: "🔱" }
    ]
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja } = req.body;
    db.config.nome = nomeLoja;

    try {
        const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

        client.on('ready', async () => {
            console.log(`Bot ${client.user.tag} Online`);
            // Registrar comando slash /configurar
            const guildId = client.guilds.cache.first()?.id;
            if (guildId) {
                const guild = client.guilds.cache.get(guildId);
                await guild.commands.set([
                    new SlashCommandBuilder().setName('configurar').setDescription('Configura o estoque e a loja')
                ]);
            }
        });

        client.on('messageCreate', async (msg) => {
            if (msg.author.bot) return;

            if (msg.content === '!vendas') {
                const embed = new EmbedBuilder()
                    .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                    .setImage(db.config.banner)
                    .setDescription("📌 Escolha sua conta no menu abaixo.\n\n**Siglas:** GOD, CDK, SG, SA...")
                    .setColor("#2b2d31");

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_vendas')
                        .setPlaceholder('Clique aqui para ver as opções')
                        .addOptions(db.estoque.map(item => ({
                            label: item.label,
                            description: `Preço: R$ ${item.preco} | Estoque: ${item.qtd}`,
                            value: item.value,
                            emoji: item.emoji
                        })))
                );

                await msg.channel.send({ embeds: [embed], components: [menu] });
            }

            if (msg.content === '!chave') {
                msg.reply(`💰 **CHAVE PIX:** \`${db.config.pix}\`\nEnvie o comprovante para entrega automática!`);
            }
        });

        client.on('interactionCreate', async (i) => {
            // Lógica do Menu de Seleção
            if (i.isStringSelectMenu() && i.customId === 'menu_vendas') {
                const produto = db.estoque.find(p => p.value === i.values[0]);
                await i.reply({ 
                    content: `✅ Você selecionou: **${produto.label}**\n💵 Valor: **R$ ${produto.preco}**\n\nPara pagar, use o PIX: \`${db.config.pix}\``, 
                    ephemeral: true 
                });
            }

            // Lógica do /configurar
            if (i.isChatInputCommand() && i.commandName === 'configurar') {
                await i.reply({ content: "⚙️ **Painel de Gestão:**\nEm breve você poderá adicionar/remover itens por aqui!", ephemeral: true });
            }
        });

        await client.login(token);
        res.send({ msg: "Bot Online!" });
    } catch (e) { res.status(500).send({ erro: "Erro ao ligar" }); }
});

app.listen(process.env.PORT || 3000);
