const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// CONFIGURAÇÕES PADRÃO (Você pode editar aqui direto)
let configBot = {
    pix: "SUA_CHAVE_PIX_AQUI",
    imagemBanner: "https://i.imgur.com/vWb6XyS.png", // Imagem do topo igual ao print
    cor: "#2b2d31"
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja } = req.body;
    try {
        const client = new Client({ 
            intents: [
                GatewayIntentBits.Guilds, 
                GatewayIntentBits.GuildMessages, 
                GatewayIntentBits.MessageContent
            ] 
        });

        client.on('ready', () => console.log(`Bot ${client.user.tag} Online!`));

        client.on('messageCreate', async (msg) => {
            if (msg.author.bot) return;

            // COMANDO !VENDAS (O PAINEL DO PRINT)
            if (msg.content === '!vendas') {
                const embedVendas = new EmbedBuilder()
                    .setTitle(`Combo Contas Baratas - ${nomeLoja}`)
                    .setImage(configBot.imagemBanner)
                    .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas no Blox Fruits.\n\n**Entenda as siglas:**\n\n**GOD:** 🔱 God Human\n**CDK:** ⚔️ Cursed Dual Katana\n**TTK:** 🗡️ True Triple Katana\n**SG:** 🎸 Soul Guitar\n**SA:** ⚓ Shark Anchor\n**VH:** 🎭 Valkyrie Helm\n**NF:** 🥛 Mirror Fractal\n\n🖱️ Clique no botão abaixo e escolha sua conta!\n📌 Não esqueça de ler a descrição com atenção.`)
                    .setFooter({ text: 'A partir de R$ 4,99 | Clique no botão "Ver Opções"' })
                    .setColor(configBot.cor);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ver_opcoes')
                        .setLabel('Ver Opções')
                        .setStyle(ButtonStyle.Success)
                );

                await msg.channel.send({ embeds: [embedVendas], components: [row] });
            }

            // COMANDO !CHAVE
            if (msg.content === '!chave') {
                await msg.reply(`💰 **CHAVE PIX PARA PAGAMENTO:**\n\`${configBot.pix}\`\n\nApós realizar o pagamento, envie o comprovante para o dono da loja!`);
            }

            // COMANDO !CONFIGURAR
            if (msg.content.startsWith('!setpix')) {
                const novaChave = msg.content.split(' ')[1];
                if(!novaChave) return msg.reply("Use: !setpix CHAVE_AQUI");
                configBot.pix = novaChave;
                msg.reply("✅ Chave PIX atualizada!");
            }
        });

        // RESPOSTA AO CLICAR NO BOTÃO
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;
            if (interaction.customId === 'ver_opcoes') {
                await interaction.reply({ 
                    content: "🛒 **NOSSOS PRODUTOS DISPONÍVEIS:**\n\n1️⃣ **CONTA LEVEL MAX + CDK + GODHUMAN** - R$ 14,90\n2️⃣ **CONTA COM FRUTA LEOPARD NO INV** - R$ 25,00\n\nPara comprar, use o comando `!chave` e envie o comprovante!", 
                    ephemeral: true 
                });
            }
        });

        await client.login(token);
        res.send({ msg: "Bot Ligado com Sucesso!" });
    } catch (e) {
        res.status(500).send({ erro: "Erro: Token inválido ou Intents desligadas." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
