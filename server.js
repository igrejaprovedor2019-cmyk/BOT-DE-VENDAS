const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: { nome: "Sua Loja", pix: "Não Definido", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: []
};

app.get('/', (req, res) => res.send("Sistema Ativo!"));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja || "Sirius Store", pix: pix || "Pendente", banner: banner || "https://i.imgur.com/vWb6XyS.png" };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        console.log(`Logado como ${client.user.tag}`);
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas'),
            new SlashCommandBuilder().setName('gerenciar').setDescription('Painel de controle total')
        ].map(c => c.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log("Comandos registrados com sucesso!");
        } catch (error) {
            console.error("Erro ao registrar comandos:", error);
        }
    });

    client.on('interactionCreate', async (i) => {
        // --- COMANDO /GERENCIAR (ADMIN) ---
        if (i.isChatInputCommand() && i.commandName === 'gerenciar') {
            const embed = new EmbedBuilder()
                .setTitle("🛠️ Painel de Controle Sirius")
                .setColor("#5865F2")
                .setDescription("Gerencie sua loja abaixo. Adicione itens ou mude as configurações visuais.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_edit_loja').setLabel('Configurar Loja').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_add_estoque').setLabel('Adicionar Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_limpar_estoque').setLabel('Limpar Tudo').setStyle(ButtonStyle.Danger)
            );
            await i.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // --- COMANDO /VENDAS (CLIENTE) ---
        if (i.isChatInputCommand() && i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 **Produtos de alta qualidade.**\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Clique abaixo para ver as opções:`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO VER OPÇÕES ---
        if (i.isButton() && i.customId === 'btn_ver_opcoes') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ O estoque está vazio!", ephemeral: true });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_checkout')
                    .setPlaceholder('🛒 Selecione a conta...')
                    .addOptions(db.estoque.map((item, idx) => ({
                        label: item.nome,
                        description: `Preço: R$ ${item.preco}`,
                        value: `item_${idx}`,
                        emoji: item.emoji || "🎮"
                    })))
            );
            await i.reply({ content: "Escolha uma das contas abaixo:", components: [menu], ephemeral: true });
        }

        // --- BOTÕES DO GERENCIAR (MODAIS) ---
        if (i.isButton()) {
            if (i.customId === 'btn_edit_loja') {
                const modal = new ModalBuilder().setCustomId('modal_config_loja').setTitle('Configurar Loja');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_nome').setLabel("Nome da Loja").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_pix').setLabel("Chave PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_banner').setLabel("URL do Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner))
                );
                await i.showModal(modal);
            }

            if (i.customId === 'btn_add_estoque') {
                const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Novo Produto');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_inome').setLabel("Nome do Item").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_ipreco').setLabel("Preço (Ex: 9.99)").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_iemoji').setLabel("Emoji (Ex: 🔱)").setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);
            }

            if (i.customId === 'btn_fechar_ticket') await i.channel.delete();
            if (i.customId === 'btn_limpar_estoque') { db.estoque = []; await i.reply({ content: "🗑️ Estoque esvaziado!", ephemeral: true }); }
        }

        // --- SUBMISSÃO DE MODAIS ---
        if (i.isModalSubmit()) {
            if (i.customId === 'modal_config_loja') {
                db.config.nome = i.fields.getTextInputValue('m_nome');
                db.config.pix = i.fields.getTextInputValue('m_pix');
                db.config.banner = i.fields.getTextInputValue('m_banner');
                await i.reply({ content: "✅ Configurações salvas!", ephemeral: true });
            }
            if (i.customId === 'modal_add_item') {
                db.estoque.push({ 
                    nome: i.fields.getTextInputValue('m_inome'), 
                    preco: i.fields.getTextInputValue('m_ipreco'), 
                    emoji: i.fields.getTextInputValue('m_iemoji') 
                });
                await i.reply({ content: "✅ Item adicionado ao estoque!", ephemeral: true });
            }
        }

        // --- TICKET DE COMPRA ---
        if (i.isStringSelectMenu() && i.customId === 'menu_checkout') {
            const item = db.estoque[i.values[0].split('_')[1]];
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });

            const embedPay = new EmbedBuilder()
                .setTitle(`💳 Checkout - ${item.nome}`)
                .setColor("#2ecc71")
                .setDescription(`Olá ${i.user}!\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvie o comprovante abaixo para receber sua conta.`);

            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedPay], components: [btnRow] });

            const btnIr = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            await i.reply({ content: `✅ Ticket aberto: ${canal}`, components: [btnIr], ephemeral: true });
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Ativo!" });
});

app.listen(process.env.PORT || 3000);
