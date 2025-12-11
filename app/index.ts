// Require the necessary discord.js classes
import { ButtonStyle, ChatInputCommandInteraction, Client, ComponentType, createComponentBuilder, EmbedBuilder, Events, GatewayIntentBits, SharedSlashCommand, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { LISTEN_ENDPOINT, sendMessage } from './endpoints';
import {EventSourcePolyfill} from "event-source-polyfill";

const { TOKEN, GUILD_ID, CHAT_CHANNEL_ID } = Bun.env;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

interface Command {
	data: SharedSlashCommand,
	execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const sendCommand = {
	data: new SlashCommandBuilder()
		.setName("send")
		.setDescription("Sends a message")
		.addStringOption(new SlashCommandStringOption().setName("message").setRequired(true)),
	async execute(i: ChatInputCommandInteraction) {
		sendMessage(i.options.getString("message", true), i.user.displayName)
	}
};

interface Data {
	message: string;
	author: string | null;
}

function listenForMessages() {
	const source = new EventSourcePolyfill(LISTEN_ENDPOINT.href);
	source.addEventListener("message", e => {
		const { message, author } = JSON.parse(e.data) as Data;
		const a = author ?? "Server";
		console.info(`Got message: ${a}: ${message}`);
		if (author === null) return;
		const channel = client.channels.cache.get(CHAT_CHANNEL_ID!)!;
		if (!channel.isSendable()) {
			console.error("Supposed to send new messages in a channel that isn't 'sendable', not sending.");
			return;
		}
		channel.send({
			flags: "SuppressNotifications",
			content: message,
			// no mentions are allowed, don't want someone accidentally doing @everyone in chat and pinging everyone.
			allowedMentions: {},
			components: [createComponentBuilder({
				type: ComponentType.ActionRow,
				components: [createComponentBuilder({
					type: ComponentType.Button,
					url: "https://codeberg.org/bab/imchat",
					style: ButtonStyle.Link,
					label: "IMChat Source"
				}).toJSON()],
			}).toJSON()]
		});
	})
}

listenForMessages();

const commands = new Map<string, Command>([
	[sendCommand.data.name, sendCommand]
]);

client.on(Events.InteractionCreate, async i => {
	if (!i.isChatInputCommand()) return;

	const command = commands.get(i.commandName);

	if (!command) return;

	try {
		await command.execute(i);
	} catch (error) {
		console.error(error);
		await i.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

console.log(CHAT_CHANNEL_ID);
if (CHAT_CHANNEL_ID !== undefined)
	client.on(Events.MessageCreate, m => {
		if (m.author.bot) return;
		if (m.guildId !== GUILD_ID) return;
		if (m.channelId !== CHAT_CHANNEL_ID) return;
		console.log(`${m.author.displayName} -> ${m.cleanContent}`);
		console.log(`${m.author.displayName} -> (uncleaned) ${m.content}`);
		sendMessage(m.cleanContent, m.author.displayName);
	});

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(TOKEN!);
