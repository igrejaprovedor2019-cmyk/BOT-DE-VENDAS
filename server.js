const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// BANCO DE DADOS EM MEMÓRIA
let db = {
    config: {
        nome: "Loja Sirius",
        pix: "Defina sua chave",
        banner: "https://i.imgur.com/vWb6XyS.png",
        cor: "#2b2d31",
        canalLogs: null
    },
    estoque: [
        { label: "LV 2800: God + Cdk + SG + Frutas", value: "p1", preco: "9.99", emoji: "⚔️", desc: "Conta level max com itens raros." },
        { label: "LV 2800: God + Shark Anchor + Frutas", value: "p2", preco: "11.99", emoji: "⚓", desc: "Focada em Shark Anchor." }
    ]
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config.nome = nomeLoja || db.config.nome;
    db.config.pix = pix || db.config.pix;
    db.config.banner = banner || db.config.banner;

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas'),
            new SlashCommandBuilder().setName('configurar').setDescription('Configura o bot (Admin)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ].map(c => c.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("Bot de Vendas Online!");
    });

    client.on('interactionCreate', async (i) => {
        // --- COMANDO /VENDAS ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor(db.config.cor)
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas.\n\n**Siglas:**\nGOD: 🔱 God Human | CDK: ⚔️ Cursed Dual Katana\nSG: 🎸 Soul Guitar | SA: ⚓ Shark Anchor\n\n🖱️ Clique no menu abaixo e escolha sua conta!`);

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_vendas')
                    .setPlaceholder('🛒 Clique aqui para selecionar seu produto')
                    .addOptions(db.estoque.map(e => ({ label: e.label, description: `R$ ${e.preco}`, value: e.value, emoji: e.emoji })))
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // --- SELEÇÃO DE PRODUTO -> CRIAÇÃO DE TICKET ---
        if (i.isStringSelectMenu() && i.customId === 'menu_vendas') {
            const produto = db.estoque.find(p => p.value === i.values[0]);
            
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });

            const embedTicket = new EmbedBuilder()
                .setTitle(`💳 Pagamento - ${produto.label}`)
                .setColor("#00ff00")
                .setDescription(`Olá ${i.user}, você iniciou o processo de compra.\n\n💵 **Valor:** \`R$ ${produto.preco}\`\n🔑 **PIX:** \`${db.config.pix}\`\n\n**Instruções:**\n1️⃣ Copie a chave acima.\n2️⃣ Pague no seu banco.\n3️⃣ Envie o comprovante aqui para entrega.\n\n*Sistema Automático ${db.config.nome}*`);

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btnFechar] });

            const btnIrTicket = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );

            await i.reply({ content: `✅ Ticket criado com sucesso em ${canal}!`, components: [btnIrTicket], ephemeral: true });
        }

        // --- COMANDO /CONFIGURAR ---
        if (i.commandName === 'configurar') {
            const embedConfig = new EmbedBuilder()
                .setTitle("⚙️ Painel de Configuração")
                .setDescription("O que você deseja alterar no bot?")
                .addFields(
                    { name: "PIX Atual", value: `\`${db.config.pix}\``, inline: true },
                    { name: "Nome da Loja", value: `\`${db.config.nome}\``, inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('set_pix').setLabel('Mudar PIX').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('set_banner').setLabel('Mudar Banner').setStyle(ButtonStyle.Primary)
            );

            await i.reply({ embeds: [embedConfig], components: [row], ephemeral: true });
        }

        if (i.isButton() && i.customId === 'fechar_ticket') {
            await i.reply("O ticket será excluído em 5 segundos...");
            setTimeout(() => i.channel.delete(), 5000);
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Online!" });
});

app.listen(process.env.PORT || 3000);
