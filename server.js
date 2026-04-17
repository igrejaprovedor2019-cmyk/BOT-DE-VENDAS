const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: {
        nome: "GBZ Store",
        pix: "Sua Chave PIX",
        banner: "https://i.imgur.com/vWb6XyS.png",
        msgVendas: "📌 Escolha sua conta abaixo. Estoque atualizado!",
        siglas: "🔱 GODHUMAN | ⚔️ CDK | 🎸 SOUL GUITAR",
    },
    estoque: [] // Aqui fica: { nome, preco, qtd, emoji }
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
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de controle')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // --- PAINEL DE VENDAS ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`⭐ ${db.config.nome} - Melhores Contas`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`${db.config.msgVendas}\n\n**Siglas:**\n${db.config.siglas}`)
                .setFooter({ text: "Clique no botão abaixo para comprar" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('abrir_menu').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            return i.reply({ embeds: [embed], components: [row] });
        }

        // --- MENU DE PRODUTOS (COM QUANTIDADE) ---
        if (i.isButton() && i.customId === 'abrir_menu') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ Estoque vazio!", ephemeral: true });
            
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('comprar_item').setPlaceholder('🛒 Escolha seu produto...')
                .addOptions(db.estoque.map((e, idx) => ({
                    label: e.nome,
                    description: `R$ ${e.preco} | Estoque: ${e.qtd}`,
                    value: `prod_${idx}`,
                    emoji: e.emoji || "📦"
                })))
            );
            return i.reply({ content: "**Selecione uma conta da lista:**", components: [menu], ephemeral: true });
        }

        // --- TICKET EM TEXTO PURO (COMO VOCÊ PEDIU) ---
        if (i.isStringSelectMenu() && i.customId === 'comprar_item') {
            await i.deferReply({ ephemeral: true }); // AQUI ELE NÃO TRAVA!
            
            const item = db.estoque[i.values[0].split('_')[1]];
            if (parseInt(item.qtd) <= 0) return i.editReply("❌ Este produto está esgotado!");

            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const msgTicket = `
👋 **Olá ${i.user}, seu pedido foi gerado!**

📦 **Produto:** \`${item.nome}\`
💰 **Valor:** \`R$ ${item.preco}\`
🔑 **PIX:** \`${db.config.pix}\`

⚠️ **Aviso:** Envie o comprovante aqui para um staff validar.
⚡ **Status:** 🕒 *Aguardando pagamento...*
`;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: msgTicket, components: [row] });
            
            const btnIr = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            return i.editReply({ content: `✅ Ticket aberto com sucesso em ${canal}!`, components: [btnIr] });
        }

        // --- GERENCIAR ---
        if (i.commandName === 'gerenciar') {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('g_loja').setLabel('Loja/PIX').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('g_msgs').setLabel('Siglas/Textos').setStyle(ButtonStyle.Primary)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('g_add').setLabel('Add Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('g_del').setLabel('Limpar Estoque').setStyle(ButtonStyle.Danger)
            );
            return i.reply({ content: "⚙️ **Painel Sirius Maker**", components: [row1, row2], ephemeral: true });
        }

        // MODAIS DE CONFIGURAÇÃO
        if (i.isButton()) {
            if (i.customId === 'g_loja') {
                const modal = new ModalBuilder().setCustomId('m_loja').setTitle('Configurar Loja');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b').setLabel("Banner URL").setStyle(TextInputStyle.Short).setValue(db.config.banner))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'g_msgs') {
                const modal = new ModalBuilder().setCustomId('m_msgs').setTitle('Siglas e Textos');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ms').setLabel("Siglas (Editável)").setStyle(TextInputStyle.Paragraph).setValue(db.config.siglas)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mv').setLabel("Texto do Painel").setStyle(TextInputStyle.Paragraph).setValue(db.config.msgVendas))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'g_add') {
                const modal = new ModalBuilder().setCustomId('m_add').setTitle('Adicionar Produto');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q').setLabel("Quantidade em Estoque").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('e').setLabel("Emoji").setStyle(TextInputStyle.Short).setRequired(false))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'fechar') return i.channel.delete();
        }

        // SALVANDO DADOS
        if (i.isModalSubmit()) {
            if (i.customId === 'm_loja') {
                db.config.nome = i.fields.getTextInputValue('n');
                db.config.pix = i.fields.getTextInputValue('p');
                db.config.banner = i.fields.getTextInputValue('b');
                return i.reply({ content: "✅ Configurações salvas!", ephemeral: true });
            }
            if (i.customId === 'm_msgs') {
                db.config.siglas = i.fields.getTextInputValue('ms');
                db.config.msgVendas = i.fields.getTextInputValue('mv');
                return i.reply({ content: "✅ Textos atualizados!", ephemeral: true });
            }
            if (i.customId === 'm_add') {
                db.estoque.push({ 
                    nome: i.fields.getTextInputValue('n'), 
                    preco: i.fields.getTextInputValue('p'), 
                    qtd: i.fields.getTextInputValue('q'),
                    emoji: i.fields.getTextInputValue('e') || "📦" 
                });
                return i.reply({ content: "✅ Item adicionado ao estoque!", ephemeral: true });
            }
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Sirius Pro Online!" });
});
app.listen(process.env.PORT || 3000);
