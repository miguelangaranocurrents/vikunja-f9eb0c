import {test, expect} from '../../support/fixtures'

test('CSV detection, preview and import persist after reload', async ({authenticatedPage: page, apiContext, userToken}) => {
	await page.goto('/migrate/csv')
	await page.locator('input[type=file]').setInputFiles({name: 'tasks.csv', mimeType: 'text/csv', buffer: Buffer.from('title,description,project\nImported CSV task,Stored description,CSV project\n')})
	await expect(page.locator('.preview-tasks')).toContainText('Imported CSV task')
	await page.getByRole('button', {name: 'Import Tasks', exact: true}).click()
	await expect(page.locator('.success-step [role=status]')).toContainText('The import from CSV has finished', {timeout: 20000})
	await expect(page.locator('.success-step .message.danger')).toHaveCount(0)
	await page.goto('/')
	await page.reload()
	await expect(page.locator('.tasks')).toContainText('Imported CSV task')
	const stored = await apiContext.get('/api/v2/tasks', {headers: {Authorization: `Bearer ${userToken}`}})
	expect(stored.ok()).toBe(true)
	expect((await stored.json()).items).toContainEqual(expect.objectContaining({title: 'Imported CSV task', description: 'Stored description'}))
})

test('CSV import page highlights the import item in the settings navigation', async ({authenticatedPage: page}) => {
	await page.goto('/migrate/csv')
	await expect(page.locator('input[type=file]')).toBeAttached()
	const navigation = page.locator('.side-nav-shell .navigation')
	await expect(navigation.locator('.navigation-link').filter({hasText: 'Import from other services'})).toHaveClass(/is-active/)
	await expect(navigation.locator('.navigation-link.is-active')).toHaveCount(1)
})
