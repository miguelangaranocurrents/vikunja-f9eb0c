import {test, expect} from '../../support/fixtures'
import {TaskFactory} from '../../factories/task'
import {ProjectFactory} from '../../factories/project'

test.describe('Editor copy as plain text', () => {
	test.beforeEach(async () => {
		await ProjectFactory.create(1)
	})

	test('keeps the list markers of a copied bullet list', async ({authenticatedPage: page}) => {
		const tasks = await TaskFactory.create(1, {
			id: 1,
			description: '<p>start</p><ul><li><p>this</p></li><li><p>is</p></li><li><p>a</p></li><li><p>list</p></li></ul><p>end</p>',
		})
		await page.goto(`/tasks/${tasks[0].id}`)
		await page.waitForLoadState('networkidle')

		const description = page.locator('.task-view .details.content.description')
		const editButton = description.locator('.tiptap button.done-edit')
		await expect(editButton).toBeVisible({timeout: 10000})
		await editButton.click()

		const editor = description.locator('.tiptap__editor .tiptap.ProseMirror')
		await expect(editor).toBeVisible()
		await editor.locator('p').first().click()
		await page.keyboard.press('ControlOrMeta+a')
		await page.keyboard.press('ControlOrMeta+c')

		await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('- this\n- is\n- a\n- list')
	})
})
