import {test, expect} from '../../support/fixtures'
import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'
import {TaskCommentFactory} from '../../factories/task_comment'
import {UserFactory} from '../../factories/user'
import {UserProjectFactory} from '../../factories/users_project'
import {createDefaultViews} from '../project/prepareProjects'

test('comment create, edit and delete persist after reload', async ({authenticatedPage: page, apiContext, userToken}) => {
	const [project] = await ProjectFactory.create(1)
	await createDefaultViews(project.id)
	const [task] = await TaskFactory.create(1, {project_id: project.id})
	const headers = {Authorization: `Bearer ${userToken}`}
	await page.goto(`/tasks/${task.id}`)
	await page.locator('.comments .tiptap[contenteditable="true"]').fill('Original comment')
	await page.locator('.comments').getByRole('button', {name: 'Comment', exact: true}).click()
	const row = page.locator('.comments .comment[id^="comment-"]')
	await expect(row).toContainText('Original comment')
	await expect(page.locator('.global-notification')).toContainText('Success')
	await page.reload()
	await expect(row).toContainText('Original comment')
	await row.getByRole('button', {name: 'Edit', exact: true}).click()
	await row.locator('.tiptap[contenteditable="true"]').fill('Updated comment')
	await row.getByRole('button', {name: 'Save', exact: true}).click()
	await expect(row).toContainText('Updated comment')
	await page.reload()
	await expect(row).toContainText('Updated comment')
	let stored = await apiContext.get(`tasks/${task.id}/comments`, {headers})
	expect(stored.ok()).toBeTruthy()
	expect(await stored.json()).toEqual([expect.objectContaining({comment: '<p>Updated comment</p>'})])
	await row.getByRole('button', {name: 'Delete', exact: true}).click()
	await page.getByRole('dialog').getByRole('button', {name: 'Do it!'}).click()
	await expect(row).toHaveCount(0)
	await page.reload()
	await expect(page.locator('.comments').getByRole('button', {name: 'Comment', exact: true})).toBeVisible()
	await expect(row).toHaveCount(0)
	stored = await apiContext.get(`tasks/${task.id}/comments`, {headers})
	expect(stored.ok()).toBeTruthy()
	expect(await stored.json()).toEqual([])
})

test('comments by another user can be replied to but not edited', async ({authenticatedPage: page, currentUser}) => {
	const [otherUser] = await UserFactory.create(1, {id: 200}, false)
	const [project] = await ProjectFactory.create(1, {owner_id: currentUser.id})
	await createDefaultViews(project.id)
	await UserProjectFactory.create(1, {project_id: project.id, user_id: otherUser.id, permission: 1})
	const [task] = await TaskFactory.create(1, {project_id: project.id, created_by_id: currentUser.id})
	await TaskCommentFactory.create(1, {id: 1, task_id: task.id, author_id: otherUser.id, comment: 'Comment from a teammate'})
	await TaskCommentFactory.create(1, {id: 2, task_id: task.id, author_id: currentUser.id, comment: 'My own comment'}, false)
	await page.goto(`/tasks/${task.id}`)
	const theirs = page.locator('#comment-1')
	const mine = page.locator('#comment-2')
	await expect(theirs).toContainText('Comment from a teammate')
	await expect(mine).toContainText('My own comment')
	await expect(mine.getByRole('button', {name: 'Edit', exact: true})).toBeVisible()
	await expect(theirs.getByRole('button', {name: 'Reply', exact: true})).toBeVisible()
	await expect(theirs.getByRole('button', {name: 'Edit', exact: true})).toHaveCount(0)
})
