const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const app = express();

app.use(express.json());

// CONFIGURAÇÕES INICIAIS (O usuário pode mudar via !configurar depois)
let configBot = {
    pix: "SUA_CHAVE_AQUI",
    imagemBanner: "https://i.imgur.com/vWb6XyS.png", // Link da imagem do topo
    cor: "#2b2d31"
};

app.get('/', (req, res) => res.send("O Bot de Vendas está ONLINE no Render!"));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja } = req.body;
    try {
        const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

        client.on('messageCreate', async (msg) => {
            if (msg.author.bot) return;

            // COMANDO !VENDAS (O PAINEL DA FOTO)
            if (msg.content === '!vendas') {
                const embedVendas = new EmbedBuilder()
                    .setTitle(`Combo Contas Baratas - ${nomeLoja}`)
                    .setImage(configBot.imagemBanner)
                    .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas no Blox Fruits.\n\n**Entenda as siglas:**\n\n**GOD:** 🔱 God Human\n**CDK:** ⚔️ Cursed Dual Katana\n**TTK:** 🗡️ True Triple Katana\n**SG:** 🎸 Soul Guitar\n**SA:** ⚓ Shark Anchor\n**VH:** 🎭 Valkyrie Helm\n**NF:** 🥛 Mirror Fractal\n\n🖱️ Clique no botão abaixo e escolha sua conta!\n📌 Não esqueça de ler a descrição com atenção.`)
                    .setFooter({ text: 'A partir de R$ 4,99 | Clique no botão "Ver Opções"' })
                    .setColor(configBot.cor);

                const botao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
                );

                await msg.channel.send({ embeds: [embedVendas], components: [botao] });
            }

            // COMANDO !CHAVE
            if (msg.content === '!chave') {
                msg.reply(`💰 Minha chave PIX é: \`${configBot.pix}\`\nApós pagar, envie o comprovante!`);
            }

            // COMANDO !CONFIGURAR
            if (msg.content === '!configurar') {
                msg.reply({ content: "⚙️ **Painel de Configuração Privado**\nUse `!setpix CHAVE` para mudar o pix ou `!setbanner LINK` para a imagem.", ephemeral: true });
            }
        });

        // LÓGICA DO BOTÃO "VER OPÇÕES"
        client.on('interactionCreate', async (i) => {
            if (!i.isButton()) return;
            if (i.customId === 'ver_opcoes') {
                await i.reply({ content: "🛒 **PRODUTOS:**\n1️⃣ Conta Level Max + CDK: R$ 10,00\n2️⃣ Conta GodHuman + Soul Guitar: R$ 15,00\n\nPara comprar, use `!chave`", ephemeral: true });
            }
        });

        await client.login(token);
        res.send({ status: "Sucesso" });
    } catch (e) { res.status(500).send({ erro: e.message }); }
});

app.listen(process.env.PORT || 3000);
