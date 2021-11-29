import { SlashCommandBuilder } from '@discordjs/builders'

export const data = new SlashCommandBuilder()
	.setName('hello')
	.setDescription('Reply with Hi')
export async function execute(interaction) {
	await interaction.reply('Hi')
}