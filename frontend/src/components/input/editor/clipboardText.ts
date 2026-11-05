import {getTextSerializersFromSchema, type TextSerializer} from '@tiptap/core'
import type {Fragment, Node as ProseMirrorNode, Schema, Slice} from '@tiptap/pm/model'

type Serializers = Record<string, TextSerializer>

function inlineText(node: ProseMirrorNode, serializers: Serializers): string {
	let text = ''
	node.forEach((child, offset, index) => {
		if (child.isText) {
			text += child.text ?? ''
			return
		}
		const serializer = serializers[child.type.name]
		if (serializer) {
			text += serializer({node: child, pos: offset, parent: node, index, range: {from: 0, to: node.content.size}})
			return
		}
		if (child.type.name === 'hardBreak') {
			text += '\n'
			return
		}
		const leafText = child.type.spec.leafText
		if (leafText) {
			text += leafText(child)
			return
		}
		text += child.textContent
	})
	return text
}

function listMarker(list: ProseMirrorNode, item: ProseMirrorNode, index: number): string {
	switch (list.type.name) {
		case 'orderedList':
			return `${(Number(list.attrs.start) || 1) + index}. `
		case 'taskList':
			return item.attrs.checked ? '- [x] ' : '- [ ] '
		default:
			return '- '
	}
}

function isList(node: ProseMirrorNode): boolean {
	return ['bulletList', 'orderedList', 'taskList'].includes(node.type.name)
}

function blockLines(node: ProseMirrorNode, serializers: Serializers): string[] {
	if (node.isTextblock) {
		return inlineText(node, serializers).split('\n')
	}

	if (isList(node)) {
		const lines: string[] = []
		node.forEach((item, _offset, index) => {
			const marker = listMarker(node, item, index)
			const indent = ' '.repeat(marker.length)
			const itemLines = fragmentLines(item.content, serializers)
			if (itemLines.length === 0) {
				lines.push(marker.trimEnd())
				return
			}
			itemLines.forEach((line, i) => {
				lines.push(i === 0 ? marker + line : (line === '' ? '' : indent + line))
			})
		})
		return lines
	}

	if (node.type.name === 'tableRow') {
		const cells: string[] = []
		node.forEach(cell => cells.push(fragmentLines(cell.content, serializers).join(' ')))
		return [cells.join('\t')]
	}

	if (node.isLeaf) {
		const serializer = serializers[node.type.name]
		if (serializer) {
			return [serializer({node, pos: 0, parent: node, index: 0, range: {from: 0, to: 0}})]
		}
		const leafText = node.type.spec.leafText
		return leafText ? [leafText(node)] : []
	}

	return fragmentLines(node.content, serializers)
}

function fragmentLines(fragment: Fragment, serializers: Serializers): string[] {
	const lines: string[] = []
	fragment.forEach(child => {
		if (child.isInline) {
			// loose inline content (open slices): gather it on one line
			const text = child.isText ? (child.text ?? '') : (serializers[child.type.name]?.({node: child, pos: 0, parent: child, index: 0, range: {from: 0, to: 0}}) ?? child.textContent)
			if (lines.length === 0) {
				lines.push('')
			}
			lines[lines.length - 1] += text
			return
		}
		lines.push(...blockLines(child, serializers))
	})
	return lines
}

function countTextblocks(fragment: Fragment): number {
	let count = 0
	fragment.descendants(node => {
		if (node.isTextblock) {
			count++
			return false
		}
		return true
	})
	return count
}

/**
 * Plain-text clipboard serializer that keeps list structure readable: bullet
 * items get "- ", ordered items their number and task items a checkbox marker.
 * A selection inside a single text block is copied as just its text.
 */
const serializerCache = new WeakMap<Schema, Serializers>()

export function serializeClipboardText(slice: Slice, schema: Schema): string {
	let serializers = serializerCache.get(schema)
	if (!serializers) {
		serializers = getTextSerializersFromSchema(schema)
		serializerCache.set(schema, serializers)
	}
	const resolved = serializers

	if (slice.openStart > 0 && countTextblocks(slice.content) <= 1) {
		return slice.content.textBetween(0, slice.content.size, '\n', leaf => {
			const serializer = resolved[leaf.type.name]
			if (serializer) {
				return serializer({node: leaf, pos: 0, parent: leaf, index: 0, range: {from: 0, to: 0}})
			}
			return leaf.type.name === 'hardBreak' ? '\n' : (leaf.type.spec.leafText?.(leaf) ?? '')
		})
	}
	return fragmentLines(slice.content, resolved).join('\n')
}
