const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: { nome: "GBZ Store", pix: "Chave PIX aqui", banner: "https://i.imgur.com/vWb6XyS.png" },
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
            new SlashCommandBuilder().setName('gerenciar').setDescription('Configurar bot e estoque')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // --- PAINEL DE VENDAS (EXATAMENTE COMO A PRINT) ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas no Blox Fruits.\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Clique no botão abaixo e escolha sua conta!`)
                .setFields({ name: 'A partir de R$ 4,99', value: 'Clique no botão "Ver Opções"' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            return i.reply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO VER OPÇÕES ---
        if (i.isButton() && i.customId === 'ver_opcoes') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ Estoque vazio!", ephemeral: true });
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('comprar')
                    .setPlaceholder('🛒 Selecione o seu produto...')
                    .addOptions(db.estoque.map((e, idx) => ({
                        label: e.nome,
                        description: `R$ ${e.preco}`,
                        value: `prod_${idx}`,
                        emoji: e.emoji
                    })))
            );
            return i.reply({ content: "Selecione uma conta:", components: [menu], ephemeral: true });
        }

        // --- CHECKOUT E TICKET ---
        if (i.isStringSelectMenu() && i.customId === 'comprar') {
            await i.deferUpdate(); // Evita o erro de "não respondeu"
            const item = db.estoque[i.values[0].split('_')[1]];
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const embedPay = new EmbedBuilder()
                .setTitle(`💳 Pagamento - ${item.nome}`)
                .setColor("#2ecc71")
                .setDescription(`Olá ${i.user}!\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvie o comprovante para um moderador entregar sua conta!`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedPay], components: [row] });
            return i.followUp({ content: `✅ Ticket aberto: ${canal}`, ephemeral: true });
        }

        // --- COMANDO GERENCIAR ---
        if (i.commandName === 'gerenciar') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('conf_loja').setLabel('Configurar Loja').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('add_item').setLabel('Adicionar Item').setStyle(ButtonStyle.Success)
            );
            return i.reply({ content: "⚙️ Painel de Controle", components: [row], ephemeral: true });
        }

        // --- MODAIS (EDIÇÃO TOTAL) ---
        if (i.isButton() && i.customId === 'conf_loja') {
            const modal = new ModalBuilder().setCustomId('m_loja').setTitle('Configurar Loja');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b').setLabel("Banner URL").setStyle(TextInputStyle.Short).setValue(db.config.banner))
            );
            return i.showModal(modal);
        }

        if (i.isButton() && i.customId === 'add_item') {
            const modal = new ModalBuilder().setCustomId('m_item').setTitle('Adicionar ao Estoque');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome do Item").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('e').setLabel("Emoji").setStyle(TextInputStyle.Short))
            );
            return i.showModal(modal);
        }

        if (i.isModalSubmit()) {
            if (i.customId === 'm_loja') {
                db.config = { nome: i.fields.getTextInputValue('n'), pix: i.fields.getTextInputValue('p'), banner: i.fields.getTextInputValue('b') };
                return i.reply({ content: "✅ Atualizado!", ephemeral: true });
            }
            if (i.customId === 'm_item') {
                db.estoque.push({ nome: i.fields.getTextInputValue('n'), preco: i.fields.getTextInputValue('p'), emoji: i.fields.getTextInputValue('e') });
                return i.reply({ content: "✅ Produto Adicionado!", ephemeral: true });
            }
        }
        if (i.isButton() && i.customId === 'fechar') return i.channel.delete();
    });

    await client.login(token);
    res.send({ msg: "Bot Online!" });
});
app.listen(process.env.PORT || 3000);
