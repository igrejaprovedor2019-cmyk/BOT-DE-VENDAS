const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const app = express();

app.use(express.json());

// Banco de dados dinâmico (salva enquanto o bot estiver online)
let db = {
    config: { nome: "Sua Loja", pix: "Não definido", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: [] 
};

app.get('/', (req, res) => res.send("Bot Online no Render!"));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja, pix: pix, banner: banner };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [
            new SlashCommandBuilder().setName('vendas').setDescription('Envia o painel de vendas profissional'),
            new SlashCommandBuilder().setName('configurar').setDescription('Painel de gestão da loja').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('add_item').setDescription('Adiciona item ao estoque')
                .addStringOption(o => o.setName('nome').setDescription('Nome do item').setRequired(true))
                .addStringOption(o => o.setName('preco').setDescription('Preço').setRequired(true))
                .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true))
        ].map(c => c.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // Painel de Vendas (O que o cliente vê)
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 **Nesta seção, você encontrará apenas contas baratas com itens bons.**\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Escolha sua conta no menu abaixo:`);

            if (db.estoque.length === 0) return i.reply({ content: "Estoque vazio!", ephemeral: true });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_compra')
                    .setPlaceholder('🛒 Selecione uma opção...')
                    .addOptions(db.estoque.map((item, idx) => ({
                        label: item.nome,
                        description: `Preço: R$ ${item.preco}`,
                        value: `item_${idx}`,
                        emoji: item.emoji
                    })))
            );
            await i.reply({ embeds: [embed], components: [menu] });
        }

        // Gestão de Estoque
        if (i.commandName === 'add_item') {
            db.estoque.push({
                nome: i.options.getString('nome'),
                preco: i.options.getString('preco'),
                emoji: i.options.getString('emoji')
            });
            await i.reply({ content: "✅ Item adicionado!", ephemeral: true });
        }

        // Lógica do Ticket (O sistema "bem feito")
        if (i.isStringSelectMenu() && i.customId === 'menu_compra') {
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
                .setTitle("💳 Checkout de Pagamento")
                .setDescription(`Olá ${i.user}, você escolheu: **${item.nome}**\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvie o comprovante abaixo.`)
                .setColor("#2ecc71")
                .setFooter({ text: `Sistema ${db.config.nome}` });

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btnFechar] });

            const linkBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );

            await i.reply({ content: `✅ Ticket criado!`, components: [linkBtn], ephemeral: true });
        }

        if (i.isButton() && i.customId === 'delete_ticket') await i.channel.delete();
    });

    await client.login(token);
    res.send({ msg: "Bot Online!" });
});

app.listen(process.env.PORT || 3000);
