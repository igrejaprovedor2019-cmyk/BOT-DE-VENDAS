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
        pix: "Chave PIX aqui",
        banner: "https://i.imgur.com/vWb6XyS.png",
        msgVendas: "📌 Seleção de contas exclusivas com os melhores itens do jogo.",
        siglas: "GOD: 🔱 | CDK: ⚔️ | SG: 🎸 | SA: ⚓",
        msgTicket: "Você escolheu um produto excelente! Siga os passos abaixo para completar sua compra."
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
            new SlashCommandBuilder().setName('vendas').setDescription('Painel de vendas profissional'),
            new SlashCommandBuilder().setName('gerenciar').setDescription('Controle total da loja')
        ].map(c => c.toJSON());
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("🔥 Sistema de Elite Online");
    });

    client.on('interactionCreate', async (i) => {
        // --- PAINEL DE VENDAS ---
        if (i.commandName === 'vendas') {
            const embed = new EmbedBuilder()
                .setTitle(`🛒 Central de Vendas - ${db.config.nome}`)
                .setImage(db.config.banner)
                .setColor("#2b2d31")
                .setDescription(`${db.config.msgVendas}\n\n**Legenda de Itens:**\n${db.config.siglas}`)
                .setFooter({ text: "Clique no botão verde para ver o estoque" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_opcoes').setLabel('Ver Opções Disponíveis').setStyle(ButtonStyle.Success)
            );
            return i.reply({ embeds: [embed], components: [row] });
        }

        // --- BOTÃO VER OPÇÕES ---
        if (i.isButton() && i.customId === 'btn_opcoes') {
            if (db.estoque.length === 0) return i.reply({ content: "❌ O estoque está vazio no momento.", ephemeral: true });
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('comprar_final').setPlaceholder('🛒 Selecione o que deseja comprar...')
                .addOptions(db.estoque.map((e, idx) => ({ 
                    label: e.nome, 
                    description: `Preço: R$ ${e.preco}`, 
                    value: `p_${idx}`, 
                    emoji: e.emoji || "📦" 
                })))
            );
            return i.reply({ content: "**Produtos disponíveis:**", components: [menu], ephemeral: true });
        }

        // --- TICKET DE CHECKOUT (O QUE VOCÊ PEDIU) ---
        if (i.isStringSelectMenu() && i.customId === 'comprar_final') {
            await i.deferUpdate();
            const item = db.estoque[i.values[0].split('_')[1]];
            
            const canal = await i.guild.channels.create({
                name: `🛒-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });

            // MENSAGEM DO TICKET BONITA
            const embedTicket = new EmbedBuilder()
                .setTitle("💳 Informações do seu Pedido")
                .setThumbnail(i.user.displayAvatarURL())
                .setColor("#00ff6a")
                .setDescription(db.config.msgTicket)
                .addFields(
                    { name: "📦 Produto:", value: `\`${item.nome}\``, inline: true },
                    { name: "💵 Valor:", value: `\`R$ ${item.preco}\``, inline: true },
                    { name: "🔑 Chave PIX:", value: `\`${db.config.pix}\``, inline: false }
                )
                .setFooter({ text: "Após o pagamento, envie o comprovante aqui." })
                .setTimestamp();

            const btnFechar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fechar_tk').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await canal.send({ content: `👋 Olá ${i.user}, seu ticket foi gerado!`, embeds: [embedTicket], components: [btnFechar] });

            const irBtn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Ir para o Ticket').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${i.guild.id}/${canal.id}`)
            );
            return i.followUp({ content: `✅ Canal de compra criado com sucesso!`, components: [irBtn], ephemeral: true });
        }

        // --- COMANDO GERENCIAR ---
        if (i.commandName === 'gerenciar') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('g_loja').setLabel('Configurar Loja').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('g_msgs').setLabel('Editar Mensagens/Siglas').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('g_add').setLabel('Adicionar Item').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('g_del').setLabel('Remover Item').setStyle(ButtonStyle.Danger)
            );
            return i.reply({ content: "⚙️ **Painel de Administração Sirius**", components: [row], ephemeral: true });
        }

        // --- BOTÕES DE GESTÃO ---
        if (i.isButton()) {
            if (i.customId === 'g_loja') {
                const modal = new ModalBuilder().setCustomId('m_loja').setTitle('Loja e Banner');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short).setValue(db.config.nome)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("PIX").setStyle(TextInputStyle.Short).setValue(db.config.pix)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('b').setLabel("URL Banner").setStyle(TextInputStyle.Short).setValue(db.config.banner))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'g_msgs') {
                const modal = new ModalBuilder().setCustomId('m_msgs').setTitle('Mensagens e Siglas');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mv').setLabel("Texto das Vendas").setStyle(TextInputStyle.Paragraph).setValue(db.config.msgVendas)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ms').setLabel("Siglas (Ex: GOD: 🔱)").setStyle(TextInputStyle.Paragraph).setValue(db.config.siglas)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mt').setLabel("Texto do Ticket").setStyle(TextInputStyle.Paragraph).setValue(db.config.msgTicket))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'g_add') {
                const modal = new ModalBuilder().setCustomId('m_add').setTitle('Novo Produto');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('n').setLabel("Nome").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p').setLabel("Preço").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('e').setLabel("Emoji").setStyle(TextInputStyle.Short))
                );
                return i.showModal(modal);
            }
            if (i.customId === 'g_del') {
                if (db.estoque.length === 0) return i.reply({ content: "Vazio", ephemeral: true });
                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('deletar').setPlaceholder('Apagar qual?')
                    .addOptions(db.estoque.map((e, idx) => ({ label: e.nome, value: `${idx}` })))
                );
                return i.reply({ content: "Selecione o item para remover:", components: [menu], ephemeral: true });
            }
            if (i.customId === 'fechar_tk') return i.channel.delete();
        }

        // --- SUBMIT MODALS ---
        if (i.isModalSubmit()) {
            if (i.customId === 'm_loja') {
                db.config.nome = i.fields.getTextInputValue('n');
                db.config.pix = i.fields.getTextInputValue('p');
                db.config.banner = i.fields.getTextInputValue('b');
                return i.reply({ content: "✅ Loja atualizada!", ephemeral: true });
            }
            if (i.customId === 'm_msgs') {
                db.config.msgVendas = i.fields.getTextInputValue('mv');
                db.config.siglas = i.fields.getTextInputValue('ms');
                db.config.msgTicket = i.fields.getTextInputValue('mt');
                return i.reply({ content: "✅ Mensagens atualizadas!", ephemeral: true });
            }
            if (i.customId === 'm_add') {
                db.estoque.push({ nome: i.fields.getTextInputValue('n'), preco: i.fields.getTextInputValue('p'), emoji: i.fields.getTextInputValue('e') || "📦" });
                return i.reply({ content: "✅ Produto adicionado!", ephemeral: true });
            }
        }

        if (i.isStringSelectMenu() && i.customId === 'deletar') {
            db.estoque.splice(parseInt(i.values[0]), 1);
            return i.reply({ content: "🗑️ Removido!", ephemeral: true });
        }
    });

    await client.login(token);
    res.send({ msg: "Bot de Elite Ligado!" });
});
app.listen(process.env.PORT || 3000);
