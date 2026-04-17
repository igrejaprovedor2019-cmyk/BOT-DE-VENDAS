const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: { nome: "Loja Sirius", pix: "A definir", banner: "https://i.imgur.com/vWb6XyS.png" },
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
            new SlashCommandBuilder().setName('configurar').setDescription('Gerenciar estoque e loja')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("Sistema Online");
    });

    client.on('interactionCreate', async (i) => {
        // PAINEL DE VENDAS
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 **Produtos de alta qualidade.**\n\n**Siglas:**\nGOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓\n\n🖱️ Escolha no menu:`);

            if (db.estoque.length === 0) return i.reply({ content: "Estoque vazio!", ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('comprar')
                    .setPlaceholder('🛒 Selecione um produto...')
                    .addOptions(db.estoque.map((item, index) => ({
                        label: item.nome,
                        description: `Preço: R$ ${item.preco}`,
                        value: `item_${index}`,
                        emoji: item.emoji
                    })))
            );
            await i.reply({ embeds: [embed], components: [row] });
        }

        // CRIAÇÃO DE TICKET BEM FEITA
        if (i.isStringSelectMenu() && i.customId === 'comprar') {
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
                .setColor("#00ff6a")
                .setDescription(`Olá ${i.user}!\n\n💵 **Valor:** R$ ${item.preco}\n🔑 **PIX:** \`${db.config.pix}\`\n\nEnvie o comprovante neste chat para entrega.`);

            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `${i.user}`, embeds: [embedTicket], components: [btnRow] });

            const irPara = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            await i.reply({ content: `✅ Canal criado: ${canal}`, components: [irPara], ephemeral: true });
        }

        // PAINEL DE CONFIGURAÇÃO (MODAL)
        if (i.commandName === 'configurar') {
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add_prod').setLabel('Adicionar Produto').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('limpar').setLabel('Limpar Estoque').setStyle(ButtonStyle.Danger)
            );
            await i.reply({ content: "⚙️ **Gestão de Estoque**", components: [btnRow], ephemeral: true });
        }

        if (i.isButton() && i.customId === 'add_prod') {
            const modal = new ModalBuilder().setCustomId('modal_item').setTitle('Novo Produto');
            const n = new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short).setRequired(true);
            const p = new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short).setRequired(true);
            const e = new TextInputBuilder().setCustomId('e').setLabel("Emoji").setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(n), new ActionRowBuilder().addComponents(p), new ActionRowBuilder().addComponents(e));
            await i.showModal(modal);
        }

        if (i.isModalSubmit() && i.customId === 'modal_item') {
            db.estoque.push({ nome: i.fields.getTextInputValue('n'), preco: i.fields.getTextInputValue('p'), emoji: i.fields.getTextInputValue('e') });
            await i.reply({ content: "✅ Adicionado!", ephemeral: true });
        }

        if (i.isButton() && i.customId === 'fechar') await i.channel.delete();
        if (i.isButton() && i.customId === 'limpar') { db.estoque = []; await i.reply({ content: "Estoque limpo!", ephemeral: true }); }
    });

    await client.login(token);
    res.send({ msg: "Bot Ligado com Sucesso!" });
});
app.listen(process.env.PORT || 3000);
