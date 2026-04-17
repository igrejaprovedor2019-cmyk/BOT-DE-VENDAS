const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

// BANCO DE DADOS DINÂMICO
let db = {
    config: { nome: "Sua Loja", pix: "Não Definido", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: []
};

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja, pix: pix, banner: banner };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Postar painel de vendas'),
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de controle total do bot').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("Sistema Sirius Maker Pro Online");
    });

    client.on('interactionCreate', async (i) => {
        // --- COMANDO VENDAS (PAINEL PÚBLICO) ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 **Contas com variedades de itens e frutas.**\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Clique no botão abaixo para ver as contas disponíveis!`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_menu').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO VER OPÇÕES ---
        if (i.isButton() && i.customId === 'abrir_menu') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ Estoque vazio no momento.", ephemeral: true });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('comprar_conta')
                    .setPlaceholder('🛒 Selecione a conta desejada...')
                    .addOptions(db.estoque.map((e, idx) => ({
                        label: e.nome,
                        description: `Preço: R$ ${e.preco}`,
                        value: `item_${idx}`,
                        emoji: e.emoji || "🎮"
                    })))
            );
            await i.reply({ content: "Escolha uma das opções abaixo:", components: [menu], ephemeral: true });
        }

        // --- SISTEMA DE TICKET (CHECKOUT) ---
        if (i.isStringSelectMenu() && i.customId === 'comprar_conta') {
            const item = db.estoque[i.values[0].split('_')[1]];
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });

            const embedTicket = new EmbedBuilder()
                .setTitle(`💳 Checkout - ${item.nome}`)
                .setColor("#00ff6a")
                .setDescription(`Olá ${i.user}!\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvia o comprovante neste chat para receber sua conta.`);

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btnFechar] });

            const btnIr = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            await i.update({ content: `✅ Ticket aberto em ${canal}`, components: [btnIr], ephemeral: true });
        }

        // --- COMANDO GERENCIAR (PAINEL DE ADMIN) ---
        if (i.commandName === 'gerenciar') {
            const embed = new EmbedBuilder()
                .setTitle("⚙️ Painel de Controle Sirius")
                .setColor("Orange")
                .setDescription("Use os botões abaixo para editar o bot em tempo real.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('edit_loja').setLabel('Editar Loja/PIX').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('add_prod').setLabel('Adicionar Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('limpar_prod').setLabel('Limpar Estoque').setStyle(ButtonStyle.Danger)
            );
            await i.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- MODAIS DE CONFIGURAÇÃO ---
        if (i.isButton()) {
            if (i.customId === 'edit_loja') {
                const modal = new ModalBuilder().setCustomId('modal_loja').setTitle('Configurar Loja');
                const n = new TextInputBuilder().setCustomId('n').setLabel("Nome da Loja").setStyle(TextInputStyle.Short).setValue(db.config.nome);
                const p = new TextInputBuilder().setCustomId('p').setLabel("Chave PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix);
                const b = new TextInputBuilder().setCustomId('b').setLabel("URL do Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner);
                modal.addComponents(new ActionRowBuilder().addComponents(n), new ActionRowBuilder().addComponents(p), new ActionRowBuilder().addComponents(b));
                await i.showModal(modal);
            }

            if (i.customId === 'add_prod') {
                const modal = new ModalBuilder().setCustomId('modal_prod').setTitle('Novo Produto');
                const n = new TextInputBuilder().setCustomId('n').setLabel("Nome do Produto").setStyle(TextInputStyle.Short);
                const p = new TextInputBuilder().setCustomId('p').setLabel("Preço (Ex: 9.99)").setStyle(TextInputStyle.Short);
                const e = new TextInputBuilder().setCustomId('e').setLabel("Emoji").setStyle(TextInputStyle.Short);
                modal.addComponents(new ActionRowBuilder().addComponents(n), new ActionRowBuilder().addComponents(p), new ActionRowBuilder().addComponents(e));
                await i.showModal(modal);
            }

            if (i.customId === 'fechar_ticket') await i.channel.delete();
            if (i.customId === 'limpar_prod') { db.estoque = []; await i.reply({ content: "Estoque limpo!", ephemeral: true }); }
        }

        // --- RECEBER DADOS DOS MODAIS ---
        if (i.isModalSubmit()) {
            if (i.customId === 'modal_loja') {
                db.config.nome = i.fields.getTextInputValue('n');
                db.config.pix = i.fields.getTextInputValue('p');
                db.config.banner = i.fields.getTextInputValue('b');
                await i.reply({ content: "✅ Configurações da loja atualizadas!", ephemeral: true });
            }
            if (i.customId === 'modal_prod') {
                db.estoque.push({ 
                    nome: i.fields.getTextInputValue('n'), 
                    preco: i.fields.getTextInputValue('p'), 
                    emoji: i.fields.getTextInputValue('e') 
                });
                await i.reply({ content: "✅ Produto adicionado!", ephemeral: true });
            }
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Ligado!" });
});

app.listen(process.env.PORT || 3000);
