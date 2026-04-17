const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, 
    SlashCommandBuilder, REST, Routes, PermissionFlagsBits, ChannelType, ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const app = express();
app.use(express.json());

let db = {
    config: { nome: "GBZ Store", pix: "Sua Chave Aqui", banner: "https://i.imgur.com/vWb6XyS.png" },
    estoque: [
        { label: "LV 2800: God + Cdk + SG + Frutas", price: "9,99", emoji: "⚔️" },
        { label: "LV 2800: God + Shark Anchor + Frutas", price: "11,99", emoji: "⚓" },
        { label: "LV 2800: God Human + Frutas", price: "4,99", emoji: "🔱" }
    ]
};

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja, pix, banner } = req.body;
    db.config = { nome: nomeLoja, pix: pix, banner: banner };

    const client = new Client({ intents: [3276799] });

    client.on('ready', async () => {
        const commands = [new SlashCommandBuilder().setName('vendas').setDescription('Postar painel de vendas')].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    });

    client.on('interactionCreate', async (i) => {
        // Painel Inicial com Botão "Ver Opções"
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas no Blox Fruits.\n\n**Entenda as siglas:**\n\nGOD: 🔱 God Human\nCDK: ⚔️ Cursed Dual Katana\nTTK: ⚔️ True Triple Katana\nSG: 🎸 Soul Guitar\nSA: ⚓ Shark Anchor\n\n🖱️ Clique no botão abaixo e escolha sua conta!`)
                .addFields({ name: 'Apartir de R$ 4,99', value: 'Clique no botão "Ver Opções"' });

            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ver_opcoes').setLabel('Ver Opções').setStyle(ButtonStyle.Success)
            );
            await i.reply({ embeds: [embed], components: [btn] });
        }

        // Ao clicar em "Ver Opções", abre o Select Menu
        if (i.isButton() && i.customId === 'ver_opcoes') {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selecionar_conta')
                    .setPlaceholder('Clique aqui para ver as opções')
                    .addOptions(db.estoque.map((e, idx) => ({
                        label: e.label,
                        description: `Preço: R$ ${e.price} | Estoque: Disponível`,
                        value: `conta_${idx}`,
                        emoji: e.emoji
                    })))
            );
            await i.reply({ content: 'Escolha sua conta:', components: [menu], ephemeral: true });
        }

        // Ao selecionar a conta, cria o Ticket de Checkout
        if (i.isStringSelectMenu() && i.customId === 'selecionar_conta') {
            const conta = db.estoque[i.values[0].split('_')[1]];
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const embedCheckout = new EmbedBuilder()
                .setTitle(`💳 Pagamento - ${conta.label}`)
                .setColor("#2ecc71")
                .setDescription(`Olá! Você selecionou um produto de alta qualidade.\n\n💵 **Valor:** R$ ${conta.price}\n🔑 **PIX:** \`${db.config.pix}\`\n\n**Instruções:**\n1️⃣ Copie a chave acima.\n2️⃣ Faça o pagamento no seu banco.\n3️⃣ Envie o comprovante aqui no chat!`);

            await canal.send({ content: `${i.user}`, embeds: [embedCheckout] });
            await i.update({ content: `✅ Ticket criado em ${canal}!`, components: [], ephemeral: true });
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Ligado!" });
});
app.listen(process.env.PORT || 3000);
