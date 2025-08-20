const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// --- BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- CACHES ---
const activeTickets = new Map();
const activeCalculators = new Map();
const activeAuctions = new Map(); // message.id -> auction data
const auctionIdMap = new Map(); // id: auctionId -> auctionMessageId (msg.id)
let auctionIdCounter = 1;

// --- VOUCH SYSTEM SETUP ---
const VOUCHES_FILE = path.join(__dirname, 'vouches.json');
let vouches = {};
if (fs.existsSync(VOUCHES_FILE)) {
    try {
        vouches = JSON.parse(fs.readFileSync(VOUCHES_FILE, 'utf-8'));
    } catch { vouches = {}; }
}
function saveVouches() {
    fs.writeFileSync(VOUCHES_FILE, JSON.stringify(vouches, null, 2));
}

// --- ITEM IMAGES DICTIONARY (for calculator) ---
const ITEM_IMAGES = {
    "Cape bag": "https://cdn.discordapp.com/attachments/yourchannelid/yourfileid/capebag.png",
    "Megalith Voucher": "https://cdn.discordapp.com/attachments/yourchannelid/yourfileid/megalithvoucher.png",
    "Twin Sai": "https://cdn.discordapp.com/attachments/yourchannelid/yourfileid/twinsai.png",
    "Testing": "https://cdn.discordapp.com/attachments/1308902541634834545/1404145759011733667/CelestialChakram.png?ex=689a2024&is=6898cea4&hm=1ef7c7f7a2dfa2c17d491ffc028450613c0298e76b23f0e5a9db7dbaba70b624&",
    // ...add more items as needed
};
const ITEM_LIST = Object.keys(ITEM_IMAGES);

// --- STATIC ITEM VALUES DICTIONARY (used for calculator) ---
const ITEM_VALUES = {
   "Cape bag": 37500,
    "Megalith Voucher": 30000,
    "Twin Sai": 28000,
    "Celestial chakram": 24000,
    "Skyforged karambit": 23750,
    "Dual bayonet": 22500,
    "Chakram": 21500,
    "Present karambit": 14500,
    "Swfitblade": 12000,
    "Karambit": 11200,
    "Butterfly knife": 10000,
    "Present Bag": 9000,
    "Nunchucks": 6200,
    "Cartoon Karambit": 4500,
    "Spinner Rock": 3300,
    "Candy Bag": 3000,
    "Mythical Axe": 2900,
    "Piggy Bank Bag": 2900,
    "Hunter Knife": 2850,
    "Cartoon Armor": 1700,
    "THE CUBE": 1500,
    "Skull Bag": 1100,
    "Shuriken": 875,
    "Double Mojo Voucher": 750,
    "Wreath Bag": 575,
    "Firework Bag": 575,
    "Easter Bag": 550,
    "Chick bag": 550,
    "Love bayonet": 550,
    "Double hat voucher": 500,
    "Shard Katar": 450,
    "Scissors": 450,
    "Cartoon bag": 400,
    "Bayonet": 350,
    "Ant armor": 350,
    "Freaky pumpkin bag": 350,
    "Cosmetic plus voucher": 350,
    "Meteor rock": 325,
    "Kukri": 325,
    "Knife and fork": 320,
    "Cleaver": 300,
    "Boulder voucher": 300,
    "Dagger": 280,
    "Spatula": 280,
    "Frying Pan": 275,
    "Stealth Axe": 275,
    "Clan Pass voucher": 275,
    "Clover bag": 275,
    "Egg basket bag": 275,
    "Bolt bag": 260,
    "Katana": 250,
    "Dumbbell": 240,
    "Clock bag": 240,
    "Magical staff": 240,
    "Coconut bag": 220,
    "St patrick's sword": 210,
    "Mystical bow": 210,
    "Cupid bow": 200,
    "Cartoon pick": 200,
    "Cartoon axe": 200,
    "Hellish hammer": 200,
    "Golden fishing rod": 190,
    "Present rock": 180,
    "Dual pick": 175,
    "Dual axe": 175,
    "Saw axe": 160,
    "Ping pong bat": 160,
    "Popsicle blade": 150,
    "Stocking bag": 150,
    "Candy wrapper bag": 150,
    "Skull rock": 150,
    "Premium fishing rod": 150,
    "Carrot knife": 150,
    "Faster chest opener voucher": 150,
    "Linked sword": 140,
    "200m trophy bag": 140,
    "Serpent axe": 120,
    "Serpent pick": 120,
    "Beach ball": 100,
    "Egg bag": 100,
    "Lurky bag": 100,
    "Long bow": 100,
    "Adventurer bag": 90,
    "Bean": 90,
    "Torus bag": 85,
    "Gardening trowel": 70,
    "Heart bag": 60,
    "Toy axe": 55,
    "Toy pick": 55,
    "Pocket axe": 50,
    "Pocket pick": 50,
    "Scythe": 50,
    "Palm tree stick": 40,
    "8 bit pick": 40,
    "8 bit axe": 40,
    "Gemstone pick": 35,
    "Gemstone axe": 35,
    "Carved skull rock": 30,
    "Claw hammer": 25,
    "Snowy hammer": 25,
    "Bomb": 20,
    "Bone club": 20,
    "Heart rock": 20,
    "Egg rock": 20,
    "Sword": 13,
    "Peeper armor": 13,
    "Sturdy pick": 13,
    "Shelly on bag": 13,
    "Crusher hammer": 10,
    "Lumber axe": 8,
    "Spiked armor": 8,
    "Ball mace": 8,
    "Magnetic armor": 8,
    "Statue bag": 8,
    "Tree stick": 8,
    "Shelly armor": 8,
    "Mammoth bag": 8
};

// --- CLASSES ---
class Ticket {
    constructor(channelId, initiatorId, accepterId, tradeData) {
        this.channelId = channelId;
        this.initiatorId = initiatorId;
        this.accepterId = accepterId;
        this.tradeData = tradeData;
        this.status = 'active';
        this.createdAt = new Date();
    }
}
class Calculator {
    constructor(userId, messageId) {
        this.userId = userId;
        this.messageId = messageId;
        this.side1Items = [null, null, null, null];
        this.side2Items = [null, null, null, null];
        this.side1Value = 0;
        this.side2Value = 0;
    }
}

// --- UTILITIES ---
function parseDuration(str) {
    let match;
    if ((match = /^(\d+)\s*(h|m|s|d)?$/i.exec(str))) {
        let n = parseInt(match[1]);
        let unit = (match[2] || "s").toLowerCase();
        if (unit === 'h') return n * 60 * 60 * 1000;
        if (unit === 'm') return n * 60 * 1000;
        if (unit === 'd') return n * 24 * 60 * 60 * 1000;
        return n * 1000;
    }
    if ((match = /^(\d+):(\d+):(\d+)$/.exec(str))) {
        return ((+match[1]) * 3600 + (+match[2]) * 60 + (+match[3]) * 1000);
    }
    return null;
}
function epochTimestamp(msFromNow) {
    return Math.floor((Date.now() + msFromNow) / 1000);
}
function getItemData(itemName) {
    const foundKey = Object.keys(ITEM_VALUES).find(key => key.toLowerCase() === itemName.toLowerCase());
    if (foundKey) {
        return {
            name: foundKey,
            value: ITEM_VALUES[foundKey],
            image: ITEM_IMAGES[foundKey] || null,
            found: true
        };
    } else {
        return {
            name: itemName,
            value: 0,
            image: null,
            found: false
        };
    }
}

// --- CALCULATOR EMBED AND COMPONENTS ---
function createItemSelectMenu(customId, placeholder) {
    const options = [];
    options.push(
        new StringSelectMenuOptionBuilder()
            .setLabel('Remove Item')
            .setValue('remove_item')
            .setDescription('Clear this slot')
            .setEmoji('❌')
    );
    const sortedItems = Object.entries(ITEM_VALUES)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24);
    for (const [itemName, value] of sortedItems) {
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(itemName)
                .setValue(itemName)
                .setDescription(`Value: ${value.toLocaleString()}`)
        );
    }
    return new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(options);
}
function createCalculatorEmbed(calculator) {
    const embed = new EmbedBuilder()
        .setTitle('🧮 Trade Value Calculator')
        .setDescription('Use the dropdown menus to select items and compare values')
        .setColor(0x0099ff)
        .setTimestamp();

    let side1Field = '', side1Total = 0;
    for (let i = 0; i < 4; i++) {
        const item = calculator.side1Items[i];
        if (item) {
            side1Field += `**${item.name}** - ${item.value.toLocaleString()}\n`;
            side1Total += item.value;
        } else {
            side1Field += `*Empty Slot ${i + 1}*\n`;
        }
    }
    calculator.side1Value = side1Total;
    embed.addFields({
        name: `Person 1 (Total: ${side1Total.toLocaleString()})`,
        value: side1Field,
        inline: true
    });

    let side2Field = '', side2Total = 0;
    for (let i = 0; i < 4; i++) {
        const item = calculator.side2Items[i];
        if (item) {
            side2Field += `**${item.name}** - ${item.value.toLocaleString()}\n`;
            side2Total += item.value;
        } else {
            side2Field += `*Empty Slot ${i + 1}*\n`;
        }
    }
    calculator.side2Value = side2Total;
    embed.addFields({
        name: `Person 2 (Total: ${side2Total.toLocaleString()})`,
        value: side2Field,
        inline: true
    });

    const valueDifference = side1Total - side2Total;
    let valueStatus = '';
    if (valueDifference > 0) {
        valueStatus = `📈 Person 1 has ${valueDifference.toLocaleString()} more value`;
    } else if (valueDifference < 0) {
        valueStatus = `📉 Person 2 has ${Math.abs(valueDifference).toLocaleString()} more value`;
    } else {
        valueStatus = `⚖️ Equal value`;
    }
    embed.addFields({
        name: 'Value Comparison',
        value: valueStatus,
        inline: false
    });
    embed.setFooter({ text: 'Only you can interact with this calculator' });

    return embed;
}
function createCalculatorComponents(calculator) {
    const components = [];
    for (let i = 0; i < 4; i++) {
        components.push(new ActionRowBuilder().addComponents(
            createItemSelectMenu(`calc_p1_slot${i + 1}`, `Person 1 - Slot ${i + 1}`)
        ));
    }
    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('calc_clear_all')
            .setLabel('Clear All')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️')
    ));
    return components;
}

// --- REGISTER SLASH COMMANDS (NO /trade) ---
const commands = [
    new SlashCommandBuilder()
        .setName('calculator')
        .setDescription('Open a private trade value calculator'),
    new SlashCommandBuilder()
        .setName('sale')
        .setDescription('Create a sale listing')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the item/service for sale')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('seller')
                .setDescription('The Discord user who is selling')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the sale')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL for the sale')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Create a buy request')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the item/service you want to buy')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('buyer')
                .setDescription('The Discord user who wants to buy')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of what you want to buy')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL for the buy request')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('rent')
        .setDescription('Start a skin rental timer (logs to renting-logs, pings skin renter role when over)')
        .addStringOption(option =>
            option.setName('skin_name')
                .setDescription('Name of the skin/item being rented')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Rental duration (e.g. 6h, 30m, 3600, 1d)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('renter')
                .setDescription('The Discord user renting the skin')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('owner')
                .setDescription('Name of the owner (or lender)')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('rentanon')
        .setDescription('Start an anonymous skin rental timer (logs to skins-for-rent, no ping on finish)')
        .addStringOption(option =>
            option.setName('skin_name')
                .setDescription('Name of the skin/item being rented')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Rental duration (e.g. 6h, 30m, 3600, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('owner')
                .setDescription('Name of the owner (or lender)')
                .setRequired(true)),
    // --- AUCTION COMMAND (all required first, then optional) ---
    new SlashCommandBuilder()
        .setName('auction')
        .setDescription('Start an auction (AUC WHITELIST only)')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the item/service being auctioned')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the auction item/service')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('starting_bid')
                .setDescription('Starting bid (minimum opening bid)')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('minimum_increment')
                .setDescription('Minimum increment for each new bid')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Auction duration (e.g. 10m, 30m, 2h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL for the auction')
                .setRequired(false)),
    // --- VOUCH COMMANDS ---
    new SlashCommandBuilder()
        .setName('vouch')
        .setDescription('Vouch for a player with description')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The Discord user you want to vouch for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Describe your vouch')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('checkvouch')
        .setDescription('Check how many vouches you have (or another user)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The Discord user to check vouches for')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('removevouch')
        .setDescription('Remove one vouch from a user (VOUCH REGULATOR only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The Discord user to remove a vouch from')
                .setRequired(true)),
    // --- AUCTION ENHANCEMENTS ---
    new SlashCommandBuilder()
        .setName('removeauction')
        .setDescription('Remove the top bid from an auction (AUC WHITELIST only)')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Auction ID (see auction embed title)')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('checklast10')
        .setDescription('Check the last 10 bids for an auction')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('Auction ID (see auction embed title)')
                .setRequired(true)),
];

// --- BOT STARTUP ---
client.once('ready', async () => {
    const GUILD_ID = '1308847827627282483'; // <-- CHANGE THIS
    await client.application.commands.set(commands, GUILD_ID);
    console.log('Commands registered.');
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand?.() || interaction.isCommand?.()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('auction_bid_')) {
            await handleAuctionBidModal(interaction);
        }
    }
});

// --- SLASH COMMAND HANDLER ---
async function handleSlashCommand(interaction) {
    // RENT/RENTANON/SALE/BUY WHITELIST CHECK
    if (['rent', 'rentanon', 'sale', 'buy'].includes(interaction.commandName)) {
        const member = interaction.member;
        const hasRole = member.roles.cache.some(role => role.name === 'COMMAND WHITELIST');
        if (!hasRole) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command. You need the "COMMAND WHITELIST" role.',
                ephemeral: true
            });
            return;
        }
    }

    // --- AUCTION BLACKLIST/WHITELIST/ID SYSTEM ---
    if (interaction.commandName === 'auction') {
        const member = interaction.member;
        // AUC WHITELIST required to start
        if (!member.roles.cache.some(role => role.name === 'AUC WHITELIST')) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command. You need the "AUC WHITELIST" role.',
                ephemeral: true
            });
            return;
        }
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const imageUrl = interaction.options.getString('image');
        const startingBid = interaction.options.getNumber('starting_bid');
        const minimumIncrement = interaction.options.getNumber('minimum_increment');
        const durationStr = interaction.options.getString('time');
        const ms = parseDuration(durationStr);

        if (!ms || ms < 10000) {
            await interaction.editReply({ content: "❌ Invalid duration. Use formats like 10m, 30m, 2h, 1d (minimum 10 seconds)." });
            return;
        }
        const endEpoch = epochTimestamp(ms);

        // Assign auction ID
        const auctionId = auctionIdCounter++;
        const auctionTitle = `🏆 Auction #${auctionId}: ${name}`;

        const auctionEmbed = new EmbedBuilder()
            .setTitle(auctionTitle)
            .setDescription(description)
            .setColor(0xf7b731)
            .addFields([
                { name: 'Starting Bid', value: `${startingBid.toLocaleString()}`, inline: true },
                { name: 'Min. Increment', value: `${minimumIncrement.toLocaleString()}`, inline: true },
                { name: 'Ends In', value: `<t:${endEpoch}:R>`, inline: true }
            ])
            .addFields([
                {
                    name: 'Current Highest Bid',
                    value: `No bids yet! Starting at **${startingBid.toLocaleString()}**.`,
                    inline: false
                },
                {
                    name: 'How To Bid',
                    value: `Click "Place Bid" and enter your bid amount in the popup.`,
                    inline: false
                }
            ])
            .setFooter({ text: `Auction started by ${interaction.user.tag}` })
            .setTimestamp();

        if (imageUrl) auctionEmbed.setImage(imageUrl);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('place_bid')
                .setLabel('Place Bid')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💸'),
            new ButtonBuilder()
                .setCustomId('end_auction')
                .setLabel('End Auction')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏹️')
        );

        const auctionMsg = await interaction.channel.send({
            embeds: [auctionEmbed],
            components: [row]
        });

        // Save auction data
        activeAuctions.set(auctionMsg.id, {
            auctionId,
            itemName: name,
            description,
            imageUrl,
            startingBid,
            minimumIncrement,
            endEpoch,
            endsAt: Date.now() + ms,
            startedBy: interaction.user.id,
            highestBid: null, // { amount, userId, userTag }
            bidders: [],
            ended: false,
            messageId: auctionMsg.id,
            channelId: interaction.channel.id
        });
        auctionIdMap.set(auctionId, auctionMsg.id);

        // Schedule auction end
        setTimeout(async () => {
            const auction = activeAuctions.get(auctionMsg.id);
            if (auction && !auction.ended) {
                await endAuction(auctionMsg, auction);
            }
        }, ms);

        await interaction.editReply({
            content: `✅ Auction started! (ID: **${auctionId}**) [View Message](${auctionMsg.url})`,
            ephemeral: true
        });
        return;
    }

    // --- REMOVEAUCTION COMMAND (AUC WHITELIST ONLY, visible to all) ---
    if (interaction.commandName === 'removeauction') {
        const auctionId = interaction.options.getInteger('id');
        const member = interaction.member;
        if (!member.roles.cache.some(role => role.name === 'AUC WHITELIST')) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command (AUC WHITELIST only).',
                ephemeral: true
            });
            return;
        }
        if (!auctionIdMap.has(auctionId)) {
            await interaction.reply({ content: `❌ No auction found with ID ${auctionId}.`, ephemeral: true });
            return;
        }
        const auctionMsgId = auctionIdMap.get(auctionId);
        const auction = activeAuctions.get(auctionMsgId);
        if (!auction || auction.ended) {
            await interaction.reply({ content: `❌ That auction has ended or does not exist.`, ephemeral: true });
            return;
        }
        if (!auction.bidders || auction.bidders.length === 0) {
            await interaction.reply({ content: `❌ There are no bids to remove in this auction.`, ephemeral: true });
            return;
        }
        // Remove top bid (last bid)
        const removedBid = auction.bidders.pop();
        // Set highestBid to new last bid or null if none
        auction.highestBid = auction.bidders.length > 0 ? {
            amount: auction.bidders[auction.bidders.length - 1].amount,
            userId: auction.bidders[auction.bidders.length - 1].userId,
            userTag: auction.bidders[auction.bidders.length - 1].userTag
        } : null;

        // Edit embed
        const channel = await client.channels.fetch(auction.channelId);
        const msgObj = await channel.messages.fetch(auction.messageId);
        const emb = EmbedBuilder.from(msgObj.embeds[0]);
        emb.spliceFields(3, 1, {
            name: 'Current Highest Bid',
            value: auction.highestBid
                ? `**${auction.highestBid.amount.toLocaleString()}** by <@${auction.highestBid.userId}>`
                : `No bids yet! Starting at **${auction.startingBid.toLocaleString()}**.`,
            inline: false
        });
        await msgObj.edit({ embeds: [emb] });

        await interaction.reply({
            content: `✅ Top bid removed: **${removedBid.amount.toLocaleString()}** by <@${removedBid.userId}>.\n${auction.highestBid ? `New highest bid: **${auction.highestBid.amount.toLocaleString()}** by <@${auction.highestBid.userId}>.` : "There are now no bids on this auction."}`,
            ephemeral: false
        });
        return;
    }

    // --- CHECKLAST10 COMMAND (visible for everyone) ---
    if (interaction.commandName === 'checklast10') {
        const auctionId = interaction.options.getInteger('id');
        if (!auctionIdMap.has(auctionId)) {
            await interaction.reply({ content: `❌ No auction found with ID ${auctionId}.`, ephemeral: true });
            return;
        }
        const auctionMsgId = auctionIdMap.get(auctionId);
        const auction = activeAuctions.get(auctionMsgId);
        if (!auction) {
            await interaction.reply({ content: `❌ That auction does not exist.`, ephemeral: true });
            return;
        }
        if (!auction.bidders || auction.bidders.length === 0) {
            await interaction.reply({ content: `❌ There are no bids for this auction.`, ephemeral: true });
            return;
        }
        const last10 = auction.bidders.slice(-10).reverse();
        const embed = new EmbedBuilder()
            .setTitle(`Last 10 Bids for Auction #${auctionId}`)
            .setColor(0x5b93ff)
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        for (const bid of last10) {
            embed.addFields({
                name: `${bid.amount.toLocaleString()} by ${bid.userTag}`,
                value: `<@${bid.userId}> at ${new Date(bid.time).toLocaleString()}`
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: false });
        return;
    }

    // --- VOUCH COMMANDS ---
    if (interaction.commandName === 'vouch') {
        const targetUser = interaction.options.getUser('user');
        const description = interaction.options.getString('description');
        const member = interaction.member;

        // Check for self-vouch
        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                content: '❌ You cannot vouch for yourself!',
                ephemeral: true
            });
            return;
        }

        // Check for VOUCH BL role
        if (member.roles.cache.some(role => role.name === 'VOUCH BL')) {
            await interaction.reply({
                content: '❌ You are blacklisted from vouching (VOUCH BL role).',
                ephemeral: true
            });
            return;
        }

        // Allow multiple vouches per person, just don't allow self-vouch
        if (!vouches[targetUser.id]) vouches[targetUser.id] = [];
        vouches[targetUser.id].push({
            voucherId: interaction.user.id,
            voucherTag: interaction.user.tag,
            description,
            time: new Date().toISOString()
        });
        saveVouches();

        const embed = new EmbedBuilder()
            .setTitle('✅ Vouch Added!')
            .setDescription(`You vouched for <@${targetUser.id}>:\n> ${description}`)
            .setColor(0x00cc66)
            .setFooter({ text: `Vouched by: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // --- REMOVEVOUCH COMMAND ---
    if (interaction.commandName === 'removevouch') {
        const member = interaction.member;
        if (!member.roles.cache.some(role => role.name === 'VOUCH REGULATOR')) {
            await interaction.reply({
                content: '❌ You do not have permission to use this command (VOUCH REGULATOR only).',
                ephemeral: true
            });
            return;
        }
        const targetUser = interaction.options.getUser('user');
        if (!vouches[targetUser.id] || vouches[targetUser.id].length === 0) {
            await interaction.reply({
                content: `❌ <@${targetUser.id}> has no vouches to remove.`,
                ephemeral: true
            });
            return;
        }
        vouches[targetUser.id].pop();
        saveVouches();

        await interaction.reply({
            content: `✅ Removed one vouch from <@${targetUser.id}>. Now at ${vouches[targetUser.id].length} vouches.`,
            ephemeral: false
        });
        return;
    }

    // --- CHECKVOUCH COMMAND ---
    if (interaction.commandName === 'checkvouch') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userVouches = vouches[targetUser.id] || [];
        const embed = new EmbedBuilder()
            .setTitle(`Vouches for ${targetUser.tag}`)
            .setColor(0x2d8cff)
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        embed.setDescription(`Total vouches: **${userVouches.length}**`);

        if (userVouches.length > 0) {
            embed.addFields(userVouches.slice(0, 10).map(v => ({
                name: `By: ${v.voucherTag} (${new Date(v.time).toLocaleString()})`,
                value: v.description.length > 100 ? v.description.slice(0, 97) + '...' : v.description
            })));
            if (userVouches.length > 10) {
                embed.addFields({ name: 'More...', value: `And ${userVouches.length - 10} more vouches!` });
            }
        }

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // RENT
    if (interaction.commandName === 'rent') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const skinName = interaction.options.getString('skin_name');
            const durationStr = interaction.options.getString('time');
            const renterUser = interaction.options.getUser('renter');
            const ownerName = interaction.options.getString('owner');
            const ms = parseDuration(durationStr);
            if (!ms || ms < 1000 * 60) {
                await interaction.editReply({ content: "❌ Invalid duration. Use formats like 6h, 30m, 3600, 1d (minimum 1 minute)." });
                return;
            }
            const guild = interaction.guild;
            const channel = guild.channels.cache.find(ch => ch.name === 'renting-logs' && ch.type === ChannelType.GuildText);
            if (!channel) {
                await interaction.editReply({ content: "❌ Channel 'renting-logs' not found." });
                return;
            }
            const skinRenterRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'skin renter');
            const endEpoch = epochTimestamp(ms);

            let content = `**Skin:** ${skinName}\n**Renter:** <@${renterUser.id}>\n**Owner:** ${ownerName}\n**⏳ Time Left:** <t:${endEpoch}:R>`;
            if (skinRenterRole) content = `<@&${skinRenterRole.id}>\n` + content;

            await channel.send({
                content: content,
                allowedMentions: { roles: skinRenterRole ? [skinRenterRole.id] : [] }
            });

            setTimeout(async () => {
                try {
                    await channel.send({
                        content: `<@&${skinRenterRole?.id}> Rental timer finished for **${skinName}**! Renter: <@${renterUser.id}> Owner: ${ownerName}`,
                        allowedMentions: { roles: skinRenterRole ? [skinRenterRole.id] : [] }
                    });
                } catch (e) {}
            }, ms);

            await interaction.editReply({ content: `✅ Rental timer started in ${channel}` });
        } catch (err) {
            console.error('Error in /rent:', err);
            await interaction.editReply({ content: "❌ Failed to start rental timer." });
        }
        return;
    }
    // RENTANON
    if (interaction.commandName === 'rentanon') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const skinName = interaction.options.getString('skin_name');
            const durationStr = interaction.options.getString('time');
            const ownerName = interaction.options.getString('owner');
            const ms = parseDuration(durationStr);
            if (!ms || ms < 1000 * 60) {
                await interaction.editReply({ content: "❌ Invalid duration. Use formats like 6h, 30m, 3600, 1d (minimum 1 minute)." });
                return;
            }
            const guild = interaction.guild;
            const channel = guild.channels.cache.find(ch => ch.name === 'skins-for-rent' && ch.type === ChannelType.GuildText);
            if (!channel) {
                await interaction.editReply({ content: "❌ Channel 'skins-for-rent' not found." });
                return;
            }
            const endEpoch = epochTimestamp(ms);

            let content = `**Skin:** ${skinName}\n**Renter:** Anonymous User\n**Owner:** ${ownerName}\n**⏳ Time Left:** <t:${endEpoch}:R>`;
            await channel.send({ content: content });

            await interaction.editReply({ content: `✅ Anonymous rental timer started in ${channel}` });
        } catch (err) {
            console.error('Error in /rentanon:', err);
            await interaction.editReply({ content: "❌ Failed to start anonymous rental timer." });
        }
        return;
    }
    // CALCULATOR
    if (interaction.commandName === 'calculator') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const calculator = new Calculator(interaction.user.id, null);
            const embed = createCalculatorEmbed(calculator);
            const components = createCalculatorComponents(calculator);

            const response = await interaction.editReply({
                embeds: [embed],
                components: components
            });

            calculator.messageId = response.id;
            activeCalculators.set(response.id, calculator);

        } catch (error) {
            console.error('Error in calculator command:', error);
            try {
                await interaction.editReply({
                    content: '❌ An error occurred while processing the calculator command. Please try again.',
                });
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
        return;
    }
    // SALE
    if (interaction.commandName === 'sale') {
        try {
            await interaction.deferReply();
            const name = interaction.options.getString('name');
            const seller = interaction.options.getUser('seller');
            const description = interaction.options.getString('description');
            const imageUrl = interaction.options.getString('image');
            const saleEmbed = new EmbedBuilder()
                .setTitle(`📦 ${name}`)
                .setDescription(`**Seller:** ${seller}\n\n${description}`)
                .setColor(0x800000)
                .setTimestamp();
            if (imageUrl) saleEmbed.setImage(imageUrl);
            saleEmbed.setFooter({ text: 'Click Purchase to create a ticket with the seller' });

            const purchaseButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`purchase_${seller.id}`)
                    .setLabel('Purchase')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );

            const channel = interaction.channel;
            const saleMsg = await channel.send({
                embeds: [saleEmbed],
                components: [purchaseButton]
            });

            await interaction.editReply({
                content: `✅ Sale listing posted! [View Message](${saleMsg.url})`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in sale command:', error);
            try {
                await interaction.editReply({
                    content: '❌ An error occurred while processing the sale command. Please try again.',
                });
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
        return;
    }
    // BUY
    if (interaction.commandName === 'buy') {
        try {
            await interaction.deferReply();
            const name = interaction.options.getString('name');
            const buyer = interaction.options.getUser('buyer');
            const description = interaction.options.getString('description');
            const imageUrl = interaction.options.getString('image');

            const buyEmbed = new EmbedBuilder()
                .setTitle(`🛒 ${name}`)
                .setDescription(`**Buyer:** ${buyer}\n\n${description}`)
                .setColor(0x800000)
                .setTimestamp();

            if (imageUrl) buyEmbed.setThumbnail(imageUrl);
            buyEmbed.setFooter({ text: 'Click Sell To to create a ticket with the buyer' });

            const sellButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sell_to_${buyer.id}`)
                    .setLabel('Sell To')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💼')
            );

            const channel = interaction.channel;
            const buyMsg = await channel.send({
                embeds: [buyEmbed],
                components: [sellButton]
            });

            await interaction.editReply({
                content: `✅ Buy request posted! [View Message](${buyMsg.url})`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in buy command:', error);
            try {
                await interaction.editReply({
                    content: '❌ An error occurred while processing the buy command. Please try again.',
                });
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
        return;
    }
}

// --- SELECT MENU HANDLER ---
async function handleSelectMenuInteraction(interaction) {
    // Calculator select menus
    if (interaction.customId.startsWith('calc_')) {
        const calculator = activeCalculators.get(interaction.message.id);
        if (!calculator) {
            await interaction.reply({
                content: '❌ This calculator is no longer active!',
                ephemeral: true
            });
            return;
        }
        if (interaction.user.id !== calculator.userId) {
            await interaction.reply({
                content: '❌ You can only interact with your own calculator!',
                ephemeral: true
            });
            return;
        }
        const selectedValue = interaction.values[0];
        const customId = interaction.customId;
        const [, person, slot] = customId.split('_');
        const personNum = parseInt(person.replace('p', ''));
        const slotNum = parseInt(slot.replace('slot', '')) - 1;
        if (selectedValue === 'remove_item') {
            if (personNum === 1) {
                calculator.side1Items[slotNum] = null;
            } else {
                calculator.side2Items[slotNum] = null;
            }
        } else {
            const itemData = getItemData(selectedValue);
            if (personNum === 1) {
                calculator.side1Items[slotNum] = itemData;
            } else {
                calculator.side2Items[slotNum] = itemData;
            }
        }
        const embed = createCalculatorEmbed(calculator);
        const components = createCalculatorComponents(calculator);
        await interaction.update({
            embeds: [embed],
            components: components
        });
        return;
    }
}

// --- BUTTON HANDLER ---
async function handleButtonInteraction(interaction) {
    // Calculator clear all
    if (interaction.customId === 'calc_clear_all') {
        const calculator = activeCalculators.get(interaction.message.id);
        if (!calculator) {
            await interaction.reply({
                content: '❌ This calculator is no longer active!',
                ephemeral: true
            });
            return;
        }
        if (interaction.user.id !== calculator.userId) {
            await interaction.reply({
                content: '❌ You can only interact with your own calculator!',
                ephemeral: true
            });
            return;
        }
        calculator.side1Items = [null, null, null, null];
        calculator.side2Items = [null, null, null, null];
        calculator.side1Value = 0;
        calculator.side2Value = 0;
        const embed = createCalculatorEmbed(calculator);
        const components = createCalculatorComponents(calculator);
        await interaction.update({
            embeds: [embed],
            components: components
        });
        return;
    }

    // --- AUCTION BUTTONS ---
    if (interaction.customId === 'place_bid') {
        const auction = activeAuctions.get(interaction.message.id);
        if (!auction || auction.ended) {
            await interaction.reply({ content: '❌ This auction has ended!', ephemeral: true });
            return;
        }
        // --- AUCTION BLACKLIST ---
        const member = interaction.member;
        if (member.roles.cache.some(role => role.name === 'AUCTION BLACKLIST')) {
            await interaction.reply({
                content: '❌ You are blacklisted from placing bids! (AUCTION BLACKLIST role)',
                ephemeral: true
            });
            return;
        }
        // Build the Modal for bid input
        const minBid = auction.highestBid
            ? auction.highestBid.amount + auction.minimumIncrement
            : auction.startingBid;

        const bidModal = new ModalBuilder()
            .setCustomId(`auction_bid_${interaction.message.id}`)
            .setTitle('Place Your Bid');

        const bidInput = new TextInputBuilder()
            .setCustomId('bid_amount')
            .setLabel(`Enter your bid (min: ${minBid})`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder(minBid.toString());

        bidModal.addComponents(
            new ActionRowBuilder().addComponents(bidInput)
        );

        await interaction.showModal(bidModal);
        return;
    }
    if (interaction.customId === 'end_auction') {
        const auction = activeAuctions.get(interaction.message.id);
        if (!auction || auction.ended) {
            await interaction.reply({ content: '❌ This auction has ended.', ephemeral: true });
            return;
        }
        // Only the auction starter or someone with AUC WHITELIST can end
        const member = interaction.member;
        if (interaction.user.id !== auction.startedBy && !member.roles.cache.some(role => role.name === 'AUC WHITELIST')) {
            await interaction.reply({ content: '❌ Only the auction starter or someone with "AUC WHITELIST" can end the auction.', ephemeral: true });
            return;
        }
        const channel = await client.channels.fetch(auction.channelId);
        const msgObj = await channel.messages.fetch(auction.messageId);
        await endAuction(msgObj, auction, interaction);
        return;
    }

    // Handle Purchase buttons from /sale command
    if (interaction.customId.startsWith('purchase_')) {
        try {
            const sellerId = interaction.customId.replace('purchase_', '');
            const buyerId = interaction.user.id;

            // Don't allow users to purchase from themselves
            if (sellerId === buyerId) {
                await interaction.reply({
                    content: '❌ You cannot purchase from yourself!',
                    ephemeral: true
                });
                return;
            }
            // Create a private channel or ticket for the trade
            const guild = interaction.guild;
            const seller = await guild.members.fetch(sellerId);
            const buyer = interaction.member;

            // Try to create a ticket channel
            try {
                const channelName = `sale-${seller.user.username}-${buyer.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: sellerId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: buyerId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        }
                    ]
                });

                // Send initial message in the ticket
                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Purchase Ticket Created')
                    .setDescription(`**Seller:** <@${sellerId}>\n**Buyer:** <@${buyerId}>\n\nThis ticket was created from a sale listing. Please discuss the details of your transaction here.`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await ticketChannel.send({
                    content: `<@${sellerId}> <@${buyerId}>`,
                    embeds: [ticketEmbed],
                    components: [closeButton]
                });

                await interaction.reply({
                    content: `✅ Purchase ticket created! Please continue your discussion in ${ticketChannel}`,
                    ephemeral: true
                });

            } catch (channelError) {
                console.error('Error creating ticket channel:', channelError);
                await interaction.reply({
                    content: `✅ Purchase request sent! Please contact <@${sellerId}> to complete the transaction.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error handling purchase button:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your purchase request.',
                ephemeral: true
            });
        }
        return;
    }

    // Handle Sell To buttons from /buy command
    if (interaction.customId.startsWith('sell_to_')) {
        try {
            const buyerId = interaction.customId.replace('sell_to_', '');
            const sellerId = interaction.user.id;

            // Don't allow users to sell to themselves
            if (sellerId === buyerId) {
                await interaction.reply({
                    content: '❌ You cannot sell to yourself!',
                    ephemeral: true
                });
                return;
            }

            // Create a private channel or ticket for the trade
            const guild = interaction.guild;
            const buyer = await guild.members.fetch(buyerId);
            const seller = interaction.member;

            // Try to create a ticket channel
            try {
                const channelName = `buy-${buyer.user.username}-${seller.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: buyerId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: sellerId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        }
                    ]
                });

                // Send initial message in the ticket
                const ticketEmbed = new EmbedBuilder()
                    .setTitle('🎫 Sell Ticket Created')
                    .setDescription(`**Buyer:** <@${buyerId}>\n**Seller:** <@${sellerId}>\n\nThis ticket was created from a buy request. Please discuss the details of your transaction here.`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                const closeButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

                await ticketChannel.send({
                    content: `<@${buyerId}> <@${sellerId}>`,
                    embeds: [ticketEmbed],
                    components: [closeButton]
                });

                await interaction.reply({
                    content: `✅ Sell ticket created! Please continue your discussion in ${ticketChannel}`,
                    ephemeral: true
                });

            } catch (channelError) {
                console.error('Error creating ticket channel:', channelError);
                await interaction.reply({
                    content: `✅ Sell request sent! Please contact <@${buyerId}> to complete the transaction.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Error handling sell button:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your sell request.',
                ephemeral: true
            });
        }
        return;
    }

    // Handle Close Ticket button
    if (interaction.customId === 'close_ticket') {
        try {
            const channel = interaction.channel;

            const confirmEmbed = new EmbedBuilder()
                .setTitle('🗑️ Close Ticket')
                .setDescription('Are you sure you want to close this ticket? This action cannot be undone.')
                .setColor(0xff0000);

            const confirmButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close_ticket')
                    .setLabel('Yes, Close')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_close_ticket')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmButtons],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error handling close ticket button:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to close the ticket.',
                ephemeral: true
            });
        }
        return;
    }

    // Handle Confirm Close Ticket button
    if (interaction.customId === 'confirm_close_ticket') {
        try {
            const channel = interaction.channel;

            await interaction.reply({
                content: '✅ Closing ticket in 5 seconds...',
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (deleteError) {
                    console.error('Error deleting ticket channel:', deleteError);
                }
            }, 5000);

        } catch (error) {
            console.error('Error confirming ticket close:', error);
            await interaction.reply({
                content: '❌ An error occurred while closing the ticket.',
                ephemeral: true
            });
        }
        return;
    }

    // Handle Cancel Close Ticket button
    if (interaction.customId === 'cancel_close_ticket') {
        await interaction.reply({
            content: '✅ Ticket close cancelled.',
            ephemeral: true
        });
        return;
    }
}

// --- HANDLE AUCTION BID MODAL SUBMISSION ---
async function handleAuctionBidModal(interaction) {
    const messageId = interaction.customId.replace('auction_bid_', '');
    const auction = activeAuctions.get(messageId);
    if (!auction || auction.ended) {
        await interaction.reply({ content: '❌ This auction has ended.', ephemeral: true });
        return;
    }
    // --- AUCTION BLACKLIST ---
    const member = interaction.member;
    if (member.roles.cache.some(role => role.name === 'AUCTION BLACKLIST')) {
        await interaction.reply({
            content: '❌ You are blacklisted from placing bids! (AUCTION BLACKLIST role)',
            ephemeral: true
        });
        return;
    }
    const bidStr = interaction.fields.getTextInputValue('bid_amount');
    const bidAmount = Number(bidStr);
    if (isNaN(bidAmount)) {
        await interaction.reply({ content: '❌ Invalid bid! Please enter a valid number.', ephemeral: true });
        return;
    }
    const minBid = auction.highestBid
        ? auction.highestBid.amount + auction.minimumIncrement
        : auction.startingBid;
    if (bidAmount < minBid) {
        await interaction.reply({ content: `❌ Your bid is too low! Minimum allowed is **${minBid}**.`, ephemeral: true });
        return;
    }
    // Valid bid
    auction.highestBid = {
        amount: bidAmount,
        userId: interaction.user.id,
        userTag: interaction.user.tag
    };
    auction.bidders.push({
        amount: bidAmount,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        time: new Date().toISOString()
    });

    // Edit auction embed
    const channel = await client.channels.fetch(auction.channelId);
    const msgObj = await channel.messages.fetch(auction.messageId);
    const emb = EmbedBuilder.from(msgObj.embeds[0]);
    // Replace the 'Current Highest Bid' field with new info
    emb.spliceFields(3, 1, {
        name: 'Current Highest Bid',
        value: `**${bidAmount.toLocaleString()}** by <@${interaction.user.id}>`,
        inline: false
    });

    await msgObj.edit({ embeds: [emb] });
    await interaction.reply({ content: `✅ Your bid of **${bidAmount.toLocaleString()}** has been placed!`, ephemeral: true });
}

// --- END AUCTION FUNCTION ---
async function endAuction(msgObj, auction, interaction = null) {
    if (auction.ended) return;
    auction.ended = true;

    // Edit auction embed to show winner or no winner
    const emb = EmbedBuilder.from(msgObj.embeds[0]);
    emb.setColor(0x888888);
    emb.spliceFields(3, 1, {
        name: 'Auction Result',
        value: auction.highestBid
            ? `🏆 Winner: <@${auction.highestBid.userId}> with **${auction.highestBid.amount.toLocaleString()}**!`
            : '❌ No bids were placed.',
        inline: false
    });
    emb.spliceFields(4, 1, {
        name: 'Status',
        value: 'Auction Ended',
        inline: false
    });
    await msgObj.edit({ embeds: [emb], components: [] });

    if (interaction) {
        await interaction.reply({ content: '⏹️ Auction ended.', ephemeral: true });
    }

    // Optionally DM the winner
    if (auction.highestBid) {
        try {
            const winner = await client.users.fetch(auction.highestBid.userId);
            await winner.send(`🎉 Congratulations! You won the auction for **${auction.itemName}** with a bid of **${auction.highestBid.amount.toLocaleString()}**!`);
        } catch (e) { }
    }
}

// --- ERROR HANDLING ---
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// --- LOGIN ---
// Paste your bot token below:
client.login(process.env.DISCORD_TOKEN);