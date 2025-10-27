import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DescriptionField from './DescriptionField.svelte';

describe('DescriptionField', () => {
	it('should render with label', () => {
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: 'テスト作業'
			}
		});

		expect(screen.getByLabelText('作業内容')).toBeInTheDocument();
	});

	it('should display the provided value', () => {
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: 'テスト作業'
			}
		});

		const textarea = screen.getByLabelText('作業内容') as HTMLTextAreaElement;
		expect(textarea.value).toBe('テスト作業');
	});

	it('should display character count', () => {
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: 'テスト'
			}
		});

		expect(screen.getByText('3 / 10,000')).toBeInTheDocument();
	});

	it('should update character count when value changes', async () => {
		const user = userEvent.setup();
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: ''
			}
		});

		const textarea = screen.getByLabelText('作業内容') as HTMLTextAreaElement;
		await user.type(textarea, 'ABC');

		expect(screen.getByText('3 / 10,000')).toBeInTheDocument();
	});

	it('should be disabled when disabled prop is true', () => {
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: 'テスト作業',
				disabled: true
			}
		});

		const textarea = screen.getByLabelText('作業内容') as HTMLTextAreaElement;
		expect(textarea).toBeDisabled();
	});

	it('should display custom maxLength', () => {
		render(DescriptionField, {
			props: {
				label: '作業内容',
				id: 'description',
				name: 'description',
				value: 'テスト',
				maxLength: 100
			}
		});

		expect(screen.getByText('3 / 100')).toBeInTheDocument();
	});
});
