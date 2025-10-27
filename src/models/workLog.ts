import { z } from 'zod';

/**
 * WorkLog バリデーションスキーマ
 */
const workLogSchema = z
	.object({
		id: z.string().uuid(),
		userId: z.string().uuid(),
		startedAt: z.date(),
		endedAt: z.date().nullable(),
		description: z.string(),
		createdAt: z.date(),
		updatedAt: z.date()
	})
	.refine(
		(data) => {
			// endedAt が null でない場合、startedAt より大きい日付であること
			if (data.endedAt !== null) {
				return data.endedAt > data.startedAt;
			}
			return true;
		},
		{
			message: 'endedAt must be greater than startedAt',
			path: ['endedAt']
		}
	);

type WorkLogProps = z.infer<typeof workLogSchema>;

/**
 * WorkLog ドメインモデルクラス
 * アプリケーション内部で扱う作業記録の完全な表現
 */
export class WorkLog {
	readonly id: string;
	readonly userId: string;
	readonly startedAt: Date;
	readonly endedAt: Date | null;
	readonly description: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;

	/**
	 * private constructor - 直接インスタンス化を防ぐ
	 * ファクトリメソッドを使用してインスタンスを生成すること
	 */
	private constructor(props: WorkLogProps) {
		this.id = props.id;
		this.userId = props.userId;
		this.startedAt = props.startedAt;
		this.endedAt = props.endedAt;
		this.description = props.description;
		this.createdAt = props.createdAt;
		this.updatedAt = props.updatedAt;
	}

	/**
	 * ファクトリメソッド: 未知のデータからWorkLogインスタンスを生成
	 * @param data - バリデーション対象のデータ
	 * @returns バリデーション済みのWorkLogインスタンス
	 * @throws ZodError - バリデーション失敗時
	 */
	static from(data: unknown): WorkLog {
		const validated = workLogSchema.parse(data);
		return new WorkLog(validated);
	}

	/**
	 * 型ガード関数: データがWorkLog形式として有効かチェック
	 * @param data - チェック対象のデータ
	 * @returns データが有効な場合true
	 */
	static isValid(data: unknown): boolean {
		return workLogSchema.safeParse(data).success;
	}

	/**
	 * 作業が進行中かどうかを判定
	 * @returns 進行中の場合true
	 */
	isActive(): boolean {
		return this.endedAt === null;
	}

	/**
	 * 作業時間を秒単位で取得
	 * @returns 作業時間（秒）、進行中の場合はnull
	 */
	getDuration(): number | null {
		if (this.endedAt === null) {
			return null;
		}
		return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
	}

	/**
	 * 作業を停止可能かどうかを判定
	 * @returns 停止可能な場合true
	 */
	canStop(): boolean {
		return this.isActive();
	}

	/**
	 * 作業記録を更新した新しいインスタンスを返す（イミュータブル）
	 * F-004: 編集機能のために追加
	 * @param params - 更新するフィールド
	 * @returns 更新された新しいWorkLogインスタンス
	 */
	update(params: {
		startedAt?: Date;
		endedAt?: Date | null;
		description?: string;
	}): WorkLog {
		const updatedData = {
			id: this.id,
			userId: this.userId,
			startedAt: params.startedAt ?? this.startedAt,
			endedAt: params.endedAt !== undefined ? params.endedAt : this.endedAt,
			description: params.description ?? this.description,
			createdAt: this.createdAt,
			updatedAt: new Date() // 現在時刻で更新
		};

		return new WorkLog(updatedData);
	}

	/**
	 * 開始時刻と終了時刻の整合性を検証
	 * F-004: 編集機能のために追加
	 * @throws Error - startedAt >= endedAt の場合
	 */
	validateTimeRange(): void {
		// endedAt が null の場合は検証をスキップ（進行中の作業）
		if (this.endedAt === null) {
			return;
		}

		// startedAt < endedAt であることを確認
		if (this.startedAt >= this.endedAt) {
			throw new Error('開始時刻は終了時刻より前である必要があります');
		}
	}

	/**
	 * プレーンオブジェクトに変換
	 * @returns WorkLogのプレーンオブジェクト表現
	 */
	toObject(): WorkLogProps {
		return {
			id: this.id,
			userId: this.userId,
			startedAt: this.startedAt,
			endedAt: this.endedAt,
			description: this.description,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt
		};
	}
}

/**
 * 作業開始レスポンススキーマ
 */
export const startWorkLogResponseSchema = z.object({
	ok: z.literal(true),
	workLog: workLogSchema,
	serverNow: z.date()
});

export type StartWorkLogResponse = {
	ok: true;
	workLog: WorkLog;
	serverNow: Date;
};

/**
 * 作業終了レスポンススキーマ
 */
export const stopWorkLogResponseSchema = z.object({
	ok: z.literal(true),
	workLog: workLogSchema,
	serverNow: z.date(),
	durationSec: z.number().int().nonnegative()
});

export type StopWorkLogResponse = {
	ok: true;
	workLog: WorkLog;
	serverNow: Date;
	durationSec: number;
};

/**
 * 初期状態取得レスポンススキーマ
 */
export const loadWorkLogResponseSchema = z.object({
	active: workLogSchema.nullable(),
	serverNow: z.date()
});

export type LoadWorkLogResponse = {
	active: WorkLog | null;
	serverNow: Date;
};

/**
 * エラーレスポンススキーマ
 */
export const errorResponseSchema = z.object({
	ok: z.literal(false),
	reason: z.enum(['ACTIVE_EXISTS', 'NO_ACTIVE', 'UNAUTHORIZED', 'INTERNAL_ERROR']),
	message: z.string(),
	serverNow: z.date().optional(),
	active: workLogSchema.optional()
});

export type ErrorResponse = {
	ok: false;
	reason: 'ACTIVE_EXISTS' | 'NO_ACTIVE' | 'UNAUTHORIZED' | 'INTERNAL_ERROR';
	message: string;
	serverNow?: Date;
	active?: WorkLog;
};

/**
 * WorkLogのバリデーション関数（後方互換性のため残存）
 * @deprecated WorkLog.from() を使用してください
 * @param data - バリデーション対象のデータ
 * @returns バリデーション済みのWorkLogインスタンス
 * @throws ZodError - バリデーション失敗時
 */
export const validateWorkLog = (data: unknown): WorkLog => {
	return WorkLog.from(data);
};

/**
 * WorkLogの型ガード関数（後方互換性のため残存）
 * @deprecated WorkLog.isValid() を使用してください
 * @param data - チェック対象のデータ
 * @returns データがWorkLog型の場合true
 */
export const isWorkLog = (data: unknown): boolean => {
	return WorkLog.isValid(data);
};
