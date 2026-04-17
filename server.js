const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: { nome: "Sua Loja", pix: "Não definido", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: []
};

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja, pix: pix, banner: banner };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas premium'),
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de gestão total')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log(`[!] ${db.config.nome} Online com Sucesso.`);
    });

    client.on('interactionCreate', async (i) => {
        // --- PAINEL DE VENDAS ---
        if (i.isChatInputCommand() && i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 **Nesta seção, você encontrará apenas contas baratas com itens bons.**\n🎮 Contas com diversas variedades de itens e frutas.\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Clique no botão abaixo para ver as opções!`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // --- PAINEL GERENCIAR (ADMIN) ---
        if (i.isChatInputCommand() && i.commandName === 'gerenciar') {
            const embed = new EmbedBuilder()
                .setTitle("⚙️ Gestão de Loja - Sirius")
                .setColor("Orange")
                .setDescription("Adicione produtos ou altere as configurações da loja.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('edit_store').setLabel('Configurar Loja').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('add_item').setLabel('Adicionar Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('clear_stock').setLabel('Limpar Estoque').setStyle(ButtonStyle.Danger)
            );
            await i.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- BOTÃO VER OPÇÕES ---
        if (i.isButton() && i.customId === 'ver_opcoes') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ O estoque está vazio no momento.", ephemeral: true });
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_compra')
                    .setPlaceholder('🛒 Escolha sua conta aqui...')
                    .addOptions(db.estoque.map((e, idx) => ({
                        label: e.nome,
                        description: `R$ ${e.preco} | Clique para abrir ticket`,
                        value: `prod_${idx}`,
                        emoji: e.emoji || "🎮"
                    })))
            );
            await i.reply({ content: "Escolha uma opção:", components: [menu], ephemeral: true });
        }

        // --- MODAIS DE GESTÃO ---
        if (i.isButton()) {
            if (i.customId === 'edit_store') {
                const modal = new ModalBuilder().setCustomId('modal_store').setTitle('Configurar Loja');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_nome').setLabel("Nome").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_pix').setLabel("Chave PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_banner').setLabel("URL do Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner))
                );
                await i.showModal(modal);
            }
            if (i.customId === 'add_item') {
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('Novo Produto');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_inome').setLabel("Nome").setStyle(TextInputStyle.Short).setPlaceholder("Ex: God + CDK")),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_ipreco').setLabel("Preço").setStyle(TextInputStyle.Short).setPlaceholder("Ex: 9.99")),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_iemoji').setLabel("Emoji").setStyle(TextInputStyle.Short).setPlaceholder("Ex: 🔱"))
                );
                await i.showModal(modal);
            }
            if (i.customId === 'close_ticket') await i.channel.delete();
            if (i.customId === 'clear_stock') { db.estoque = []; await i.reply({ content: "🗑️ Estoque limpo!", ephemeral: true }); }
        }

        // --- SUBMIT MODAL ---
        if (i.isModalSubmit()) {
            if (i.customId === 'modal_store') {
                db.config = { nome: i.fields.getTextInputValue('m_nome'), pix: i.fields.getTextInputValue('m_pix'), banner: i.fields.getTextInputValue('m_banner') };
                await i.reply({ content: "✅ Configurações salvas!", ephemeral: true });
            }
            if (i.customId === 'modal_add') {
                db.estoque.push({ nome: i.fields.getTextInputValue('m_inome'), preco: i.fields.getTextInputValue('m_ipreco'), emoji: i.fields.getTextInputValue('m_iemoji') });
                await i.reply({ content: "✅ Item adicionado!", ephemeral: true });
            }
        }

        // --- TICKET DE CHECKOUT ---
        if (i.isStringSelectMenu() && i.customId === 'select_compra') {
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
                .setDescription(`Olá ${i.user}!\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvie o comprovante abaixo para receber seu produto.`);

            const btnClose = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger));
            await canal.send({ content: `${i.user}`, embeds: [embedPay], components: [btnClose] });

            const btnIr = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`));
            await i.update({ content: `✅ Ticket criado: ${canal}`, components: [btnIr], ephemeral: true });
        }
    });

    await client.login(token);
    res.send({ msg: "Sistema Iniciado!" });
});
app.listen(process.env.PORT || 3000);
