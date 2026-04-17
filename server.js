const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();

app.use(express.json());

// Banco de dados em memória com as siglas que você usa
let db = {
    config: { nome: "GBZ Store", pix: "A definir", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: []
};

app.get('/', (req, res) => res.send("Bot Online no Render!"));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja || "GBZ Store", pix: pix || "A definir", banner: banner || "https://i.imgur.com/vWb6XyS.png" };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas'),
            new SlashCommandBuilder().setName('configurar').setDescription('Gerenciar estoque e bot')
        ].map(c => c.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // --- PAINEL DE VENDAS ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas.\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Clique no menu abaixo e escolha sua conta!`);

            if (db.estoque.length === 0) return i.reply({ content: "❌ Adicione itens no `/configurar` primeiro!", ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('comprar_item')
                    .setPlaceholder('🛒 Clique aqui para ver as opções')
                    .addOptions(db.estoque.map((item, index) => ({
                        label: item.nome,
                        description: `R$ ${item.preco} | Estoque: ${item.qtd}`,
                        value: `item_${index}`,
                        emoji: item.emoji
                    })))
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // --- SISTEMA DE TICKET (O BEM FEITO) ---
        if (i.isStringSelectMenu() && i.customId === 'comprar_item') {
            const index = i.values[0].split('_')[1];
            const item = db.estoque[index];

            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });

            const embedTicket = new EmbedBuilder()
                .setTitle(`💳 Pagamento - ${item.nome}`)
                .setColor("#2ecc71")
                .setDescription(`Olá ${i.user}, você selecionou um produto de alta qualidade.\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\n**Instruções:**\n1️⃣ Copie a chave acima.\n2️⃣ Pague no seu banco.\n3️⃣ Envie o comprovante aqui!\n\n*Sistema Automático ${db.config.nome}*`);

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btnFechar] });

            // Botão de redirecionamento imediato
            const rowIr = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            await i.reply({ content: `✅ Ticket criado com sucesso em ${canal}!`, components: [rowIr], ephemeral: true });
        }

        // --- PAINEL DE CONFIGURAÇÃO ---
        if (i.commandName === 'configurar') {
            const embedConfig = new EmbedBuilder()
                .setTitle("⚙️ Painel de Gestão Sirius")
                .setDescription("Gerencie o conteúdo da sua loja diretamente por aqui.")
                .addFields(
                    { name: "Itens no Estoque", value: `${db.estoque.length}`, inline: true },
                    { name: "Chave PIX", value: `\`${db.config.pix}\``, inline: true }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add_estoque').setLabel('Adicionar Item').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('limpar_estoque').setLabel('Limpar Tudo').setStyle(ButtonStyle.Danger)
            );

            await i.reply({ embeds: [embedConfig], components: [row], ephemeral: true });
        }

        // --- MODAL PARA ADICIONAR ITEM ---
        if (i.isButton() && i.customId === 'add_estoque') {
            const modal = new ModalBuilder().setCustomId('modal_add').setTitle('Adicionar Produto');
            const nomeInput = new TextInputBuilder().setCustomId('nome').setLabel("Nome do Item").setStyle(TextInputStyle.Short).setRequired(true);
            const precoInput = new TextInputBuilder().setCustomId('preco').setLabel("Preço (Ex: 9.99)").setStyle(TextInputStyle.Short).setRequired(true);
            const qtdInput = new TextInputBuilder().setCustomId('qtd').setLabel("Quantidade em Estoque").setStyle(TextInputStyle.Short).setRequired(true);
            const emojiInput = new TextInputBuilder().setCustomId('emoji').setLabel("Emoji (Ex: ⚔️)").setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(nomeInput), new ActionRowBuilder().addComponents(precoInput), new ActionRowBuilder().addComponents(qtdInput), new ActionRowBuilder().addComponents(emojiInput));
            await i.showModal(modal);
        }

        if (i.isModalSubmit() && i.customId === 'modal_add') {
            db.estoque.push({
                nome: i.fields.getTextInputValue('nome'),
                preco: i.fields.getTextInputValue('preco'),
                qtd: i.fields.getTextInputValue('qtd'),
                emoji: i.fields.getTextInputValue('emoji')
            });
            await i.reply({ content: "✅ Produto adicionado ao estoque!", ephemeral: true });
        }

        if (i.isButton() && i.customId === 'fechar_ticket') await i.channel.delete();
        if (i.isButton() && i.customId === 'limpar_estoque') { db.estoque = []; await i.reply({ content: "🧹 Estoque limpo!", ephemeral: true }); }
    });

    await client.login(token);
    res.send({ msg: "Bot Online!" });
});

app.listen(process.env.PORT || 3000);
