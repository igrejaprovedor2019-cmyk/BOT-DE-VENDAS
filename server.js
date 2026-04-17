const express = require('express');
const { 
    Client, GatewayIntentBits, ActionRowBuilder, EmbedBuilder, 
    StringSelectMenuBuilder, SlashCommandBuilder, REST, Routes, PermissionFlagsBits 
} = require('discord.js');
const app = express();
const path = require('path');

app.use(express.json());

// BANCO DE DADOS (Configurações Iniciais)
let lojaDB = {
    nome: "Sirius Store",
    pix: "Chave não configurada",
    banner: "https://i.imgur.com/vWb6XyS.png",
    estoque: [
        { id: "c1", nome: "LV 2800: God + Cdk + SG + Frutas", preco: "9.99", qtd: 62, emoji: "⚔️" },
        { id: "c2", nome: "LV 2800: God + Shark Anchor + Frutas", preco: "11.99", qtd: 94, emoji: "⚓" },
        { id: "c3", nome: "LV 2800: God Human + Frutas", preco: "4.99", qtd: 27, emoji: "🔱" }
    ]
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/ligar-bot', async (req, res) => {
    const { token, nomeLoja } = req.body;
    lojaDB.nome = nomeLoja;

    const client = new Client({ 
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
    });

    client.on('ready', async () => {
        console.log(`Bot ${client.user.tag} Online!`);

        // REGISTRAR COMANDOS SLASH (/)
        const commands = [
            new SlashCommandBuilder()
                .setName('vendas')
                .setDescription('Envia o painel de vendas profissional'),
            new SlashCommandBuilder()
                .setName('chave')
                .setDescription('Configura sua chave PIX para vendas')
                .addStringOption(opt => opt.setName('pix').setDescription('Sua chave PIX').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder()
                .setName('configurar')
                .setDescription('Configurações gerais do bot')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ].map(cmd => cmd.toJSON());

        const rest = new REST({ version: '10' }).setToken(token);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
            console.log("Comandos registrados!");
        } catch (e) { console.error(e); }
    });

    client.on('interactionCreate', async (i) => {
        // COMANDO /VENDAS
        if (i.isChatInputCommand() && i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`Combo Contas Baratas - ${lojaDB.nome}`)
                .setImage(lojaDB.banner)
                .setColor("#2b2d31")
                .setDescription(`📌 Nesta seção, você encontrará apenas contas baratas com itens bons.\n🎮 Contas com diversas variedades de itens e frutas.\n\n**Siglas:**\n**GOD:** 🔱 God Human | **CDK:** ⚔️ Cursed Dual Katana\n**SG:** 🎸 Soul Guitar | **SA:** ⚓ Shark Anchor\n\n🖱️ Clique no menu abaixo e escolha sua conta!`);

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('selecionar_produto')
                    .setPlaceholder('🛒 Clique aqui para ver as opções')
                    .addOptions(lojaDB.estoque.map(p => ({
                        label: p.nome,
                        description: `Valor: R$ ${p.preco} | Estoque: ${p.qtd}`,
                        value: p.id,
                        emoji: p.emoji
                    })))
            );

            await i.reply({ embeds: [embed], components: [menu] });
        }

        // COMANDO /CHAVE
        if (i.isChatInputCommand() && i.commandName === 'chave') {
            const novaChave = i.options.getString('pix');
            lojaDB.pix = novaChave;
            await i.reply({ content: `✅ **Sucesso!** Sua chave PIX foi configurada para: \`${novaChave}\``, ephemeral: true });
        }

        // INTERAÇÃO COM O MENU
        if (i.isStringSelectMenu() && i.customId === 'selecionar_produto') {
            const produto = lojaDB.estoque.find(p => p.id === i.values[0]);
            
            const embedCheckout = new EmbedBuilder()
                .setTitle("💳 Pagamento - " + produto.nome)
                .setColor("Green")
                .setDescription(`Olá! Você selecionou um produto de alta qualidade.\n\n💵 **Valor:** \`R$ ${produto.preco}\`\n🔑 **PIX:** \`${lojaDB.pix}\`\n\n**Instruções:**\n1️⃣ Copie a chave acima.\n2️⃣ Faça o pagamento no seu banco.\n3️⃣ Envie o comprovante aqui no chat para um moderador entregar sua conta!`)
                .setFooter({ text: "Sistema Automático " + lojaDB.nome });

            await i.reply({ embeds: [embedCheckout], ephemeral: true });
        }
    });

    await client.login(token);
    res.send({ msg: "Bot Ativado com Sucesso!" });
});

app.listen(process.env.PORT || 3000);
