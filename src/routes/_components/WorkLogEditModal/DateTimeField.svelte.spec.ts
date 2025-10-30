import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DateTimeField from './DateTimeField.svelte';

describe('DateTimeField', () => {
	it('should render with label', () => {
		render(DateTimeField, {
			props: {
				label: 'テストラベル',
				id: 'test-id',
				name: 'test-name',
				value: '2025-10-27T10:30',
			},
		});

		expect(screen.getByLabelText('テストラベル')).toBeInTheDocument();
	});

	it('should display the provided value', () => {
		render(DateTimeField, {
			props: {
				label: 'テストラベル',
				id: 'test-id',
				name: 'test-name',
				value: '2025-10-27T10:30',
			},
		});

		const input = screen.getByLabelText('テストラベル') as HTMLInputElement;
		expect(input.value).toBe('2025-10-27T10:30');
	});

	it('should update value when user types', async () => {
		const user = userEvent.setup();
		render(DateTimeField, {
			props: {
				label: 'テストラベル',
				id: 'test-id',
				name: 'test-name',
				value: '2025-10-27T10:30',
			},
		});

		const input = screen.getByLabelText('テストラベル') as HTMLInputElement;
		await user.clear(input);
		await user.type(input, '2025-10-28T14:00');

		expect(input.value).toBe('2025-10-28T14:00');
	});

	it('should be disabled when disabled prop is true', () => {
		render(DateTimeField, {
			props: {
				label: 'テストラベル',
				id: 'test-id',
				name: 'test-name',
				value: '2025-10-27T10:30',
				disabled: true,
			},
		});

		const input = screen.getByLabelText('テストラベル') as HTMLInputElement;
		expect(input).toBeDisabled();
	});

	it('should have required attribute when required prop is true', () => {
		render(DateTimeField, {
			props: {
				label: 'テストラベル',
				id: 'test-id',
				name: 'test-name',
				value: '2025-10-27T10:30',
				required: true,
			},
		});

		const input = screen.getByLabelText('テストラベル') as HTMLInputElement;
		expect(input).toBeRequired();
	});
});
