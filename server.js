const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

// BANCO DE DADOS COMPLETO
let db = {
    config: {
        nome: "GBZ Store",
        pix: "Chave PIX",
        banner: "https://i.imgur.com/vWb6XyS.png",
        msgVendas: "📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas no Blox Fruits.",
        msgTicket: "Olá! Você selecionou um produto de alta qualidade.\n\nEnvie o comprovante para receber sua conta!"
    },
    estoque: []
};

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config.nome = nomeLoja || db.config.nome;
    db.config.pix = pix || db.config.pix;
    db.config.banner = banner || db.config.banner;

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Postar painel de vendas'),
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de Controle Total')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // --- COMANDO VENDAS ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`${db.config.msgVendas}\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓`)
                .setFooter({ text: "Clique no botão abaixo para ver as opções" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            return i.reply({ embeds: [embed], components: [row] });
        }

        // --- COMANDO GERENCIAR (O CÉREBRO DO BOT) ---
        if (i.commandName === 'gerenciar') {
            const embed = new EmbedBuilder()
                .setTitle("🛠️ Painel de Controle Sirius")
                .setDescription("Escolha o que você deseja editar agora:")
                .setColor("Blue");

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('edit_loja').setLabel('Configurar Loja/PIX').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('edit_msgs').setLabel('Editar Mensagens').setStyle(ButtonStyle.Primary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add_item').setLabel('Adicionar Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('del_item').setLabel('Remover Produto').setStyle(ButtonStyle.Danger)
            );

            return i.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
        }

        // --- INTERAÇÕES DE BOTÕES (MODAIS) ---
        if (i.isButton()) {
            if (i.customId === 'edit_loja') {
                const modal = new ModalBuilder().setCustomId('m_loja').setTitle('Configurar Loja');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome da Loja").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Chave PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b').setLabel("URL do Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner))
                );
                return i.showModal(modal);
            }

            if (i.customId === 'edit_msgs') {
                const modal = new ModalBuilder().setCustomId('m_msgs').setTitle('Editar Mensagens');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mv').setLabel("Mensagem do Painel de Vendas").setStyle(TextInputStyle.Paragraph).setValue(db.config.msgVendas)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mt').setLabel("Mensagem de Dentro do Ticket").setStyle(TextInputStyle.Paragraph).setValue(db.config.msgTicket))
                );
                return i.showModal(modal);
            }

            if (i.customId === 'add_item') {
                const modal = new ModalBuilder().setCustomId('m_add').setTitle('Adicionar ao Estoque');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome do Item").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('e').setLabel("Emoji (Opcional)").setStyle(TextInputStyle.Short).setRequired(false))
                );
                return i.showModal(modal);
            }

            if (i.customId === 'del_item') {
                if (db.estoque.length === 0) return i.reply({ content: "Estoque vazio!", ephemeral: true });
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('deletar_item').setPlaceholder('Selecione o item para APAGAR')
                    .addOptions(db.estoque.map((e, idx) => ({ label: e.nome, value: `${idx}` })))
                );
                return i.reply({ content: "Qual item deseja remover?", components: [menu], ephemeral: true });
            }

            if (i.customId === 'ver_opcoes') {
                if (db.estoque.length === 0) return i.reply({ content: "❌ Estoque vazio!", ephemeral: true });
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('comprar').setPlaceholder('🛒 Selecione seu produto...')
                    .addOptions(db.estoque.map((e, idx) => ({ label: e.nome, description: `R$ ${e.preco}`, value: `prod_${idx}`, emoji: e.emoji || "📦" })))
                );
                return i.reply({ content: "Escolha uma conta:", components: [menu], ephemeral: true });
            }

            if (i.customId === 'fechar') return i.channel.delete();
        }

        // --- SUBMIT MODALS ---
        if (i.isModalSubmit()) {
            if (i.customId === 'm_loja') {
                db.config.nome = i.fields.getTextInputValue('n');
                db.config.pix = i.fields.getTextInputValue('p');
                db.config.banner = i.fields.getTextInputValue('b');
                return i.reply({ content: "✅ Configurações de Loja atualizadas!", ephemeral: true });
            }
            if (i.customId === 'm_msgs') {
                db.config.msgVendas = i.fields.getTextInputValue('mv');
                db.config.msgTicket = i.fields.getTextInputValue('mt');
                return i.reply({ content: "✅ Mensagens atualizadas!", ephemeral: true });
            }
            if (i.customId === 'm_add') {
                db.estoque.push({ nome: i.fields.getTextInputValue('n'), preco: i.fields.getTextInputValue('p'), emoji: i.fields.getTextInputValue('e') || "📦" });
                return i.reply({ content: "✅ Produto adicionado!", ephemeral: true });
            }
        }

        // --- LOGICA DE COMPRA ---
        if (i.isStringSelectMenu()) {
            if (i.customId === 'deletar_item') {
                db.estoque.splice(parseInt(i.values[0]), 1);
                return i.reply({ content: "🗑️ Item removido!", ephemeral: true });
            }
            if (i.customId === 'comprar') {
                await i.deferUpdate();
                const item = db.estoque[i.values[0].split('_')[1]];
                const canal = await i.guild.channels.create({
                    name: `🛒-${i.user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                const embedTicket = new EmbedBuilder()
                    .setTitle(`💳 Pagamento - ${item.nome}`)
                    .setColor("#2ecc71")
                    .setDescription(`${db.config.msgTicket}\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\``);

                const btn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger));
                await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btn] });

                const irBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`));
                return i.followUp({ content: `✅ Ticket aberto: ${canal}`, components: [irBtn], ephemeral: true });
            }
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Ligado com Controle Total!" });
});
app.listen(process.env.PORT || 3000);
