import type {CurrentsConfig} from '@currents/playwright'

const config: CurrentsConfig = {
	projectId: process.env.CURRENTS_PROJECT_ID ?? '',
	consoleOutput: 'compact',
	contextLinks: true,
	outputFile: 'currents-report.json',
}

export default config
