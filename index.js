const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

require("dotenv").config();
const TOKEN = process.env.TOKEN;

const CLIENT_ID = "1515588996821028965";
const GUILD_ID = "1515105644309647551";
const LOG_CHANNEL_ID = "1515587600130510869";
const STAFF_ROLE_ID = "1515590222132547646";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const joins = new Map();
const spam = new Map();

const RAID_LIMIT = 6;
const RAID_TIME = 10000;

const SPAM_LIMIT = 5;
const SPAM_TIME = 7000;

async function sendLog(guild, text) {
  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;

  channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("Red")
        .setTitle("🛡️ Anti-Raid Florida RP")
        .setDescription(text)
        .setTimestamp()
    ]
  }).catch(() => {});
}

const commands = [
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("Enviar uma mensagem pelo bot")
    .addStringOption(option =>
      option
        .setName("mensagem")
        .setDescription("Mensagem que o bot vai enviar")
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Comando /say registrado.");
  } catch (error) {
    console.error("Erro ao registrar comando:", error);
  }
})();

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "say") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ Você não tem permissão para usar esse comando.",
        ephemeral: true
      });
    }

    const mensagem = interaction.options.getString("mensagem");

    await interaction.channel.send(mensagem);

    await interaction.reply({
      content: "✅ Mensagem enviada.",
      ephemeral: true
    });
  }
});

client.on("guildMemberAdd", async (member) => {
  const guildId = member.guild.id;
  const now = Date.now();

  if (!joins.has(guildId)) joins.set(guildId, []);

  const list = joins.get(guildId).filter(time => now - time < RAID_TIME);
  list.push(now);
  joins.set(guildId, list);

  if (list.length >= RAID_LIMIT) {
    await sendLog(
      member.guild,
      `🚨 Possível raid detectada!\nEntraram **${list.length} membros** em poucos segundos.\n\n🔒 Travando canais.`
    );

    const staffRole = member.guild.roles.cache.get(STAFF_ROLE_ID);

    member.guild.channels.cache.forEach(async (channel) => {
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

    await sendLog(member.guild, "🔒 Canais travados temporariamente contra raid.");
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const member = message.member;
  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  const linksSuspeitos = [
    "discord.gg/",
    "discord.com/invite/",
    "bit.ly/",
    "grabify",
    "free-nitro",
    "nitro-free"
  ];

  const msg = message.content.toLowerCase();
  const isStaff = member.permissions.has(PermissionsBitField.Flags.ManageMessages);

  if (!isStaff && linksSuspeitos.some(link => msg.includes(link))) {
    await message.delete().catch(() => {});

    await sendLog(
      message.guild,
      `🚫 Link suspeito apagado.\n👤 Usuário: ${message.author}\n📌 Canal: ${message.channel}`
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
      `⚠️ Usuário silenciado por spam.\n👤 Usuário: ${message.author}\n⏱️ Tempo: 10 minutos`
    );

    spam.set(key, []);
  }
});

client.login(TOKEN);