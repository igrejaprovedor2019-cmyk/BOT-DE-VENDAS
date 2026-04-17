const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, 
    StringSelectMenuBuilder, SlashCommandBuilder, REST, Routes, 
    PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// CONFIGURAÇÃO GLOBAL QUE VEM DO SITE
let botConfig = {};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    
    // Salva as configs enviadas pelo site
    botConfig = {
        nome: nomeLoja || "Minha Loja",
        pix: pix || "Não configurado",
        banner: banner || "https://i.imgur.com/vWb6XyS.png",
        estoque: [
            { id: "c1", nome: "LV 2800: God + Cdk + SG + Frutas", preco: "9.99", emoji: "⚔️" },
            { id: "c2", nome: "LV 2800: God + Shark Anchor + Frutas", preco: "11.99", emoji: "⚓" },
            { id: "c3", nome: "LV 2800: God + Cdk + MF + VH", preco: "13.99", emoji: "🥛" },
            { id: "c4", nome: "LV 2800: God Human + Frutas", preco: "4.99", emoji: "🔱" }
        ]
    };

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas profissional'),
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        try { await rest.put(Routes.applicationCommands(client.user.id), { body: commands }); } catch (e) {}
    });

    client.on('interactionCreate', async (i) => {
        // COMANDO /VENDAS
        if (i.isChatInputCommand() && i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${botConfig.nome}`)
                .setImage(botConfig.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas.\n\n**Siglas:**\nGOD: 🔱 God Human | CDK: ⚔️ Cursed Dual Katana\n\n🖱️ Clique no menu abaixo e escolha sua conta!`);

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selecionar_produto')
                    .setPlaceholder('🛒 Clique aqui para ver as opções')
                    .addOptions(botConfig.estoque.map(p => ({
                        label: p.nome,
                        description: `Valor: R$ ${p.preco}`,
                        value: p.id,
                        emoji: p.emoji
                    })))
            );
            await i.reply({ embeds: [embed], components: [menu] });
        }

        // MENU SELEÇÃO -> CRIA TICKET
        if (i.isStringSelectMenu() && i.customId === 'selecionar_produto') {
            const produto = botConfig.estoque.find(p => p.id === i.values[0]);
            const idPedido = Math.floor(1000 + Math.random() * 9000);

            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const embedPagamento = new EmbedBuilder()
                .setTitle(`💳 Pagamento - Pedido #${idPedido}`)
                .setColor("#2ecc71")
                .setDescription(`Olá! Você selecionou: **${produto.nome}**\n\n💵 **VALOR:** R$ ${produto.preco}\n🔑 **PIX:** \`${botConfig.pix}\`\n\n**Instruções:**\n1️⃣ Copie a chave acima.\n2️⃣ Faça o pagamento.\n3️⃣ Envie o comprovante aqui no chat!`)
                .setFooter({ text: `Loja: ${botConfig.nome}` });

            const botaoFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedPagamento], components: [botaoFechar] });
            await i.reply({ content: `✅ Ticket criado em ${canal}!`, ephemeral: true });
        }

        if (i.isButton() && i.customId === 'fechar_ticket') {
            await i.channel.delete();
        }
    });

    try {
        await client.login(token);
        res.send({ msg: "✅ Bot Configurado e Online!" });
    } catch (e) {
        res.status(500).send({ erro: "Token Inválido!" });
    }
});

app.listen(process.env.PORT || 3000);
