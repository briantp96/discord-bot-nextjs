import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import discord, { Client, Intents, MessageReaction, User } from 'discord.js';

dotenv.config();

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No bot token found!');
}

type ModuleFile = {
  onStartup?: (client: Client) => Promise<void>;
  onReactionAdd?: (
    client: Client,
    reaction: MessageReaction,
    user: User
  ) => Promise<void>;
};

const client = new discord.Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const modules: ModuleFile[] = [];
const moduleFiles = fs
  .readdirSync(path.resolve(__dirname, './modules'))
  .filter((file) => file.endsWith('.ts'));

for (const moduleFile of moduleFiles) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(`./modules/${moduleFile}`) as ModuleFile;
  modules.push(module);
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  modules.forEach((mod) => mod.onStartup?.(client));
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.partial) {
    try {
      await user.fetch();
    } catch (error) {
      console.log('Error while trying to fetch an user', error);
    }
  }

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch (error) {
      console.log('Error while trying to fetch a reaction message', error);
    }
  }

  if (reaction.partial) {
    try {
      const fetchedReaction = await reaction.fetch();
      modules.forEach((mod) =>
        mod.onReactionAdd?.(client, fetchedReaction, user as User)
      );
    } catch (error) {
      console.log('Error while trying to fetch a reaction', error);
    }
  } else {
    modules.forEach((mod) =>
      mod.onReactionAdd?.(client, reaction, user as User)
    );
  }
});

// Wake up 🤖
client.login(process.env.DISCORD_BOT_TOKEN);
