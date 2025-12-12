import { ButtonStyle, ChatInputCommandInteraction, Client, ComponentType, createComponentBuilder, Events, GatewayIntentBits, SharedSlashCommand, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js';
import { LISTEN_ENDPOINT, sendMessage } from './endpoints';
import {EventSourcePolyfill} from "event-source-polyfill";
import {CHAT_CHANNEL_ID, GUILD_ID, PLATFORM_ID, TOKEN} from "./env";

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

type PlatformID = `${string}:${string}`;

interface Data {
	message: string;
	author: string | null;
	platformID?: PlatformID;
}

function listenForMessages() {
	const source = new EventSourcePolyfill(LISTEN_ENDPOINT.href);
	source.addEventListener("message", e => {
		const { message, author, platformID } = JSON.parse(e.data) as Data;
		// ignore this message, it's from us.
		if (platformID === PLATFORM_ID)
			return;
		const a = author ?? "Server";
		console.info(`Got message: ${a} via ${platformID ?? "unknown platform"}: ${message}`);
		if (author === null) return;
		const channel = client.channels.cache.get(CHAT_CHANNEL_ID!)!;
		if (!channel.isSendable()) {
			console.error("Supposed to send new messages in a channel that isn't 'sendable', not sending.");
			return;
		}
		channel.send({
			// we want `@silent` messages
			flags: "SuppressNotifications",
			content: message,
			// no mentions are allowed, don't want someone accidentally saying `@everyone` in chat and pinging everyone.
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
