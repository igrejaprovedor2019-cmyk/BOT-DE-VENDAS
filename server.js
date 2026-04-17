
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
        msgVendas: "📌 Seleção de contas exclusivas.",
        siglas: "🔱 GODHUMAN | ⚔️ CDK | 🎸 SOUL GUITAR",
        msgTicket: "Olá! Realize o pagamento abaixo para receber seu produto."
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
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de controle')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log(`✅ Bot ${client.user.tag} Online!`);
    });

    client.on('interactionCreate', async (i) => {
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`⭐ ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`${db.config.msgVendas}\n\n**Siglas:**\n${db.config.siglas}`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_opc').setLabel('Ver Opções').setStyle(ButtonStyle.Success));
            return i.reply({ embeds: [embed], components: [row] });
        }

        if (i.isButton() && i.customId === 'ver_opc') {
            if (db.estoque.length === 0) return i.reply({ content: "Estoque vazio!", ephemeral: true });
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('compra').setPlaceholder('Escolha um item...')
                .addOptions(db.estoque.map((e, idx) => ({ label: e.nome, description: `R$ ${e.preco} | Qtd: ${e.qtd}`, value: `p_${idx}` })))
            );
            return i.reply({ content: "Selecione:", components: [menu], ephemeral: true });
        }

        if (i.isStringSelectMenu() && i.customId === 'compra') {
            await i.deferReply({ ephemeral: true });
            const item = db.estoque[i.values[0].split('_')[1]];
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const msg = `👋 **Olá ${i.user}!**\n\n📦 **Produto:** \`${item.nome}\`\n💰 **Valor:** \`R$ ${item.preco}\`\n🔑 **PIX:** \`${db.config.pix}\`\n\n${db.config.msgTicket}`;
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fechar').setLabel('Fechar').setStyle(ButtonStyle.Danger));
            await canal.send({ content: msg, components: [row] });
            
            return i.editReply({ content: `✅ Ticket: ${canal}` });
        }

        if (i.commandName === 'gerenciar') {
            const r = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('g_loja').setLabel('Loja/PIX').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('g_add').setLabel('Add Item').setStyle(ButtonStyle.Success)
            );
            return i.reply({ content: "Painel ADM", components: [r], ephemeral: true });
        }

        if (i.isButton() && i.customId === 'g_loja') {
            const m = new ModalBuilder().setCustomId('m_l').setTitle('Config');
            m.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b').setLabel("Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner))
            );
            return i.showModal(m);
        }

        if (i.isButton() && i.customId === 'g_add') {
            const m = new ModalBuilder().setCustomId('m_a').setTitle('Add Item');
            m.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q').setLabel("Qtd").setStyle(TextInputStyle.Short))
            );
            return i.showModal(m);
        }

        if (i.isModalSubmit()) {
            if (i.customId === 'm_l') {
                db.config.nome = i.fields.getTextInputValue('n');
                db.config.pix = i.fields.getTextInputValue('p');
                db.config.banner = i.fields.getTextInputValue('b');
                return i.reply({ content: "✅ Salvo", ephemeral: true });
            }
            if (i.customId === 'm_a') {
                db.estoque.push({ nome: i.fields.getTextInputValue('n'), preco: i.fields.getTextInputValue('p'), qtd: i.fields.getTextInputValue('q') });
                return i.reply({ content: "✅ Adicionado", ephemeral: true });
            }
        }
        if (i.customId === 'fechar') return i.channel.delete();
    });

    await client.login(token);
    res.send({ msg: "OK" });
});

// ESSA LINHA É A QUE RESOLVE O ERRO DE CONEXÃO NO RENDER:
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Site online na porta ${port}`));
