import {defineConfig, devices} from '@playwright/test'
import {currentsReporter} from '@currents/playwright'
import {execSync} from 'child_process'
import currentsConfig from './currents.config'

// Find system chromium - for UI mode, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env var
const getChromiumPath = () => {
	// Check if env var is already set (for UI mode)
	if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
		return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
	}
	try {
		return execSync('which chromium', {encoding: 'utf-8'}).trim()
	} catch {
		return undefined
	}
}

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1, // No parallelization initially
	reporter: process.env.CI ? [['html', {open: 'never'}], ['list'], ['json', {outputFile: 'test-results.json'}], ...(process.env.CURRENTS_RECORD_KEY ? [currentsReporter(currentsConfig)] : [])] : 'html',
	use: {
		baseURL: process.env.BASE_URL || 'http://127.0.0.1:4173',
		trace: 'on',
		video: 'on',
		screenshot: 'on',
		testIdAttribute: 'data-cy', // Preserve existing data-cy selectors
		serviceWorkers: 'block',
		launchOptions: {
			executablePath: getChromiumPath(),
		},
	},
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']},
		},
	],
	// webServer configuration removed - we manually start services in CI
	// For local development, run `pnpm preview` and `pnpm preview:vikunja` separately
})
