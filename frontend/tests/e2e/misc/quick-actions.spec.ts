import {test, expect} from '../../support/fixtures'

import {ProjectFactory} from '../../factories/project'
import {createDefaultViews} from '../project/prepareProjects'

test.describe('Quick actions', () => {
	test('Creates a new task named like an existing project', async ({authenticatedPage: page, currentUser}) => {
		const projects = await ProjectFactory.create(2, {
			owner_id: currentUser.id,
			title: (i: number) => i === 1 ? 'Inbox' : 'Groceries',
		})
		await createDefaultViews(projects[0].id)
		await createDefaultViews(projects[1].id, 5)

		await page.goto(`/projects/${projects[0].id}/1`)
		await expect(page.locator('.project-title')).toContainText('Inbox')
		await page.getByRole('button', {name: 'Open the search/quick action bar'}).click()
		const input = page.locator('.quick-actions .action-input input')
		await expect(input).toBeFocused()

		await input.fill('New task')
		await expect(page.locator('.quick-actions .result-item-button')).toHaveCount(1)
		await input.press('Enter')
		await expect(page.locator('.quick-actions .active-cmd')).toHaveText('New task')

		await input.fill('Groceries')
		await input.press('Enter')

		await expect(page.locator('.global-notification')).toContainText('The task was successfully created')
		await expect(page).toHaveURL(/\/tasks\/\d+/)
		await expect(page.locator('.task-view h1.title.input')).toContainText('Groceries')
	})
})
