require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const fetch = require('isomorphic-unfetch');
const {prefix, token} = require('./config.json');

const client = new Discord.Client();
const cooldowns = new Discord.Collection();

client.commands = new Discord.Collection();

const commandFolders = fs.readdirSync('./commands');
commandFolders.forEach(folder => {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
	commandFiles.forEach(file => {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.name, command);
	});
});

client.on('ready', () => console.info(`Logged in as ${client.user.tag} 🚀`));

client.on('message', message => {
	// when no prefix or bot command
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	//arguments and command
	const args =  message.content.slice(prefix.length).trim().split(' ');
	const commandName = args.shift().toLowerCase();

	// If command is not a avilabe exit immediately
	if(!client.commands.has(commandName)) return;

	const command = client.commands.get(commandName);

	if (command.args && !args.length) {
		return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
	}

	// Spam restriction / cooldown time management
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}
	
	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;
	
	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`**⚠️ please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.**`);
		}
	}
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	
	// Command execution happens here
	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.login(process.env.BOT_TOKEN || token);
