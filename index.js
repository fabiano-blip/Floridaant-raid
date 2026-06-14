require("dotenv").config();

const fs = require("fs");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1515588996821028965";
const GUILD_ID = "1515105644309647551";

const LOG_CHANNEL_ID = "1515124375450419240";
const STAFF_ROLE_ID = "1515590222132547646";

const AUTO_ROLE_ID = "1515117268156285089"; 
const WL_APROVADO_ROLE_ID = "1515117136907997235";

const PORT = process.env.PORT || 9595;
const DB_FILE = "./verificados.json";

const RAID_LIMIT = 6;
const RAID_TIME = 10000;

const SPAM_LIMIT = 5;
const SPAM_TIME = 7000;

const joins = new Map();
const spam = new Map();

if (!TOKEN) {
  console.log("❌ TOKEN não encontrado.");
  process.exit(1);
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ pendentes: [], verificados: [] }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function sendLog(guild, text, color = "Blue") {
  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle("🌴 Florida RP")
        .setDescription(text)
        .setTimestamp()
    ]
  }).catch(() => {});
}

/* API MTA */

app.post("/select/verificado", (req, res) => {
  const { account } = req.body;
  const db = loadDB();

  const verificado = db.verificados.find(v => v.account === account);

  if (verificado) {
    return res.json({
      account: verificado.account,
      userid: verificado.userid,
      name: verificado.name
    });
  }

  return res.json(false);
});

app.post("/insert/serVerificado", (req, res) => {
  const { account, code, name } = req.body;
  const db = loadDB();

  db.pendentes = db.pendentes.filter(p => p.account !== account);

  db.pendentes.push({
    account,
    code,
    name,
    userid: null,
    status: "aguardando_discord",
    criadoEm: Date.now()
  });

  saveDB(db);

  return res.json({ success: true });
});

app.post("/cargo/discord", async (req, res) => {
  const { account, cargoid, type } = req.body;

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(account);

    if (type === "add") await member.roles.add(cargoid);
    if (type === "remove") await member.roles.remove(cargoid);

    return res.json({ success: true });
  } catch {
    return res.json({ success: false });
  }
});

app.post("/send/message", async (req, res) => {
  const { account, mensagem } = req.body;

  try {
    const user = await client.users.fetch(account);
    await user.send(mensagem);
    return res.json({ success: true });
  } catch {
    return res.json({ success: false });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Florida RP online");
});

/* COMANDOS */

const commands = [
  new SlashCommandBuilder()
    .setName("painelwl")
    .setDescription("Enviar painel de whitelist Florida RP"),

  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Enviar mensagem pelo bot")
    .addStringOption(option =>
      option.setName("mensagem").setDescription("Mensagem").setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.log("❌ Erro ao registrar comandos:");
    console.error(error);
  }

  app.listen(PORT, () => {
    console.log(`✅ API ligada na porta ${PORT}`);
  });
});

/* INTERAÇÕES */

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painelwl") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🌴 WHITELIST — FLORIDA RP")
        .setDescription(
          "Bem-vindo(a) à **Florida RP**!\n\n" +
          "Para iniciar sua whitelist, clique no botão abaixo.\n\n" +
          "Você precisará informar:\n" +
          "• Código que apareceu no MTA\n" +
          "• Nome do personagem\n" +
          "• O que é RDM\n" +
          "• O que é VDM\n" +
          "• O que é amor à vida"
        )
        .setFooter({ text: "Florida RP • Sistema de Whitelist" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar_wl")
          .setLabel("Iniciar Whitelist")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: "✅ Painel de whitelist enviado.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "say") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
      }

      const mensagem = interaction.options.getString("mensagem");
      await interaction.channel.send(mensagem);

      return interaction.reply({ content: "✅ Mensagem enviada.", ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "iniciar_wl") {
      const modal = new ModalBuilder()
        .setCustomId("modal_wl")
        .setTitle("Whitelist Florida RP");

      const codigo = new TextInputBuilder()
        .setCustomId("codigo")
        .setLabel("Código que apareceu no MTA")
        .setPlaceholder("Exemplo: A1B2C3D")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const personagem = new TextInputBuilder()
        .setCustomId("personagem")
        .setLabel("Nome do personagem")
        .setPlaceholder("Exemplo: Pedro Silva")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const rdm = new TextInputBuilder()
        .setCustomId("rdm")
        .setLabel("Explique o que é RDM")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const vdm = new TextInputBuilder()
        .setCustomId("vdm")
        .setLabel("Explique o que é VDM")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const rp = new TextInputBuilder()
        .setCustomId("rp")
        .setLabel("Explique o que é amor à vida")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(codigo),
        new ActionRowBuilder().addComponents(personagem),
        new ActionRowBuilder().addComponents(rdm),
        new ActionRowBuilder().addComponents(vdm),
        new ActionRowBuilder().addComponents(rp)
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId.startsWith("aprovar_wl_")) {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: "❌ Apenas staff pode aprovar.", ephemeral: true });
      }

      const discordId = interaction.customId.replace("aprovar_wl_", "");
      const db = loadDB();

      const pendente = db.pendentes.find(p => p.userid === discordId);

      if (!pendente) {
        return interaction.reply({ content: "❌ Whitelist pendente não encontrada.", ephemeral: true });
      }

      db.verificados = db.verificados.filter(v => v.account !== pendente.account);

      db.verificados.push({
        account: pendente.account,
        userid: pendente.userid,
        name: pendente.name,
        verificadoEm: Date.now()
      });

      db.pendentes = db.pendentes.filter(p => p.userid !== discordId);

      saveDB(db);

      const member = await interaction.guild.members.fetch(discordId).catch(() => null);

      if (member) {
        await member.roles.remove(AUTO_ROLE_ID).catch(() => {});
        await member.roles.add(WL_APROVADO_ROLE_ID).catch(() => {});

        await member.send(
          "✅ Sua whitelist na **Florida RP** foi aprovada!\n\nVocê recebeu o cargo de aprovado e já pode entrar no servidor."
        ).catch(() => {});
      }

      await sendLog(
        interaction.guild,
        `✅ Whitelist aprovada.\n👤 Discord: <@${discordId}>\n🎮 Conta MTA: **${pendente.account}**\n✅ Staff: ${interaction.user}`,
        "Green"
      );

      return interaction.update({
        content: `✅ Whitelist aprovada por ${interaction.user}.`,
        embeds: interaction.message.embeds,
        components: []
      });
    }

    if (interaction.customId.startsWith("recusar_wl_")) {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.reply({ content: "❌ Apenas staff pode recusar.", ephemeral: true });
      }

      const discordId = interaction.customId.replace("recusar_wl_", "");
      const db = loadDB();

      const pendente = db.pendentes.find(p => p.userid === discordId);

      db.pendentes = db.pendentes.filter(p => p.userid !== discordId);
      saveDB(db);

      const member = await interaction.guild.members.fetch(discordId).catch(() => null);

      if (member) {
        await member.send(
          "❌ Sua whitelist na **Florida RP** foi recusada.\n\nRevise as regras e tente novamente."
        ).catch(() => {});
      }

      await sendLog(
        interaction.guild,
        `❌ Whitelist recusada.\n👤 Discord: <@${discordId}>\n🎮 Conta MTA: **${pendente?.account || "Não encontrada"}**\n❌ Staff: ${interaction.user}`,
        "Red"
      );

      return interaction.update({
        content: `❌ Whitelist recusada por ${interaction.user}.`,
        embeds: interaction.message.embeds,
        components: []
      });
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "modal_wl") {
      const codigo = interaction.fields.getTextInputValue("codigo").toUpperCase();
      const personagem = interaction.fields.getTextInputValue("personagem");
      const rdm = interaction.fields.getTextInputValue("rdm");
      const vdm = interaction.fields.getTextInputValue("vdm");
      const rp = interaction.fields.getTextInputValue("rp");

      const db = loadDB();
      const pendente = db.pendentes.find(p => p.code === codigo);

      if (!pendente) {
        return interaction.reply({
          content: "❌ Código inválido. Entre no MTA, pegue o código correto e tente novamente.",
          ephemeral: true
        });
      }

      pendente.userid = interaction.user.id;
      pendente.name = personagem;
      pendente.status = "aguardando_staff";
      pendente.respostas = { rdm, vdm, rp };

      saveDB(db);

      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("📋 Nova Whitelist Recebida")
        .addFields(
          { name: "👤 Discord", value: `${interaction.user}`, inline: true },
          { name: "🎮 Conta MTA", value: pendente.account || "Não encontrada", inline: true },
          { name: "📌 Personagem", value: personagem, inline: false },
          { name: "📘 O que é RDM?", value: rdm.slice(0, 1000), inline: false },
          { name: "🚗 O que é VDM?", value: vdm.slice(0, 1000), inline: false },
          { name: "❤️ Amor à vida", value: rp.slice(0, 1000), inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`aprovar_wl_${interaction.user.id}`)
          .setLabel("Aprovar")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`recusar_wl_${interaction.user.id}`)
          .setLabel("Recusar")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Danger)
      );

      if (logChannel) {
        await logChannel.send({
          content: `<@&${STAFF_ROLE_ID}> nova whitelist para análise.`,
          embeds: [embed],
          components: [row]
        });
      }

      return interaction.reply({
        content: "✅ Sua whitelist foi enviada para análise da staff.",
        ephemeral: true
      });
    }
  }
});

/* CARGO AUTOMÁTICO + ANTI-RAID */

client.on("guildMemberAdd", async member => {
  try {
    await member.roles.add(AUTO_ROLE_ID);
  } catch {}

  const guildId = member.guild.id;
  const now = Date.now();

  if (!joins.has(guildId)) joins.set(guildId, []);

  const list = joins.get(guildId).filter(time => now - time < RAID_TIME);
  list.push(now);
  joins.set(guildId, list);

  if (list.length >= RAID_LIMIT) {
    await sendLog(
      member.guild,
      `🚨 **Possível raid detectada!**\nEntraram **${list.length} membros** em poucos segundos.\n\n🔒 Tentando travar os canais.`,
      "Red"
    );

    const staffRole = member.guild.roles.cache.get(STAFF_ROLE_ID);

    member.guild.channels.cache.forEach(async channel => {
      try {
        if (!channel.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) return;

        await channel.permissionOverwrites.edit(member.guild.roles.everyone, {
          SendMessages: false
        });

        if (staffRole) {
          await channel.permissionOverwrites.edit(staffRole, {
            SendMessages: true
          });
        }
      } catch {}
    });

    await sendLog(member.guild, "🔒 Canais travados temporariamente contra raid.", "Red");
  }
});

/* ANTI-SPAM + ANTI-LINK */

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const member = message.member;
  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  const isStaff =
    member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.roles.cache.has(STAFF_ROLE_ID);

  const linksSuspeitos = [
    "discord.gg/",
    "discord.com/invite/",
    "bit.ly/",
    "grabify",
    "free-nitro",
    "nitro-free",
    "steamgift",
    "airdrop",
    "claim-nitro"
  ];

  const msg = message.content.toLowerCase();

  if (!isStaff && linksSuspeitos.some(link => msg.includes(link))) {
    await message.delete().catch(() => {});

    await sendLog(
      message.guild,
      `🚫 **Link suspeito apagado.**\n👤 Usuário: ${message.author}\n📌 Canal: ${message.channel}\n📝 Mensagem: \`${message.content.slice(0, 800)}\``,
      "Red"
    );

    return;
  }

  if (!spam.has(key)) spam.set(key, []);

  const userMessages = spam.get(key).filter(time => now - time < SPAM_TIME);
  userMessages.push(now);
  spam.set(key, userMessages);

  if (!isStaff && userMessages.length >= SPAM_LIMIT) {
    await message.delete().catch(() => {});

    try {
      await member.timeout(10 * 60 * 1000, "Anti-spam Florida RP");
    } catch {}

    await sendLog(
      message.guild,
      `⚠️ **Usuário silenciado por spam.**\n👤 Usuário: ${message.author}\n⏱️ Tempo: 10 minutos`,
      "Orange"
    );

    spam.set(key, []);
  }
});

client.login(TOKEN);